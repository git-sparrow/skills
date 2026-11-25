import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { closeout, init, prepare } from "../../../skills/cross-review/scripts/protocol.mjs";

const runner = fileURLToPath(new URL("../../../skills/cross-review/scripts/provider.mjs", import.meta.url));
const fake = fileURLToPath(new URL("./fake-provider.mjs", import.meta.url));
const supported = ["darwin", "linux"].includes(process.platform);
const claudeModel = process.env.CROSS_REVIEW_CLAUDE_MODEL;
const codexModel = process.env.CROSS_REVIEW_CODEX_MODEL;
const live = Boolean(claudeModel && codexModel);
const json = (dir, name) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));

function fixture(t, { deadline = 10_000, behavior = "success", clean = false, real = false, mode = "review" } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "provider-eval-"));
  const repo = path.join(root, "repo");
  const source = path.join(root, "source");
  const bin = path.join(root, "bin");
  const run = path.join(root, "run");
  const marker = path.join(root, "launches");
  for (const dir of [repo, source, bin]) mkdirSync(dir);
  if (real) t.diagnostic(`Live artifacts: ${root}`);
  else t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...argv) => execFileSync("git", ["-C", repo, ...argv], { stdio: "pipe" });
  git("init", "-q");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  const file = path.join(repo, "calc.mjs");
  writeFileSync(file, "export const double = n => n * 2;\n");
  const standards = "Use named exports for public functions. This is the only coding standard for this fixture.\n";
  writeFileSync(path.join(repo, "CODING_STANDARDS.md"), standards);
  git("add", "calc.mjs", "CODING_STANDARDS.md");
  git("commit", "-qm", "base");
  writeFileSync(file, clean ? "export const double = n => 2 * n;\n" : "export const double = n => n * 3;\n");
  git("commit", "-qam", "head");
  const contract = "For finite integer inputs double(n) returns twice n. The entire implementation appears in the diff.\n";
  writeFileSync(path.join(source, "contract.md"), contract);
  const verify = execFileSync(process.execPath, ["--input-type=module", "-e",
    "import { double } from './calc.mjs'; console.log(double(2))"], { cwd: repo, encoding: "utf8" });
  assert.equal(Number(verify), clean ? 4 : 6);
  writeFileSync(path.join(source, "CODING_STANDARDS.md"), standards);
  writeFileSync(path.join(source, "check.md"),
    `Fixture coordinator ran double(2) at the pinned head and observed ${verify.trim()}. ` +
    "The fixture has one implementation file and no downstream callers. The patch is generated from the two commits.\n");
  const experts = [
    { id: "a", provider: "anthropic", harness: "claude-code", model: real ? claudeModel : "fake-claude" },
    { id: "b", provider: "openai", harness: "codex", model: real ? codexModel : "fake-codex" }
  ];
  init(run, { repo, source, base: "HEAD~1", head: "HEAD", transport: "claude-codex", mode,
    callMinutes: deadline / 60_000, experts });
  for (const name of ["claude", "codex"]) {
    writeFileSync(path.join(bin, name),
      '#!/bin/sh\nexec "$REVIEW_FAKE_NODE" "$REVIEW_FAKE_SCRIPT" "' + name + '" "$@"\n',
      { mode: 0o700 });
  }
  const env = real ? process.env : { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    REVIEW_FAKE_MARKER: marker, REVIEW_FAKE_BEHAVIOR: behavior,
    REVIEW_FAKE_NODE: process.execPath, REVIEW_FAKE_SCRIPT: fake };
  const start = (attempt) => {
    const child = spawn(process.execPath, [runner, run, attempt.attemptId], { env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    const done = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal, stderr }));
    });
    return { child, done };
  };
  return { run, marker, start, root, file, repo,
    reserve: (id, phase, packet) => prepare(run, id, phase, packet) };
}

test("both provider envelopes are accepted and duplicate dispatch is rejected", { skip: !supported }, async (t) => {
  const { reserve, marker, run, start } = fixture(t);
  const attempts = [reserve("a"), reserve("b")];
  const [first, second, codex] = await Promise.all(
    [attempts[0], attempts[0], attempts[1]].map((attempt) => start(attempt).done));
  assert.deepEqual([first.code, second.code].sort(), [0, 1]);
  assert.match(first.code ? first.stderr : second.stderr, /already launched|EEXIST/);
  assert.equal(codex.code, 0, codex.stderr);
  assert.equal(closeout(run).review, "COMPLETE");
  assert.equal(readFileSync(marker, "utf8").trim().split("\n").length, 2);
});

test("a reserved attempt cannot dispatch after its coordinator pauses past expiry", { skip: !supported }, async (t) => {
  const { reserve, marker, start } = fixture(t, { deadline: 500 });
  const attempt = reserve("a");
  await delay(Math.max(0, attempt.deadline - Date.now()) + 20);
  const result = await start(attempt).done;
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Dispatch deadline expired/);
  assert.equal(existsSync(marker), false);
});

for (const [behavior, evidence] of [
  ["partial", /Missing successful Codex turn/],
  ["timeout", /Execution deadline expired/],
  ["interrupt", /Supervisor interrupted/]
]) {
  test(`${behavior} cannot accept a plausible response or unlock retry`, { skip: !supported }, async (t) => {
    const { reserve, marker, start } = fixture(t, { behavior, deadline: behavior === "timeout" ? 1400 : 5000 });
    const attempt = reserve("b");
    const { child, done } = start(attempt);
    if (behavior === "interrupt") {
      for (let i = 0; i < 100 && !existsSync(marker); i++) await delay(20);
      assert.ok(existsSync(marker));
      child.kill("SIGTERM");
    }
    const result = await done;
    assert.equal(result.code, 1, result.stderr);
    const receipt = json(attempt.dir, "transport.json");
    assert.match(receipt.evidence, evidence);
    assert.equal(receipt.outcome, "failed");
    assert.equal(existsSync(path.join(attempt.dir, "result.json")), false);
    assert.throws(() => reserve("b"), /No terminal transient failure/);
  });
}

test("Claude Markdown response cannot substitute for structured output", { skip: !supported }, async (t) => {
  const { reserve, start } = fixture(t, { behavior: "fenced" });
  const attempt = reserve("a");
  const result = await start(attempt).done;
  assert.equal(result.code, 1);
  assert.match(json(attempt.dir, "transport.json").evidence, /Missing Claude structured output/);
  assert.equal(existsSync(path.join(attempt.dir, "result.json")), false);
});

test("hard supervisor loss preserves the claim and blocks retry", { skip: !supported }, async (t) => {
  const { reserve, marker, run, start } = fixture(t, { behavior: "hard-loss" });
  const attempt = reserve("b");
  const { child, done } = start(attempt);
  for (let i = 0; i < 100 && !existsSync(marker); i++) await delay(20);
  assert.ok(existsSync(marker));
  const pid = Number(readFileSync(marker, "utf8").trim().split(" ")[1]);
  assert.ok(Number.isInteger(pid) && pid > 0);
  try {
    child.kill("SIGKILL");
    assert.equal((await done).signal, "SIGKILL");
    assert.doesNotThrow(() => process.kill(pid, 0));
    assert.equal(existsSync(path.join(attempt.dir, "transport.json")), false);
    assert.equal(closeout(run).runtime, "INCOMPLETE");
    assert.match((await start(attempt).done).stderr, /already launched/);
    assert.throws(() => reserve("b"), /missing terminal evidence/);
  } finally {
    // A dead supervisor cannot reap this fake group. The test owns its cleanup.
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
});

function identifiesMultiplier(finding) {
  const explanation = `${finding.claim} ${finding.evidence}`;
  return finding.impact === "behavioral" && finding.location.includes("calc.mjs") &&
    (/\b(?:multipl\w*|triple\w*|three times)\b/i.test(explanation) ||
      (/\b(?:double|returns?)\b/i.test(explanation) && /\b6\b/.test(explanation) && /\b4\b/.test(explanation)) ||
      (/\*\s*3\b/.test(explanation) && /\*\s*2\b/.test(explanation)));
}

for (const clean of [false, true]) {
  test(`live ${clean ? "clean" : "seeded defect"} discovery`, { skip: !supported || !live }, async (t) => {
    const { reserve, start } = fixture(t, { clean, real: true, deadline: 120_000 });
    const attempts = [reserve("a"), reserve("b")];
    const results = await Promise.all(attempts.map((attempt) => start(attempt).done));
    for (const [index, result] of results.entries()) {
      assert.equal(result.code, 0, result.stderr);
      const { dir, expert } = attempts[index];
      const { findings } = json(dir, "result.json");
      const receipt = json(dir, "transport.json");
      t.diagnostic(JSON.stringify({ expert, findings, costUsd: receipt.costUsd, usage: receipt.usage,
        elapsedMs: receipt.observedAt - receipt.execution.dispatchedAt }));
      if (clean) assert.deepEqual(findings, []);
      else assert.ok(findings.some(identifiesMultiplier), "Missing behavioral finding on the seeded change");
    }
  });
}


test("live targeted challenge and repair", { skip: !supported || !live }, async (t) => {
  const { reserve, start, root, file, repo, run } = fixture(t,
    { real: true, mode: "repair", deadline: 120_000 });
  async function phase(name, packet) {
    const attempts = ["a", "b"].map((id) => reserve(id, name, packet));
    const results = await Promise.all(attempts.map((attempt) => start(attempt).done));
    return results.flatMap((result, index) => {
      assert.equal(result.code, 0, result.stderr);
      const { dir, attemptId, expert } = attempts[index];
      const { findings, limitations } = json(dir, "result.json");
      const receipt = json(dir, "transport.json");
      t.diagnostic(JSON.stringify({ phase: name, expert, findings, limitations,
        costUsd: receipt.costUsd, usage: receipt.usage,
        elapsedMs: receipt.observedAt - receipt.execution.dispatchedAt }));
      if (name === "verification") assert.deepEqual(findings, []);
      else assert.ok(findings.some(identifiesMultiplier), `Missing defect in ${name}`);
      return findings.map(({ id }) => `${attemptId}/${id}`);
    });
  }
  const original = await phase("discovery");
  const challenge = path.join(root, "challenge.md");
  writeFileSync(challenge, "Challenge the counterclaim that the multiplier change cannot violate the contract " +
    "because double(0) is still 0. Evaluate double(2) and give the surviving finding if warranted.");
  const challenged = await phase("challenge", challenge);
  writeFileSync(file, "export const double = n => n * 2;\n");
  const check = execFileSync(process.execPath, ["--input-type=module", "-e",
    "import { double } from './calc.mjs'; console.log(double(2))"], { cwd: repo, encoding: "utf8" });
  assert.equal(Number(check), 4);
  const verification = path.join(root, "verification.md");
  writeFileSync(verification, "Verify the repair against the original multiplier defect. " +
    "The coordinator executed double(2) against the tracked repair and observed 4.");
  await phase("verification", verification);
  const summary = closeout(run, [{
    id: "multiplier", sources: [...original, ...challenged], confidence: "high", impact: "behavioral",
    disposition: "fixed", evidence: "double(2) returned 6 at the pinned head and 4 with the overlay.",
    reason: "Both reviewers verified the tracked repair against the contract."
  }]);
  assert.equal(summary.review, "COMPLETE");
  assert.equal(summary.currency, "current-overlay");
});
