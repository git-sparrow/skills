import { appendFileSync } from "node:fs";

const { REVIEW_FAKE_MARKER: marker, REVIEW_FAKE_BEHAVIOR: behavior } = process.env;
const provider = process.argv[2];
const schemaFlag = provider === "claude" ? "--json-schema" : "--output-schema";
if (!process.argv.includes(schemaFlag)) throw new Error(`Missing ${schemaFlag}`);
let request = "";
for await (const chunk of process.stdin) request += chunk;
const identity = {};
for (const key of ["attemptId", "snapshotSha256", "requestSha256"]) {
  identity[key] = request.match(new RegExp(`"${key}": "([^"]+)"`))?.[1];
  if (!identity[key]) throw new Error(`Missing ${key}`);
}
const text = JSON.stringify({ ...identity, completion: "COMPLETE", analysis: "Fixture response.",
  coverage: "Fixture snapshot.", limitations: [], findings: [] });
const emit = (event) => console.log(JSON.stringify(event));
if (provider === "claude" && behavior === "fenced") {
  emit({ type: "result", subtype: "success", is_error: false, session_id: "fake-claude",
    result: "```json\n" + text + "\n```" });
} else if (provider === "claude") {
  emit({ type: "result", subtype: "success", is_error: false, session_id: "fake-claude", result: "", structured_output: JSON.parse(text) });
} else {
  emit({ type: "thread.started", thread_id: "fake-codex" });
  emit({ type: "turn.started" });
  emit({ type: "item.completed", item: { type: "agent_message", text } });
  if (behavior === "success") emit({ type: "turn.completed" });
}
appendFileSync(marker, `${provider} ${process.pid}\n`);
if (["timeout", "interrupt", "hard-loss"].includes(behavior)) setInterval(() => {}, 1000);
