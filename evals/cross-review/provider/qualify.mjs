// Mechanical closeout check for one manual coordinator qualification run (README.md):
//
//   node evals/cross-review/provider/qualify.mjs <run> <claude-model> <codex-model>
//
// Passes when the run reviewed the fixture pins, both discoveries ran on the exact
// bindings, and every accepted result answers the run's one snapshot. Whether the
// coordinator confirmed the defect is a reading of its report, not checked here.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PINS = {
  base: "bf5fbb6e1cbcaef69f63688536b3bcfc3d805f45",
  head: "78730876fb5ea2a0e2e3170dcacb77f10e1b1e6a",
};

export function qualify(run, claudeModel, codexModel, pins = PINS) {
  const errors = [];
  const read = (...parts) => JSON.parse(readFileSync(path.join(run, ...parts), "utf8"));
  const meta = read("run.json");
  if (meta.base !== pins.base || meta.head !== pins.head) {
    errors.push(`run reviewed ${meta.base}..${meta.head}, not the fixture pins ${pins.base}..${pins.head}`);
  }
  if (meta.transport !== "claude-codex") errors.push(`transport is ${meta.transport}, not claude-codex`);
  const want = [
    { provider: "anthropic", harness: "claude-code", model: claudeModel },
    { provider: "openai", harness: "codex", model: codexModel },
  ];
  const attempts = readdirSync(path.join(run, "attempts"));
  for (const binding of want) {
    const label = `${binding.harness} ${binding.model}`;
    const accepted = attempts.filter((id) => {
      if (!id.includes("-discovery-") || !existsSync(path.join(run, "attempts", id, "result.json"))) return false;
      const b = read("attempts", id, "transport.json").binding;
      return b.provider === binding.provider && b.harness === binding.harness && b.model === binding.model;
    });
    if (accepted.length !== 1) errors.push(`${accepted.length} accepted discoveries on ${label}; want 1`);
    for (const id of accepted) {
      const transport = read("attempts", id, "transport.json");
      if (transport.outcome !== "succeeded") errors.push(`${id}: transport outcome ${transport.outcome}`);
      const result = read("attempts", id, "result.json");
      if (result.snapshotSha256 !== meta.snapshotSha256) errors.push(`${id}: answered another snapshot`);
      if (result.completion !== "COMPLETE") errors.push(`${id}: response ${result.completion}`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [run, claudeModel, codexModel] = process.argv.slice(2);
  if (!codexModel) {
    console.error("usage: node qualify.mjs <run> <claude-model> <codex-model>");
    process.exit(2);
  }
  const errors = qualify(run, claudeModel, codexModel);
  console.log(errors.length ? errors.join("\n") : "pins, bindings and snapshot: ok");
  process.exit(errors.length ? 1 : 0);
}
