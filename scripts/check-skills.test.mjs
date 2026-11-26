import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkReadme, checkSkill, frontmatter, loadRepo, parseSimpleYaml, readmeRows } from "./check-skills.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every skill passes its frontmatter, credits and Codex policy checks", () => {
  assert.deepEqual(loadRepo(root).flatMap(checkSkill), []);
});

test("README has one Skills row per skill, auto exactly when model-invocable", () => {
  const skills = new Map(loadRepo(root).map((s) => [s.name, s.fm["disable-model-invocation"]?.value !== true]));
  assert.deepEqual(checkReadme(readmeRows(readFileSync(join(root, "README.md"), "utf8")), skills), []);
});

// The cases below prove each check fires, on inline fixtures.

const sha = "b7b93c36be9bcc36a74db438e0fd385d660bc559";
const credit = (n, over = {}) => ({
  author: "A", project: "p", relation: "inspired-by", license: "MIT",
  source: `https://github.com/o/r/blob/${sha}/SKILL.md`, ...over,
});

function skill({ dmi, credits = [], meta = "", openai, hasNotices = false } = {}) {
  const lines = ["---", "name: s", "description: d"];
  if (dmi !== undefined) lines.push(`disable-model-invocation: ${dmi}`);
  const groups = credits.flatMap((c, i) => Object.entries(c).map(([k, v]) => `  credits-${i + 1}-${k}: ${v}`));
  if (groups.length || meta) lines.push("metadata:", ...groups, ...(meta ? [meta] : []));
  lines.push("---", "body");
  return {
    name: "s",
    fm: frontmatter(lines.join("\n")),
    openai: openai === undefined ? null : parseSimpleYaml(`policy:\n  allow_implicit_invocation: ${openai}\n`),
    hasNotices,
  };
}

const errorsOf = (opts) => checkSkill(skill(opts));
const failsWith = (opts, pattern) => assert.match(errorsOf(opts).join("\n"), pattern);

test("valid fixtures pass", () => {
  assert.deepEqual(errorsOf({}), []);
  assert.deepEqual(errorsOf({ dmi: true, openai: false, credits: [credit(1)] }), []);
  assert.deepEqual(errorsOf({ credits: [credit(1, { relation: "adapted" })], hasNotices: true }), []);
  assert.deepEqual(errorsOf({ credits: [credit(1, { source: "https://example.com/talk" })] }), []);
  assert.deepEqual(errorsOf({ meta: "  origin: 'true'" }), []);
});

test("metadata values must be strings", () => {
  failsWith({ meta: "  version: 1" }, /metadata\.version is not a string/);
  failsWith({ meta: "  pinned: true" }, /metadata\.pinned is not a string/);
  failsWith({ meta: "  legacy: yes" }, /metadata\.legacy is not a string/);
  failsWith({ meta: "  empty:" }, /metadata\.empty is not a string/);
});

test("credits groups are complete, contiguous and well-formed", () => {
  const { license, ...noLicense } = credit(1);
  failsWith({ credits: [noLicense] }, /credits-1 has no license/);
  failsWith({ credits: [credit(1, { relation: "copied" })] }, /relation is "copied"/);
  failsWith({ credits: [credit(1, { source: "https://github.com/o/r/blob/main/SKILL.md" })] }, /not a blob\/<40-hex commit>/);
  failsWith({ credits: [credit(1, { source: `https://github.com/o/r/tree/${sha}/x` })] }, /not a blob\/<40-hex commit>/);
  failsWith({ credits: [credit(1, { license: "none", relation: "adapted" })], hasNotices: true }, /license none/);
  failsWith({ credits: [credit(1, { relation: "adapted" })] }, /THIRD-PARTY-NOTICES\.md/);
  failsWith({ meta: "  credits-1-url: x" }, /credits-1-url is not a credits-N/);
  const gap = skill({ credits: [credit(1)] });
  gap.fm.metadata = Object.fromEntries(Object.entries(gap.fm.metadata).map(([k, v]) => [k.replace("-1-", "-2-"), v]));
  assert.match(checkSkill(gap).join("\n"), /numbered 1\.\.1 without gaps/);
});

test("Claude and Codex invocation settings agree", () => {
  failsWith({ dmi: true }, /does not set policy\.allow_implicit_invocation: false/);
  failsWith({ dmi: true, openai: true }, /does not set policy\.allow_implicit_invocation: false/);
  failsWith({ openai: false }, /but disable-model-invocation is not true/);
  failsWith({ dmi: false, openai: false }, /but disable-model-invocation is not true/);
  assert.deepEqual(errorsOf({ dmi: false, openai: true }), []);
});

test("README rows: one per skill, auto mark matches, no strays", () => {
  const readme = (rows) => `# x\n\n## Skills\n\n| Skill | How |\n| --- | --- |\n${rows.join("\n")}\n\n## Install\n`;
  const skills = new Map([["a", true], ["b", false]]);
  const check = (rows) => checkReadme(readmeRows(readme(rows)), skills).join("\n");
  assert.equal(check(["| `a` | *auto*. x |", "| `b` | y |"]), "");
  assert.match(check(["| `a` | *auto*. x |", "| `a` | *auto*. x |", "| `b` | y |"]), /2 Skills rows for a/);
  assert.match(check(["| `b` | y |"]), /0 Skills rows for a/);
  assert.match(check(["| `a` | x |", "| `b` | y |"]), /a is model-invocable/);
  assert.match(check(["| `a` | *auto*. x |", "| `b` | *auto*. y |"]), /b is explicit-only/);
  assert.match(check(["| `a` | *auto*. x |", "| `b` | y |", "| `c` | z |"]), /row for c/);
});

test("the YAML reader rejects what it cannot read", () => {
  assert.throws(() => parseSimpleYaml("a:\n  - x\n"), /unsupported YAML/);
  assert.throws(() => parseSimpleYaml("a:\n    b: c\n"), /unsupported indentation/);
  assert.throws(() => parseSimpleYaml("a: [1, 2]\n"), /unsupported scalar/);
  assert.throws(() => parseSimpleYaml("a: x # note\n"), /unsupported scalar/);
  assert.deepEqual(parseSimpleYaml("a: \"q: r\"\n").a.value, "q: r");
});
