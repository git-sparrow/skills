import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const read = (file) => readFileSync(file, "utf8");
export const json = (file) => JSON.parse(read(file));
export const write = (file, value) => writeFileSync(file, value, { flag: "wx" });
export const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
export const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function files(dir, relative = "") {
  return readdirSync(path.join(dir, relative)).sort().flatMap((name) => {
    const entry = path.join(relative, name);
    const stat = lstatSync(path.join(dir, entry));
    requireThat(!stat.isSymbolicLink(), `Snapshot symlink: ${entry}`);
    if (stat.isDirectory()) return files(dir, entry);
    requireThat(stat.isFile(), `Not a regular file: ${entry}`);
    return [entry];
  });
}

export function hashes(dir) {
  return Object.fromEntries(files(dir).map((file) =>
    [file, digest(readFileSync(path.join(dir, file)))],
  ));
}
