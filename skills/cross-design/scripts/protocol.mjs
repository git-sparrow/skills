#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import {
  copyFileSync, existsSync, mkdirSync, readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { digest, read, json, write, writeJson, requireThat, files, hashes } from "../../../lib/artifacts.mjs";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phases = ["proposal", "challenge-1", "challenge-2"];

function loadRun(run) {
  const state = json(path.join(run, "run.json"));
  requireThat(
    digest(JSON.stringify(hashes(path.join(run, "inputs")))) === state.snapshotSha256,
    "Input snapshot changed; start a new consultation",
  );
  return state;
}

function attempts(run) {
  return readdirSync(path.join(run, "attempts")).sort().map((name) => {
    const dir = path.join(run, "attempts", name);
    return { ...json(path.join(dir, "attempt.json")), dir };
  });
}

function acceptedResponse(dir) {
  const raw = read(path.join(dir, "response.txt"));
  const result = json(path.join(dir, "result.json"));
  const expected = { ...JSON.parse(raw), responseSha256: digest(raw) };
  requireThat(JSON.stringify(result) === JSON.stringify(expected), "Accepted response changed");
  return result;
}

export function init(run, config, now = Date.now()) {
  const { source, experts, minutes = 30, callMinutes = 10 } = config;
  requireThat(Array.isArray(experts) && experts.length === 2, "Select two experts");
  for (const expert of experts) {
    requireThat(/^[a-z][a-z0-9-]*$/.test(expert.id), "Invalid expert id");
    for (const key of ["model", "provider", "harness"]) {
      requireThat(typeof expert[key] === "string" && expert[key].trim(), `Missing ${key}`);
    }
  }
  requireThat(experts[0].id !== experts[1].id, "Expert ids must differ");
  requireThat(
    experts[0].model !== experts[1].model || experts[0].provider !== experts[1].provider,
    "Select distinct model bindings",
  );
  for (const value of [minutes, callMinutes]) {
    requireThat(Number.isFinite(value) && value > 0, "Budget must be positive and finite");
  }
  requireThat(minutes <= 30 && callMinutes <= 10, "Budget exceeds the skill's default cap");
  const inputSource = realpathSync(source);
  const target = path.resolve(run);
  requireThat(!target.startsWith(`${inputSource}${path.sep}`), "Run must be outside inputs");
  requireThat(read(path.join(inputSource, "brief.md")).trim(), "brief.md is empty");
  const sourceFiles = files(inputSource);
  for (const name of ["_proposal.md", "_challenge.md"]) {
    requireThat(!sourceFiles.includes(name), `Reserved input name: ${name}`);
  }
  mkdirSync(target);
  mkdirSync(path.join(target, "inputs"));
  mkdirSync(path.join(target, "attempts"));
  for (const file of sourceFiles) {
    const dest = path.join(target, "inputs", file);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(path.join(inputSource, file), dest);
  }
  for (const name of ["proposal", "challenge"]) {
    copyFileSync(path.join(skill, `${name}.md`), path.join(target, "inputs", `_${name}.md`));
  }
  const inputs = hashes(path.join(target, "inputs"));
  const state = {
    experts, inputs, snapshotSha256: digest(JSON.stringify(inputs)),
    startedAt: now, deadline: now + minutes * 60_000, callMs: callMinutes * 60_000,
  };
  writeJson(path.join(target, "run.json"), state);
  return state;
}

export function prepare(run, expert, phase, candidate, evidence, now = Date.now()) {
  const state = loadRun(run);
  requireThat(state.experts.some((item) => item.id === expert), "Unknown expert");
  requireThat(phases.includes(phase), "Unknown phase");
  requireThat(now < state.deadline, "Consultation budget exhausted");
  const prior = attempts(run);
  const same = prior.filter((item) => item.expert === expert && item.phase === phase);
  requireThat(same.length < 2, "Only one retry is allowed");
  if (same.length) {
    const failed = path.join(same[0].dir, "failure.json");
    requireThat(existsSync(failed), "Record failure before retrying");
    requireThat(json(failed).retryable === true, "Failure is not transient");
    requireThat(!prior.some((item) => item.expert === expert && item.retry),
      "Expert retry budget exhausted");
  }
  const previousPhase = phases[phases.indexOf(phase) - 1];
  const responses = [];
  if (previousPhase) {
    for (const requiredPhase of phases.slice(0, phases.indexOf(phase))) {
      for (const binding of state.experts) {
        const accepted = prior.find((item) => item.expert === binding.id &&
          item.phase === requiredPhase && existsSync(path.join(item.dir, "result.json")));
        requireThat(accepted, `Missing ${requiredPhase} response from ${binding.id}`);
        responses.push({ expert: binding.id, phase: requiredPhase,
          response: acceptedResponse(accepted.dir) });
      }
    }
  }
  requireThat(phase === "proposal" ? !candidate && !evidence : Boolean(candidate),
    "Only challenges take a candidate and new evidence; challenges require a candidate");
  const candidateText = candidate ? read(candidate) : null;
  const extra = evidence ? read(evidence) : "";
  requireThat(candidateText === null || candidateText.trim(), "Candidate is empty");
  const candidateSha256 = candidateText === null ? null : digest(candidateText);
  const evidenceSha256 = digest(extra);
  for (const other of prior.filter((item) => item.phase === phase)) {
    requireThat(other.candidateSha256 === candidateSha256 &&
      other.evidenceSha256 === evidenceSha256, "Phase inputs changed; use a new cycle");
  }
  const attemptId = `${expert}-${phase}-${randomUUID()}`;
  const dir = path.join(run, "attempts", attemptId);
  const brief = read(path.join(run, "inputs", "brief.md"));
  const method = read(path.join(run, "inputs", phase === "proposal" ?
    "_proposal.md" : "_challenge.md"));
  const context = `${method}\n\n## Brief\n${brief}\n\n` +
    `## Evidence snapshot\n${path.resolve(run, "inputs")}\n` +
    `${JSON.stringify(state.inputs, null, 2)}\n` +
    (candidateText === null ? "" : `\n## Candidate\n${candidateText}\n`) +
    (responses.length ? `\n## Prior responses\n${JSON.stringify(responses, null, 2)}\n` : "") +
    (extra ? `\n## New evidence\n${extra}\n` : "");
  const requestSha256 = digest(context);
  requireThat(prior.filter((item) => item.phase === phase)
    .every((item) => item.requestSha256 === requestSha256),
  "Phase context changed; use a new cycle");
  const attempt = {
    attemptId, expert, phase, retry: same.length === 1,
    snapshotSha256: state.snapshotSha256, requestSha256, candidateSha256, evidenceSha256,
    startedAt: now, deadline: Math.min(state.deadline, now + state.callMs),
  };
  const envelope = {
    attemptId, snapshotSha256: state.snapshotSha256, requestSha256, candidateSha256,
    status: phase === "proposal" ? "PROPOSED or BLOCKED" : "SUPPORT, REVISE or BLOCKED",
    analysis: "Your substantive reasoning", concerns: ["Any objections or missing evidence"],
  };
  const request = `${context}\n## Response envelope\n` +
    `Return one JSON object, without Markdown fences. Copy identity fields exactly.\n` +
    `${JSON.stringify(envelope, null, 2)}\nUse [] when there are no concerns.\n`;
  attempt.requestFileSha256 = digest(request);
  mkdirSync(dir);
  write(path.join(dir, "context.md"), context);
  if (candidateText !== null) write(path.join(dir, "candidate.md"), candidateText);
  write(path.join(dir, "request.md"), request);
  writeJson(path.join(dir, "attempt.json"), attempt);
  return { ...attempt, dir };
}

export function record(run, attemptId, rawFile, now = Date.now()) {
  const state = loadRun(run);
  const attempt = attempts(run).find((item) => item.attemptId === attemptId);
  requireThat(attempt, "Unknown attempt");
  const { dir } = attempt;
  requireThat(!existsSync(path.join(dir, "failure.json")), "Attempt already failed");
  requireThat(now <= attempt.deadline, "Response arrived after deadline");
  requireThat(digest(read(path.join(dir, "request.md"))) === attempt.requestFileSha256,
    "Request file changed");
  requireThat(digest(read(path.join(dir, "context.md"))) === attempt.requestSha256,
    "Request context changed");
  if (attempt.candidateSha256) {
    requireThat(digest(read(path.join(dir, "candidate.md"))) === attempt.candidateSha256,
      "Candidate changed");
  }
  const raw = read(rawFile);
  const response = JSON.parse(raw);
  requireThat(response && !Array.isArray(response), "Response must be an object");
  for (const key of ["attemptId", "snapshotSha256", "requestSha256", "candidateSha256"]) {
    requireThat(response[key] === attempt[key], `Response ${key} does not match`);
  }
  requireThat(attempt.snapshotSha256 === state.snapshotSha256, "Snapshot does not match");
  const statuses = attempt.phase === "proposal" ? ["PROPOSED", "BLOCKED"] :
    ["SUPPORT", "REVISE", "BLOCKED"];
  requireThat(statuses.includes(response.status), "Invalid response status");
  requireThat(typeof response.analysis === "string" && response.analysis.trim(),
    "Response has no analysis");
  requireThat(Array.isArray(response.concerns) && response.concerns.every((item) =>
    typeof item === "string" && item.trim()), "Invalid concerns");
  requireThat(!["REVISE", "BLOCKED"].includes(response.status) || response.concerns.length,
    "Revision or blocker needs a specific concern");
  requireThat(!existsSync(path.join(dir, "result.json")), "Attempt already succeeded");
  write(path.join(dir, "response.txt"), raw);
  writeJson(path.join(dir, "result.json"), { ...response, responseSha256: digest(raw) });
  return response;
}

export function fail(run, attemptId, reason, retryable = false) {
  const attempt = attempts(run).find((item) => item.attemptId === attemptId);
  requireThat(attempt, "Unknown attempt");
  requireThat(typeof reason === "string" && reason.trim(), "Failure needs a reason");
  requireThat(!existsSync(path.join(attempt.dir, "result.json")), "Attempt already succeeded");
  writeJson(path.join(attempt.dir, "failure.json"), { reason, retryable });
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const [command, run, ...args] = process.argv.slice(2);
    let result;
    if (command === "init") result = init(run, json(args[0]));
    else if (command === "prepare") result = prepare(run, ...args);
    else if (command === "record") result = record(run, ...args);
    else if (command === "fail") result = fail(run, args[0], args[1], args[2] === "transient");
    else throw new Error("Usage: protocol.mjs init|prepare|record|fail <run> <arguments>; see references/protocol.md");
    console.log(JSON.stringify(result ?? { recorded: true }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
