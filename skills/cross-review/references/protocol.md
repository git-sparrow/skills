# Review artifact protocol

Requires Node 20.11+. Run the skill's `scripts/protocol.mjs` from a complete plugin tree;
`lib/artifacts.mjs` is shared with cross-design. Whole-plugin copies and skill symlinks into
that tree are supported. Copying only an individual skill folder is not supported.
One honest coordinator writes records sequentially. Hashes detect accidental drift, not a
malicious writer changing manifests too. This helper records artifacts. The separate [provider runner](transports.md)
executes and supervises the Claude Code + Codex transport.

## Capture

Create a private source directory with nonempty `contract.md` and relevant evidence only.
Files must be regular files, not symlinks; names beginning `_` are reserved. `init` fails
unless every repo path the contract cites in backticks (a trailing `:line` is ignored), and
every `CODING_STANDARDS.md` or `CONTRIBUTING.md` at the root, `.github/` or `docs/` at head,
has a source file of the same relative path or basename. The contract
lists obligations, contextual links and downstream exclusions. Create config JSON outside
that directory:

```json
{
  "repo": "/absolute/repository",
  "source": "/absolute/prepared-inputs",
  "base": "refs/remotes/origin/main",
  "head": "HEAD",
  "mode": "review",
  "transport": "native",
  "minutes": 30,
  "callMinutes": 10,
  "experts": [
    {"id": "a", "model": "MODEL_A", "provider": "PROVIDER", "harness": "native collaboration"},
    {"id": "b", "model": "MODEL_B", "provider": "PROVIDER", "harness": "native collaboration"}
  ]
}
```

Replace bindings with actual selections. Add identity limitations/resolved identity when
available. Bindings must differ. Select `repair` up front only when editing is authorized.
Keep the new run directory outside the repository and source directory.

```sh
node <skill>/scripts/protocol.mjs init <new-run> <config.json>
node <skill>/scripts/protocol.mjs prepare <run> a discovery
node <skill>/scripts/protocol.mjs prepare <run> b discovery
```

`init` resolves both selectors to commits and generates `_diff.patch` using direct endpoints,
`git diff --no-ext-diff --no-textconv --binary --no-color --no-renames BASE HEAD --`.
It captures the contract, evidence, metadata and all review prompts. It requires a clean
repository, including nonignored untracked files. Ignored files are not reviewed. Ref
currentness is local; record the caller's last fetch separately if remote freshness matters.

`prepare` returns unique attempt paths and an absolute deadline. Discovery contexts are
identical; only response identities differ. It neither launches calls nor enforces process
deadlines. Each retry needs a new attempt; never remove earlier attempts. Partial artifact
writes invalidate the run rather than being silently repaired.

## Dispatch and acceptance

For `claude-codex`, use `provider.mjs` as described in the [transport procedure](transports.md).
It records launch and terminal observations and submits the result for acceptance.
For native calls, use the manual procedure below.

```sh
node <skill>/scripts/protocol.mjs preflight <run> <attempt-id>
# Host launches selected native model with request.md, returns execution handle.
node <skill>/scripts/protocol.mjs launched <run> <attempt-id> <handle>
```

Recheck deadline immediately before actual launch. The second command records the handle
and observed launch time, not provider dispatch time. Follow the [transport procedure](transports.md).
Save the exact final assistant response to the attempt's `raw.txt`; retain provider wrappers
separately when available. The response envelope is in `request.md`:

- exact `attemptId`, `snapshotSha256`, `requestSha256`;
- `completion`: COMPLETE or INCOMPLETE; substantive `analysis` and `coverage` strings;
- `limitations`: string array, nonempty for INCOMPLETE;
- `findings`: array, possibly empty. Each has nonempty `id`, `location`, `claim`, `evidence`;
  `confidence`: high/medium/low; `impact`: behavioral/advisory;
  `disposition`: proposed/unresolved/advisory. IDs are unique within a response.

Create a coordinator-owned receipt outside the reserved `transport.json` path:

```json
{
  "attemptId": "EXACT_ATTEMPT_ID",
  "handle": "EXACT_HOST_HANDLE",
  "binding": {"id": "a", "model": "MODEL_A", "provider": "PROVIDER", "harness": "native collaboration"},
  "outcome": "succeeded",
  "observedAt": 1794900000000,
  "evidence": "Matching host final event; describe what was observed",
  "limits": "Configured identity only; prompt-only isolation; remote shutdown unknown"
}
```

Copy `binding` exactly from `launch.json`; use actual epoch milliseconds for `observedAt`.
Outcomes are succeeded, failed, cancelled or unknown. Set `transient: true` only for an
observed terminal transient failure/cancellation. Never infer termination from a cancellation
request. Unknown forbids further calls for that expert. Access denial is not transient.

```sh
node <skill>/scripts/protocol.mjs finish <run> <attempt-id> <receipt-input.json> <raw.txt>
```

`finish` stores the receipt exclusively. Non-success leaves failure diagnostics and never
accepts a response, even if a plausible raw file exists. Success additionally requires
matching current attempt and inputs, valid response, unchanged refs/working tree, and time
remaining. Rejections are recorded; do not retry malformed results as transient transport
failures. INCOMPLETE responses stay incomplete despite structural validity. The coordinator
checks semantic coverage. A partial write or missing manifest leaves an incomplete run.

## Focused follow-ups and repair

After both completed discoveries, write a packet with exact claims/IDs, adjudication and
discriminating evidence. Reserve `challenge` for one or both experts, passing the packet as
the final argument. One challenge phase only; all its requests must use identical bytes.
Do not include peer responses in initial discovery.

In repair mode, after one authorized batch and focused checks, write a verification packet
with original finding IDs, edits, checks/results and limits. Use:

```sh
node <skill>/scripts/protocol.mjs prepare <run> a verification <packet.md>
node <skill>/scripts/protocol.mjs prepare <run> b verification <packet.md>
```

The helper captures `git diff HEAD_PIN --` with the same fixed diff options, covering the
combined tracked staged/unstaged state, deletions and binary patches. The original pins
must remain unchanged. Untracked repair files are rejected; ignored files are excluded
and must not be part of a claimed repair. Capture all relevant check evidence in the packet.
Overlay drift prevents acceptance/currency. This is focused verification of an overlay,
not a complete review of a new commit. No command commits changes.

Calls include retries and follow-ups: six max in review mode, eight in repair mode; one
retry per expert total, one repair batch, one challenge phase, one verification phase.
The original total deadline always wins. No automatic discovery restart.

## Adjudication and closeout

Write a JSON array of canonical findings. Every original finding must map exactly once,
including rejected and duplicate claims:

```json
[{
  "id": "R1",
  "sources": ["ATTEMPT_ID/REVIEWER_FINDING_ID"],
  "confidence": "high",
  "impact": "behavioral",
  "disposition": "confirmed",
  "evidence": "Source proof or focused observation, including base comparison when relevant",
  "reason": "Why this claim is confirmed, rejected, unresolved, advisory or fixed"
}]
```

Dispositions: confirmed, unresolved, advisory, rejected, fixed. `fixed` requires repair mode
and both completed focused verification responses; the coordinator still verifies their
substance and the actual fix. Confidence is independent of impact. Confirmed behavioral
findings block; unresolved behavioral claims remain separate. Advisory findings do not
force repair. Locations need not belong to changed lines. Preserve reasons and dissent.

```sh
node <skill>/scripts/protocol.mjs closeout <run> <adjudication.json>
```

Closeout checks accepted bytes/receipts and both refs, reports transport `runtime` and `review` COMPLETE/INCOMPLETE separately, plus
current/current-overlay/stale, and lists blockers and unresolved findings. All selected
calls must complete, except terminal failed attempts superseded by their own successful
retry. A successful transport can still return unusable or INCOMPLETE review content. Missing
adjudication leaves the review incomplete. The helper cannot assess proof
quality, completeness of reasoning or readiness. Add a human-readable report with actual
coverage, checks, elapsed time, unsupported guarantees and unperformed work. Retain all
artifacts on failure; never call a stale report current or zero findings exhaustive proof.
