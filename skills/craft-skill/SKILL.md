---
name: craft-skill
description: Craft a new agent skill from an incident or an inspiration, with credited sources, a hand-run proof and a PR.
disable-model-invocation: true
metadata:
  credits-1-author: Matt Pocock
  credits-1-project: mattpocock/skills
  credits-1-relation: inspired-by
  credits-1-license: MIT
  credits-1-source: https://github.com/mattpocock/skills/blob/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/productivity/grilling/SKILL.md
  credits-2-author: Matt Pocock
  credits-2-project: mattpocock/skills
  credits-2-relation: inspired-by
  credits-2-license: MIT
  credits-2-source: https://github.com/mattpocock/skills/blob/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/productivity/writing-for-agents/SKILL.md
---

# Craft a skill

Build one skill that earns its place: it names its **Origin**, takes the best of its
**Sources**, credits each one, and proves itself on a real task before it ships.
Vocabulary (Origin, Source, Credit, Relation) is defined in this repo's `GLOSSARY.md`.

Every fact about a Source carries a **receipt**: the commit read, the command, the date.

## 1. Read the Sources

For each link the user gives:

1. Resolve it to `owner/repo`, path and the commit you read
   (`gh api repos/<owner>/<repo>/commits/<ref> --jq .sha`), and read the skill folder at
   that commit: `SKILL.md` and every file it points to.
2. Find its license: the nearest `LICENSE` walking up from the skill folder to the repo
   root (a plugin folder often carries its own). Record the SPDX id, the copyright line,
   or `none`.
3. Note what it does well, its branches, and what looks weak or out of date.

Then search once for related skills (`find-skills` if available; otherwise a web search
for the job plus `SKILL.md`). Show the user the best two or three with one line each and
let them pick which join the Sources. Run the checks above on each one they pick.

Done when every Source has a pinned commit, a license and notes, and the user has ruled
on the search results.

## 2. Interview

Call the `grilling` skill if it is available; otherwise follow
[`references/interview.md`](references/interview.md). Call `domain-modeling` when it is
available to settle names. Settle every one of these:

- **Origin**: an incident (link to the issue, PR or session where it went wrong or keeps
  repeating) or an inspiration (what the user saw, and the job it should do in their work).
- **Difference**: what ours does that the Sources do not, and why. When nothing real
  differs, recommend installing the Source as-is through `manage-skills` and stop.
- **Take and skip**: per Source, what we take and what we leave, with the reason.
- **Relation** per Source: `adapted` when wording is reused, `inspired-by` for ideas only.
  A Source with license `none` is `inspired-by` only.
- **Target**: this repo (default), a private skills repo, or a project repo's own skills.
  A public target holds nothing personal: the skill speaks of the reader in general terms,
  and personal facts stay in the user's own instructions.
- **Invocation**: user-invoked by default; model-invoked only when the Origin shows the
  agent must reach it alone or another skill must call it.
- **Name**: verb plus object, matching the target's existing names.

Done when each item has the user's answer and the user confirms the shared understanding.

## 3. Draft

Write `skills/<name>/SKILL.md` following `writing-for-agents` if available: steps with
completion criteria, reference behind pointers, leading words over restatement.

- Credits: one numbered group per Source, as in
  [`references/credits.md`](references/credits.md). An `adapted` Source also needs its
  notice file.
- User-invoked: `disable-model-invocation: true`, a one-line human-facing description,
  and `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.
- Model-invoked: a description carrying the trigger branches, no `openai.yaml` policy.

Done when the draft reads as the agreed design, every taken item is in it and every
skipped item is absent.

## 4. Prove

Run the skill by hand on one realistic task: the incident replayed, or for an
inspiration, a task from the job the user named. Run it in a fresh subagent that gets only
the skill and the task, so the session's context cannot fill the gaps. Record the task, what the skill did and
the verdict in `evals/<name>/hand-run-<YYYY-MM-DD>/report.md`. Fix the draft and rerun
until the verdict holds.

Done when the report shows the skill doing the job on that task.

## 5. Deliver

Show the user each outward text and wait for approval before sending it.

1. Inspiration Origin: open an issue in the target repo with the Source links, what the
   user liked, the job, and the Difference.
2. Branch, commit, and follow the target repo's rules. In this repo: add the skill's row
   to the README's Skills table (its name and how to use it) and a `CHANGELOG.md` entry
   under Unreleased.
3. Open the PR. Its body carries a **Sources** section, one line per Source: what we took,
   what we skipped and why. The later upstream review reads it to judge new upstream work.

Done when the PR is open and links the Origin and the hand-run report.
