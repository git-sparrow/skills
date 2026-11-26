// Repo-wide checks on each skill's frontmatter, credits, Codex policy and README row.
// The format they enforce: skills/craft-skill/references/credits.md and README.md.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Reads the YAML subset these files use: `key: scalar` lines, and a key with no value
// opening one level of two-space-indented `key: scalar` lines. Anything else throws, so a
// file this cannot read fails the check instead of passing half-read.
export function parseSimpleYaml(text) {
  const root = {};
  let nested = null;
  for (const [i, raw] of text.split("\n").entries()) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const m = /^( *)([A-Za-z0-9_.-]+):(?: (.*))?$/.exec(raw);
    if (!m) throw new Error(`line ${i + 1}: unsupported YAML: ${raw}`);
    const [, indent, key, value = ""] = m;
    const target = indent === "" ? root : nested;
    if (target && Object.hasOwn(target, key)) throw new Error(`line ${i + 1}: duplicate key ${key}`);
    if (indent === "") {
      if (value.trim() === "") {
        nested = root[key] = {};
      } else {
        root[key] = scalar(value, i);
        nested = null;
      }
    } else if (indent === "  " && nested) {
      nested[key] = scalar(value, i);
    } else {
      throw new Error(`line ${i + 1}: unsupported indentation: ${raw}`);
    }
  }
  return root;
}

// YAML 1.1 parsers still read yes/no/on/off as booleans and ISO dates as timestamps, so
// those count as non-strings too.
const NON_STRING =
  /^(~|null|Null|NULL|true|True|TRUE|false|False|FALSE|yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF|[-+]?[0-9]+|0o[0-7]+|0x[0-9a-fA-F]+|[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN)|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}([Tt ].*)?)$/;

class Scalar {
  constructor(value, string) {
    this.value = value;
    this.string = string;
  }
}

function scalar(raw, i) {
  const v = raw.trim();
  if (/^"([^"\\]|\\.)*"$/.test(v)) return new Scalar(JSON.parse(v), true);
  if (/^'([^']|'')*'$/.test(v)) return new Scalar(v.slice(1, -1).replaceAll("''", "'"), true);
  if (/^[[{|>&*!"'%@`]/.test(v) || v.includes(" #") || v.includes(": ") || v.endsWith(":")) {
    throw new Error(`line ${i + 1}: unsupported scalar: ${v}`);
  }
  if (v === "") return new Scalar(null, false);
  if (NON_STRING.test(v)) {
    const value = /^(true|True|TRUE)$/.test(v) ? true : /^(false|False|FALSE)$/.test(v) ? false : v;
    return new Scalar(value, false);
  }
  return new Scalar(v, true);
}

export function frontmatter(skillMd) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(skillMd);
  if (!m) throw new Error("SKILL.md does not start with a --- frontmatter block");
  return parseSimpleYaml(m[1]);
}

// Hostnames are case-insensitive; URL lowercases them.
function isGitHub(source) {
  try {
    return ["github.com", "www.github.com"].includes(new URL(source).hostname);
  } catch {
    return false;
  }
}

const CREDIT_FIELDS = ["author", "project", "relation", "license", "source"];

// `skill` is { name, fm, openai, hasNotices }: fm and openai as parseSimpleYaml returns them
// (openai null when agents/openai.yaml is absent).
export function checkSkill({ name, fm, openai, hasNotices }) {
  const errors = [];
  const fail = (msg) => errors.push(`${name}: ${msg}`);

  if (fm.name?.value !== name) fail(`frontmatter name ${JSON.stringify(fm.name?.value)} does not match the folder`);

  let meta = fm.metadata ?? {};
  if (meta instanceof Scalar) {
    fail("metadata must be a map");
    meta = {};
  }
  for (const [key, v] of Object.entries(meta)) {
    if (!v.string) fail(`metadata.${key} is not a string; quote it`);
  }

  const groups = new Map();
  for (const [key, v] of Object.entries(meta)) {
    if (!key.startsWith("credits-")) continue;
    const m = /^credits-([1-9][0-9]*)-([a-z]+)$/.exec(key);
    if (!m || !CREDIT_FIELDS.includes(m[2])) {
      fail(`metadata.${key} is not a credits-N-<${CREDIT_FIELDS.join("|")}> key`);
      continue;
    }
    const n = Number(m[1]);
    if (!groups.has(n)) groups.set(n, {});
    groups.get(n)[m[2]] = v.value;
  }
  const numbers = [...groups.keys()].sort((a, b) => a - b);
  if (numbers.some((n, i) => n !== i + 1)) {
    fail(`credits groups must be numbered 1..${numbers.length} without gaps; found ${numbers.join(", ")}`);
  }
  let adapted = false;
  for (const n of numbers) {
    const g = groups.get(n);
    const at = `credits-${n}`;
    for (const f of CREDIT_FIELDS) if (!g[f]) fail(`${at} has no ${f}`);
    if (g.relation && !["adapted", "inspired-by"].includes(g.relation)) {
      fail(`${at}-relation is ${JSON.stringify(g.relation)}; use adapted or inspired-by`);
    }
    if (g.source && isGitHub(g.source) &&
        !/^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-f]{40}\/./.test(g.source)) {
      fail(`${at}-source is a GitHub URL but not a blob/<40-hex commit>/ link: ${g.source}`);
    }
    if (g.license === "none" && g.relation !== "inspired-by") {
      fail(`${at} has license none, so its relation must be inspired-by`);
    }
    if (g.relation === "adapted") adapted = true;
  }
  if (adapted && !hasNotices) fail("an adapted Source needs skills/" + name + "/THIRD-PARTY-NOTICES.md");

  const dmi = fm["disable-model-invocation"];
  if (dmi && typeof dmi.value !== "boolean") fail("disable-model-invocation must be true or false");
  const claudeExplicitOnly = dmi?.value === true;
  const implicit = openai?.policy?.allow_implicit_invocation;
  if (implicit && typeof implicit.value !== "boolean") fail("agents/openai.yaml allow_implicit_invocation must be true or false");
  const codexExplicitOnly = implicit?.value === false;
  if (claudeExplicitOnly !== codexExplicitOnly) {
    fail(claudeExplicitOnly
      ? "disable-model-invocation is true, but agents/openai.yaml does not set policy.allow_implicit_invocation: false"
      : "agents/openai.yaml sets policy.allow_implicit_invocation: false, but disable-model-invocation is not true");
  }
  return errors;
}

// Rows of the table under `## Skills`: `| \`name\` | how to use |`. GFM lets a row drop its
// outer pipes, so those count too.
export function readmeRows(readme) {
  const section = /^## Skills\n([\s\S]*?)(?=^## )/m.exec(readme);
  if (!section) throw new Error("README has no ## Skills section");
  const rows = [];
  for (const line of section[1].split("\n")) {
    const m = /^\|?\s*`([^`]+)`\s*\|(.*)$/.exec(line);
    if (m) rows.push({ name: m[1], auto: m[2].trim().startsWith("*auto*") });
  }
  return rows;
}

// `skills` maps name -> modelInvocable.
export function checkReadme(rows, skills) {
  const errors = [];
  for (const [name, invocable] of skills) {
    const mine = rows.filter((r) => r.name === name);
    if (mine.length !== 1) {
      errors.push(`README: ${mine.length} Skills rows for ${name}; want exactly 1`);
      continue;
    }
    if (mine[0].auto !== invocable) {
      errors.push(invocable
        ? `README: ${name} is model-invocable, so its row starts with *auto*`
        : `README: ${name} is explicit-only, so its row must not say *auto*`);
    }
  }
  for (const r of rows) if (!skills.has(r.name)) errors.push(`README: row for ${r.name}, which has no skills/${r.name}/`);
  return errors;
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();

export function loadRepo(root) {
  const dir = join(root, "skills");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map(({ name }) => {
      const base = join(dir, name);
      const openaiPath = join(base, "agents", "openai.yaml");
      return {
        name,
        fm: frontmatter(readFileSync(join(base, "SKILL.md"), "utf8")),
        openai: existsSync(openaiPath) ? parseSimpleYaml(readFileSync(openaiPath, "utf8")) : null,
        hasNotices: isFile(join(base, "THIRD-PARTY-NOTICES.md")),
      };
    });
}
