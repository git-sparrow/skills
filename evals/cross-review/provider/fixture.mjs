// The provider eval's disposable fixture: one function, `double`, broken at head (n * 3) or
// rewritten without a behaviour change (`clean`). Fixed identity and dates make the commit
// IDs the same on every machine, so a manual qualification can name its pins in advance.
//
//   node evals/cross-review/provider/fixture.mjs <new-dir> [--clean]
//
// builds the repo in <new-dir> and prints its base and head commits.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STANDARDS = "Use named exports for public functions. This is the only coding standard for this fixture.\n";
export const CONTRACT = "For finite integer inputs double(n) returns twice n. The entire implementation appears in the diff.\n";

const DATE = "2026-11-25T00:00:00Z";

export function makeFixtureRepo(repo, { clean = false } = {}) {
  // Inherited GIT_* settings (GIT_DEFAULT_HASH, GIT_DIR, ...) and global or system config
  // (i18n.commitEncoding, ...) would change or misplace the commits, so none apply.
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_AUTHOR_DATE: DATE,
    GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid", GIT_COMMITTER_DATE: DATE,
  };
  const git = (...argv) => execFileSync("git", ["-C", repo, ...argv],
    { stdio: "pipe", env, encoding: "utf8" }).trim();
  git("init", "-q", "--object-format=sha1");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  const file = path.join(repo, "calc.mjs");
  writeFileSync(file, "export const double = n => n * 2;\n");
  writeFileSync(path.join(repo, "CODING_STANDARDS.md"), STANDARDS);
  git("add", "calc.mjs", "CODING_STANDARDS.md");
  git("commit", "-qm", "base");
  writeFileSync(file, clean ? "export const double = n => 2 * n;\n" : "export const double = n => n * 3;\n");
  git("commit", "-qam", "head");
  return { file, base: git("rev-parse", "HEAD~1"), head: git("rev-parse", "HEAD") };
}

// realpath: a checkout reached through a symlink still runs as the main script.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const [dir, flag] = process.argv.slice(2);
  if (!dir || (flag && flag !== "--clean")) {
    console.error("usage: node fixture.mjs <new-dir> [--clean]");
    process.exit(2);
  }
  mkdirSync(dir, { recursive: true });
  if (readdirSync(dir).length) {
    console.error(`${dir} is not empty`);
    process.exit(2);
  }
  const { base, head } = makeFixtureRepo(dir, { clean: flag === "--clean" });
  console.log(`base ${base}\nhead ${head}`);
}
