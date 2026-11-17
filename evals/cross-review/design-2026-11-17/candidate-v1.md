# Candidate v1: bounded native review and workflow-owned validation

## Decision and tradeoffs
Ship cross-review as prompts plus a Node artifact helper. Default review-only; explicit
repair mode allows one repair batch and focused verification. Two fresh distinct configured
models, gpt-6.1-sol and gpt-6-astra here, same provider allowed. Follow caller/repo bindings;
unavailable bindings produce INCOMPLETE; never substitute silently. Resolved identity is
unknown unless separately observed. No external runner or bridge is advertised. PR #9 is
historical evidence, not a base. #8 retains release/migration.

The supported execution path is active coordinator management through native spawn_agent,
final notifications, list_agents and interrupt_agent. Recheck deadline immediately before
launch; poll at most 30 seconds while waiting, request interruption at deadline and observe
terminal state. Only observed successful final completion can unlock acceptance. Unknown
cancellation blocks retries for that expert. On coordinator interruption, reconcile saved
handles first; expired/unreconciled attempts remain incomplete. This is NOT autonomous
timeout supervision, filesystem isolation, descendant cleanup or remote-provider shutdown.
If a caller requires those stronger guarantees, this path is unsupported. Successful live
exchanges qualify only the observed exchange, not the stronger guarantees.

## Boundaries and packaging
Extract only deterministic file-tree hashing (reject symlinks), digest, exclusive writes,
and JSON/read/assert primitives into lib/artifacts.mjs, with two actual consumers.
Cross-design keeps its commands, prompts, phase rules and response schema unchanged.
Cross-review owns snapshot generation, schemas, receipts, budgets and all workflow state.
No generic scheduler, adapter registry, state-machine engine or generated bundler.

Support whole-plugin copies/archives and individual skill symlinks into that complete
checkout. Node resolves module-relative imports from real paths. Test both in a detached
copied plugin tree and via external symlinks. Standalone copied skill folders are not
advertised; document that shared lib travels with the plugin.

## Review artifact interfaces
Proposed skill paths: SKILL.md, discovery.md, challenge.md, verification.md,
references/protocol.md, references/transports.md, scripts/protocol.mjs and tests.
The coordinator alone writes records. New run directories, exclusive file creation,
immutable inputs and UUID attempt directories; no live cleanup.

init(config): repository realpath, full base/head SHAs resolved from recorded selectors,
fixed direct base-to-head git diff recipe (--no-ext-diff --no-textconv --binary), generated
patch hash, scoped contract, relevant evidence, prompt snapshots, models, mode and budgets.
Committed reviews only; inspect source with git show at pins. No arbitrary supplied diff.
Require a clean tracked/untracked repository at initial capture so the reviewer cannot
mistake local edits for reviewed source; keep run files outside it. Recheck both selectors,
pins, regenerated diff and input hashes before claiming currentness. A moved selector makes
the report historical/stale, including base-only changes. Remote freshness is only as recent
as the caller's fetch; record that limit.

prepare(expert, discovery|challenge|verification, optional focused packet): reserve a new
attempt and exact request. Discovery packets are independent and byte-identical except
response identity; both reviewers own correctness, failure paths and affected invariants.
Challenges require both discoveries and a nonempty claim/evidence packet; no unrestricted
rediscovery. Verification requires repair mode and a packet of stable finding IDs, edits,
focused checks and relevant behavior. Both experts in a follow-up phase receive identical
packet bytes; one targeted cycle each. Retry keeps those bytes unchanged.

For repair without commit authorization, capture a fresh immutable verification snapshot:
original pins plus generated tracked working-tree diff against the pinned head, scoped
finding/check packet and changed tracked-file bytes (or their content hashes plus patch).
Reject untracked repair files in this initial interface; callers must explicitly arrange a
committed revision for those. Hash the repair overlay and recheck it before accepting
verification and closeout. Do not call this a completed review of a new committed head.
A caller-authorized committed repair can instead start a linked snapshot of its new pins,
without resetting the existing session's total time/call budget. Initial implementation
may support only the tracked overlay path, documenting that limit rather than adding a
second scheduler. No commit/push/merge/publish is implied by repair.

record(attempt, raw, receipt): validate unchanged inputs/request/packet, response identities,
nonempty reasoning and coverage, structured findings, deadline and coordinator-owned
terminal-success receipt tied to the exact handle/attempt/binding. Store original bytes,
digest and accepted response exclusively. Structured INCOMPLETE is retained as diagnostic
and never counted as completed discovery. A failed/cancelled/unknown receipt cannot accept
plausible output. Interrupted or malformed artifact writes fail closed; preserve directories.
A receipt is an honest coordinator observation, not host attestation or transport execution.
Reserve/dispatch/acceptance checks are distinct; helper admission never claims to stop work.

fail(attempt, receipt, reason, transient): record terminal or unknown outcome; retry only a
confirmed terminal transient failure, once per expert across the run. Unknown outcome never
unlocks retry. Missing attempt manifests or partial output/result writes invalidate the run
rather than reusing paths. Accepted results are rehashed at closeout.

## Findings, budgets and report
Response: COMPLETE/INCOMPLETE, analysis, coverage, limitations, findings. INCOMPLETE needs a
specific limitation. Findings have stable reviewer ID, location, claim, evidence, confidence
(high/medium/low), impact (behavioral/advisory), disposition (proposed/unresolved/advisory).
Empty findings is valid with substantive completion reasoning; the coordinator verifies
reasoning quality. Canonical IDs map duplicates and preserve all original findings.

Coordinator adjudication records source proof or focused observation, comparison to base
where relevant, behavioral impact, disposition and reason. Agreement is not confirmation.
Confirmed behavior regressions may block outside changed lines. Cosmetic findings stay
advisory; rejected claims and dissent remain visible. Reopen only with new evidence.

Default 30 minutes total, 10 minutes/call; review-only max six calls (two discovery, two
targeted challenge, two possible transient retries); repair max eight (adds two focused
verification). No broad rediscovery. All follow-ups and coordinator work consume the same
clock. No automatic extension; budget ends with partial report, never consensus chasing.

Closeout records independent axes: runtime/review complete or incomplete, current/stale,
blocking findings, unresolved potentially blocking claims, advisory/rejected findings and
readiness evidence. Completion is not exhaustiveness; clean findings are not proof of
readiness. All selected attempts must be terminal and structurally usable, with retries
explicitly superseding only their own failed attempts. Keep historical evidence on failure.
Adjudication remains a coordinator-authored record, not a shared workflow engine.

## Ordered implementation and checks
1. Save this exact candidate, proposals, one challenge cycle, source checks, dissent and decision.
2. Build cross-review snapshots, receipts and acceptance tests for the four #9 failures,
   input/identity drift, base/head drift, invalid/failed/unknown/late transport outcomes,
   retries preserving peer input, advisory stop and unchanged-line blocking semantics.
3. Extract tiny shared primitives with cross-design's existing suite unchanged; prove copied
   plugin and symlink access. Keep workflow prompts/schemas separate.
4. Add review/repair procedure and scoped follow-up snapshots; test focused repair binding.
5. Run bounded native known-defect, clean and advisory/disputed evaluations plus focused
   repair. Save actual calls/time, original replies, rejected findings and misses. Separately
   probe harmless native interruption/reconciliation, stating exactly what is observed.
6. Run Node suites, plugin/skill validation; README and Unreleased link evidence. Push and
   open replacement PR, then link/close #9 as superseded. No merge/release/migration.

## Rejected alternatives and remaining risk
Retaining #9's supervisor could provide stronger local process control but expands provider
qualification beyond the required native path. It remains a future option if hard autonomous
deadlines or cross-provider review is required. A generic engine or copied design state
machine would conflate workflows. Generated per-skill vendoring adds machinery for an
unadvertised install mode; use whole-plugin packaging and test it instead.

Risk: active coordinator supervision can stop when the coordinator is interrupted; unknown
work remains incomplete and may still run. Hashes and receipts assume an honest sole writer,
not adversarial tamper resistance. Model semantic quality is not mechanically provable.
