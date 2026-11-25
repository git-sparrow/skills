#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digest, read, json, write, writeJson, requireThat as check, files, hashes } from "../../../lib/artifacts.mjs";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phases = ["discovery", "challenge", "verification"];
const nonempty = (x) => typeof x === "string" && x.trim().length > 0;
const strings = (x) => Array.isArray(x) && x.every(nonempty);
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const resolve = (repo, ref) => git(repo, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).trim();
const diffArgs = ["diff", "--no-ext-diff", "--no-textconv", "--binary", "--no-color", "--no-renames"];
const patch = (repo, base, head) => git(repo, ...diffArgs, base, ...(head === undefined ? [] : [head]), "--");
const untracked = (repo) => git(repo, "ls-files", "--others", "--exclude-standard");
const status = (repo) => git(repo, "status", "--porcelain", "--untracked-files=all");
const bindingFor = (state, expert) => state.experts.find((x) => x.id === expert);
const identityKeys = ["attemptId", "snapshotSha256", "requestSha256"];

function load(run) {
  const state = json(path.join(run, "run.json"));
  check(digest(JSON.stringify(hashes(path.join(run, "inputs")))) === state.snapshotSha256,
    "Input snapshot changed");
  const { snapshotSha256, ...metadata } = state;
  check(JSON.stringify(metadata) === JSON.stringify(json(path.join(run, "inputs", "_review.json"))),
    "Run metadata changed");
  return state;
}

function attempts(run, attemptId) {
  return readdirSync(path.join(run, "attempts")).sort()
    .filter((name) => attemptId === undefined || name === attemptId).map((name) => {
    const dir = path.join(run, "attempts", name);
    const a = { ...json(path.join(dir, "attempt.json")), dir };
    check(!existsSync(path.join(dir, "response.txt")) || existsSync(path.join(dir, "result.json")),
      "Partial acceptance; preserve run as incomplete");
    return a;
  });
}

function integrity(a) {
  check(digest(read(path.join(a.dir, "request.md"))) === a.requestFileSha256, "Request changed");
  check(digest(read(path.join(a.dir, "context.md"))) === a.requestSha256, "Context changed");
}

function accepted(a) {
  integrity(a);
  const raw = read(path.join(a.dir, "response.txt"));
  const result = json(path.join(a.dir, "result.json"));
  check(JSON.stringify(result) === JSON.stringify({ ...JSON.parse(raw), responseSha256: digest(raw),
    transportSha256: digest(read(path.join(a.dir, "transport.json"))) }),
    "Accepted response changed");
  check(digest(read(path.join(a.dir, "transport.json"))) === result.transportSha256,
    "Transport receipt changed");
  return result;
}

function results(prior) {
  return prior.filter((a) => existsSync(path.join(a.dir, "result.json")))
    .map((a) => ({ attempt: a, response: accepted(a) }));
}

const providerHarnesses = new Map([["anthropic", "claude-code"], ["openai", "codex"]]);

export function checkProviderBinding(binding) {
  check(providerHarnesses.has(binding.provider) &&
    providerHarnesses.get(binding.provider) === binding.harness, "Invalid Claude/Codex binding");
  check(typeof binding.model === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(binding.model),
    "Set an explicit provider model ID");
}

export function init(run, config, now = Date.now()) {
  const { source, experts, mode = "review", minutes = 30, callMinutes = 10, transport = "native" } = config;
  check(["review", "repair"].includes(mode), "Invalid mode");
  check(Array.isArray(experts) && experts.length === 2, "Select two experts");
  for (const e of experts) {
    check(/^[a-z][a-z0-9-]*$/.test(e.id), "Invalid expert id");
    for (const k of ["model", "provider", "harness"]) check(nonempty(e[k]), `Missing ${k}`);
  }
  check(experts[0].id !== experts[1].id &&
    (experts[0].model !== experts[1].model || experts[0].provider !== experts[1].provider),
  "Select distinct expert/model bindings");
  check(["native", "claude-codex"].includes(transport), "Invalid transport");
  if (transport === "claude-codex") {
    experts.forEach(checkProviderBinding);
    check(experts[0].provider !== experts[1].provider, "Select one Anthropic and one OpenAI expert");
  }
  check(Number.isFinite(minutes) && minutes > 0 && minutes <= 30 &&
    Number.isFinite(callMinutes) && callMinutes > 0 && callMinutes <= 10, "Invalid budget");
  const repo = realpathSync(config.repo);
  const target = path.resolve(run);
  const input = realpathSync(source);
  check(target !== repo && !target.startsWith(repo + path.sep) && target !== input &&
    !target.startsWith(input + path.sep), "Run must be outside repository and source");
  check(status(repo) === "", "Initial repository must be clean");
  check(nonempty(config.base) && nonempty(config.head), "Missing revision selectors");
  const base = resolve(repo, config.base), head = resolve(repo, config.head);
  check(nonempty(read(path.join(input, "contract.md"))), "Empty scoped contract");
  const sourceFiles = files(input);
  check(sourceFiles.every((f) => !f.startsWith("_")), "Reserved input name");
  mkdirSync(target);
  mkdirSync(path.join(target, "inputs"));
  mkdirSync(path.join(target, "attempts"));
  for (const file of sourceFiles) {
    const dest = path.join(target, "inputs", file);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(path.join(input, file), dest);
  }
  for (const phase of phases) copyFileSync(path.join(skill, `${phase}.md`),
    path.join(target, "inputs", `_${phase}.md`));
  const diff = patch(repo, base, head);
  write(path.join(target, "inputs", "_diff.patch"), diff);
  const state = { repo, base, head, baseSelector: config.base, headSelector: config.head,
    diffArgs, diffSha256: digest(diff), experts, mode, transport, startedAt: now,
    deadline: now + minutes * 60_000, callMs: callMinutes * 60_000,
    maxCalls: mode === "repair" ? 8 : 6 };
  writeJson(path.join(target, "inputs", "_review.json"), state);
  state.snapshotSha256 = digest(JSON.stringify(hashes(path.join(target, "inputs"))));
  writeJson(path.join(target, "run.json"), state);
  return state;
}

export function current(run) {
  const s = load(run);
  return resolve(s.repo, s.baseSelector) === s.base && resolve(s.repo, s.headSelector) === s.head &&
    digest(patch(s.repo, s.base, s.head)) === s.diffSha256;
}

function overlay(state) {
  check(untracked(state.repo) === "", "Untracked repair files are unsupported");
  return patch(state.repo, state.head, undefined);
}

function revisionCheck(run, state, a) {
  check(current(run), "Base or head changed; report is stale");
  if (a.phase === "verification") {
    check(digest(overlay(state)) === a.overlaySha256, "Repair overlay changed");
  } else check(status(state.repo) === "", "Working tree changed during review");
}

export function prepare(run, expert, phase = "discovery", packetFile, now = Date.now()) {
  const s = load(run), prior = attempts(run);
  check(bindingFor(s, expert), "Unknown expert");
  check(phases.includes(phase), "Unknown phase");
  check(phase !== "verification" || s.mode === "repair", "Repair mode required");
  check(now < s.deadline && prior.length < s.maxCalls, "Run budget exhausted");
  check(current(run), "Base or head changed; report is stale");
  results(prior);
  const same = prior.filter((a) => a.expert === expert && a.phase === phase);
  check(same.length < 2, "Only one retry allowed");
  check(!prior.some((a) => {
    if (a.expert !== expert) return false;
    const receipt = path.join(a.dir, "transport.json");
    if (existsSync(receipt)) return json(receipt).outcome === "unknown";
    return existsSync(path.join(a.dir, "launch.json"));
  }), "Unknown cancellation or missing terminal evidence; no further calls for expert");
  if (same.length) {
    const f = path.join(same[0].dir, "failure.json");
    check(existsSync(f) && json(f).transient === true, "No terminal transient failure to retry");
    check(!prior.some((a) => a.expert === expert && a.retry), "Expert retry budget exhausted");
  }
  if (phase !== "discovery") {
    for (const e of s.experts) check(results(prior).some(({ attempt: a, response: r }) =>
      a.expert === e.id && a.phase === "discovery" && r.completion === "COMPLETE"),
    "Both completed discoveries required");
  }
  check(phase === "discovery" ? !packetFile : Boolean(packetFile), "Follow-up requires focused packet only");
  const packet = packetFile ? read(packetFile) : "";
  check(!packetFile || nonempty(packet), "Empty focused packet");
  const repair = phase === "verification" ? overlay(s) : "";
  if (phase !== "verification") check(status(s.repo) === "", "Working tree changed during review");
  const context = `${read(path.join(run, "inputs", `_${phase}.md`))}\n\n` +
    `Snapshot: ${path.resolve(run, "inputs")}\nRepository: ${s.repo}\nBase: ${s.base}\nHead: ${s.head}\n` +
    (s.transport === "claude-codex"
      ? "Read every inline snapshot input. Review only the supplied bytes. Do not use tools or open local paths.\n"
      : "Read every snapshot input. Inspect source only at these pins with git show.\n") +
    `\nFocused packet:\n${packet}\n\nTracked repair overlay against head:\n${repair}`;
  const requestSha256 = digest(context);
  check(prior.filter((a) => a.phase === phase).every((a) => a.requestSha256 === requestSha256),
    "Phase inputs changed; no additional cycle allowed");
  const attemptId = `${expert}-${phase}-${randomUUID()}`;
  const dir = path.join(run, "attempts", attemptId);
  const a = { attemptId, expert, phase, retry: same.length === 1, snapshotSha256: s.snapshotSha256,
    requestSha256, overlaySha256: digest(repair), startedAt: now,
    deadline: Math.min(s.deadline, now + s.callMs) };
  const envelope = { ...Object.fromEntries(identityKeys.map((k) => [k, a[k]])),
    completion: "COMPLETE or INCOMPLETE", analysis: "Substantive reasoning", coverage: "What you examined",
    limitations: [], findings: [] };
  const request = context + "\n\nReturn one JSON object without fences; copy identities exactly:\n" +
    JSON.stringify(envelope, null, 2) + "\nFinding shape: {id, location, claim, evidence, confidence: high|medium|low, impact: behavioral|advisory, disposition: proposed|unresolved|advisory}. All other finding fields are nonempty strings.\n";
  a.requestFileSha256 = digest(request);
  mkdirSync(dir);
  write(path.join(dir, "context.md"), context);
  write(path.join(dir, "request.md"), request);
  writeJson(path.join(dir, "attempt.json"), a);
  return { ...a, dir };
}

export function preflight(run, attemptId, now = Date.now()) {
  const s = load(run), a = attempts(run, attemptId).find((x) => x.attemptId === attemptId);
  check(a, "Unknown attempt");
  integrity(a);
  check(now < a.deadline && now < s.deadline, "Dispatch deadline expired");
  check(!existsSync(path.join(a.dir, "launch.json")) && !existsSync(path.join(a.dir, "transport.json")),
    "Attempt already launched or finished");
  revisionCheck(run, s, a);
  return a;
}

export function launched(run, attemptId, handle, now = Date.now()) {
  const a = preflight(run, attemptId, now), s = load(run);
  check(nonempty(handle), "Missing execution handle");
  const receipt = { attemptId, handle, binding: bindingFor(s, a.expert), observedAt: now };
  writeJson(path.join(a.dir, "launch.json"), receipt);
  return receipt;
}

function validateResponse(r, a) {
  check(r && typeof r === "object" && !Array.isArray(r), "Response must be an object");
  for (const k of identityKeys) check(r[k] === a[k], `Mismatched ${k}`);
  check(["COMPLETE", "INCOMPLETE"].includes(r.completion), "Invalid completion");
  check(nonempty(r.analysis) && nonempty(r.coverage), "Empty reasoning or coverage");
  check(strings(r.limitations), "Invalid limitations");
  check(r.completion !== "INCOMPLETE" || r.limitations.length > 0, "Incomplete needs missing work");
  check(Array.isArray(r.findings), "Invalid findings");
  const ids = new Set();
  for (const f of r.findings) {
    check(f && ["id", "location", "claim", "evidence"].every((k) => nonempty(f[k])), "Malformed finding");
    check(!ids.has(f.id), "Duplicate finding ID"); ids.add(f.id);
    check(["high", "medium", "low"].includes(f.confidence) &&
      ["behavioral", "advisory"].includes(f.impact) &&
      ["proposed", "unresolved", "advisory"].includes(f.disposition), "Invalid finding dimensions");
  }
}

export function finish(run, attemptId, receipt, rawFile, now = Date.now()) {
  const s = load(run), a = attempts(run, attemptId).find((x) => x.attemptId === attemptId);
  check(a, "Unknown attempt");
  const launch = json(path.join(a.dir, "launch.json"));
  check(receipt.attemptId === attemptId && receipt.handle === launch.handle &&
    JSON.stringify(receipt.binding) === JSON.stringify(launch.binding), "Mismatched transport identity");
  check(["succeeded", "failed", "cancelled", "unknown"].includes(receipt.outcome), "Invalid terminal outcome");
  check(Number.isFinite(receipt.observedAt) && receipt.observedAt >= launch.observedAt &&
    receipt.observedAt <= now, "Invalid transport observation time");
  check(nonempty(receipt.evidence) && nonempty(receipt.limits), "Transport needs evidence and limits");
  writeJson(path.join(a.dir, "transport.json"), receipt);
  if (receipt.outcome !== "succeeded") {
    writeJson(path.join(a.dir, "failure.json"), { reason: receipt.evidence,
      transient: receipt.transient === true && ["failed", "cancelled"].includes(receipt.outcome) });
    return { completion: "INCOMPLETE", outcome: receipt.outcome };
  }
  try {
    check(now <= a.deadline && now <= s.deadline, "Acceptance deadline expired");
    integrity(a); revisionCheck(run, s, a);
    const raw = read(rawFile), r = JSON.parse(raw);
    validateResponse(r, a);
    // Keep the model's raw response unmodified; bind receipt in the separate result.
    write(path.join(a.dir, "response.txt"), raw);
    writeJson(path.join(a.dir, "result.json"), { ...r, responseSha256: digest(raw),
      transportSha256: digest(read(path.join(a.dir, "transport.json"))) });
    return r;
  } catch (error) {
    writeJson(path.join(a.dir, "rejection.json"), { reason: error.message });
    throw error;
  }
}

export function closeout(run, adjudication = []) {
  const s = load(run), prior = attempts(run), rs = results(prior);
  const findings = rs.flatMap(({ attempt: a, response: r }) => r.findings.map((f) =>
    ({ ...f, source: `${a.attemptId}/${f.id}` })));
  check(Array.isArray(adjudication), "Adjudication must be an array");
  const covered = new Set(), ids = new Set();
  for (const f of adjudication) {
    check(f && nonempty(f.id) && !ids.has(f.id), "Missing or duplicate canonical ID"); ids.add(f.id);
    check(strings(f.sources) && f.sources.length > 0 && new Set(f.sources).size === f.sources.length && f.sources.every((k) =>
      findings.some((x) => x.source === k) && !covered.has(k)), "Invalid finding sources");
    f.sources.forEach((k) => covered.add(k));
    check(["high", "medium", "low"].includes(f.confidence) && ["behavioral", "advisory"].includes(f.impact) &&
      ["confirmed", "unresolved", "advisory", "rejected", "fixed"].includes(f.disposition), "Invalid adjudication dimensions");
    check(nonempty(f.reason) && nonempty(f.evidence), "Adjudication needs reason and evidence");
    if (f.disposition === "fixed") check(s.mode === "repair" && s.experts.every((e) =>
      rs.some(({ attempt: a, response: r }) => a.expert === e.id && a.phase === "verification" && r.completion === "COMPLETE")),
    "Fixed requires both focused verifications");
  }
  const succeeded = prior.filter((a) => existsSync(path.join(a.dir, "transport.json")) &&
    json(path.join(a.dir, "transport.json")).outcome === "succeeded");
  const runtimeComplete = s.experts.every((e) => succeeded.some((a) =>
    a.expert === e.id && a.phase === "discovery")) && prior.every((a) =>
    succeeded.some((b) => b.expert === a.expert && b.phase === a.phase));
  const complete = s.experts.every((e) => rs.some(({ attempt: a, response: r }) =>
    a.expert === e.id && a.phase === "discovery" && r.completion === "COMPLETE")) &&
    prior.every((a) => rs.some(({ attempt: b, response: r }) => b.expert === a.expert &&
      b.phase === a.phase && r.completion === "COMPLETE")) && covered.size === findings.length;
  let currency = "stale";
  if (current(run)) {
    const verifications = prior.filter((a) => a.phase === "verification");
    currency = verifications.length ?
      (verifications.every((a) => digest(overlay(s)) === a.overlaySha256) ? "current-overlay" : "stale") :
      (status(s.repo) === "" ? "current" : "stale");
  }
  return { runtime: runtimeComplete ? "COMPLETE" : "INCOMPLETE", review: complete ? "COMPLETE" : "INCOMPLETE", currency,
    blocking: adjudication.filter((f) => f.impact === "behavioral" && f.disposition === "confirmed").map((f) => f.id),
    unresolved: adjudication.filter((f) => f.impact === "behavioral" && f.disposition === "unresolved").map((f) => f.id),
    findings, adjudication, calls: prior.length,
    readiness: "Coordinator must report scoped checks and limitations; completion is not merge approval" };
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const [command, run, ...args] = process.argv.slice(2);
    let result;
    if (command === "init") result = init(run, json(args[0]));
    else if (command === "prepare") result = prepare(run, ...args);
    else if (command === "preflight") result = preflight(run, args[0]);
    else if (command === "launched") result = launched(run, ...args);
    else if (command === "finish") result = finish(run, args[0], json(args[1]), args[2]);
    else if (command === "closeout") result = closeout(run, args[0] ? json(args[0]) : []);
    else throw new Error("Use init|prepare|preflight|launched|finish|closeout; see references/protocol.md");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
