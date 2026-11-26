# Credits

How a skill names its Sources. `craft-skill` writes these; an upstream review reads them
to diff each Source from the pinned commit to its current head.

## Format

The Agent Skills spec types `metadata` as "a map from string keys to string values"
(https://agentskills.io/specification, read 2026-11-26), so credits are flat keys, one
numbered group per Source, numbered from 1:

```yaml
metadata:
  credits-1-author: Lauren Tan
  credits-1-project: pstack
  credits-1-relation: inspired-by
  credits-1-license: MIT
  credits-1-source: https://github.com/cursor/plugins/blob/<commit-sha>/pstack/skills/no-comments/SKILL.md
```

| Key | Value |
| --- | --- |
| `credits-N-author` | the person or organisation named in the Source's license or README |
| `credits-N-project` | the project or plugin the Source belongs to |
| `credits-N-relation` | `adapted` (wording reused) or `inspired-by` (ideas only) |
| `credits-N-license` | SPDX id of the nearest `LICENSE` above the Source, or `none` |
| `credits-N-source` | a GitHub `blob/<full-commit-sha>/` URL to the file read |

A Source that is not a single file (an agent, a doc, a talk) still gets a group; point
`source` at the most specific pinned URL there is.

## Adapted wording

Permissive licenses require their notice in copies of substantial portions. MIT: "The
above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software." For each `adapted` Source, add
`skills/<name>/THIRD-PARTY-NOTICES.md` with the Source URL, its copyright line and the
full license text. Metadata alone does not meet the notice requirement.

A Source with license `none` grants no copying rights: `inspired-by` only, wording in our
own words.
