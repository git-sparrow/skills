---
name: trim-redundancy
description: Trim repeated information from comments and documentation while keeping the reasons and contracts readers need.
disable-model-invocation: true
---

# Trim redundancy

Keep information; remove repetition. Repository instructions and standards decide where
information belongs.

## 1. Bound the pass

Use the caller's scope. Otherwise establish the PR base from repository metadata (on
GitHub, `gh pr view --json baseRefName,baseRefOid,headRefOid`) and review its merge-base
diff plus task-related working-tree changes, including untracked files. Ask for scope
if the base is unknown.

Default to first-party prose. Vendored, generated and third-party artifacts, including
pinned upstream copies, are read-only evidence unless the caller explicitly requests
their update and repository policy permits it.

**Done:** files, revision range and working-tree changes to review are identified.

## 2. Get an independent review

Give one fresh read-only reviewer the scope, applicable repository instructions and
standards, and [REVIEWER.md](REVIEWER.md), without your own proposed edits. Give it only
those review instructions, not this orchestration workflow. If delegation is unavailable,
apply `REVIEWER.md` yourself and disclose that limitation.

**Done:** every scoped passage is assessed or listed as unreviewed; coverage distinguishes
files with findings, reviewed files without findings, and unreviewed files or portions.

## 3. Check the evidence

Verify each finding against the source it names. Resolve disagreement through evidence;
unsupported findings become uncertain.

**Done:** each finding is accepted, rejected with a reason, or retained as uncertain.
A review-only request ends with the report below.

## 4. Apply and verify

For an authorized cleanup, apply accepted prose edits. Preserve application behavior;
put renames, refactoring and new enforcement in follow-up recommendations. Changes to
public contracts, required notices or directives need separate justification within
the caller's scope. Inspect the diff for information loss and unintended code changes,
then run the repository's required checks.

**Done:** accepted edits are applied and required checks have results or stated blockers.

## Report

For either mode, report scope and revisions, accepted findings or edits, unresolved cases,
coverage gaps, follow-ups and check results. Group related findings and keep evidence
compact; report safety-critical keeps, not an inventory of every retained sentence.
Deletion counts are not a quality target.

## Attribution

Inspired by Lauren Tan's pstack
[no-comments](https://github.com/cursor/plugins/blob/e8d856f0273b42ebafe0ec3546bd645709e7c1b0/pstack/skills/no-comments/SKILL.md)
and [Comment Sicko](https://github.com/cursor/plugins/blob/99559f2f52047978602ef365589275831e76af07/pstack/agents/comment-sicko.md).
