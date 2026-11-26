# Review execution

Select `native` or `claude-codex` when initializing the run. Keep the caller's
required bindings if one provider is unavailable, and report the run INCOMPLETE.

## Claude Code + Codex

Use installed, authenticated CLIs on macOS or Linux. The command contract was checked
with `claude --help` (2.1.332) and `codex exec --help` (0.172.0) on 2026-11-25.
The runner requests schema-constrained output with Claude Code's `--json-schema`
and Codex's `--output-schema`. The schemas contain only the current attempt's
identity values. The runner takes Claude's structured output from the original JSON
result and Codex's response from the JSONL terminal turn. The protocol still checks
the exact identity and review semantics.
The coordinator can invoke the same command from either host wherever both CLIs
and their provider accounts are available.

Set `"transport": "claude-codex"` in config. Supply one expert with
`"provider": "anthropic", "harness": "claude-code"` and one with
`"provider": "openai", "harness": "codex"`. Give each a concrete model ID
reachable by its account. Use the caller's selection and preserve the exact binding.
Select this path only when the caller authorizes both providers to receive the snapshot.
The snapshot carries the context Step 1 requires. The
runner sends both CLIs the saved request and inline snapshot through stdin. Each starts
in a fresh scratch directory. Follow-up calls include their saved packet and repair overlay.

Reserve attempts sequentially and run this command once per attempt, concurrently if
possible. The command claims the attempt, checks its deadline at dispatch, runs the
selected CLI, and calls the existing protocol's `finish`:

```sh
node <skill>/scripts/provider.mjs <run> <attempt-id>
```

If a CLI fails to start, see [When a CLI fails to start](#when-a-cli-fails-to-start).

Use a foreground command or managed process that can keep the supervisor alive. Its
timer runs independently of conversational polling. At deadline or on SIGINT/SIGTERM,
it sends TERM to the CLI process group and escalates to KILL. It records whether it
observed the group exit. A host killing the supervisor outright can leave the group
running. Treat a claimed attempt with missing terminal evidence as unknown and keep
the review incomplete. Neither a group exit nor a local signal demonstrates remote
shutdown or covers a descendant that left the process group. The runner never retries
automatically. Unknown and other unclassified outcomes cannot unlock retry.

The runner retains separate provider stdout and stderr, extracts final assistant text
only after a successful CLI exit with a complete terminal envelope, and records provider
session, local PID, outcome and available usage. Output above 8 MiB combined aborts the
call and leaves partial diagnostics. The review protocol still validates the exact
attempt and snapshot in the response. Model IDs are configured identities unless the
provider reports the resolved ID. Report both when present.

Claude Code starts in safe mode with built-in tools disabled. Codex starts with user
config and rules ignored, shell execution and web search disabled, and a read-only
sandbox with approvals disabled. The runner disables Codex hooks and Claude safe mode
disables project hooks. Managed policy can still apply. Reviewers use inline evidence.
The repository's provider canary checks for an exposed peer token and a created file
or hook marker. These observations are specific to the installed CLIs and configuration.
Codex's read-only sandbox itself does not confine reads to the inline snapshot.
Store run directories privately and send only material authorized for both providers.

### When a CLI fails to start

A coordinator that runs inside its own sandbox can stop a reviewer CLI before it
reviews anything. The attempt then ends `failed`, its receipt gives the CLI exit,
and the attempt's `provider.stderr` holds the CLI's own message. Two failures were
seen from a Codex coordinator on macOS with Claude Code 2.1.332 and codex-cli
0.172.0 ([qualification](../../../evals/cross-review/provider/qualification.md#skill-driven-coordinator-check)):

- **Claude is not authenticated.** Claude Code could not authenticate from inside
  the outer sandbox. Run `claude auth status` and `codex login status` through the
  same host and sandbox that launch the runner; a check from another terminal
  proves nothing about it.
- **Codex's app server does not start.** The nested `codex exec` failed to
  initialize with `Operation not permitted`.

The fix in both cases was the host's approval to run the `provider.mjs` command
outside the coordinator's sandbox. Change nothing else: the runner sets each
reviewer's isolation in its own arguments (Claude `--safe-mode --tools ""`; Codex
`--sandbox read-only --ignore-user-config` with shell and hooks disabled), so they
still apply outside the outer sandbox. Never add flags that loosen them. A startup
failure is an access failure, not a transient one, so it does not unlock a retry;
start a new run once the launch works. These observations cover that one setup;
other hosts may fail differently.

## Managed native collaboration

Use the host's `spawn_agent`, final notifications, `list_agents` and `interrupt_agent`
when exact selection, fresh contexts and terminal observation are available.

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
