# Bounded native evaluation, 2026-11-17

Twelve accepted review calls: six initial independent discoveries across three fixtures,
two focused repair verifications, then a fresh four-call discovery/challenge evaluation
after a session pause. Two additional challenge calls were mistakenly launched after the
original deadline and remain **unaccepted diagnostics**. The expired extension is INCOMPLETE.
No transport retries or repeated challenge cycles were used. The architecture consultation
is a separate four-call record; the interruption probe is also separate.

Models were configured as OpenAI `gpt-6.1-sol` and `gpt-6-astra`. Initial contexts were
fresh, with no peer responses exposed. Follow-ups reused each reviewer's context and the
same exact focused packet. Configured identity is not independently resolved provider
identity. This small run is not a model ranking or a reliability estimate.

Initial cases had 30-minute total/ten-minute call budgets. The fresh dispute run had a
15-minute total/five-minute call budget and a coordinator cap of four calls. The initial
defect plus repair took 381.547 seconds, clean discovery 290.745 seconds, and advisory
290.709 seconds. The fresh dispute took 180.171 seconds. These are initialization to last
final-observation durations including coordinator handling, not model latency. All twelve
accepted responses met their original run/attempt deadlines. [receipt.json](receipt.json)
records counts, hashes and lifecycle observations. Exact provider dispatch/terminal times
and costs were unavailable.

| Case | Observed result | Coordinator evidence and disposition |
| --- | --- | --- |
| Known defect | Both found Math.min → Math.max regression | Pinned execution confirmed overdraw/overfulfillment in unchanged `caller.mjs:2`; R1 confirmed/blocking |
| Intended clean change, initial discovery | Both COMPLETE, zero findings | String-name trimming was judged correct; later evaluation exposed ambiguity for empty names, so this is not unconditional clean-change proof |
| Advisory case | Both COMPLETE, zero structured findings | Both recognized short local names as advisory and declined naming-only findings; no additional discovery/repair forced |
| Focused repair | Both COMPLETE, no remaining finding | Restored Math.min in tracked overlay; 121 coordinator-run pairs; R1 fixed, current-overlay, original head still defective |
| Fresh dispute evaluation | Discovery disagreed; one focused challenge retained uncertainty | Sol flagged trailing separator for empty names; Astra initially preserved fixed prefix. Runtime confirms output, but required output remains ambiguous. R2 unresolved, review COMPLETE; no additional cycle |

[Behavior observations](behavior-observations.json) show base `[0,3,5]` and head `[-2,0,0]`
for `(stock, request)` pairs `(3,5)`, `(5,2)`, `(5,0)`. The coordinator executed each pinned
helper with the unchanged caller, then checked every repaired pair from zero through ten.
Reviewers assessed the supplied execution evidence and source; they did not independently
run project code. Finite samples corroborate source proof, not exhaustive testing.
[Before](defect-before.json) and [after](defect-closeout.json) retain R1's dispositions.

The fresh run produced a real dispute instead of needing the planned seeded non-string
false positive. [Both initial interpretations and discriminating observations](actual-dispute-packet.md)
were sent in one identical challenge packet. Sol reduced confidence from high to medium;
Astra acknowledged that preserving punctuation does not necessarily require preserving
the separator space, but retained intent uncertainty. The coordinator preserved the initial
dissent and [adjudicated R2 unresolved](dispute-adjudication.json), because agreement does
not establish an author's requirement. The smallest missing fact is the intended output
for an empty name. That fixture ambiguity does not require a new skill architecture round.

The initial clean reviews missed this ambiguity. The advisory case emitted no formal
advisory finding; structured advisory stopping is covered by automated tests. Rejected
candidate concerns in initial reasoning were non-string inputs for the string-only
contract and sparse/custom-iterator inputs for the dense-array contract. No structured
reviewer finding was dropped; R1 was fixed and R2 retained unresolved. No broad corpus was
tested. These limitations remain visible rather than treating zero findings as completeness.

## Pause and late dispatch incident

A session pause crossed the originally reserved challenge deadlines. On the user's
continuation, the coordinator mistakenly reused the old preflight observation and launched
two calls. Both `launched` commands then returned `Dispatch deadline expired`. One model
finished; the other was interrupted, and `list_agents` confirmed terminal managed-turn states.
Neither result was accepted or backdated. The earlier clean discovery closeout is historical;
[the extended run is INCOMPLETE](clean-after-expiry.json). Requests, attempt metadata and the
one late raw response remain under [expired-challenge/](expired-challenge/), with the
[incident receipt](expired-challenge.json).

This incident demonstrates that artifact admission cannot prevent host dispatch and that
successful response generation is not transport supervision. The transport instructions
now explicitly prohibit reusing preflight across a pause. The user's continuation supported
a separate, bounded four-call evaluation to finish the dispute check; it was not an attempt
to turn the expired results into success or to seek unanimous findings.

The separate [manual interruption probe](../design-2026-11-17/native-interruption.json)
observed running → interrupted after `interrupt_agent`, confirmed through `list_agents`.
Neither it nor this incident qualifies automatic timeout triggering, coordinator-loss
cleanup, external process descendants, OS isolation or remote provider shutdown. Those
remain unsupported. Fake receipts in automated tests establish artifact decisions only.

A coordinator import probe also exposed the new helper's CLI guard mishandling stdin imports
(`argv[1]` was `-`). The guard was fixed and regression-tested before repair response
acceptance; those responses still met their original deadline. Cross-design's CLI behavior
was not changed.

Original responses, requests, contexts, snapshots and hashes are retained. Generic phase
templates are present in discovery snapshots for prompt identity, but peer answers are not.
Run `node evals/cross-review/live-2026-11-17/prepare-fixtures.mjs` to recreate initial fixture
repos and reservations in a new temporary directory; it launches no models. Historical pins
and receipts describe the actual run and are not rewritten by recreation.
