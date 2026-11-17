# Decision: cross-review replacement for skills issue #11
Choose the smallest reliable implementation from current main 3ebffb8. Two independent proposals then one challenge cycle; 30 minutes total, 10 minutes/call, one transient retry per expert. No consensus rounds. Release and Kavtsya migration belong to #8. Implementation must preserve cross-design packaging and behavior.

Observed source: cross-design is a 276-line Node artifact helper plus prompts. It owns immutable input hashes, unique attempts, response identity validation, and deadline checks, but no dispatch/cancellation. Native collaboration exposes spawn_agent (explicit model with fresh context), final notifications, list_agents, interrupt_agent; no automatic per-call deadline argument. Prior #13 proved response exchange and manual managed-turn interruption only. This session has native gpt-6.1-sol and gpt-6-astra bindings available. Isolation is prompt-only; no OS filesystem fence. External #9 runner is historical evidence, not a mandatory dependency. No requirement for cross-provider operation. Do not propose an unspecified bridge or infer supervisor guarantees from response success.

Known #9 failure reproductions in issue: empty sections pass; blank line hides INCOMPLETE; stale report reused after interrupted run; retry cleanup deletes input still used by peer. Further gaps: diff not mechanically bound to base/head, only head rechecked; scope recursively imports unrelated issue obligations; cosmetic findings cause repeated repair loops. Treat these as demonstrated contract evidence, not instructions to audit #9 again.

## Delivery contract (updated 2026-11-16)

Redesign `cross-review` as a bounded, evidence-based code-review workflow. Use the merged `cross-design` skill to choose the architecture before implementing it. This issue owns that decision and implementation; #8 continues to track publication and the later Kavtsya migration. No new architecture issue is needed.

Origin: the architecture review of #9, followed by #12 and merged #13 (`3ebffb8`). The [live cross-design decision and receipts](https://github.com/git-sparrow/skills/blob/3ebffb844f5e9770029ce0b767aeef0555463261/evals/cross-design/2026-11-16-native/decision.md) are evidence and constraints, not proof that cross-review is already fixed. #9 remains open at `2c0f91d` with its original findings.

## Desired workflows

- **Design consultation:** independent alternatives → concrete candidate → bounded mutual critique → decision with remaining dissent.
- **Code review:** independent findings → evidence-based adjudication → targeted challenge where useful → report → optional repair and focused verification.

Keep the prompts, result meanings and stopping rules specific to each workflow. Agreement supports a judgment; it does not establish correctness or replace evidence.

## What the latest findings change

1. **Share an artifact protocol, not a general execution framework.** Immutable input snapshots, attempt directories, identity/hash handling, model-binding metadata and result validation are candidates for reuse. Actual dispatch, cancellation and process supervision belong to a qualified host or transport. Extract only primitives demonstrated to have two consumers; do not copy cross-design's proposal statuses or challenge state machine into code review.
2. **Native agents do not eliminate all useful executable code.** Artifact validation and its tests remain useful even when a host owns execution. The earlier “same runtime means no scripts/tests” assumption below is superseded.
3. **Separate confidence, impact and disposition.** A confirmed cosmetic issue need not block completion. A behavior regression caused by the change may manifest outside changed lines; changed-line membership is not the blocking criterion.
4. **Review-only is the default.** Repair is a separately selected mode using existing authorization. Review does not implicitly commit, push, publish, merge or accept risk.
5. **Runtime claims must match the evidence.** #13 demonstrated successful native two-model exchange and a manual managed-turn interruption. It did not qualify automatic deadline supervision, external process descendants, remote provider shutdown, or cross-provider operation. Configured model overrides and prompt-only isolation were explicitly limited claims.
6. **Deadlines have distinct owners.** Artifact code can reject late reservations and acceptance; it cannot prevent a host from dispatching an already reserved request late or terminate running work. Preserve these distinctions and coordinator-interruption failure behavior.

## Known failures to eliminate

The review of #9 reproduced these behaviors even though its 40 tests passed:

- Empty report sections can pass as a complete review.
- An INCOMPLETE marker following a blank line can be missed.
- A report left by an interrupted attempt can make a later process that wrote no report appear successful.
- Preparing a retry under another label deletes an earlier attempt's staged input, potentially while another reviewer reads it.

Additional architectural gaps: the supplied diff is not mechanically bound to its base/head; closeout checks the head but not the base; acceptance criteria from every referenced issue can import unrelated or downstream obligations; cosmetic findings and substantive defects drive the same convergence loop.

Preserve the useful existing work: read-only reviewer intent, evidence-based adjudication, testable process supervision where retained, separate review/runtime results, and an auditable record. Do not merge #9 merely to establish a baseline.

## Design decisions to settle with cross-design

Give two fresh models the requirements and demonstrated failures, rather than asking them to keep auditing the existing implementation. The coordinator verifies material claims and writes one concrete candidate; allow one challenge cycle initially, within an explicit call/time budget. Preserve dissent and the exact candidate identity. Additional calls require a justified budget, not a search for unanimity.

The decision record must settle:

- Model/provider policy: distinct-model native review versus a required or optional cross-provider leg; respect repository/user choices and disclose substitutions or unavailable bindings.
- Supported coordinator/transport paths: which existing host controls or supervisor satisfy launch, completion, cancellation and output collection; whether existing runner code is retained or a concrete bridge is used. Do not depend on an unspecified bridge.
- Artifact/code boundaries: the smallest useful shared primitives and workflow-owned schemas/state. Test packaged and symlinked access for both skills; sharing must not silently break their installation layout.
- Default discovery, dispute and repair budgets; the conditions for focused verification versus additional discovery.
- Result definitions: distinguish an unusable/incomplete run, a completed review, unresolved blocking findings, and readiness evidence. Do not call “no new findings” proof of completeness.

## Implementation requirements

### Snapshot and scope

- Identify repository, base SHA, head SHA, generated diff, scoped contract, relevant evidence and prompt identity.
- Generate the review diff from its pins and verify its identity. Recheck base and head before claiming that a report is current.
- Separate this PR's obligations from contextual issues and downstream rollout. Collect evidence needed to substantiate claims, not every linked page indiscriminately.
- Prepare shared inputs once and keep them immutable while reviewers run. Each attempt owns new output paths; retries never rewrite or delete another attempt's inputs.

### Review and adjudication

- Give correctness, failure behavior and affected invariants an explicit owner. Requirements and repository standards are evidence sources; maintainability advice remains distinguishable from blocking defects.
- Use structured findings with stable IDs, location, claim, evidence, confidence, impact and disposition. An empty finding list is valid when the review actually completed; empty reasoning or a malformed result is not completion.
- Verify regressions against the base when relevant. A source proof or focused runtime observation supports confirmation; model agreement alone does not.
- Challenge consequential disagreements with the disputed claim and discriminating evidence, rather than launching another unrestricted review.
- Retain rejected findings and reasons, especially when the coordinator authored the change. Reopen a settled finding only with new evidence.

### Budgets, repair and transport

- Bound the full run, including retries and follow-ups. Report incomplete work and unresolved findings honestly when the budget ends.
- Separate confirmed impact from certainty; cosmetic/advisory items do not force endless repair cycles.
- After authorized repair, verify the previous finding, changed code and affected behavior. Broader discovery needs a concrete reason and remaining budget.
- Accept output only from a successful terminal transport outcome and a matching current attempt. Partial output from failed/cancelled execution remains diagnostic.
- Preserve observable lifecycle receipts. Unknown cancellation means no retry for that expert and an explicit blocked/incomplete result, not invented termination.
- Retain the existing process-supervisor tests if that supervisor remains. New artifact sharing must preserve cross-design's existing behavior and tests.

## Delivery sequence

1. **Design record:** run cross-design on this issue, save independent proposals, one concrete candidate, challenge responses, evidence-based decisions and dissent. Resolve material unknowns or clearly limit supported behavior before implementing.
2. **Replacement implementation PR:** start an isolated worktree/branch from current main. Use #9 as historical evidence and reusable tested code, not as a branch that must be merged first. Keep the final diff organized around the selected design, not the seven-round history.
3. **Verification:** prove the concrete failure modes below and run bounded representative live evaluations. Add automated checks appropriate to retained executable code; do not make style checks the central readiness gate.
4. **Supersession and review:** when the replacement is ready, link it from #9 and close #9 as superseded. Deliver the replacement PR with evidence and explicit limitations. Do not merge it without a separate maintainer instruction.
5. **Release and consumer migration:** after approval/merge, prepare the release, then migrate Kavtsya to the published copy and remove its duplicate. Track these downstream steps in #8; they are not prerequisites for merging the skill implementation.

Split out a child issue only for a concrete independently shippable follow-up (for example, qualifying another transport). Keep the core architecture and implementation contract here.

## Acceptance criteria

- [ ] A written, implementation-ready design decision records alternatives, exact candidate, evidence, dissent, supported paths and budgets.
- [ ] The replacement implements review-only and optional repair without inheriting the design-consultation state machine.
- [ ] Immutable snapshots and structured results reject stale, empty/malformed, mismatched and late results; an intentionally empty findings list remains a valid completed-review outcome.
- [ ] Tests cover interrupted attempts, stale report reuse, retry overlap, base/input changes and failed transport producing plausible output. Tests assert observable behavior, not just expected CLI arguments.
- [ ] Blocking decisions use evidenced behavioral impact, including regressions outside changed lines; advisory-only findings do not prevent stopping.
- [ ] A bounded live evaluation covers a known defect, a clean change, and a disputed or advisory finding. Optional repair gets a focused follow-up. Report what was found/missed, rejected findings, actual calls/time and limits; do not present one run as a model ranking.
- [ ] Each advertised transport has evidence for the lifecycle guarantees claimed. Successful response exchange is not presented as automatic timeout, OS isolation or remote-shutdown proof.
- [ ] Cross-design's tests and supported packaging still work after any shared-code extraction. Plugin/skill validation and the repository's relevant automated checks pass.
- [ ] README and Unreleased changelog describe the delivered workflow and link its evidence. The replacement PR explains why #9 is superseded and which gaps remain.
- [ ] #8 still owns release/consumer migration; #11 can close when its design and implementation are merged, without claiming that rollout is complete.

## Session handoff

Start a fresh session in `/Users/olek/repos/skills`. Read README.md and applicable instructions first, then use this issue as the delivery contract. #13 is merged; #9 is historical input and remains unmerged. Work in an isolated worktree and deliver a replacement PR. Opening that PR includes pushing its feature branch; merging requires a separate maintainer instruction.
