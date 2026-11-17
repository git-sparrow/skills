# Decision: READY for implementation

Adopt [candidate v1](candidate-v1.md), SHA-256
`19bbf762a7eb9fe992871debd208fd228bf637f3d8a4a761ee00db672602e144`.
Both fresh models proposed independently, then challenged these exact bytes once and
returned SUPPORT. There is no revised candidate or further consensus round. Support is
separate from this coordinator's readiness judgment and from implementation validation.

Use native managed review plus a small artifact validator. Share only filesystem/hash
primitives with cross-design. Keep workflow schemas, prompts and budgets independent.
Use whole-plugin packaging and symlinks into a complete checkout; reject a generated
bundler for an unadvertised standalone-folder installation mode.

[Source checks](source-checks.md) reproduce empty/incomplete false success in #9 and
establish the other historical defects from source. The native tool interface and
[interruption probe](native-interruption.json) establish manual managed-turn controls.
They do not establish automatic timeout enforcement, coordinator-loss cleanup, external
process supervision, OS isolation or remote-provider shutdown. Those remain unsupported.
An external runner is not retained; its supervisor tests therefore do not describe a
shipped transport. A future requirement for autonomous shutdown would change this choice.

Preserved dissent: the clean-repository requirement rejects unrelated untracked files;
tracked-only repair excludes new source/tests; partial artifact writes conservatively
invalidate a run instead of recovering it. These reduce scope and recoverability but
keep the initial contract explicit and testable. Never omit an unsupported new repair
file from a success claim. Sol withdrew generated vendoring as a requirement after the
whole-plugin installation contract was made explicit.

Bindings: OpenAI gpt-6.1-sol and gpt-6-astra, native collaboration with fresh proposal
contexts. Configured overrides are observed; resolved provider identity is unavailable.
Isolation is prompt-only. [Receipt](receipt.json) records actual elapsed time, four calls,
one challenge cycle, zero retries, hashes and observed final events. Raw final responses
are preserved under responses/. Host dispatch/terminal timestamps remain unknown; recorded
observations are not model latency measurements. All four passed cross-design validation
within the original 30-minute run / 10-minute call budget.

Implementation must prove copied-plugin and symlink imports, artifact failure cases and
bounded representative reviews before shipment. Those tests may discover implementation
bugs; they are not reasons to repeat this architecture consultation for unanimity.
