# Candidate v1: artifact protocol with explicit host lifecycle evidence

## Decision and scope
Keep cross-design's helper responsible for artifact identity and acceptance. Keep model
execution with a capable native host or an existing external supervisor; add no CLI runner,
bridge dependency or adapter framework to PR #13. This is an initial architecture decision
and bounded native smoke test, not universal transport certification or a model ranking.

## Evidence and alternatives
The supplied source implements init/prepare/record/fail, with no process launcher.
prepare checks reservation time; record checks acceptance time, not physical response
arrival or successful transport completion. The coordinator observed 17 tests passing;
those tests do not qualify host lifecycle behavior. Both proposals independently support
this boundary and require observable transport outcomes.

The strongest alternative is a runner that couples execution, exit and acceptance in one
program. That would reduce coordinator error, but it introduces harness/output/process-tree
obligations without a common execution target and does not automatically cover native APIs.
No available qualifying bridge is in the evidence. Retain the counterargument: written host
rules are weaker enforcement than an executable adapter. If an intended host cannot meet
the contract, that path is unsupported; supporting it requires a separate narrow adapter.

## Ownership and failure contract
- Helper: immutable input hashes, separate attempts, exact context/candidate identity,
  exclusive accepted outcomes, default retry/cycle ceilings, and deadline acceptance.
- Host: requested model binding, fresh context, execution handle, actual dispatch, observed
  final completion, cancellation, output capture, and managed descendants where applicable.
- Coordinator: sole writer, model admission, smaller caller budgets, lifecycle evidence,
  response validation, evidence-based judgment, visible dissent and final decision.

Keep the helper API and envelope unchanged. Require a coordinator-owned transport receipt
for each attempt, with configured/resolved identity and limits, reservation/dispatch/terminal
or observation timestamps where available, execution handle, outcome, and cancellation
scope when relevant. Use transport.json; unavailable facts are explicitly unknown. A receipt
records observations, not independent attestation or helper-enforced transport validation.

Immediately before dispatch, the host rechecks the absolute reservation deadline. Do not
restart the clock. Use supported supervision and leave time to collect and record a response.
Only a successful final transport event followed by helper acceptance is usable. Failed,
cancelled, malformed or late output remains diagnostic, even if it looks like valid JSON.
At deadline request cancellation through the supported host controls and observe terminal
state; do not equate a request with termination. Cleanup/reporting may outlive the response
budget. Native turn interruption does not prove remote provider computation termination.
External descendants need separate supervisor evidence.

If terminal cancellation cannot be established, preserve the receipt, leave the attempt
unaccepted, make no retry and report BLOCKED with partial advice. Do not invent a terminal
failure to unlock a retry. After confirmed transient terminal failure, existing retry limits
and fresh paths apply. The coordinator enforces this run's one challenge cycle, below the
helper's two-cycle ceiling. Changes after this challenge remain UNREVIEWED.

## Concrete implementation and acceptance
1. Keep protocol.mjs unchanged. Retain the pending protocol documentation correction:
   late reservations and acceptance are helper checks; launch and cancellation are host work.
2. Require the transport receipt in references/transports.md, distinguish cancellation
   request from observed terminal state, and preserve the BLOCKED/no-retry branch. No
   new generic schema or runner is required for this initial change.
3. Publish the exact candidate, both proposals and both challenge responses, candidate
   digest, decision, receipts and limitations as evidence for PR #13. The decision records
   readiness separately from mutual support. Keep all existing tests and validators passing.
4. Report only what the native smoke test observes: two configured model overrides, same
   initial evidence, independent proposals, same candidate, one challenge each and accepted
   response envelopes. Native tool completion events establish final responses in this run.

The prior paused run expired before challenge acceptance and is not a passing consultation.
The helper rejected late acceptance; no timestamp was backdated. The user's continuation
started this fresh bounded run. Preserve that failure in the evaluation record.

A separate harmless native probe requested a 45-second wait, then the coordinator invoked
collaboration.interrupt_agent (previous status running); collaboration.list_agents reported
agent_status interrupted. This is a coordinator-observed managed-turn event, not proof of
an automatic deadline watchdog, external process termination or remote provider shutdown.
Automatic deadline supervision and external CLI paths remain unqualified. Do not advertise
full lifecycle support from this successful-response smoke test. A controlled over-deadline
task with event timestamps is the smallest additional host-qualification test, if such a
support claim is later needed.

Configured models: gpt-6.1-sol and gpt-6-astra through native collaboration overrides, both
OpenAI. Separate provider-resolved identities are unavailable. Read-only behavior and
snapshot-only reading are instruction-based, not an OS boundary. Preserve these limitations
and the counterargument to coordinator enforcement even if both experts support this plan.
