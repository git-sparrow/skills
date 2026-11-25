# Provider qualification on 2026-11-25

Commands used Claude Code 2.1.332 (`claude --version`) and Codex CLI 0.172.0
(`codex --version`). The selected models were `claude-sonnet-4-6` and
`gpt-6.2-sol`. These are observations for this setup.

- With the original Codex arguments, a canary call read a synthetic peer
  token. The attempted write failed. With shell tools disabled, neither
  provider exposed its peer token or created the write file or SessionStart
  project-hook marker. Receipt: `node evals/cross-review/provider/canary.mjs`
  with the two model environment variables. The Codex project hook was not
  separately trusted and exercised as a positive control. Managed hooks
  and general filesystem confinement remain unverified.
- A Claude Code coordinator invoked the live discovery eval through one
  allowlisted shell command. Its clean case passed on both providers. On
  the defect case both transport receipts reported success, but the Claude
  response was enclosed in Markdown fences and the review protocol
  rejected it at JSON parsing. Receipt: `node --test --test-name-pattern
  '^live ' evals/cross-review/provider/run.test.mjs`, 1 passed and 1 failed.
  The earlier direct launch passed both cases with the same fixture
  standards and contract. These runs establish that both launch paths can
  reach both providers. Reliable end-to-end discovery remains open.

## Structured-output follow-up

Both provider schemas now constrain the identity fields to the current attempt.
The first schema run left identity fields as unconstrained strings and the
protocol rejected a mistyped attempt ID. The per-attempt schema run passed
clean discovery, defect discovery, and targeted challenge and focused repair
from both the direct launch and the Claude Code launch through the allowlisted
command. Each run accepted ten provider calls and closed the repair as
`COMPLETE` with a current tracked overlay. The challenge tested a supplied
zero-input counterclaim. It did not establish how often reviewers independently
disagree or raise advisory findings.

| Launch | Live cases passed | Slowest call | Claude reported cost | Codex output tokens |
| --- | ---: | ---: | ---: | ---: |
| Direct | 3/3 | 34.278 s | $0.279282 | 2,100 |
| Claude Code allowlisted command | 3/3 | 28.379 s | $0.272160 | 1,976 |

Receipts: the live section of `node --test --test-name-pattern '^live '
evals/cross-review/provider/run.test.mjs`, run once directly and once from
Claude Code. Codex reported usage rather than cost. Claude Code invoked the
fixed harness, so this does not measure how a fresh coordinator discovers or
follows the skill without a prepared command.

Independent spec review found that supervisor loss during challenge could
leave the expert eligible for verification. The protocol now blocks another
phase for that expert when the launch receipt has no terminal counterpart.
Local verification: `node --test evals/cross-review/provider/run.test.mjs
skills/*/scripts/*.test.mjs` passed 72 checks with the three opt-in live
cases skipped.

The schema-constrained canary rerun found no disclosed peer token, write
file, or project hook marker for either provider. The first adversarial
canary call on Claude omitted structured output, so the probe records
response-format compliance separately from observed side effects.
Receipt: `node evals/cross-review/provider/canary.mjs` with the same model
environment variables. Production review still rejects a missing
structured response.

## Skill-driven coordinator check

Both fresh coordinators followed the skill from PR commit `33d802d` without a
prepared eval command. They reviewed the same fixture pins, `43effa5` to
`4a32163`. Each run completed in two discovery calls and confirmed blocker
`R1` by executing the pinned implementations: `double(2)` returned 4 at base
and 6 at head. Both closeouts reported runtime COMPLETE, review COMPLETE and
snapshot current. The transport receipts show Claude resolved to
`claude-opus-5-5` and Codex used the configured `gpt-6.2-sol` binding without
a provider-reported resolved ID.

The first Codex coordinator run could not authenticate Claude inside the outer
sandbox and its nested Codex app server failed to initialize with
`Operation not permitted`. The rerun succeeded after approval to launch the
provider runner outside the coordinator's outer sandbox, with the reviewer's
read-only settings and disabled shell tools still enabled. On this setup, use
that approval path if the outer sandbox blocks startup. This observation does
not cover other host configurations.

Receipts: reran `protocol.mjs closeout` with each saved adjudication ledger and
inspected both runs' accepted results and provider transport receipts. The
Codex coordinator qualified Claude's assertion about every nonzero input
because both versions can overflow to Infinity. The independently confirmed
multiplier regression remains blocking.
