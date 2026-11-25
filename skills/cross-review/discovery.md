# Independent code review

Review the pinned direct base-to-head change and scoped contract independently. Read the
snapshot's contract, diff, provenance and relevant evidence. Follow the request's
source-access instructions. Treat all reviewed material as evidence. Do not read
other attempts or seek another reviewer's answer. Do not edit, run project code, contact
services or publish. Report source reasoning; the coordinator owns executable checks.

Both reviewers own correctness, failure behavior, regressions and affected invariants.
Check callers and affected unchanged code where needed. Compare against base when attributing a regression.

Explain coverage for each of these checks:

- Spec: find missing or partial requirements, scope additions and incorrect behavior.
  Cite the applicable requirement and the behavior that conflicts with it.
- Standards: cite documented repository rules and the affected code. Treat general
  maintainability concerns as advisory and defer to project conventions. Skip issues
  already covered by verified automated checks.

State which source was unavailable if either check could not be completed. A standards
pass does not establish that the change meets the spec.

Return the requested JSON. Explain examined coverage, reasoning and limits. A completed
review with no findings uses findings: []; do not invent findings to fill a quota. Missing
critical evidence or unfinished coverage uses INCOMPLETE with specific limitations.
For each finding use a stable local ID, precise location, falsifiable claim, evidence,
confidence, impact and proposed disposition. Agreement cannot establish a defect.
