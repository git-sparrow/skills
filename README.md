# skills

Personal agent skills for **Claude Code** and **Codex**, from one layout.

## Skills

In Claude Code type `/skills:<name>`; in Codex, `$skills:<name>`. Skills marked *auto* also
start on their own when the task fits.

| Skill | How to use |
| --- | --- |
| `adopt-tech` | *auto*. Before adding or upgrading a dependency, scaffolding a project, or writing config for a tool new to the repo. Every version and path it writes carries a receipt. |
| `trim-redundancy` | Point it at comments or docs. It cuts repeated information and keeps the reasons and contracts. |
| `cross-design` | *auto*. Ask two independent models for design alternatives; it challenges a proposal and records the decision with its trade-offs. |
| `cross-review` | *auto*. Run on a committed change or PR: Claude Code and Codex review it separately, and you get evidence-checked findings. Review-only unless you allow repairs. |
| `craft-skill` | Give it links to skills you like, or a problem that keeps repeating. It interviews you, credits the sources, tests the new skill and opens a PR. |
| `bratan` | When the last answer did not land. It says it again in plain English, point first. |

## Install

Claude Code:

```sh
claude plugin marketplace add git-sparrow/skills
claude plugin install skills@git-sparrow
```

Codex:

```sh
codex plugin marketplace add git-sparrow/skills
codex plugin add skills@git-sparrow
```

Pin a version with a tag: `git-sparrow/skills@v0.1.0` (Codex), or a `ref` in the
marketplace source (Claude Code).

## Layout

- `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`: the single manifest
  pair. Codex reads the same files, so there is no second manifest.
- `skills/<name>/SKILL.md`: one folder per skill, `name` and `description` in the
  frontmatter. Skills drawn from other authors credit them in `metadata`; the format is
  [`skills/craft-skill/references/credits.md`](skills/craft-skill/references/credits.md),
  the terms are in [`GLOSSARY.md`](GLOSSARY.md).
- `lib/artifacts.mjs`: shared filesystem/hash primitives for cross-design and cross-review.
  Install the whole plugin; individual skill-directory symlinks into a complete checkout
  work, but copying a skill folder without `lib/` does not.
- `skills/<name>/scripts/`: optional helpers and their tests.
- `scripts/check-skills.test.mjs`: checks each skill's frontmatter and credits against the
  credits format, that `disable-model-invocation: true` matches
  `allow_implicit_invocation: false` in `agents/openai.yaml`, and that each skill has one
  [Skills](#skills) row, marked *auto* exactly when the model may start it.
- Run every test with `node --test` (Node 20.11 or later) from the repository root. CI runs
  it on each pull request; it needs no credentials and makes no model calls.
- `skills/<name>/agents/openai.yaml`: optional Codex invocation policy.
  `policy.allow_implicit_invocation: false` keeps the skill out of the model's skill list,
  and an explicit `$skill` still runs it. Checked 2026-11-14 with codex-cli 0.167.2, the
  skills loaded through `~/.agents/skills`: Codex listed only `adopt-tech`, and
  `$skills:trim-redundancy` loaded `trim-redundancy` (the bare `$trim-redundancy` did not).
  A plugin install honours it too. Checked 2026-11-23 with codex-cli 0.171.0: with the
  plugin installed from this marketplace (main at `2536af9`) into empty `CODEX_HOME` and
  `HOME` folders, `codex debug prompt-input` listed `skills:adopt-tech`,
  `skills:cross-design` and `skills:cross-review` but not `skills:trim-redundancy`.
  Setting the policy to `true` in the installed copy brought it back. `prompt-input`
  renders the model-visible prompt without a model call, so it needs no login.

Verified 2026-11-14 with Claude Code 2.1.325 and codex-cli 0.167.2: both installed this
plugin and its skills in isolated config homes (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`).

## Rules

- Changes land through pull requests; every change says why, with a link to the session
  or issue that taught the lesson.
- A PR that adds a skill links its origin (an incident, or an inspiration and the job it
  does here), shows the skill at work, and adds its row to [Skills](#skills).
- Releases are tagged and recorded in `CHANGELOG.md`.
- Public repo: nothing company-specific, personal or confidential goes in here.
