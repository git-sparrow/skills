# Implementation validation for issue #11

Checked 2026-11-17 on Node v24.22.1. `node --test skills/*/scripts/*.test.mjs`
passes **55/55**: cross-design's unchanged 17 tests and 38 cross-review tests. Tests use
real temporary Git repositories and observable artifact outcomes. Fake transport receipts
are explicitly test doubles; they do not qualify native supervision.

| Contract | Evidence |
| --- | --- |
| Architecture before implementation | [Exact candidate and decision](design-2026-11-17/decision.md), two independent proposals, one challenge cycle, four validated responses |
| Empty/malformed/incomplete/stale results | Empty reasoning/coverage, blank-line structured INCOMPLETE, invalid Markdown/JSON, stale IDs, wrong hashes and accepted-response tampering tests |
| Interruption/retry overlap | Cancelled/failed/unknown receipts cannot accept plausible output; retry leaves peer request intact; old raw output cannot satisfy retry; partial writes fail closed |
| Snapshot/base/head correctness | Diff generated from real pins; diff/contract/prompt drift rejected; base-only/head-only ref changes prevent currentness and acceptance; budget metadata cannot be extended |
| Full-run budgets | Reservation, preflight and acceptance expiry checked separately; six-call review cap includes both retries and challenges; one retry per expert across phases |
| Finding semantics | Confirmed behavioral findings at unchanged caller locations block; advisory findings stop; rejected reasons retained; missing adjudication leaves review incomplete |
| Optional repair | Mode gate; both focused verifications required for fixed disposition; staged/unstaged binary edits and deletions captured; overlay drift and untracked files rejected |
| Live review and repair | [Twelve accepted native calls](live-2026-11-17/report.md): defect, intended-clean, advisory reasoning, focused repair, and a real disputed interpretation; source proof plus 121 coordinator-run input pairs |
| Runtime claim limits | [Manual interruption](design-2026-11-17/native-interruption.json); no autonomous timeout, coordinator-loss cleanup, OS isolation, descendant or remote-shutdown claim |
| Shared packaging | Both skills execute from a detached full-plugin copy and external skill-directory symlinks; same 55 tests pass from the actual Claude plugin cache |

Claude Code 2.1.325 successfully added the detached local marketplace and installed
`skills@git-sparrow` with `CLAUDE_CONFIG_DIR` pointing at a fresh temporary directory.
The installed cache contains `lib/artifacts.mjs` and both skill entrypoints. Running the
full suite from that cache passed 55/55. This changed no user's normal plugin installation.
A new Codex installer run was not performed; the shared manifest/layout, detached copy and
symlink behavior were checked. The README's earlier Codex install receipt remains historical.

`claude plugin validate .` passes with its pre-existing missing-icon warning. Frontmatter
for cross-review and cross-design was parsed with Ruby's YAML safe loader and checked for
allowed keys, names and nonempty bounded descriptions. Both pass. The standalone Python
quick validator could not run because this interpreter lacks PyYAML. An initial all-skill
variant of the strict key check rejected trim-redundancy's pre-existing
`disable-model-invocation` key; that unrelated skill was not changed. These are explicit
validation-tool limits, not evidence of a defect in either changed skill.

`git diff --check` passes. The archived candidate and sixteen accepted raw model responses match
their recorded hashes; all twelve accepted live request/context pairs also match their receipts.
No release/version bump or consumer migration is included. #8 owns that later work.

Remaining coverage limits: the first intended-clean reviews missed an empty-name requirement
ambiguity, which the later dispute evaluation preserved as unresolved after one challenge.
The advisory case produced advisory reasoning but no structured advisory finding; automated
tests cover structured advisory stopping. Two calls accidentally dispatched after a session
pause exceeded their reservation deadlines and were not accepted; the extended run remains
INCOMPLETE, with diagnostics retained. The resumed four-call evaluation used a fresh explicit
15-minute budget. No broad corpus, external provider, automatic timeout or coordinator-loss
shutdown was qualified. Tracked-only repair and initial clean-repository requirements remain
explicit scope limits. See the live report for actual misses, dissent and lifecycle failures.
