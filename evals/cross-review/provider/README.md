# Claude Code and Codex provider evaluation

This pilot exercises the real cross-review runner against disposable Git
fixtures. Run on macOS or Linux from the repository root.

```sh
node --test evals/cross-review/provider/run.test.mjs
```

The default run uses local CLI stand-ins. It grades launch counts, expiry,
partial provider output, cancellation, retry eligibility and protocol closeout.
It needs no credentials or provider access.

To add live defect and clean discovery, set both model IDs to the exact IDs
available on the installed and authenticated CLIs:

```sh
CROSS_REVIEW_CLAUDE_MODEL="your-claude-model-id" \
CROSS_REVIEW_CODEX_MODEL="your-codex-model-id" \
node --test evals/cross-review/provider/run.test.mjs
```

Replace the placeholders with concrete IDs before running. This sends only
synthetic fixture evidence and spends up to four provider calls. The expected
integer doubling behavior is declared in the contract. The fixture executes
a distinguishing input on each head. The graders check that both reviewers
return an accepted behavioral finding on the defective file or zero findings
on the clean case. Inspect flagged findings against the contract and executed
behavior before treating them as correct. The run prints the artifact directory,
findings, timing and available usage. Live artifacts remain in that directory
for inspection.

The pilot covers CLI dispatch and discovery. Issue #15 also calls for running
from both coordinator hosts, probing effective permissions with canaries, and
qualifying challenge and repair. Evaluating the effect of skill wording
requires a separate controlled comparison under issue #3.
