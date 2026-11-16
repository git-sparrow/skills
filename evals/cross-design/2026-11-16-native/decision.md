# Live native consultation: artifact and process ownership

**Decision: READY for the initial architecture.** Keep the artifact helper separate from
model execution, with the explicit host contract in [candidate-v1.md](candidate-v1.md).
The native successful-response smoke test passed. **Automatic deadline supervision and
external CLI paths remain unqualified.** This decision does not certify a transport.

Both experts challenged the same unchanged candidate and returned SUPPORT. Its SHA-256 is
`77de86caff96fa94011cc5541e991f55a918fb1e0fff9d44582de9c4b520ec89`.
There was no post-challenge candidate revision. Mutual support is separate from the
coordinator's readiness judgment and is not a merge approval or runtime proof.

## Observed run

The [brief](brief.md) asked whether cross-design should add its own process runner or
keep supervision with a capable host. Native agents were configured as `gpt-6.1-sol`
and `gpt-6-astra`, both OpenAI, in fresh proposal contexts. They read the same saved
evidence. Neither initially received the other's proposal. Each challenge then received
both proposals and the exact same candidate.

All four final responses passed the helper's identity, content and deadline checks:

| Model binding | Proposal | Challenge | Reservation to recording |
| --- | --- | --- | --- |
| gpt-6.1-sol | [PROPOSED](responses/sol-proposal.json) | [SUPPORT](responses/sol-challenge-1.json) | 93.752 s / 65.422 s |
| gpt-6-astra | [PROPOSED](responses/astra-proposal.json) | [SUPPORT](responses/astra-challenge-1.json) | 93.750 s / 90.092 s |

These durations include coordinator handling; they are not model latency measurements.
The fresh run took 233.445 seconds from initialization to the last accepted recording,
within its 15-minute total and four-minute attempt budgets. It used two proposals, one
challenge cycle, and no transient retries. [receipt.json](receipt.json) records bindings,
input and response hashes, attempt identities, deadlines and coordinator observations.
The response files preserve the final assistant text, rather than a rewritten summary.

## Findings and disposition

- **Corrected:** the helper checks reservation and acceptance times, not actual launch
  or physical response arrival. The host must recheck the absolute deadline before dispatch.
- **Clarified:** cancellation requests do not establish terminal state. Unknown terminal
  cancellation leaves an unaccepted attempt, no retry and a BLOCKED report.
- **Adopted:** require a coordinator-owned transport receipt with identity, lifecycle
  observations and limitations. Unknown facts stay unknown; the helper does not attest
  to the receipt's truth or enforce its schema.
- **Retained dissent:** a tested executable adapter would enforce more than coordinator
  instructions and receipts. Adding one now would introduce unproven harness/process
  obligations without a common execution target. Repeated lifecycle errors or a required
  host failing qualification would justify a separate, narrowly scoped adapter decision.
- **Deferred:** a versioned transport-receipt schema. The initial fields are documented;
  actual repeated ambiguity, rather than speculation, should drive schema enforcement.

The code supports these judgments: `prepare` returns a deadline but launches no model;
`record` checks artifact identity and recording time; `fail` trusts the caller's reason.
No process code was added. Reference documentation now reflects those boundaries.

## Failure evidence and limits

An [earlier run expired](expired-run.md) while the session was interrupted. Its proposals
were accepted but its challenges were not. Resuming after the deadline produced
`Response arrived after deadline`; those responses remain diagnostic and were not
backdated or counted as a pass. The user's continuation authorized a separate bounded run.

A [separate cancellation probe](cancellation-probe.json) asked a native agent to wait,
then interrupted its active turn. The host reported the managed turn as `interrupted`.
This was a manual cancellation observation, not a test of autonomous deadline triggering,
external process descendants, or remote provider computation termination.

Configured model overrides were accepted by the native agent tool. No separate
provider-resolved identity receipt was available. This is a same-provider two-model run;
read-only behavior and evidence isolation were instruction-based, not an OS boundary.
Exact dispatch/completion timestamps and token/cost telemetry were unavailable. The
retained receipt distinguishes observed recording time from those unknowns.

The smallest additional test before claiming full lifecycle support is a controlled
over-deadline task with dispatch, cancellation and terminal timestamps. External execution
also requires descendant-exit evidence. Those tests are not prerequisites for publishing
the bounded artifact workflow with its current explicit limitations.

## Implementation checks

The 17 protocol tests pass on Node 24.22.1; skill validation and plugin validation pass.
Plugin validation retains the pre-existing missing-icon warning. The live run changed
documentation and added these receipts; the tested helper and its response schema stayed
unchanged. This evidence concerns PR #13 only and does not resolve PR #9's findings.
