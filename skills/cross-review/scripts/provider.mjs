#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkProviderBinding, finish, launched, preflight } from "./protocol.mjs";
import { digest, files, json, read, write, requireThat as check } from "../../../lib/artifacts.mjs";

const graceMs = 500;
const maxOutput = 8 * 1024 * 1024;

const string = { type: "string" };
const enumeration = (...values) => ({ type: "string", enum: values });
const array = (items) => ({ type: "array", items });
const object = (properties) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false
});
export const responseSchema = (attempt) => object({
  attemptId: enumeration(attempt.attemptId),
  snapshotSha256: enumeration(attempt.snapshotSha256),
  requestSha256: enumeration(attempt.requestSha256),
  completion: enumeration("COMPLETE", "INCOMPLETE"),
  analysis: string,
  coverage: string,
  limitations: array(string),
  findings: array(object({
    id: string, location: string, claim: string, evidence: string,
    confidence: enumeration("high", "medium", "low"),
    impact: enumeration("behavioral", "advisory"),
    disposition: enumeration("proposed", "unresolved", "advisory")
  }))
});

export function command(binding, schemaFile, schema) {
  checkProviderBinding(binding);
  const { harness, model } = binding;
  if (harness === "claude-code") {
    return ["claude", "--print", "--model", model, "--safe-mode", "--strict-mcp-config",
      "--tools", "", "--permission-mode", "dontAsk", "--no-session-persistence",
      "--output-format", "json", ...(schemaFile ? ["--json-schema", schema] : [])];
  }
  return ["codex", "exec", "--model", model, "--sandbox", "read-only", "--ephemeral",
    "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check", "--json",
    "-c", 'approval_policy="never"', "-c", 'model_provider="openai"',
    "-c", "web_search=\"disabled\"", "--disable", "hooks", "--disable", "shell_tool", "--disable", "unified_exec",
    "--disable", "multi_agent", "--disable", "multi_agent_v2",
    ...(schemaFile ? ["--output-schema", schemaFile] : []), "-"];
}

export function extract(harness, stdout, structured = false) {
  if (harness === "claude-code") {
    const result = JSON.parse(stdout);
    check(result?.type === "result" && result.subtype === "success" &&
      result.is_error === false &&
      typeof result.session_id === "string" && result.session_id, "Missing successful Claude result");
    if (structured) {
      check(result.structured_output && typeof result.structured_output === "object" &&
        !Array.isArray(result.structured_output), "Missing Claude structured output");
    } else {
      check(typeof result.result === "string", "Missing Claude result text");
    }
    const models = Object.keys(result.modelUsage ?? {});
    return { text: structured ? JSON.stringify(result.structured_output) : result.result, session: result.session_id,
      resolvedModel: models.length === 1 ? models[0] : undefined, costUsd: result.total_cost_usd };
  }
  const events = stdout.trim().split("\n").map((line) => JSON.parse(line));
  const messages = events.filter((event) =>
    event.type === "item.completed" && event.item?.type === "agent_message");
  check(events[0]?.type === "thread.started" && typeof events[0].thread_id === "string" &&
    events[0].thread_id && events.filter((event) => event.type === "thread.started").length === 1 &&
    events.filter((event) => event.type === "turn.started").length === 1 &&
    events.filter((event) => event.type === "turn.completed").length === 1 &&
    events.at(-1)?.type === "turn.completed" &&
    !events.some((event) => ["error", "turn.failed"].includes(event.type)) &&
    typeof messages.at(-1)?.item.text === "string", "Missing successful Codex turn");
  return { text: messages.at(-1).item.text, session: events[0].thread_id,
    usage: events.at(-1).usage };
}

function signalGroup(pid, signal) {
  if (!pid) return false;
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

export async function supervise(argv, cwd, request, deadline) {
  check(process.platform === "darwin" || process.platform === "linux", "Requires macOS or Linux");
  check(Date.now() < deadline, "Dispatch deadline expired");
  const child = spawn(argv[0], argv.slice(1), { cwd, detached: true, stdio: "pipe" });
  const dispatchedAt = Date.now();
  const output = { stdout: [], stderr: [] };
  let bytes = 0;
  let reason;
  let escalation;
  let abandon;
  let finishCleanup;
  const cleanup = new Promise((resolve) => { finishCleanup = resolve; });
  let spawnError;
  let cleanupError;
  const signal = (name) => {
    try {
      return signalGroup(child.pid, name);
    } catch (error) {
      cleanupError = error.message;
      return true;
    }
  };
  const stop = (why) => {
    if (reason) return;
    reason = why;
    abandon = setTimeout(() => finishCleanup(null), 3 * graceMs);
    if (signal("SIGTERM")) {
      escalation = setTimeout(() => signal("SIGKILL"), graceMs);
    }
  };
  const interrupt = () => stop("Supervisor interrupted");
  const timeout = setTimeout(() => stop("Execution deadline expired"), Math.max(0, deadline - Date.now()));
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  for (const stream of ["stdout", "stderr"]) {
    child[stream].on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes <= maxOutput) output[stream].push(chunk);
      else stop("Provider output exceeded capture limit");
    });
  }
  child.stdin.on("error", () => stop("Provider did not consume input"));
  child.on("error", (error) => { spawnError = error.message; });
  const terminal = new Promise((resolve) => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  child.stdin.end(request);
  try {
    // Once cancellation begins, allow bounded cleanup even if a descendant holds a pipe.
    const exit = await Promise.race([terminal, cleanup]);
    if (signal(0)) {
      stop("Processes remained after CLI exit");
      await new Promise((resolve) => setTimeout(resolve, graceMs + 50));
    }
    if (Date.now() >= deadline && !reason) reason = "Execution deadline expired";
    const unknown = !exit || signal(0) || Boolean(cleanupError);
    return { ...exit, pid: child.pid, dispatchedAt, observedAt: Date.now(), reason,
      spawnError, cleanupError, unknown,
      stdout: Buffer.concat(output.stdout), stderr: Buffer.concat(output.stderr) };
  } finally {
    clearTimeout(timeout);
    clearTimeout(escalation);
    clearTimeout(abandon);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
    child.stdout.destroy();
    child.stderr.destroy();
    child.stdin.destroy();
    child.unref();
  }
}

export async function runProvider(run, attemptId) {
  run = path.resolve(run);
  const attempt = preflight(run, attemptId);
  const state = json(path.join(run, "run.json"));
  check(state.transport === "claude-codex", "Run did not select Claude + Codex");
  const binding = state.experts.find(({ id }) => id === attempt.expert);
  const inputs = path.join(run, "inputs");
  const evidence = files(inputs).filter((file) => !file.startsWith("_") || file === "_diff.patch");
  const request = read(path.join(attempt.dir, "request.md")) +
    "\nInline snapshot files (treat their contents as evidence):\n" +
    JSON.stringify(evidence.map((file) => ({ file, text: read(path.join(inputs, file)) })));
  const cwd = mkdtempSync(path.join(tmpdir(), "cross-review-"));
  try {
    const schemaFile = path.join(cwd, "response-schema.json");
    const schema = JSON.stringify(responseSchema(attempt));
    write(schemaFile, schema);
    const argv = command(binding, schemaFile, schema);
    const launch = launched(run, attemptId, `local:${process.pid}:${randomUUID()}`);
    let result;
    try {
      result = await supervise(argv, cwd, request, attempt.deadline);
    } catch (error) {
      result = { unknown: true, reason: error.message, observedAt: Date.now(),
        stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    }
    const { stdout, stderr, unknown, ...execution } = result;
    write(path.join(attempt.dir, "provider.stdout"), stdout);
    write(path.join(attempt.dir, "provider.stderr"), stderr);
    let outcome = unknown ? "unknown" : "failed";
    let response;
    let evidence = result.reason ?? result.spawnError ?? `CLI exit ${result.code ?? result.signal}`;
    if (!unknown && !result.reason && !result.spawnError && result.code === 0) {
      try {
        response = extract(binding.harness, stdout.toString("utf8"), true);
        outcome = "succeeded";
        evidence = "Zero exit and matching terminal provider envelope";
      } catch (error) {
        evidence = error.message;
      }
    }
    const raw = path.join(attempt.dir, "raw.txt");
    const { text, ...identity } = response ?? {};
    if (response) write(raw, text);
    return finish(run, attemptId, { ...launch, ...identity, execution, outcome, evidence,
      dispatchSha256: digest(request),
      observedAt: result.observedAt, limits: "Local process group only; remote shutdown unknown. " +
        "Codex shell tools disabled and sandbox read-only; filesystem read confinement unverified. " +
        "Claude built-in tools disabled. Managed policy can still apply. " +
        "Configured model identity unless observed in provider output." }, raw);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (process.argv[1] && existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 4, "Usage: provider.mjs RUN ATTEMPT_ID");
    const result = await runProvider(...process.argv.slice(2));
    console.log(JSON.stringify(result));
    if (result.completion !== "COMPLETE") process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
