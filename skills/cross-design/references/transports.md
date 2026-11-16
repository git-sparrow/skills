# Model calls

Prefer native delegation when exact model selection, fresh contexts, completion events
and cancellation are available. Pass the saved request verbatim. Experts return text;
the coordinator saves it to that attempt's `raw.txt`. Do not infer completion from a
launcher acknowledgement. Wait for the expert's final response or failure. Admit a host
only when its supported lifecycle controls can establish the managed task's terminal
state. Save a coordinator-owned `transport.json` in each attempt directory: configured
and resolved identity, execution handle, reservation/dispatch/terminal or observation
times where available, outcome, isolation limits and relevant cancellation scope. Mark
unavailable facts unknown. This receipt records observations; the helper does not verify
transport evidence or enforce its schema.

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

Cancel timed-out work before retrying. A cancellation request is not a terminal event:
observe the managed task's state and record the scope of the cancellation. Native turn
interruption does not establish that all remote provider computation stopped. External
process/descendant guarantees need separate supervisor evidence. Cleanup and reporting
may outlive the response budget; new work and accepted late results may not.

Every retry reserves new paths. If terminal cancellation cannot be confirmed, preserve
an honest transport receipt, leave the attempt unaccepted, launch no retry for that expert
and report BLOCKED with partial advice. Do not record a retryable terminal failure to
unlock another attempt. Reusing files after a timeout can let a late response impersonate
the next attempt.
