import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { init, missingFromSnapshot, prepare, preflight, launched, finish, closeout, current } from "./protocol.mjs";

const experts = ["a", "b"].map((id) => ({ id, model: `model-${id}`, provider: "test", harness: "fake" }));
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
const read = (p) => readFileSync(p, "utf8");
const put = (p, v) => writeFileSync(p, typeof v === "string" ? v : JSON.stringify(v));
function fixture(t, config = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "review-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, "repo"), source = path.join(root, "source"), run = path.join(root, "run");
  mkdirSync(repo); mkdirSync(source);
  git(repo, "init", "-q"); git(repo, "config", "user.name", "Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
  put(path.join(repo, "value.txt"), "old\n"); git(repo, "add", "."); git(repo, "commit", "-qm", "base"); git(repo, "branch", "base");
  put(path.join(repo, "value.txt"), "new\n"); git(repo, "commit", "-qam", "head"); git(repo, "branch", "review-head");
  put(path.join(source, "contract.md"), "Change value; release is downstream, not an obligation.");
  const options = { repo, source, base: "base", head: "review-head", experts, ...config };
  const state = init(run, options, 1000);
  return { root, repo, source, run, options, state };
}
function start(run, expert = "a", phase = "discovery", packet, now = 2000) {
  const a = prepare(run, expert, phase, packet, now);
  preflight(run, a.attemptId, now + 1);
  launched(run, a.attemptId, `handle-${a.attemptId}`, now + 2);
  return a;
}
function response(a, overrides = {}) {
  return { attemptId: a.attemptId, snapshotSha256: a.snapshotSha256, requestSha256: a.requestSha256,
    completion: "COMPLETE", analysis: "Compared both versions; the scoped contract is met.",
    coverage: "value.txt and caller behavior", limitations: [], findings: [], ...overrides };
}
function receipt(a, overrides = {}, now = 3000) {
  return { attemptId: a.attemptId, handle: `handle-${a.attemptId}`, binding: experts.find((e) => e.id === a.expert),
    outcome: "succeeded", observedAt: now, evidence: "fake host emitted terminal completion",
    limits: "Test double, no native supervision claim", ...overrides };
}
function end(run, a, overrides = {}, transport = {}, now = 3000) {
  const raw = path.join(a.dir, "raw.txt"); put(raw, response(a, overrides));
  return finish(run, a.attemptId, receipt(a, transport, now), raw, now);
}
function discoveries(run, finding = null) {
  return experts.map((e) => { const a = start(run, e.id); end(run, a, { findings: finding && e.id === "a" ? [finding] : [] }); return a; });
}
const finding = { id: "F1", location: "unchanged-caller.mjs:4", claim: "Changed callee breaks its unchanged caller",
  evidence: "Base returns 1, head returns 0; caller requires a positive result", confidence: "high", impact: "behavioral", disposition: "proposed" };
function adjudicate(a, overrides = {}) {
  return [{ id: "R1", sources: [`${a.attemptId}/F1`], confidence: "high", impact: "behavioral", disposition: "confirmed",
    evidence: "Focused base/head observation confirms changed callee result", reason: "The caller now takes an invalid branch", ...overrides }];
}

test("completed empty findings are valid, preserve exact raw and produce complete review", (t) => {
  const { run } = fixture(t); const [a] = discoveries(run);
  assert.equal(read(path.join(a.dir, "raw.txt")), read(path.join(a.dir, "response.txt")));
  assert.equal(closeout(run).review, "COMPLETE"); assert.equal(closeout(run).currency, "current");
});
for (const [name, overrides] of Object.entries({ emptyAnalysis: { analysis: " " }, emptyCoverage: { coverage: "" },
  staleID: { attemptId: "old" }, wrongHash: { requestSha256: "wrong" }, missingFindings: { findings: null },
  malformedFinding: { findings: [{}] }, missingIncompleteReason: { completion: "INCOMPLETE" } })) {
  test(`rejects ${name} rather than counting completion`, (t) => {
    const { run } = fixture(t); const a = start(run);
    assert.throws(() => end(run, a, overrides)); assert.equal(closeout(run).review, "INCOMPLETE");
  });
}
test("blank-line INCOMPLETE JSON stays incomplete; Markdown sections and malformed text fail", (t) => {
  const { run } = fixture(t); const a = start(run);
  const raw = path.join(a.dir, "raw.txt");
  put(raw, "\n\n" + JSON.stringify(response(a, { completion: "INCOMPLETE", limitations: ["Missing caller source"] })));
  finish(run, a.attemptId, receipt(a), raw, 3000);
  assert.equal(closeout(run).review, "INCOMPLETE");
  const b = start(run, "b"); put(path.join(b.dir, "raw.txt"), "Reviewed base...head\n\nINCOMPLETE\n## Standards\n## Spec");
  assert.throws(() => finish(run, b.attemptId, receipt(b), path.join(b.dir, "raw.txt"), 3000), SyntaxError);
});
for (const outcome of ["failed", "cancelled", "unknown"]) {
  test(`${outcome} execution cannot accept plausible output`, (t) => {
    const { run } = fixture(t); const a = start(run); end(run, a, {}, { outcome, transient: true });
    assert.equal(closeout(run).review, "INCOMPLETE");
    assert.throws(() => end(run, a), /EEXIST/);
    if (outcome === "unknown") assert.throws(() => prepare(run, "a", "discovery", undefined, 4000), /Unknown cancellation/);
  });
}
test("interrupted retry preserves peer inputs, cannot reuse old output and cannot overlap active attempt", (t) => {
  const { run } = fixture(t); const a = start(run); const b = start(run, "b");
  const before = read(path.join(b.dir, "request.md"));
  assert.throws(() => prepare(run, "a", "discovery", undefined, 2500), /missing terminal evidence/);
  end(run, a, {}, { outcome: "cancelled", transient: true });
  const retry = start(run, "a", "discovery", undefined, 4000);
  assert.notEqual(retry.dir, a.dir); assert.equal(read(path.join(b.dir, "request.md")), before);
  assert.throws(() => finish(run, retry.attemptId, receipt(retry, {}, 5000), path.join(a.dir, "raw.txt"), 5000), /Mismatched attemptId/);
  end(run, b); assert.equal(closeout(run).review, "INCOMPLETE");
});
test("a successful retry supersedes only its own terminal transient failure", (t) => {
  const { run } = fixture(t); const a = start(run); end(run, a, {}, { outcome: "failed", transient: true });
  end(run, start(run, "a", "discovery", undefined, 4000), {}, {}, 5000);
  end(run, start(run, "b")); assert.equal(closeout(run).review, "COMPLETE");
});
test("one retry per expert across phases; no retries for access denial", (t) => {
  const { run, root } = fixture(t); const a = start(run); end(run, a, {}, { outcome: "failed", transient: true });
  end(run, start(run, "a", "discovery", undefined, 4000), {}, {}, 5000); end(run, start(run, "b"));
  const packet = path.join(root, "packet.md"); put(packet, "R1: exact claim and discriminating evidence");
  const c = start(run, "a", "challenge", packet, 6000); end(run, c, {}, { outcome: "failed", transient: true }, 7000);
  assert.throws(() => prepare(run, "a", "challenge", packet, 8000), /retry budget/);
  const d = start(run, "b", "challenge", packet, 6000); end(run, d, {}, { outcome: "failed", evidence: "Access denied" }, 7000);
  assert.throws(() => prepare(run, "b", "challenge", packet, 8000), /terminal transient/);
});
test("late reservations, dispatch and acceptance are distinct rejected operations", (t) => {
  const { run } = fixture(t, { minutes: 1, callMinutes: 0.1 }); const a = start(run);
  assert.throws(() => end(run, a, {}, {}, a.deadline + 1), /Acceptance deadline/);
  const b = prepare(run, "b", "discovery", undefined, 9000);
  assert.throws(() => preflight(run, b.attemptId, b.deadline), /Dispatch deadline/);
  assert.throws(() => prepare(run, "b", "discovery", undefined, 61000), /budget exhausted/);
});
for (const changed of ["base", "review-head"]) test(`${changed} drift prevents current report and acceptance`, (t) => {
  const { run, repo, state } = fixture(t); const a = start(run);
  git(repo, "branch", "-f", changed, changed === "base" ? state.head : state.base);
  assert.equal(current(run), false); assert.throws(() => end(run, a), /stale/);
  assert.equal(closeout(run).currency, "stale");
});
for (const file of ["_diff.patch", "contract.md", "_discovery.md"]) test(`${file} drift invalidates inputs`, (t) => {
  const { run } = fixture(t); const a = start(run); put(path.join(run, "inputs", file), "changed");
  assert.throws(() => end(run, a), /snapshot changed/);
});
test("source changes do not rewrite snapshot; accepted receipts detect drift", (t) => {
  const { run, source } = fixture(t); put(path.join(source, "contract.md"), "source changed");
  const [a] = discoveries(run); put(path.join(a.dir, "transport.json"), "{}");
  assert.throws(() => closeout(run), /Accepted response changed/);
});
test("partial artifact writes and missing attempt manifests fail closed", (t) => {
  const { run } = fixture(t); const a = start(run); put(path.join(a.dir, "response.txt"), "partial");
  assert.throws(() => closeout(run), /Partial acceptance/);
  rmSync(path.join(a.dir, "response.txt")); rmSync(path.join(a.dir, "attempt.json"));
  assert.throws(() => closeout(run), /ENOENT/);
});
test("advisory findings stop; evidenced behavioral findings block outside changed lines; rejection is retained", (t) => {
  const { run } = fixture(t); const [a] = discoveries(run, finding);
  assert.equal(closeout(run).review, "INCOMPLETE");
  const blocked = closeout(run, adjudicate(a)); assert.equal(blocked.review, "COMPLETE"); assert.deepEqual(blocked.blocking, ["R1"]);
  const advisory = closeout(run, adjudicate(a, { impact: "advisory", disposition: "advisory" }));
  assert.equal(advisory.review, "COMPLETE"); assert.deepEqual(advisory.blocking, []);
  assert.equal(closeout(run, adjudicate(a, { disposition: "rejected", reason: "Source proof disproves causality" })).adjudication[0].disposition, "rejected");
});
test("follow-ups require completed discovery and identical focused packets", (t) => {
  const { run, root } = fixture(t); const packet = path.join(root, "packet.md"); put(packet, "R1 evidence");
  assert.throws(() => prepare(run, "a", "challenge", packet, 2000), /discoveries/);
  discoveries(run); start(run, "a", "challenge", packet, 4000); put(packet, "Different evidence");
  assert.throws(() => prepare(run, "b", "challenge", packet, 4000), /Phase inputs changed/);
  assert.throws(() => prepare(run, "a", "verification", packet, 4000), /Repair mode/);
});
test("repair captures staged and unstaged binary edits; detects subsequent deletion drift", (t) => {
  const { run, repo, root } = fixture(t, { mode: "repair" }); const [a] = discoveries(run, finding);
  const packet = path.join(root, "packet.md"); put(packet, "R1 repaired; focused check now passes");
  put(path.join(repo, "value.txt"), "staged\n"); git(repo, "add", "value.txt");
  put(path.join(repo, "value.txt"), "unstaged\0binary\n");
  const v = start(run, "a", "verification", packet, 4000);
  assert.match(read(path.join(v.dir, "context.md")), /GIT binary patch/); end(run, v, {}, {}, 5000);
  end(run, start(run, "b", "verification", packet, 4000), {}, {}, 5000);
  assert.equal(closeout(run, adjudicate(a, { disposition: "fixed" })).currency, "current-overlay");
  rmSync(path.join(repo, "value.txt")); assert.equal(closeout(run, adjudicate(a)).currency, "stale");
});
test("untracked repair files are rejected, never omitted", (t) => {
  const { run, repo, root } = fixture(t, { mode: "repair" }); discoveries(run);
  const packet = path.join(root, "packet.md"); put(packet, "R1 repaired"); put(path.join(repo, "new-test.mjs"), "new");
  assert.throws(() => prepare(run, "a", "verification", packet, 4000), /Untracked repair/);
});
test("both skills execute from detached plugin copies and external skill-directory symlinks", (t) => {
  const { root, options } = fixture(t); const plugin = path.join(root, "plugin");
  const original = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  mkdirSync(plugin); for (const dir of ["skills", "lib", ".claude-plugin"]) cpSync(path.join(original, dir), path.join(plugin, dir), { recursive: true });
  for (const name of ["cross-design", "cross-review"]) {
    const linked = path.join(root, name); symlinkSync(path.join(plugin, "skills", name), linked);
    for (const entry of [path.join(plugin, "skills", name), linked]) {
      const source = path.join(root, `${name}-${entry === linked ? "linked" : "copy"}-source`); mkdirSync(source);
      put(path.join(source, name === "cross-design" ? "brief.md" : "contract.md"), "A scoped decision or review.");
      const config = path.join(source, "../config.json"); put(config, { ...options, source });
      const run = source + "-run";
      execFileSync(process.execPath, [path.join(entry, "scripts/protocol.mjs"), "init", run, config], { cwd: root });
      const a = JSON.parse(execFileSync(process.execPath, [path.join(entry, "scripts/protocol.mjs"), "prepare", run, "a", name === "cross-design" ? "proposal" : "discovery"], { cwd: root, encoding: "utf8" }));
      assert.match(read(path.join(a.dir, "request.md")), /Response envelope|Return one JSON/);
    }
  }
});
for (const file of ["request.md", "context.md"]) test(`${file} changes cannot be accepted`, (t) => {
  const { run } = fixture(t); const a = start(run); put(path.join(a.dir, file), "new instructions");
  assert.throws(() => end(run, a), /changed/);
});
test("run metadata changes cannot extend the original budget", (t) => {
  const { run } = fixture(t); const file = path.join(run, "run.json");
  const state = JSON.parse(read(file)); state.deadline += 100000; put(file, state);
  assert.throws(() => prepare(run, "a", "discovery", undefined, 2000), /metadata changed/);
});
test("transport receipts must match the launched handle and binding", (t) => {
  const { run } = fixture(t); const a = start(run);
  assert.throws(() => end(run, a, {}, { handle: "old-handle" }), /transport identity/);
  assert.throws(() => end(run, a, {}, { binding: experts[1] }), /transport identity/);
  assert.throws(() => end(run, a, {}, { observedAt: 999999 }), /observation time/);
});
test("edited accepted responses fail closeout and cannot be replaced by another finish", (t) => {
  const { run } = fixture(t); const [a] = discoveries(run);
  put(path.join(a.dir, "response.txt"), JSON.stringify(response(a, { analysis: "Edited later" })));
  assert.throws(() => closeout(run), /Accepted response changed/);
  assert.throws(() => end(run, a), /EEXIST/);
});
test("tracked deletion is captured as a distinct repair overlay", (t) => {
  const { run, repo, root } = fixture(t, { mode: "repair" }); discoveries(run);
  rmSync(path.join(repo, "value.txt")); const packet = path.join(root, "packet.md"); put(packet, "Remove tracked obsolete value");
  const a = start(run, "a", "verification", packet, 4000);
  assert.match(read(path.join(a.dir, "context.md")), /deleted file mode/);
  end(run, a, {}, {}, 5000);
});
test("fixed disposition cannot bypass focused verification", (t) => {
  const { run } = fixture(t, { mode: "repair" }); const [a] = discoveries(run, finding);
  assert.throws(() => closeout(run, adjudicate(a, { disposition: "fixed" })), /both focused/);
});
test("helper can be imported from a stdin module without invoking its CLI", () => {
  const script = new URL("./protocol.mjs", import.meta.url).href;
  assert.equal(execFileSync(process.execPath, ["--input-type=module", "-"], {
    input: `import { init } from ${JSON.stringify(script)}; console.log(typeof init);`, encoding: "utf8",
  }).trim(), "function");
});
test("full review call cap includes retries and targeted follow-ups", (t) => {
  const { run, root } = fixture(t); const packet = path.join(root, "packet.md"); put(packet, "R1 discriminating evidence");
  for (const e of experts) {
    const a = start(run, e.id); end(run, a, {}, { outcome: "failed", transient: true });
    end(run, start(run, e.id, "discovery", undefined, 4000), {}, {}, 5000);
  }
  for (const e of experts) end(run, start(run, e.id, "challenge", packet, 6000), {}, {}, 7000);
  assert.equal(closeout(run).calls, 6);
  assert.throws(() => prepare(run, "a", "challenge", packet, 8000), /budget exhausted/);
});
test("successful execution and completed review are independent dimensions", (t) => {
  const { run } = fixture(t);
  end(run, start(run, "a"), { completion: "INCOMPLETE", limitations: ["Missing required evidence"] });
  end(run, start(run, "b"));
  const report = closeout(run);
  assert.equal(report.runtime, "COMPLETE"); assert.equal(report.review, "INCOMPLETE");
});

test("Claude/Codex selection requires one exact binding from each provider", (t) => {
  const { root, options } = fixture(t);
  const anthropic = { id: "a", provider: "anthropic", harness: "claude-code", model: "claude-model" };
  const openai = { id: "b", provider: "openai", harness: "codex", model: "openai-model" };
  const config = { ...options, transport: "claude-codex" };
  const run = path.join(root, "paired");
  assert.throws(() => init(run, { ...config, experts: [anthropic, { ...anthropic, id: "b", model: "other" }] }),
    /one Anthropic and one OpenAI/);
  assert.deepEqual(init(run, { ...config, experts: [anthropic, openai] }).experts, [anthropic, openai]);
});

test("a lost challenge supervisor blocks another phase for that expert", (t) => {
  const { run, root } = fixture(t, { mode: "repair" });
  discoveries(run);
  const packet = path.join(root, "packet.md");
  put(packet, "Review one focused claim.");
  start(run, "a", "challenge", packet, 4000);
  assert.throws(() => prepare(run, "a", "verification", packet, 5000), /missing terminal evidence/);
  assert.equal(prepare(run, "b", "challenge", packet, 5000).expert, "b");
});

test("init refuses a snapshot missing a cited repo file or a standards file", (t) => {
  const { root, repo } = fixture(t);
  const source = path.join(root, "source2");
  mkdirSync(source);
  mkdirSync(path.join(repo, "lib"));
  put(path.join(repo, "lib", "caller.mjs"), "x\n"); put(path.join(repo, "CONTRIBUTING.md"), "rules\n");
  git(repo, "add", "."); git(repo, "commit", "-qm", "more"); git(repo, "branch", "-f", "review-head");
  put(path.join(source, "contract.md"), "Keep `lib/caller.mjs:3` working; `value.txt` changes; `npm test` runs.");
  const config = { repo, source, base: "base", head: "review-head", experts };
  assert.throws(() => init(path.join(root, "r1"), config),
    /Copy into the source directory: CONTRIBUTING\.md, lib\/caller\.mjs, value\.txt/);
  put(path.join(source, "CONTRIBUTING.md"), "rules\n");
  mkdirSync(path.join(source, "lib")); put(path.join(source, "lib", "caller.mjs"), "x\n");
  put(path.join(source, "value.txt"), "new\n");
  assert.equal(init(path.join(root, "r2"), config).head, git(repo, "rev-parse", "review-head"));
});

test("missingFromSnapshot matches by basename and ignores paths the repo lacks", (t) => {
  const { repo } = fixture(t);
  assert.deepEqual(missingFromSnapshot(repo, "review-head", "`value.txt` and `nope.md`", ["head/value.txt"]), []);
  assert.deepEqual(missingFromSnapshot(repo, "review-head", "`value.txt`", ["contract.md"]), ["value.txt"]);
});
