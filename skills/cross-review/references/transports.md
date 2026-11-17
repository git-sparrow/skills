# Supported execution: managed native collaboration

This version supports the native host exposing `spawn_agent`, final task notifications,
`list_agents` and `interrupt_agent`. It does not ship an external runner or unspecified
bridge. A different host needs its own concrete lifecycle evidence before it is advertised.
If exact model selection or terminal outcomes are unavailable, preserve partial work and
report INCOMPLETE. Cross-provider operation has not been qualified.

1. Reserve the attempt, run `preflight`, check the returned absolute deadline, and launch
   a fresh-context native task (`fork_turns: none`) with the selected model and saved
   request verbatim. Bound active waits to at most 30 seconds and leave time for recording.
2. Save the returned handle with `launched`. That timestamp is a coordinator observation
   after launch, not a provider dispatch timestamp. If this write fails, preserve the
   returned handle separately, interrupt/reconcile it, and mark the run incomplete.
3. Collect the actual final assistant text from the matching handle. Record outcome and
   evidence in a coordinator-owned receipt. A final assistant JSON saying COMPLETE cannot
   override host failure. A task still running, idle without a final event, or of unknown
   terminal status is not success. Keep raw provider wrappers/logs separately when exposed.
4. At deadline request interruption. `interrupt_agent` returning a previous state is only
   a request observation; use `list_agents` to establish the managed turn is interrupted.
   Unknown outcome gets `unknown`, no retry for that expert, and an incomplete report.
   Confirmed terminal transient failures may retry once in new paths within the same run.
5. After coordinator interruption, first inspect saved handles and reconcile/cancel work.
   Never reuse a preflight observation from before a pause: run it again before dispatch.
   A final response may be accepted only if all normal checks still pass before the original
   deadline. Cleanup/observation can continue after expiry; launches and acceptance cannot.

Receipts include attempt, handle, exact configured binding, observed time, outcome,
specific lifecycle evidence and limits. Resolved model identity, exact dispatch/terminal
clock times and cost telemetry remain unknown when unavailable. A receipt is an auditable
coordinator observation, not a host-signed attestation. The helper validates its shape and
binding, not whether the observation is true. Never let the reviewer supply its own receipt.

Admission checks cannot prevent a coordinator from launching late. Active polling is not
an automatic watchdog. Managed-turn interruption proves neither descendant exit nor remote
provider computation termination. Prompt-only read-only/evidence separation is not an OS
sandbox. Coordinator loss may leave work running; the run remains incomplete until reconciled.
Do not use this path when a caller requires autonomous wall-clock termination guarantees.
