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
