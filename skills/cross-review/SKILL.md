---
name: cross-review
description: Review a committed change with two independent models, adjudicate findings using evidence, and report within explicit budgets. Review-only by default; optionally repair and verify focused findings when authorized.
metadata:
  origin: https://github.com/git-sparrow/skills/issues/11
---

# Cross-review

Coordinate a bounded code review. Two fresh models discover findings; you verify claims
and own the report. Agreement is testimony, not proof. Use cross-design for architecture
alternatives, not this skill's finding protocol.

## 1. Scope and pin

Read repository instructions. Identify the originating issue or spec from the caller,
commit references or repository docs. Capture relevant coding standards, including
`CODING_STANDARDS.md` and `CONTRIBUTING.md` when present. Record the source of each
obligation and any evidence gaps. Write `contract.md` separating this change's obligations,
contextual links and downstream exclusions. Fetch only evidence needed for claims; a
linked issue does not automatically add obligations. Record provenance and the freshness
of fetched refs. Capture the repository, base/head selectors and resolved commits, generated
diff, evidence and prompt identity using [the protocol](references/protocol.md).

Initial reviews require a clean repository and committed pins. The helper generates a
direct base-to-head diff; resolve a merge base explicitly if that is the intended base.
Review source at the pins, not mutable working files. Keep run artifacts outside the repo.
Prepare shared inputs once; never rewrite them or clean another attempt during a run.

Choose two distinct model bindings using caller/repository preferences; otherwise choose
two suitable available models. Use `claude-codex` when the caller requests Claude Code
and Codex, and `native` for managed native collaboration. Record the exact configured
model, provider, harness and resolved identity when available.
Never substitute silently. Unavailable required bindings leave the review INCOMPLETE.
Use fresh contexts and prohibit reading peer attempts. Isolation is prompt-only unless
the host independently proves stronger restrictions.

Default mode is `review`. Select `repair` only with existing authorization to edit.
Neither mode authorizes commits, pushes, messages, publishing, merging or risk acceptance.
Default budget: 30 minutes total, 10 minutes per call; two discoveries, at most two targeted
challenge calls in one cycle, and one transient retry per expert across the entire run.
Review-only permits at most six calls; repair permits eight by adding two focused
verifications after one repair batch. All coordinator checks and repairs consume the same
clock. Smaller caller limits win. No broad rediscovery or automatic budget reset.

## 2. Independent discovery

Follow the concrete [transport procedure](references/transports.md). Reserve attempts
sequentially, then launch calls concurrently where supported. Recheck deadlines immediately
before dispatch. Save each handle, original final response and lifecycle observations.
A launcher acknowledgement or a plausible file is not successful terminal completion.

Both reviewers own correctness, failure paths, affected invariants and regressions,
including effects in unchanged callers. Give each the saved [discovery](discovery.md)
request and same snapshot. Requirements and standards are evidence; maintainability
advice remains distinguishable from behavioral defects. Reviewers return structured
findings with stable local IDs, locations, claims, evidence, confidence, impact and proposed
disposition. A substantive COMPLETE response may have zero findings. Empty reasoning,
malformed responses and INCOMPLETE work never count as completed discovery.

The helper checks identities, hashes, time and successful terminal receipts. You must
check whether the reasoning and coverage are meaningful. Partial output after failure or
cancellation remains diagnostic. Unknown cancellation prohibits retry for that expert.
After coordinator interruption, reconcile saved handles before continuing; expired or
unreconciled work remains INCOMPLETE. Preserve usable partial findings.

## 3. Adjudicate and challenge selectively

Assign canonical IDs and map every original finding, including duplicates. Record evidence,
confidence, impact, disposition and a reason for each. Confirm with source proof or a
focused observation; compare base behavior when attributing a regression. Both models
agreeing does not confirm a claim. Keep rejected findings and reasons visible, particularly
when you authored the change. Reopen a settled claim only with new evidence.

A confirmed behavioral defect may block readiness outside changed lines. Confirmed
cosmetic or advisory findings do not force another cycle. Potentially blocking unresolved
claims remain explicit uncertainty. For consequential disagreement, write a focused packet
with exact finding IDs, the disputed claim, contrary argument and discriminating evidence.
Use [challenge](challenge.md) for one or both reviewers within the single cycle/call budget;
all calls in that phase receive the same immutable packet. Do not restart general review
or seek unanimity. Stop when useful evidence is sufficient or the budget ends.

## 4. Optional repair and focused verification

In selected repair mode, apply one authorized repair batch. Run focused checks for the
prior finding and affected behavior. Write a packet with canonical finding IDs, exact edits,
checks/results, remaining risks and the earlier adjudication. The helper captures a fresh
tracked working-tree overlay against the original head, including staged and unstaged
edits. Both reviewers receive that same snapshot with [verification](verification.md).
Recheck overlay bytes at acceptance and closeout. Preserve the original review.

This initial interface supports tracked-file repairs only. A new untracked source/test
file makes repair verification unsupported; do not omit it or commit it without authority.
Do not move the pinned refs during this run. A committed repair/new revision needs a
separately authorized continuation with remaining budget explicitly accounted for, not a
silent restart. New broad discovery requires a concrete new risk and separately justified
budget. Advisory-only findings never require repair.

## 5. Report honestly

Recheck base and head selectors, generated diff, snapshots, accepted responses and any
repair overlay. Run `closeout` with the adjudication ledger. A stale report remains evidence
about its saved pins; do not call it current. Missing or invalid artifacts leave the run
incomplete. Preserve diagnostic files rather than repairing the ledger in place.

Report separately: execution/coverage completeness; snapshot currency; confirmed blocking,
unresolved, advisory, rejected and fixed findings; scoped verification and readiness evidence.
Report spec and standards coverage separately, with the sources checked and any gaps.
Include actual calls, retries, elapsed time, bindings, lifecycle limits, misses and unperformed
work. “No findings” means none established within stated coverage, not exhaustive correctness.
A completed review can contain blockers. Readiness evidence is not merge authorization.

When evaluating the workflow, distinguish a fixture's intended label from its established
expected behavior. Count a fixture toward clean-case coverage only when the requirements
establish that expectation. If later evidence exposes ambiguity, revise any earlier
coverage claims that relied on the fixture.

Keep the report outside tracked source unless the caller requests a repository artifact.
The coordinator manages review stages. Report the lifecycle and isolation limits of the
selected transport, including the scope of any observed local cancellation.
