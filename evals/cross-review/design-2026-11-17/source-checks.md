# Verified before selecting architecture

Repository main: 3ebffb844f5e9770029ce0b767aeef0555463261. Historical PR #9: 2c0f91d.

- `node --test skills/*/scripts/*.test.mjs`: 17/17 pass, Node v24.22.1.
- Imported #9 `validateReport` with `node --input-type=module -e`: both `Reviewed base...head\n## Standards\n## Spec` and `Reviewed base...head\n\nINCOMPLETE\n## Standards\n## Spec` return null (accepted). An initial stdin-mode probe failed at the old CLI realpath guard on argv `-`; rerun with `-e` produced these results.
- #9 `readReport` reads an existing prefix .md when present; assertLaunchable checks an outcome and worktree, not absence of that .md. Source proof of stale-report exposure.
- #9 `stagePrevious` removes all differently named previous-for-r*.md; source proof of overlapping retry input deletion.
- #9 closeout `judgeRun` checks current worktree head/status, not base ref drift.
- Cross-design helper reads local files, uses exclusive writes and unique attempt IDs, checks deadline at reservation/acceptance. No dispatch, timer, process launch, cancellation or transport-result validation is implemented there.
- Installed native tools expose configured model override with fork_turns=none, task final messages/list_agents and interrupt_agent. No automatic call deadline argument. Prior #13 cancellation receipt supports managed-turn interruption only. These facts limit advertised lifecycle behavior.

No public external source claims are needed for this local architecture decision.
