import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { command, extract, supervise } from "./provider.mjs";

const executable = process.execPath;
const claude = { provider: "anthropic", harness: "claude-code", model: "claude-model" };
const codex = { provider: "openai", harness: "codex", model: "openai-model" };
const supported = ["darwin", "linux"].includes(process.platform);
const validEvents = [
  { type: "thread.started", thread_id: "test-thread" },
  { type: "turn.started" },
  { type: "item.completed", item: { type: "agent_message", text: "result" } },
  { type: "turn.completed", usage: { input_tokens: 42 } }
];
const jsonl = (events) => events.map((event) => JSON.stringify(event)).join("\n");

test("provider commands preserve exact model and reject mismatched bindings", () => {
  for (const binding of [claude, codex]) {
    const argv = command(binding);
    assert.equal(argv[argv.indexOf("--model") + 1], binding.model);
  }
  assert.throws(() => command({ ...claude, provider: "openai" }), /Invalid Claude\/Codex binding/);
  assert.throws(() => command({ ...codex, model: "--oss" }), /explicit provider model/);
});

test("Claude requires a successful terminal result with session identity", () => {
  const result = { type: "result", subtype: "success", is_error: false,
    session_id: "session", result: "review", modelUsage: { "resolved-model": {} } };
  assert.equal(extract(claude.harness, JSON.stringify(result)).resolvedModel, "resolved-model");
  assert.throws(() => extract(claude.harness, JSON.stringify({ ...result, is_error: true })), /successful/);
  assert.throws(() => extract(claude.harness, '{ "result": "review"'), SyntaxError);
});

test("Codex rejects partial output, provider errors and duplicate turn identity", () => {
  assert.equal(extract(codex.harness, jsonl(validEvents)).text, "result");
  assert.throws(() => extract(codex.harness, jsonl(validEvents.slice(0, 3))), /successful/);
  assert.throws(() => extract(codex.harness, jsonl([
    ...validEvents.slice(0, 3), { type: "error" }, validEvents[3]
  ])), /successful/);
  assert.throws(() => extract(codex.harness, jsonl([validEvents[0], ...validEvents])), /successful/);
});

test("expired dispatch never starts the program", { skip: !supported }, async () => {
  await assert.rejects(supervise([executable, "-e", "process.abort()"], tmpdir(), "",
    Date.now() - 1), /Dispatch deadline expired/);
});

test("supervisor records actual exit and keeps output streams separate", { skip: !supported }, async () => {
  const result = await supervise([executable, "-e",
    "process.stdin.pipe(process.stdout); console.error('diagnostic'); process.exitCode = 7;"],
  tmpdir(), "response", Date.now() + 5000);
  assert.equal(result.code, 7);
  assert.equal(result.unknown, false);
  assert.equal(result.stdout.toString(), "response");
  assert.equal(result.stderr.toString().trim(), "diagnostic");
});

test("deadline kills a TERM-resistant CLI", { skip: !supported }, async () => {
  const result = await supervise([executable, "-e",
    "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
  tmpdir(), "", Date.now() + 900);
  assert.equal(result.reason, "Execution deadline expired");
  assert.equal(result.signal, "SIGKILL");
  assert.equal(result.unknown, false);
  assert.throws(() => process.kill(-result.pid, 0), { code: "ESRCH" });
});

test("interrupting a separate supervisor stops its local group", { skip: !supported }, async (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "review-interrupt-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const ready = path.join(cwd, "ready");
  const model = `require('node:fs').writeFileSync(${JSON.stringify(ready)}, String(process.pid)); setInterval(()=>{}, 1000)`;
  const script = `import { supervise } from ${JSON.stringify(new URL("./provider.mjs", import.meta.url).href)};
  const result = await supervise([process.execPath, "-e", ${JSON.stringify(model)}], process.cwd(), "", Date.now() + 4000);
  console.log(JSON.stringify({ unknown: result.unknown, reason: result.reason }));`;
  const supervisor = spawn(executable, ["--input-type=module", "-e", script], { cwd });
  const done = new Promise((resolve) => supervisor.once("close", resolve));
  let output = "";
  supervisor.stdout.setEncoding("utf8").on("data", (data) => { output += data; });
  for (let attempt = 0; attempt < 100 && !existsSync(ready); attempt++) await delay(20);
  assert.ok(existsSync(ready));
  const childPid = Number(readFileSync(ready, "utf8"));
  supervisor.kill("SIGTERM");
  assert.equal(await done, 0);
  assert.deepEqual(JSON.parse(output), { unknown: false, reason: "Supervisor interrupted" });
  assert.throws(() => process.kill(-childPid, 0), { code: "ESRCH" });
});

test("deadline reaches a descendant in the CLI process group", { skip: !supported }, async () => {
  const script = `
    const { spawn } = require("node:child_process");
    const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"]);
    process.on("SIGTERM", () => {});
    worker.on("spawn", () => console.log(worker.pid));
    worker.on("exit", (_, signal) => console.log(signal));
  `;
  const result = await supervise([executable, "-e", script], tmpdir(), "", Date.now() + 900);
  const [pid, signal] = result.stdout.toString().trim().split("\n");
  assert.equal(result.reason, "Execution deadline expired");
  assert.equal(signal, "SIGTERM");
  assert.equal(result.unknown, false);
  assert.throws(() => process.kill(Number(pid), 0), { code: "ESRCH" });
});
