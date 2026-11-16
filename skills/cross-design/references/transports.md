# Model calls

Prefer native delegation when exact model selection, fresh contexts, completion events
and cancellation are available. Pass the saved request verbatim. Experts return text;
the coordinator saves it to that attempt's `raw.txt`. Do not infer completion from a
launcher acknowledgement. Wait for the expert's final response or failure.

For an external CLI, inspect its installed help for model binding, read-only permissions,
input and final-output options. Use an existing process supervisor that can enforce the
attempt deadline, terminate descendants, await exit, and capture separate stdout/stderr.
If those guarantees are unavailable, report the transport limitation instead of starting
an unbounded process. The artifact helper does not launch or kill processes.

Use a private scratch working directory and the least tool access that can read the
supplied snapshot. Disable unrelated plugins, MCP services and hooks using the installed
harness's supported controls. Verify the effective configuration; a model flag does not
establish read-only behavior. Describe prompt-only isolation honestly. Do not give either
initial expert the directory containing the other proposal. Where filesystem access
cannot be confined, explicitly prohibit reading other attempts and record the limit.

Save provider output and identity metadata in the attempt directory. Extract the final
assistant response into `raw.txt` without rewriting its content. A nonzero exit, provider
error, cancellation or timeout is a failed call even if partial output looks valid;
record the failure, not that partial response as success. Keep both the original provider
output and the extracted response. The helper validates the latter; it does not validate
provider identity, sandbox enforcement, reasoning quality or transport success.

Cancel timed-out work before retrying. Every retry reserves new paths. If cancellation
cannot be confirmed, stop that expert and disclose the limitation. Reusing files after a
timeout can let a late response impersonate the next attempt.
