# craft-skill hand run, 2026-11-26

**Task.** Build `bratan` (#23) from two Sources the user named: pstack `bro` and Matt
Pocock's `wait-what`. Inspiration Origin; target this repo.

| Step | What happened | Result |
| --- | --- | --- |
| 1. Read Sources | Pinned `cursor/plugins@b7b93c3` and `mattpocock/skills@6f7f783`. The nearest-`LICENSE` walk found `pstack/LICENSE` (MIT) where the repo root has none. The search (`gh search code`, `SKILL.md`) surfaced `jackfranklin/dotfiles` `wtf` (MIT), `humanlayer/humanlayer` `asd-ste100` (Apache-2.0, root `LICENSE` + `NOTICE`) and `open-steps` `os-say-simple`; the user took the first two. | pass |
| 2. Interview | Two `grilling` rounds settled Origin, Difference, take/skip, Relation (all `inspired-by`), target, invocation and name. The user moved the non-native-reader note from the description into the body, and kept personal English-level data out of the public skill, filing a private profile repo for it (sparrow-home#9). | pass, one gap |
| 3. Draft | `skills/bratan/SKILL.md` with four numbered credit groups and `agents/openai.yaml`. | pass |
| 4. Prove | A fresh subagent ran `bratan` on a dense message from this session; [report](../../bratan/hand-run-2026-11-26/report.md). | pass |
| 5. Deliver | Issue #23 opened after the user approved its text; PR follows. | pass |

**Gaps fixed in `craft-skill`.**

- Step 2 had no rule for personal facts in a public target; the user had to raise it. The
  Target item now says a public skill speaks of the reader in general terms.
- Step 4 did not say how to run the skill by hand. Running it in a fresh subagent, with
  only the skill and the task, kept this session's context out of the result; the step now
  says so.

**Verdict.** Pass: the run produced a credited, proven skill and an approved issue, and
surfaced two gaps that are now closed.
