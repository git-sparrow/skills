# skills

Personal agent skills for **Claude Code** and **Codex**, from one layout.

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
- `skills/<name>/agents/openai.yaml`: optional Codex invocation policy. For
  `trim-redundancy`, implicit invocation is disabled; client discovery is not yet tested.

Verified 2026-10-09 with Claude Code 2.1.295 and codex-cli 0.160.1: both installed a
probe skill from this layout in isolated config homes (`CLAUDE_CONFIG_DIR`,
`CODEX_HOME`).

## Rules

- Changes land through pull requests; every change says why, with a link to the session
  or issue that taught the lesson.
- Releases are tagged and recorded in `CHANGELOG.md`.
- Public repo: nothing company-specific, personal or confidential goes in here.
