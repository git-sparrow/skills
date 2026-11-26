# Changelog

## Unreleased

- `cross-review`: Step 1 counts the files a workflow, config or build change runs as
  readers, and `contract.md` names each standards file looked for and not found (#35).

- Provider eval: the fixture ignores global and system Git config, so settings such as
  `i18n.commitEncoding` cannot change its fixed commits.

- `cross-review`: the transport guide explains the two startup failures seen from a
  sandboxed Codex coordinator and how to launch without loosening reviewer isolation.
  The provider eval README gives a manual coordinator qualification: a fixture with fixed
  commits (`fixture.mjs`), one prompt for both hosts, and a closeout check
  (`qualify.mjs`) (#20).

## 0.2.1 (2026-11-26)

- CI: `node --test` runs on each pull request: the skill script tests, the cross-review
  provider eval with CLI stand-ins, and new repo checks in `scripts/check-skills.test.mjs`
  for metadata types, credits groups, Claude/Codex invocation parity and README rows (#27).

- `cross-review`: Step 1 requires the snapshot to carry every cited file and affected
  caller, so reviewers can check each obligation without the repository (#29).

- `craft-skill`: the hand run keeps its prompt and full output beside the report, and
  delivery says when a release is needed to ship the skill (#28).

## 0.2.0 (2026-11-26)

- README: the Skills table shows each skill's name and how to use it; origins live in each
  skill's PR and issue.

- Add `craft-skill`: build a skill from an incident or an inspiration, credit each Source
  with flat, commit-pinned metadata, prove it on a hand-run task and deliver it by PR.
  The README rule now accepts an inspiration as a skill's origin; `GLOSSARY.md` defines
  Origin, Source, Credit and Relation; `trim-redundancy` credits move to numbered groups.

- Add `bratan`: restate the last message in plain English for a non-native reader, point
  first, qualifiers up front, every fact kept. Origin: #23.

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
