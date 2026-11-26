# Claude Code and Codex provider evaluation

This pilot exercises the real cross-review runner against disposable Git
fixtures. Run on macOS or Linux from the repository root.

```sh
node --test evals/cross-review/provider/run.test.mjs
```

The default run uses local CLI stand-ins. It grades launch counts, expiry,
partial provider output, cancellation, retry eligibility and protocol closeout.
It needs no credentials or provider access.

To add live clean and defect discovery, challenge and focused repair verification, set both model IDs to the exact IDs
available on the installed and authenticated CLIs:

```sh
CROSS_REVIEW_CLAUDE_MODEL="your-claude-model-id" \
CROSS_REVIEW_CODEX_MODEL="your-codex-model-id" \
node --test evals/cross-review/provider/run.test.mjs
```

Replace the placeholders with concrete IDs before running. This sends only
synthetic fixture evidence and spends up to ten provider calls. The expected
integer doubling behavior is declared in the contract. The fixture executes
a distinguishing input on each head. The graders check that both reviewers
return an accepted behavioral finding on the defective file or zero findings
on the clean case. Inspect flagged findings against the contract and executed
behavior before treating them as correct. The run prints the artifact directory,
findings, timing and available usage. Live artifacts remain in that directory
for inspection.

The pilot covers CLI dispatch, discovery, challenge and repair. Issue #15
also calls for running from both coordinator hosts and probing effective
permissions with canaries. Evaluating the effect of skill wording
requires a separate controlled comparison under issue #3.

With the same two model environment variables, run
`node evals/cross-review/provider/canary.mjs` to exercise the production CLI
arguments with synthetic read, write and project-hook canaries. It makes two
live calls and grades actual token disclosure and marker files. It cannot
establish general filesystem confinement or managed-hook behavior.

## Manual coordinator qualification

The tests above drive the runner from a prepared harness. This check asks a fresh
coordinator on each host to follow the skill by itself. Repeat it after a change to
`skills/cross-review/scripts/provider.mjs`, the response schemas, or
`skills/cross-review/references/transports.md`. The last run is recorded in
[qualification.md](qualification.md#skill-driven-coordinator-check).

**Set up.** Set four shell variables. `CHECKOUT` is the absolute path of the root of
a clean clone of this repository at the commit under test; record
`git -C "$CHECKOUT" rev-parse HEAD`. `WORK` is an absolute path to a new, empty
folder outside that clone. `CLAUDE_MODEL` and `CODEX_MODEL` are the exact model IDs
on the installed, authenticated CLIs. The skill is
`$CHECKOUT/skills/cross-review/SKILL.md`, read from the checkout rather than an
installed plugin, so the run tests the change. Build one fixture per host:

```sh
node "$CHECKOUT/evals/cross-review/provider/fixture.mjs" "$WORK/fixture-claude"
node "$CHECKOUT/evals/cross-review/provider/fixture.mjs" "$WORK/fixture-codex"
```

Each prints `base bf5fbb6e1cbcaef69f63688536b3bcfc3d805f45` and
`head 78730876fb5ea2a0e2e3170dcacb77f10e1b1e6a`; a test keeps those commits fixed.
The head changes `double` from `n * 2` to `n * 3`.

**Run.** Start a fresh Claude Code session and a fresh Codex session. Give each this
prompt, with `<HOST>` set to `claude` or `codex` and the other placeholders filled in
with absolute paths and the exact model IDs:

```text
Read <CHECKOUT>/skills/cross-review/SKILL.md and the files it links, and follow it
to review the Git repository at <WORK>/fixture-<HOST>, base
bf5fbb6e1cbcaef69f63688536b3bcfc3d805f45, head
78730876fb5ea2a0e2e3170dcacb77f10e1b1e6a. The contract for this change: "For finite
integer inputs double(n) returns twice n. The entire implementation appears in the
diff." Use the claude-codex transport with Claude model <CLAUDE_MODEL> and Codex model
<CODEX_MODEL>; both providers may receive the snapshot. Review only. Put the run
directory at <WORK>/run-<HOST>. Finish with the closeout output and your report.
```

If a reviewer CLI fails to start, see
[When a CLI fails to start](../../../skills/cross-review/references/transports.md#when-a-cli-fails-to-start).
Once the launch works, the coordinator starts a new run in a new directory (for
example `run-<HOST>-2`); check that run, not the failed one.

**Close out.** For each host:

```sh
node "$CHECKOUT/evals/cross-review/provider/qualify.mjs" "$WORK/run-<HOST>" "$CLAUDE_MODEL" "$CODEX_MODEL"
```

It passes when the run reviewed the fixture commits, one accepted COMPLETE discovery
ran on each exact binding, and every accepted result, follow-ups included, answers
the run's one snapshot.
Then read the coordinator's closeout and report. The qualification passes when the
closeout says runtime COMPLETE, review COMPLETE and currency current, and the report
confirms the multiplier defect in `calc.mjs` as blocking from evidence the coordinator
observed (for example, `double(2)` returns 4 at base and 6 at head). Record the
checkout commit, CLI versions, models, any resolved model IDs and the results in
`qualification.md`.
