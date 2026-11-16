import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { init, prepare, record, fail } from "./protocol.mjs";

function fixture(t, options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "cross-design-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const run = path.join(root, "run");
  mkdirSync(source);
  writeFileSync(path.join(source, "brief.md"), "Choose a durable queue for a small service.");
  const config = { source, experts: [
    { id: "a", model: "model-a", provider: "provider", harness: "fake" },
    { id: "b", model: "model-b", provider: "provider", harness: "fake" },
  ], ...options };
  init(run, config, 1000);
  const candidate = path.join(root, "candidate.md");
  writeFileSync(candidate, "Use the existing database queue, with bounded retries.");
  return { root, source, run, config, candidate };
}

function reply(run, attempt, overrides = {}, now = 2000) {
  const response = {
    ...Object.fromEntries(["attemptId", "snapshotSha256", "requestSha256", "candidateSha256"]
      .map((key) => [key, attempt[key]])),
    status: attempt.phase === "proposal" ? "PROPOSED" : "SUPPORT",
    analysis: "Use a database queue because the observed volume fits its capacity.",
    concerns: [], ...overrides,
  };
  const raw = path.join(attempt.dir, "raw.txt");
  writeFileSync(raw, JSON.stringify(response));
  return record(run, attempt.attemptId, raw, now);
}

function proposals(run) {
  return ["a", "b"].map((expert) => {
    const attempt = prepare(run, expert, "proposal", undefined, undefined, 1500);
    reply(run, attempt);
    return attempt;
  });
}

test("snapshot survives source changes and detects changes to captured inputs", (t) => {
  const { run, source } = fixture(t);
  writeFileSync(path.join(source, "brief.md"), "changed source");
  prepare(run, "a", "proposal", undefined, undefined, 1500);
  writeFileSync(path.join(run, "inputs", "brief.md"), "changed snapshot");
  assert.throws(() => prepare(run, "b", "proposal"), /snapshot changed/);
});

test("initial experts share evidence without seeing each other's responses", (t) => {
  const { run } = fixture(t);
  const [a, b] = proposals(run);
  assert.equal(a.requestSha256, b.requestSha256);
  assert.equal(readFileSync(path.join(a.dir, "context.md"), "utf8"),
    readFileSync(path.join(b.dir, "context.md"), "utf8"));
});

test("challenge includes both proposals and pins the same candidate for both experts", (t) => {
  const { run, candidate } = fixture(t);
  proposals(run);
  const a = prepare(run, "a", "challenge-1", candidate, undefined, 2500);
  const b = prepare(run, "b", "challenge-1", candidate, undefined, 2500);
  assert.equal(a.candidateSha256, b.candidateSha256);
  assert.equal(a.requestSha256, b.requestSha256);
  const context = readFileSync(path.join(a.dir, "context.md"), "utf8");
  assert.match(context, /"expert": "a"/);
  assert.match(context, /"expert": "b"/);
  reply(run, a, { status: "REVISE", concerns: ["Show throughput evidence."] }, 3000);
  reply(run, b, {}, 3000);
});

test("challenge waits for both proposals", (t) => {
  const { run, candidate } = fixture(t);
  reply(run, prepare(run, "a", "proposal", undefined, undefined, 1500));
  assert.throws(() => prepare(run, "a", "challenge-1", candidate, undefined, 2500),
    /Missing proposal response from b/);
});

test("candidate changes within a phase are refused without changing earlier snapshots", (t) => {
  const { run, candidate } = fixture(t);
  proposals(run);
  const a = prepare(run, "a", "challenge-1", candidate, undefined, 2500);
  const saved = readFileSync(path.join(a.dir, "candidate.md"), "utf8");
  writeFileSync(candidate, "Use a different queue.");
  assert.throws(() => prepare(run, "b", "challenge-1", candidate, undefined, 2500),
    /Phase inputs changed/);
  assert.equal(readFileSync(path.join(a.dir, "candidate.md"), "utf8"), saved);
});

test("empty reasoning and stale identities cannot become accepted results", (t) => {
  const { run } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  assert.throws(() => reply(run, a, { analysis: " " }), /no analysis/);
  assert.throws(() => reply(run, a, { attemptId: "old-attempt" }), /does not match/);
  assert.throws(() => reply(run, a, { requestSha256: "wrong" }), /does not match/);
  assert.throws(() => reply(run, a, { status: "BLOCKED" }), /specific concern/);
});

test("accepted outcomes cannot be overwritten or changed to failures", (t) => {
  const { run } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  reply(run, a);
  assert.throws(() => reply(run, a), /already succeeded/);
  assert.throws(() => fail(run, a.attemptId, "later error"), /already succeeded/);
});

test("retry gets new paths, preserves old context, and cannot accept a late old response", (t) => {
  const { run } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  fail(run, a.attemptId, "temporary transport failure", true);
  const retry = prepare(run, "a", "proposal", undefined, undefined, 2000);
  assert.notEqual(a.dir, retry.dir);
  assert.equal(readFileSync(path.join(a.dir, "context.md"), "utf8"),
    readFileSync(path.join(retry.dir, "context.md"), "utf8"));
  assert.throws(() => reply(run, a), /already failed/);
  assert.throws(() => reply(run, retry, { attemptId: a.attemptId }), /does not match/);
  fail(run, retry.attemptId, "temporary failure again", true);
  assert.throws(() => prepare(run, "a", "proposal", undefined, undefined, 2500), /one retry/);
});

test("access failures cannot be retried", (t) => {
  const { run } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  fail(run, a.attemptId, "model access denied");
  assert.throws(() => prepare(run, "a", "proposal", undefined, undefined, 2500), /not transient/);
});

test("overall and per-call deadlines bound accepted calls", (t) => {
  const { run } = fixture(t, { minutes: 1, callMinutes: 0.5 });
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  assert.equal(a.deadline, 31500);
  assert.throws(() => reply(run, a, {}, 31501), /after deadline/);
  const b = prepare(run, "b", "proposal", undefined, undefined, 60000);
  assert.equal(b.deadline, 61000);
  assert.throws(() => prepare(run, "b", "proposal", undefined, undefined, 61000), /exhausted/);
});

test("changed request or candidate bytes invalidate a response", (t) => {
  const { run, candidate } = fixture(t);
  proposals(run);
  const a = prepare(run, "a", "challenge-1", candidate, undefined, 2500);
  writeFileSync(path.join(a.dir, "candidate.md"), "changed");
  assert.throws(() => reply(run, a, {}, 3000), /Candidate changed/);
  const b = prepare(run, "b", "challenge-1", candidate, undefined, 2500);
  writeFileSync(path.join(b.dir, "context.md"), "changed");
  assert.throws(() => reply(run, b, {}, 3000), /context changed/);
});

test("second cycle carries dissent and no third cycle is allowed", (t) => {
  const { run, candidate } = fixture(t);
  proposals(run);
  for (const expert of ["a", "b"]) {
    const attempt = prepare(run, expert, "challenge-1", candidate, undefined, 2500);
    reply(run, attempt, { status: "REVISE", concerns: ["Measure capacity first."] }, 3000);
  }
  writeFileSync(candidate, "Measured capacity supports the existing database queue.");
  const a = prepare(run, "a", "challenge-2", candidate, undefined, 3500);
  assert.match(readFileSync(path.join(a.dir, "context.md"), "utf8"), /Measure capacity first/);
  assert.throws(() => prepare(run, "a", "challenge-3", candidate, undefined, 4000), /Unknown phase/);
});

test("run cannot be replaced and snapshot symlinks are refused", (t) => {
  const { root, run, source, config } = fixture(t);
  assert.throws(() => init(run, config), /EEXIST/);
  symlinkSync(path.join(source, "brief.md"), path.join(source, "link.md"));
  assert.throws(() => init(path.join(root, "other"), config), /symlink/);
});

test("editing a saved proposal cannot give the other expert a different challenge", (t) => {
  const { run, candidate } = fixture(t);
  const [, b] = proposals(run);
  prepare(run, "a", "challenge-1", candidate, undefined, 2500);
  const file = path.join(b.dir, "result.json");
  const saved = JSON.parse(readFileSync(file, "utf8"));
  saved.analysis = "Replace the original proposal with different advice.";
  writeFileSync(file, JSON.stringify(saved));
  assert.throws(() => prepare(run, "b", "challenge-1", candidate, undefined, 2500),
    /Accepted response changed/);
});

test("a changed final request is rejected even if its context was not touched", (t) => {
  const { run } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  writeFileSync(path.join(a.dir, "request.md"), "Different instructions.");
  assert.throws(() => reply(run, a), /Request file changed/);
});

test("one expert's retry allowance cannot be reused in a later phase", (t) => {
  const { run, candidate } = fixture(t);
  const a = prepare(run, "a", "proposal", undefined, undefined, 1500);
  fail(run, a.attemptId, "transient", true);
  reply(run, prepare(run, "a", "proposal", undefined, undefined, 1600));
  reply(run, prepare(run, "b", "proposal", undefined, undefined, 1600));
  const challenge = prepare(run, "a", "challenge-1", candidate, undefined, 2500);
  fail(run, challenge.attemptId, "transient", true);
  assert.throws(() => prepare(run, "a", "challenge-1", candidate, undefined, 3000),
    /retry budget exhausted/);
});

test("CLI runs through a symlink from outside the skill directory", (t) => {
  const { root, source, config } = fixture(t);
  const script = path.join(import.meta.dirname, "protocol.mjs");
  const linked = path.join(root, "protocol.mjs");
  symlinkSync(script, linked);
  const configFile = path.join(root, "config.json");
  writeFileSync(configFile, JSON.stringify({ ...config, source }));
  const run = path.join(root, "cli-run");
  execFileSync(process.execPath, [linked, "init", run, configFile], { cwd: root });
  const attempt = JSON.parse(execFileSync(process.execPath,
    [linked, "prepare", run, "a", "proposal"], { cwd: root, encoding: "utf8" }));
  reply(run, attempt, {}, Date.now());
  assert.equal(JSON.parse(readFileSync(path.join(attempt.dir, "result.json"))).status, "PROPOSED");
});
