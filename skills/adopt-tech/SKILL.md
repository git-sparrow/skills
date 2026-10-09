---
name: adopt-tech
description: Adopt a technology from fresh facts, not memory. Use before adding or upgrading a dependency, scaffolding a project, or writing config, layout or import paths for a tool that is new to this repo or on a new major version.
---

# Adopt a technology from fresh facts

Every version, config key, file path and import this skill produces carries a **receipt**:
what was checked, how, and when, inline. Example: `@sveltejs/kit` 3.0.1 is `latest`,
published 2026-10-06 (`npm view`, 2026-10-09). A fact without a receipt is memory; replace it.

The **target major** is the newest stable major the repo's version authority allows: the
registry's `latest`, unless the repo names an authority that sets versions (an SDK such as
Expo, a catalog, a written policy). Every doc and tool below is read for the target major.

**Scratch work** (downloaded docs, the reference scaffold) goes in one fresh `mktemp -d`
directory, deleted before the report.

**Stack references.** When the stack matches one, read it before step 1. It names the
traps; the steps still put a receipt on every fact in it.

- Expo / React Native: [`references/expo.md`](references/expo.md)

## 1. Version matrix

Look up every package in the set, peers included
(`npm view <pkg> dist-tags peerDependencies engines time --json`, or the ecosystem's
equivalent):

| Package | Target | Published | Peer ranges | Engines | Compatible? | Deviation + reason |
| --- | --- | --- | --- | --- | --- | --- |

Check the set against itself: peer ranges, the runtime engine, and the package manager's
minimum release age.

A **deviation** is any version other than the target: an older major or minor, or a hold
for release age. Write its reason in the row and stop for the human's approval.

**Done when** every package has a row with a receipt, and every deviation is approved.

## 2. Vendor sources

Search for each of these, for the target major:

- an official skill or agent plugin
- `llms-small.txt` / `llms-full.txt` (content) and `llms.txt` (index)
- an official MCP server
- the official scaffolder
- a best-practices chapter, official lint presets or an autofixer
- the getting-started and migration guides

Read in this order of preference: official skill, content file, index plus the specific
page. Read an official skill's content even when you choose not to install it: it is the
vendor's own summary of best practices. When the repo keeps an LLM-resources table, add a row per tool: URL, variant, receipt.

**Done when** every item is marked found (with URL) or not found.

## 3. Principles

From the sources, extract concrete principles (best practices, migration notes,
recommended config), each with its URL. Keep a principle when:

- the vendor, or an authority the vendor names, states it;
- it applies to the target major;
- it fits the repo's rules and version authority;
- a lint rule, autofixer or ten-line proof of concept shows it working, wherever one can.

**Done when** every best-practices and migration source from step 2 is read, and every
principle in them is kept or rejected with a reason.

## 4. Reference scaffold

Generate a project with the official scaffolder in the scratch directory.
Diff its config, layout and import paths against your plan, and its versions against the
matrix.

**Done when** every config file, directory and import path you will write traces to the
scaffold or to a step 2 page, and every scaffold file you remove or change has a reason.

## 5. Install

Install the approved matrix, letting the package manager write exact versions
(`pnpm add -E <pkg>`). Add the vendor's MCP server, autofixer and skills as exact-pinned
dev dependencies run from the project, and enforce kept principles with them where they
reach. A version-less `npx <pkg>` resolves `latest` on every run, so it belongs only in a
scheduled drift monitor.

**Done when** every installed version matches the matrix, every official tool is pinned
or skipped with a reason, and every installed autofixer and lint preset passes on the
files you wrote.

## 6. Report

One message to the human: the matrix, sources found, principles kept and rejected, tooling
installed, and deviations with reasons.

**Done when** the report is sent and every fact in it carries its receipt.
