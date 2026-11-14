# skills

Personal agent skills for **Claude Code** and **Codex**, from one layout.

## Skills

Each skill comes from a real incident, and the PR that added it shows the skill at work.

| Skill | Why it exists | Evidence |
| --- | --- | --- |
| `adopt-tech` | [git-sparrow/kavtsya#303](https://github.com/git-sparrow/kavtsya/issues/303): a scaffold written for the previous major after the version check had passed | [#2](https://github.com/git-sparrow/skills/pull/2), and the hand-run eval recorded in [#3](https://github.com/git-sparrow/skills/issues/3) |
| `trim-redundancy` | [git-sparrow/kavtsya#305](https://github.com/git-sparrow/kavtsya/pull/305): a redundant incident recap in the docs | [#4](https://github.com/git-sparrow/skills/pull/4) |
| `cross-review` | [git-sparrow/kavtsya#323](https://github.com/git-sparrow/kavtsya/issues/323): a pilot in which Codex reviewed a Claude PR with no messages relayed through the maintainer; the runner followed a reviewer that ran about 3 h past its deadline ([git-sparrow/kavtsya#328](https://github.com/git-sparrow/kavtsya/pull/328)) | The dogfood review in [git-sparrow/kavtsya#325](https://github.com/git-sparrow/kavtsya/pull/325), and EVIDENCE_TBD |

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
  frontmatter.
- `skills/<name>/scripts/`: optional scripts a skill runs, with their tests
  (`node --test skills/<name>/scripts/`).
- `skills/<name>/agents/openai.yaml`: optional Codex invocation policy.
  `policy.allow_implicit_invocation: false` keeps the skill out of the model's skill list,
  and an explicit `$skill` still runs it. Checked 2026-11-14 with codex-cli 0.167.2, the
  skills loaded through `~/.agents/skills`: Codex listed only `adopt-tech`, and
  `$skills:trim-redundancy` loaded `trim-redundancy` (the bare `$trim-redundancy` did not).
  A plugin install was not run against this policy.

Verified 2026-11-14 with Claude Code 2.1.325 and codex-cli 0.167.2: both installed this
plugin and its skills in isolated config homes (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`).

## Rules

- Changes land through pull requests; every change says why, with a link to the session
  or issue that taught the lesson.
- A PR that adds a skill adds its row to [Skills](#skills).
- Releases are tagged and recorded in `CHANGELOG.md`.
- Public repo: nothing company-specific, personal or confidential goes in here.
