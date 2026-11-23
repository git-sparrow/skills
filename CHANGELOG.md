# Changelog

## Unreleased

- README: a Codex plugin install honours `policy.allow_implicit_invocation: false`, now
  verified with `codex debug prompt-input` in an isolated `CODEX_HOME`.

- Add `cross-review`: review-only by default, evidence-based adjudication, bounded targeted
  challenge and optional repair with focused verification. Replaces the unmerged #9 design;
  origin/contract: #11. [Design](evals/cross-review/design-2026-11-17/decision.md) and
  [live evaluation evidence](evals/cross-review/live-2026-11-17/report.md) record limitations.
  Share only artifact primitives with cross-design; retain its workflow and tests.
  Release and consumer migration remain in #8.

- Add `cross-design`: independent design proposals, bounded challenge, and a decision
  record that preserves dissent. Includes a helper for input snapshots, distinct
  attempts, response validation and consultation budgets. Origin: #12.

## 0.1.0 (2026-11-14)

- README lists each skill with the incident behind it and the PR that shows it working.
- Repository layout shared by Claude Code and Codex.
- MIT license.
- `adopt-tech` skill, with an Expo / React Native reference.
- `trim-redundancy` skill for focused review and cleanup of source comments and documentation.
