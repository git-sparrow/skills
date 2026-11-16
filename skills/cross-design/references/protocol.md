# Artifact protocol

Use `scripts/protocol.mjs` from the skill folder. The coordinator alone calls this helper
and writes the durable record. Reserve attempts sequentially, then run their model calls
concurrently. The helper is not a concurrent job scheduler or a process supervisor.

Prepare a private input directory containing `brief.md` and only the evidence both
experts should read. Record provenance inside those files; no secrets or unrelated source
trees. Files must be regular files, not symlinks. Prepare a config outside that directory:

```json
{
  "source": "/absolute/path/to/prepared-inputs",
  "experts": [
    {"id": "a", "model": "SELECTED_MODEL_A", "provider": "PROVIDER_A", "harness": "HOST"},
    {"id": "b", "model": "SELECTED_MODEL_B", "provider": "PROVIDER_B", "harness": "HOST"}
  ],
  "minutes": 30,
  "callMinutes": 10
}
```

Replace the model bindings with real selections; add `resolvedModel` and `identityLimits`
to each binding when known. Provider families may be the same; the model bindings must
differ. The helper checks distinct configured values, not their truth or account access.

## Snapshot and proposals

```sh
node <skill>/scripts/protocol.mjs init <new-run-dir> <config.json>
node <skill>/scripts/protocol.mjs prepare <run-dir> a proposal
node <skill>/scripts/protocol.mjs prepare <run-dir> b proposal
```

`init` starts the total clock, copies inputs and expert briefs, and records their hashes
in `run.json`. It refuses an existing run directory. `prepare` verifies the snapshot and
returns a unique attempt ID, directory and absolute deadline. Give the selected expert
that directory's `request.md` verbatim. Its response must be one JSON object using the
identity fields and status vocabulary supplied in the request. The `requestSha256` field
hashes `context.md` (the substantive request before its response envelope); the full
request is saved alongside it. A digest establishes identity, not reasoning quality.

Use a supervisor to stop the call at its returned deadline; it is the smaller of the
per-call allowance and remaining total budget. Save its final response verbatim to
`<attempt-dir>/raw.txt`, retaining any original provider wrapper and logs separately.
After a successful transport completion:

```sh
node <skill>/scripts/protocol.mjs record <run-dir> <attempt-id> <attempt-dir>/raw.txt
```

`record` checks identity, unchanged input/context/candidate bytes, allowed status, nonempty
analysis, concern shape and the deadline. It saves an exclusive `response.txt` copy and
`result.json` with its digest, and checks these match before reusing accepted responses.
It cannot
judge whether reasoning is substantive; the coordinator must check that too. A wrapper's
success status does not replace these checks, and valid JSON does not override a failed
transport. Keep invalid raw responses for diagnosis.

## Challenges

Write the candidate outside `inputs/`, then reserve both attempts with the same candidate
and optional new-evidence file:

```sh
node <skill>/scripts/protocol.mjs prepare <run-dir> a challenge-1 <candidate.md> [new-evidence.md]
node <skill>/scripts/protocol.mjs prepare <run-dir> b challenge-1 <candidate.md> [new-evidence.md]
```

The helper requires both preceding responses, includes both original proposals and all
prior challenge results, snapshots the candidate and new evidence in each context, and
rejects differing candidate/evidence bytes or substantive context within a phase.
Record responses as above.
Use `challenge-2` only if needed, with a new candidate version. A third cycle is refused.
Archive the candidate from its attempt directory; later edits to the source candidate
do not change what the experts saw. The candidate's digest is separate from the input
snapshot and request digests.

## Failures and limits

```sh
node <skill>/scripts/protocol.mjs fail <run-dir> <attempt-id> 'specific reason'
node <skill>/scripts/protocol.mjs fail <run-dir> <attempt-id> 'transient failure' transient
```

Record failure after the supervisor confirms cancellation or completion. Mark retryable
only for a transient transport failure, not access denial, an expert's BLOCKED judgment,
or a malformed response. One transient retry per expert across all phases is permitted:
repeat `prepare` for that expert and phase to get new paths. No response or outcome is
overwritten. An interrupted helper may leave a partial directory; preserve it and report
the failed run rather than reusing paths or silently repairing the ledger.

There are at most six substantive calls and two transport retries. The helper rejects
late launches and late responses. It does not terminate a running call; use the transport
supervisor. A consultation cannot continue past its deadline by creating another run
unless the caller explicitly grants a new budget. Save `decision.md` and any unreviewed
candidate after the deadline; budget limits calls, not honest reporting.

Before reporting, recheck accepted result files against their saved raw responses and
candidate. The helper assumes a single honest writer; its hashes detect accidental drift,
not a malicious actor rewriting both a file and its manifest. READY / UNRESOLVED / BLOCKED
are coordinator judgments; SUPPORT is an expert stance. Keep those concepts separate.
