# PRD: Evaluator-Driven Code Optimization Mode For Paperclip Product Autopilot

## Summary

Add an evaluator-driven engineering optimization mode to
`paperclip-product-autopilot`.

This PRD salvages the most valuable distinct functionality from the archived
repo `paperclip-autoresearch-improver`, especially:

- score-improvement policies
- evaluator command parsing and score extraction
- git-worktree sandbox execution
- mutable-path scoping
- delivery runs tied to scored candidate mutations

The live `paperclip-product-autopilot` is a product-signal and delivery system.
The archived repo adds a concrete optimization engine for repository-level
improvement loops. That is valuable, but it belongs as a mode or module inside
the current product-autopilot system rather than as a separate top-level repo.

## Problem

The live product-autopilot system can ingest signals, rank ideas, govern
delivery, and run controlled execution. What it does not clearly provide is a
repeatable loop for evaluator-driven code improvement where the system can:

- mutate a constrained part of a repo
- run an objective scorer
- compare score deltas
- accept only strict improvements
- package accepted wins into reviewable delivery artifacts

That makes the live system strong at deciding what to ship, but weaker at
automating engineering-quality ratchets once a target surface has been chosen.

## Users

- Staff engineers running quality ratchets
- Product or platform teams seeking continuous repo improvement
- Operators who want bounded automation with measurable gain

## Goals

- let operators define a mutable surface and scorer
- run candidate improvements in isolated worktrees
- accept only statistically or policy-valid score improvements
- keep all runs auditable and reviewable
- integrate code-optimization runs into the live autopilot governance model

## Non-Goals

- Replacing full product ranking and signal ingestion
- Running unrestricted self-editing across an entire monorepo
- Auto-merging code without review controls

## Product Requirements

### 1. Optimizer Definition

Operators must be able to define:

- workspace path
- mutable paths
- evaluation command(s)
- score extraction strategy
- score direction (`higher_is_better` or `lower_is_better`)
- improvement policy (`threshold`, `confidence`, or `epsilon`)

### 2. Isolated Candidate Execution

Each candidate run must execute in an isolated git worktree or equivalent clean
workspace copy.

Isolation requirements:

- no writes to the source workspace
- full diff artifact preserved
- command output captured
- failed candidate cleanup

### 3. Score Extraction And Comparison

The system must support:

- numeric extraction from raw command output
- optional regex-based score parsing
- optional dot-path extraction from structured output
- multi-metric aggregation

### 4. Acceptance Policies

The system must support:

- strict-threshold improvement
- epsilon-aware acceptance for noisy scorers
- confidence-aware policy when repeated measurements are available
- hard rejection on quality gate regressions

### 5. Delivery Integration

Accepted candidates must become first-class delivery artifacts in the live
autopilot system with:

- score delta
- diff preview
- run metadata
- guardrail output
- optional PR generation

### 6. Templates

The system should ship with starter optimizer templates for:

- test reliability
- lighthouse / web performance
- eslint / static quality
- bundle size
- targeted service-level quality scorecards

## UX / Operator Surface

The live autopilot UI should add:

- optimizer definitions
- run history
- score trend charts
- stagnation alerts
- accepted / rejected candidate drill-downs

## Success Metrics

- operators can configure a new optimizer in under 10 minutes
- accepted runs show measurable score improvement with no hidden regressions
- false-positive acceptance rate stays near zero
- teams can run quality ratchets continuously without manual repo juggling

## Delivery Phases

### Phase 1

- import optimizer definition model
- add worktree sandbox runner
- implement score extraction and threshold policies

### Phase 2

- integrate with delivery runs and audit timeline
- add built-in templates and UI surfaces
- add optional PR generation

### Phase 3

- support multi-metric aggregation and confidence policies
- add automatic stagnation detection and recommendation loops
- connect optimizer outcomes back into product-autopilot preference learning

## Why This Is Worth Salvaging

This functionality is materially distinct from the current live repo. The live
repo decides and governs product improvement work; the archived repo contributes
an engine for objectively scoring engineering mutations. Combined, they produce
a stronger end-to-end autopilot.

