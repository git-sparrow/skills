# Decision: the process boundary of cross-design

Choose the smallest dependable initial architecture for cross-design: should its artifact helper also launch/supervise external model CLIs, or should model execution remain with a capable host?

## Outcome and scope
Deliver an implementation-ready design for the process/artifact boundary. This is a live consultation validating the skill on PR #13, not a request to vote on merging it. Experts do not implement or run tests. One challenge cycle maximum; no extensions to seek agreement. Preserve consequential dissent.

## Evidence and provenance
The files under source/ are copied from git-sparrow/skills PR #13 based on head 6074e2d851cf08e8bd10ac48574fed6bdfca9067, base f03f79556511862ef240ad94786d238e5f109c29, read 2026-11-16. The two reference documents include pending corrections distinguishing reservation from actual launch and unknown cancellation from terminal failure. Snapshot hashes identify the exact input bytes. The helper and tests can be read as source. Coordinator-observed validation: 17 tests passed on Node 24.22.1; skill and plugin validation passed. These are coordinator claims, not results you personally ran. A prior simulated consultation preserved dissent and an unreviewed final revision.

## Constraints
- Keep this a portable skill for hosts that can select two distinct models; cross-provider diversity is optional and must not be falsely claimed.
- Keep immutable inputs, separate attempt paths, stale-response rejection, a total budget, and visible dissent.
- The current helper is an artifact protocol, not a process supervisor. Its deadline check rejects late launches/results; it cannot kill a process.
- Hosts differ in native agent APIs, CLI availability and cancellation guarantees. Use existing supported supervision rather than pretending Markdown or result validation can enforce process termination.
- No new dependencies, installed tools, credentials or paid relays for this decision. The pending cross-review PR #9 is a separate project and is not an available library dependency.
- Public evidence only. You may read only your request and this evidence snapshot. Do not inspect other attempts, the wider checkout, or private data. Isolation is instruction-based, not an OS read boundary.

## Non-goals
Build a general orchestration framework, repair PR #9, rank models, verify a provider sandbox, or prove production readiness across every harness.

## Alternatives not yet ruled out
A. Artifact helper plus an explicit host supervision contract.
B. Extend this helper into an external CLI runner now.
C. Borrow an existing bridge, if a concrete available dependency meets both host directions.

## Acceptance criteria
A standalone candidate must define ownership, supported and unsupported execution paths, deadlines/cancellation behavior, failure outcomes, implementation steps and acceptance checks. Identify which claims are verified by the supplied code and which need a future integration run. Agreement cannot stand in for evidence. Any blocking unknown must have a small discriminating experiment.

## Output scope
Keep the substantive proposal under 350 words while covering a recommendation, strongest alternative, ownership, failures, concrete next steps, verification and what could change your conclusion. This is one bounded consultation, not a demand for exhaustive audit.
