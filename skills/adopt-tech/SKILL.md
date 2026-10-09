---
name: adopt-tech
description: Adopt a technology from fresh facts instead of memory. Use before adding or upgrading a dependency, scaffolding a project, or writing a config file, project layout or import path for a tool that is new to you, new to this repo, or on a new major version.
---

# Adopt a technology from fresh facts

Memory is stale in the places a new major changes: versions, config shape, file layout,
import paths. It feels exactly as certain as a fresh fact, so every step here replaces a
recollection with a **receipt**: what was checked, how, and when, written inline
(`@sveltejs/kit` 3.0.1 latest, published 2026-10-06 (`npm view`, 2026-10-09)).

Work through the steps in order. Each ends on its completion criterion.

## 1. Version matrix

For every package in the set, including peers the set pulls in, look up the registry
(`npm view <pkg> dist-tags version peerDependencies engines time --json`, or the
ecosystem's equivalent). Build one table:

| Package | Latest stable | Published | Peer ranges | Engines | Compatible? | Deviation + reason |
| --- | --- | --- | --- | --- | --- | --- |

- **Target the latest stable version.** When the repo names a version authority (an SDK
  that dictates versions, a catalog, a documented policy), that authority sets the
  target instead of the registry's `latest`.
- Check the set against itself: peer ranges, the runtime engine, and the package
  manager's minimum release age (a release younger than that cannot install yet).
- Let the package manager write versions (`pnpm add -E <pkg>`), or paste them from the
  lookup.

A deviation (a previous major, an older minor, a release-age hold) is a decision: write
the reason in its row and **stop for the human's approval** before installing.

**Done when** every package has a row with a receipt and every deviation is approved.

## 2. LLM resources

Look for what the vendor publishes for agents, at the docs root and on an "AI" docs page:

- `llms.txt` (usually an index), `llms-small.txt` / `llms-full.txt` (content inline)
- an official MCP server
- official skills or an agent plugin
- the official scaffolder (`create-*`, `sv create`, …)

Prefer, in order: an official skill, a content variant, an index plus the specific page.
If the repo keeps an LLM-resources table, add a row per tool: URL, variant, check date.

**Done when** each of the four kinds is marked found (with URL) or not found.

## 3. Best practices

Find the vendor's own best-practices material **for the installed major**: a "Best
practices" or "Recommendations" chapter, an official best-practices skill, official lint
presets or an autofixer, the "recommended" notes in the migration guide.

Explore it into concrete principles, each with its source URL. Verify each principle:

- it comes from the vendor, or from an authority the vendor names;
- it applies to the installed major;
- it fits the repo's own rules and version authority;
- where a lint rule, autofixer or ten-line proof of concept can show it, run that.

Adopt the principles that pass; enforce them with pinned tooling where it exists. Record
each rejected principle with its reason.

**Done when** every principle found is adopted or rejected with a reason.

## 4. Reference scaffold

Read the getting-started and migration pages for the exact major. Generate a reference
project with the official scaffolder in a scratch directory outside the repo, then diff
its config files, layout and import paths against what you were about to write.

**Done when** every config file, directory and import path you write traces to the
scaffold or to a docs page for this major.

## 5. Official tooling

Install the vendor's MCP server, autofixer or skills when they exist, pinned as exact dev
dependencies and run from `node_modules`. A version-less `npx <pkg>` resolves `latest` on
every run, so it belongs only in a deliberate drift monitor, never on a gate.

**Done when** each official tool is pinned or skipped with a reason.

## 6. Report

Give the human one message: the version matrix, the LLM resources found, the best
practices adopted and rejected, the tooling installed, and every deviation with its
reason. Each fact carries its receipt.

## Stack references

Lessons from projects that already went through an adoption. Read the matching file
before step 1; they say where the traps are, and the steps above still verify every
version and API in them.

- Expo / React Native: [`references/expo.md`](references/expo.md)
