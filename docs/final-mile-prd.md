# Paperclip Product Autopilot

## Final-Mile PRD

Status: Active  
Owner: Ola-Turmo  
Repo: `Ola-Turmo/paperclip-product-autopilot`  
Branch: `main`  
Last updated: 2026-04-14

## 1. Purpose

This document defines the remaining work required to take the current codebase from a strong production candidate to a genuinely excellent, state-of-the-art operator system.

The broad platform hardening is already done:

- clean install, typecheck, build, test, and pack flow
- current SDK-aligned manifest and UI wiring
- explicit lifecycle/state-machine coverage
- repository boundary for most important entities
- deterministic ideation and duplicate handling
- research snapshots, evaluation fixtures, and scorecards
- digest suppression, reopen, cooldown, and escalation policy
- governance gates for risky actions
- operator console with audit, health, intervention, learning, and digest surfaces

The remaining work is now concentrated, not foundational.

## 2. Current State

Current repo state on `main`:

- `npm run typecheck` passes
- `npm test` passes
- `npm run build` passes
- `npm pack --dry-run` passes
- runtime schemas cover persisted entities
- worker modules are split by domain
- UI smoke tests exist
- governance controls exist for auto-approval, merge locks, and full rollback

Current reality:

- the system is credible and production-shaped
- the remaining work is mainly about deeper product intelligence, richer operator ergonomics, and stronger policy completeness

## 3. Remaining Gaps

### 3.1 Architecture cleanup

Still left:

- finish repository adoption for remaining helper bypasses
- reduce duplicated lookup/query patterns further
- separate domain entities from plugin-facing DTOs where they should diverge
- add migration and compatibility policy for future persisted schema changes

Why it matters:

- the codebase is clean enough to work in now, but still not as explicit as it should be for long-term evolution

Acceptance criteria:

- all new worker logic routes through repositories or pure services
- common list/get/find patterns are centralized
- schema changes have an explicit compatibility note or migration path

### 3.2 Planning and execution rigor

Still left:

- clearer checkpoint-mandatory rules
- explicit cancellation semantics for delivery runs
- stronger plan structure for approval, rollout, and test gates
- runtime budget accounting hooks if the Paperclip runtime exposes the right signal

Why it matters:

- the planning and run model is good, but not yet complete enough to govern every execution edge case cleanly

Acceptance criteria:

- checkpoint requirements are derivable from plan/risk state
- cancellation is explicit and tested rather than implied
- planning artifacts encode enough structure to drive run-time policy decisions reliably

### 3.3 Research ingestion and signal interfaces

Still left:

- define signal-ingestion interfaces for research sources
- formalize provenance/source normalization contracts
- improve research finding freshness/diversity evaluation further

Why it matters:

- research intelligence is stronger than before, but still too internally modeled and not yet shaped as a general ingestion layer

Acceptance criteria:

- a new source type can be added without changing core ideation logic
- provenance fields are normalized across source families
- replay fixtures can compare research quality across input mixes

### 3.4 Preference learning depth

Still left:

- track category, complexity, and execution-mode preference signals separately
- make those preference explanations more explicit in operator ranking surfaces
- add broader regression coverage for combined swipe-plus-outcome learning

Why it matters:

- the system already learns, but the learning model is still too compressed to explain nuanced behavior fully

Acceptance criteria:

- ranking explanations can show which preference dimensions changed the score
- tests cover preference shifts from both operator input and delivery outcomes

### 3.5 Digest and governance completion

Still left:

- broader digest escalation policy beyond current reopen/escalation rules
- stronger distinction between informational, blocking, and intervention-required digests
- fuller governance policy surface for other destructive or high-impact actions

Why it matters:

- the digest layer is now materially good, but not yet a full operator alerting system

Acceptance criteria:

- digests encode not only priority but intervention urgency
- escalation can distinguish persistent nuisance from critical recurring failure
- destructive actions are all covered by explicit gates, not just a subset

### 3.6 Observability and quality measurement

Still left:

- more complete event taxonomy across all high-value transitions
- broader duration and latency metrics
- richer scorecards that combine ideation, delivery safety, and operator burden

Why it matters:

- the system is measurable now, but not yet as diagnosable as a mature production product should be

Acceptance criteria:

- all major lifecycle transitions emit stable event names
- durations exist for the critical loops, not just select ones
- scorecards can answer whether the product is improving or just changing

### 3.7 Operator-console excellence

Still left:

- better run-detail decision context
- richer budget-management surfaces
- richer digest-management surfaces
- sharper failure and remediation UX

Why it matters:

- the UI is now useful, but still not quite elite in clarity or intervention speed

Acceptance criteria:

- operators can immediately tell what happened, why it matters, and what to do next
- budget and digest surfaces support actual operational decision-making rather than passive viewing
- remediation workflows are visible from the place where failures are inspected

## 4. Workstreams

### Workstream A: Finish Structural Cleanup

Deliverables:

- final repository adoption pass
- DTO/domain separation where justified
- migration policy note

Exit criteria:

- no meaningful new worker logic depends on raw helper access

### Workstream B: Complete Execution Policy

Deliverables:

- checkpoint-required policy
- cancellation semantics
- stronger planning and risk structure

Exit criteria:

- execution-state decisions are policy-driven, not ad hoc

### Workstream C: Deepen Product Intelligence

Deliverables:

- signal-ingestion contracts
- richer preference dimensions
- stronger explanation surfaces

Exit criteria:

- ranking behavior is not only deterministic but more legible and adaptable

### Workstream D: Finish Alerting and Governance

Deliverables:

- richer digest urgency model
- broader destructive-action gates
- operator-facing governance guidance updates

Exit criteria:

- high-impact automation paths are explicitly bounded and reviewable

### Workstream E: Push Operator UX to Excellent

Deliverables:

- improved run-detail decision context
- better budget and digest operations
- richer remediation UX

Exit criteria:

- the UI feels like an operator console, not just an internal dashboard

## 5. Quality Bar For Done

The final-mile work is done when all of the following are true:

- remaining helper and repository ambiguity is no longer material
- plans, checkpoints, cancellations, rollbacks, and locks are all policy-complete
- research ingestion is extensible by contract
- preference learning is more granular and more visible
- digest handling reflects recurrence, urgency, and operator burden appropriately
- the UI is strong in both steady-state monitoring and failure handling
- metrics and scorecards can meaningfully support iteration decisions

## 6. Recommended Next Order

Recommended order from here:

1. Finish structural cleanup and repository adoption
2. Add checkpoint-required and cancellation policy
3. Deepen preference dimensions and ranking explanations
4. Expand digest urgency and governance policy
5. Improve budget, digest, and remediation UX
6. Complete observability and scorecard depth

## 7. Summary

The repo no longer needs rescue work.

What it needs now is final-mile excellence:

- sharper policies
- clearer reasoning surfaces
- richer operator control
- better metrics for continuous improvement

That is a much better place to be than the repo's starting point, and it means the remaining work can be deliberate rather than reactive.
