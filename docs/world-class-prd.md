# Paperclip Product Autopilot

## World-Class PRD and Execution Backlog

Status: Draft  
Owner: Ola-Turmo  
Repo: `Ola-Turmo/paperclip-product-autopilot`  
Last updated: 2026-04-12

## 1. Executive Summary

Paperclip Product Autopilot should become the best-in-class autonomous product improvement system for software teams running inside Paperclip. It should not be a loose collection of plugin handlers and UI panels. It should be a reliable product operating system that continuously:

1. Understands product context.
2. Runs disciplined research.
3. Generates and scores ideas.
4. Learns from human decisions.
5. Plans and executes delivery safely.
6. Measures outcomes.
7. Improves its own future decisions.

The current repository has promising domain coverage but is not yet in a production-ready state. It does not typecheck, does not build in a portable environment, has no tests, and has drift between manifest, UI, SDK contracts, and packaging. This PRD defines the target system and the work required to reach a genuinely world-class standard.

## 2. Product Vision

Build an autonomous product improvement engine that acts like a disciplined product team member, not a demo bot.

It should:

- Continuously discover opportunities from user feedback, product analytics, incident signals, roadmap context, competitor moves, and market research.
- Convert raw signals into structured, evidence-backed product opportunities.
- Learn operator preferences over time through swipes, approvals, deferrals, and outcomes.
- Execute approved work through safe, observable delivery runs with checkpoints, budgets, locks, and rollback.
- Produce measurable business value while staying aligned with product strategy and operator control.

## 3. Product Principles

### 3.1 Reliability over theatrics

The system must prefer correct, auditable, resumable behavior over flashy autonomy claims.

### 3.2 Human control at every risk boundary

Operator review must exist at strategy shifts, unsafe delivery actions, budget thresholds, destructive changes, and unclear evidence.

### 3.3 Evidence before ideation

Ideas should never be generated in a vacuum. Every idea should trace back to structured evidence and explicit reasoning.

### 3.4 Learning loop, not a one-shot loop

The system should improve from swipe behavior, execution outcomes, rollout metrics, and post-run retrospectives.

### 3.5 Portable, testable, boring infrastructure

The plugin should build cleanly from a fresh clone, run locally, and pass deterministic validation in CI.

## 4. Users and Jobs To Be Done

### 4.1 Founder / product lead

Needs a prioritized stream of worthwhile product improvements without manually synthesizing all product signals.

### 4.2 Staff engineer / tech lead

Needs proposed work to be technically scoped, safe to execute, and grounded in delivery constraints.

### 4.3 Operator / reviewer

Needs a fast review surface to approve, defer, reject, pause, resume, and inspect autopilot activity.

### 4.4 Team / organization

Needs the system to be trustworthy, observable, secure, and aligned with budgets, strategy, and ownership.

## 5. Core Problems To Solve

The current product concept must solve these real problems:

- Product research is scattered across tickets, analytics, support, Slack, docs, and intuition.
- Ideas are often unscored, repetitive, and disconnected from strategic goals.
- Teams struggle to move from “interesting idea” to “safe, scoped, executable change.”
- Autonomous systems fail when they cannot explain why they acted, what they changed, or how to roll back.
- Learning from human judgments is usually lost instead of formalized.

## 6. Current State Assessment

### 6.1 Strengths

- Strong conceptual model for research, ideas, planning, runs, locks, checkpoints, and budgets.
- Broad domain entity coverage.
- Clear ambition toward supervised autonomy.
- Early UI prototype exists for major workflows.

### 6.2 Current gaps

- Manifest does not match current Paperclip SDK contracts.
- UI imports and props are out of sync with the SDK.
- Two parallel source trees create ambiguity and maintenance risk.
- Build relies on a local sibling SDK checkout and is not portable.
- Tests are absent.
- No CI quality gate exists.
- No formal observability, metrics model, or event taxonomy exists.
- No security or privacy model is documented.
- No evaluation harness exists for idea quality, planning quality, or delivery safety.

## 7. World-Class Outcome Definition

This project is world-class when all of the following are true:

- Fresh clone works with standard install, build, test, and package commands.
- Plugin contracts are fully aligned with the Paperclip SDK version in `package.json`.
- All core flows are covered by deterministic tests.
- Delivery actions are resumable, observable, and rollback-capable.
- Ideas are evidence-backed, deduplicated, scored, and ranked.
- Preference learning materially improves suggestion quality over time.
- Operators can understand every decision, every action, and every failure.
- The system can be safely used on real product work, not just toy demos.

## 8. Target Product Scope

### 8.1 Core loop

1. Ingest signals.
2. Normalize and store evidence.
3. Produce research cycles.
4. Generate and deduplicate ideas.
5. Learn from swipes and outcomes.
6. Create planning artifacts.
7. Run supervised delivery.
8. Validate release health.
9. Record outcomes and lessons.
10. Reinject learnings into the next cycle.

### 8.2 Required surfaces

- Project detail experience
- Sidebar/status surface
- Dashboard summary surface
- Settings/admin surface
- Run detail and run audit surface
- Operator digest and intervention surface

### 8.3 Required operating modes

- Disabled
- Supervised
- Semi-automatic
- Full automatic with explicit enterprise-grade safety controls

## 9. Non-Goals For V1

- Full autonomous production deployment without human approval
- Multi-tenant cloud control plane
- Cross-company benchmarking
- Complex ML ranking infrastructure before high-quality deterministic baselines exist
- General-purpose issue tracker replacement

## 10. Target Architecture

### 10.1 Codebase architecture

Adopt one authoritative source tree. Eliminate split-brain structure between root `src/*` and `src/autopilot/*`.

Recommended structure:

```text
src/
  manifest/
    index.ts
  worker/
    index.ts
    data/
    actions/
    tools/
    jobs/
    services/
    policies/
  domain/
    entities.ts
    value-objects.ts
    schemas.ts
  persistence/
    repositories/
    mappers/
  ui/
    pages/
    widgets/
    components/
    hooks/
  integrations/
    github/
    paperclip/
    analytics/
    research/
  evaluation/
    fixtures/
    scoring/
  tests/
    unit/
    integration/
    contract/
    e2e/
```

### 10.2 Service boundaries

Separate business logic from Paperclip adapter code:

- Domain layer: pure decision logic and state transitions
- Repository layer: Paperclip entity persistence
- Application layer: orchestrates use cases
- Adapter layer: Paperclip plugin APIs, UI hooks, external connectors

### 10.3 State model

All important state transitions must be explicit and validated:

- Research cycle states
- Idea lifecycle states
- Planning artifact states
- Delivery run states
- Health check states
- Rollback states
- Digest states

### 10.4 Event model

Introduce a normalized event log with immutable event records for:

- signal_ingested
- research_started
- research_completed
- idea_created
- idea_deduplicated
- swipe_recorded
- plan_approved
- run_started
- checkpoint_created
- run_paused
- run_resumed
- health_check_passed
- health_check_failed
- rollback_triggered
- lesson_captured

## 11. Functional Requirements

### 11.1 Research intelligence

- Support multiple signal inputs.
- Store provenance for every finding.
- Capture confidence, freshness, category, and source quality.
- Group findings into cycles with clear objectives.

Acceptance criteria:

- Every finding has `source`, `timestamp`, `confidence`, and `category`.
- Research cycles can be started, completed, queried, and audited.
- Research output is reproducible and attributable.

### 11.2 Idea engine

- Generate ideas from evidence, not freeform prompts alone.
- Score for impact, feasibility, complexity, and strategic fit.
- Deduplicate using deterministic heuristics plus semantic similarity later.
- Maintain active, maybe, approved, rejected, in-progress, completed, and archived states.

Acceptance criteria:

- Every idea points to evidence references.
- Duplicate annotation exists and is test-covered.
- Rankings are stable and explainable.

### 11.3 Preference learning

- Convert swipe behavior and outcome quality into preference signals.
- Learn category, tag, score, and complexity preferences.
- Avoid opaque ML-only behavior in V1.

Acceptance criteria:

- Preference profile updates deterministically after every swipe.
- Explanations show how prior decisions influenced ranking.

### 11.4 Planning system

- Convert approved ideas into planning artifacts.
- Capture implementation spec, dependencies, rollout plan, test plan, and approval checklist.
- Distinguish execution mode and approval mode.

Acceptance criteria:

- Plans are structured and machine-readable.
- Plans can be reviewed before delivery starts.

### 11.5 Delivery orchestration

- Support creation, pause, resume, completion, and cancellation of runs.
- Enforce workspace lease ownership and product locks.
- Support convoy tasks for multi-step execution.
- Require checkpoints at risk boundaries.

Acceptance criteria:

- Every run has a clear lifecycle and audit trail.
- Stuck runs are detected and surfaced.
- Rollback paths exist before destructive actions.

### 11.6 Safety and governance

- Budget enforcement
- Branch and path locking
- Rollback checkpoints
- Approval boundaries
- Intervention log
- Release health checks

Acceptance criteria:

- Budget exhaustion pauses future autonomous work.
- Unsafe execution paths cannot proceed without explicit authorization.

### 11.7 Operator UX

- Fast overview of project health
- Frictionless swipe queue
- Clear alerts and digests
- Deep inspection of runs, checkpoints, locks, and failures
- Settings that match actual execution behavior

Acceptance criteria:

- Main workflows require minimal navigation.
- Every critical action gives clear feedback and next-state visibility.

## 12. Quality Bar

### 12.1 Engineering standards

- `npm install` succeeds in a clean environment
- `npm run typecheck` passes
- `npm run build` passes
- `npm test` passes
- CI enforces all of the above
- No hard-coded local filesystem dependencies in build tooling

### 12.2 Test standards

- Unit tests for domain transitions
- Integration tests for Paperclip entity persistence
- Contract tests for manifest and UI slot compatibility
- E2E tests for core user flows
- Regression fixtures for duplicate detection, preference learning, and budget policies

### 12.3 UX standards

- No dead surfaces
- No placeholder panels in shipped build
- Empty states are useful
- Errors are actionable
- Loading states are consistent
- All major surfaces are visually coherent

### 12.4 Ops standards

- Structured logs
- Event taxonomy
- Metrics counters and durations
- Run auditability
- Failure classification
- Digest deduplication

## 13. Security and Privacy Requirements

- Define data classes: public research, internal product strategy, delivery metadata, operator notes.
- Minimize storage of sensitive external content.
- Redact or avoid secrets in logs and digests.
- Require explicit policy for GitHub and deployment actions.
- Add permission boundaries for autonomous behaviors.

Acceptance criteria:

- No secrets or tokens are persisted in entity data.
- Sensitive actions have policy gates and audit events.

## 14. Observability and Evaluation

### 14.1 Product metrics

- Research cycles completed per week
- Idea approval rate
- Maybe-to-approval conversion rate
- Duplicate rate
- Delivery success rate
- Rollback rate
- Time from idea approval to run completion
- Budget consumption per delivered outcome

### 14.2 System metrics

- Handler error rate
- Job runtime
- Queue depth
- Stuck run count
- Checkpoint frequency
- Lock contention rate

### 14.3 Evaluation loops

- Evaluate idea quality against operator decisions.
- Evaluate plan usefulness against execution success.
- Evaluate research freshness and signal diversity.
- Evaluate autonomy safety using replay fixtures.

## 15. Current State

Status on `main` as of 2026-04-12:

- `npm run typecheck` passes
- `npm test` passes
- `npm run build` passes
- `npm pack --dry-run` passes
- CI exists
- Build is portable
- Manifest and packaging are aligned with the current SDK surface
- Runtime validation exists for core entities
- Worker registrations are split into data, actions, tools, and jobs
- Action handlers are split by domain

Important caveat:

- The system is now structurally credible, but not yet state of the art. The remaining work is primarily around formal correctness, better decision quality, richer operator tooling, and evaluation.

## 16. Complete Todo

This is the authoritative backlog. Keep this list current. Do not create separate phased plans or duplicate issue lists.

### 16.1 Core architecture

- [x] Make `src/*` the authoritative source tree.
- [x] Split worker registration into data, actions, tools, and jobs modules.
- [x] Split action handlers into domain modules.
- [x] Move tool handlers into smaller domain modules instead of one file.
- [x] Move job handlers into smaller domain modules instead of one file.
- [~] Replace remaining direct helper calls in handlers with typed repository usage.
- [~] Expand the repository layer so all major entity access goes through repository interfaces.
- [ ] Separate pure domain logic from Paperclip adapter logic more aggressively.
- [ ] Introduce mappers or translators where plugin-facing DTOs and domain entities should diverge.
- [ ] Create a small domain package structure for state machines, policies, and scoring logic.

### 16.2 State machines and invariants

- [x] Formalize the idea lifecycle as an explicit state machine.
- [x] Formalize the delivery-run lifecycle as an explicit state machine.
- [x] Formalize the digest lifecycle as an explicit state machine.
- [x] Formalize checkpoint and rollback lifecycles as explicit state machines.
- [~] Prevent invalid transitions centrally instead of in scattered handlers.
- [ ] Add invariant validation helpers for impossible or contradictory entity states.
- [~] Add transition tests for every allowed and disallowed lifecycle step.
- [~] Add invariant checks into runtime validation paths where appropriate.

### 16.3 Persistence and schemas

- [x] Add runtime validation for core entities.
- [x] Extend schema coverage to every persisted entity type.
- [ ] Audit entity keys, scope rules, and lookup patterns for consistency.
- [ ] Add repository tests that assert entity persistence shape and lookup semantics.
- [ ] Reduce duplicate entity-query patterns by consolidating common repository methods.
- [ ] Add migration notes or compatibility policy for future schema changes.

### 16.4 Research intelligence

- [ ] Define signal-ingestion interfaces for research inputs.
- [ ] Add first-class provenance fields and source-quality scoring.
- [ ] Add freshness and confidence policies for findings.
- [ ] Add deduplication for research findings, not just ideas.
- [ ] Add support for grouping findings by signal family and topic.
- [ ] Add reproducible research-cycle snapshots.
- [ ] Add deterministic tests for provenance, dedupe, and freshness behavior.

### 16.5 Idea generation and ranking

- [x] Remove heuristic randomness from idea generation.
- [x] Replace the current simplistic idea generation path with evidence-backed generation inputs.
- [~] Build a deterministic scoring model for impact, feasibility, confidence, and strategic alignment.
- [~] Add explicit ranking explanations for every suggested idea.
- [~] Improve duplicate detection beyond simple overlap heuristics.
- [~] Add similarity fixtures and regression tests for duplicate handling.
- [~] Add scoring calibration fixtures so ranking behavior remains stable over time.

### 16.6 Preference learning and feedback loops

- [~] Expand preference learning beyond swipe counts.
- [~] Incorporate outcomes such as delivery success, rollback, health-check failure, and completion time.
- [ ] Track category, complexity, and execution-mode preference signals separately.
- [ ] Make preference explanations visible in ranking and operator review surfaces.
- [ ] Add regression tests for preference updates from both swipes and outcomes.

### 16.7 Planning and delivery orchestration

- [x] Extract delivery builders and policy logic into services.
- [ ] Make planning artifacts more structured and less free-form.
- [ ] Add stronger validation for approval mode, execution mode, and checklist completeness.
- [ ] Add convoy-task dependency validation and cycle detection.
- [ ] Add clearer rules for when checkpoints are mandatory.
- [ ] Add delivery-run cancellation semantics if cancellation is intended to be supported.
- [ ] Add run-time budget accounting hooks if Paperclip exposes the right telemetry.

### 16.8 Safety, rollback, and governance

- [x] Add checkpoint, release-health, and rollback primitives plus observability.
- [ ] Strengthen rollback policy and rollback-action semantics.
- [ ] Add stricter checkpoint restore validation.
- [ ] Add release-health aggregation logic across multiple checks.
- [ ] Add digest escalation and suppression policy.
- [ ] Add reopen rules, cooldown windows, and dedupe keys for digests.
- [ ] Add explicit policy gates for destructive or risky actions.
- [ ] Define full-auto boundaries that remain hard-coded supervised.
- [ ] Document governance policy in the repo, not just in code.

### 16.9 Observability and evaluation

- [x] Add basic lifecycle telemetry and metrics.
- [ ] Define a complete event taxonomy for all important transitions.
- [ ] Emit metrics for research, idea ranking, planning, delivery, rollbacks, and operator interventions.
- [ ] Add duration and latency metrics, not just counters.
- [~] Add structured failure categories.
- [~] Build a replay harness for decision evaluation.
- [~] Add benchmark fixtures for ranking quality, safety behavior, and digest behavior.
- [~] Add a simple scorecard that can answer whether the system is getting better.

### 16.10 UI and operator experience

- [x] Replace broken UI wiring with a working SDK-aligned UI.
- [~] Turn the UI from a stabilization surface into a true operator console.
- [x] Add a run audit timeline.
- [~] Add evidence drill-down for ideas and research findings.
- [~] Add budget and digest management surfaces.
- [~] Add run-detail and health-check UX that exposes decision context, not just raw records.
- [~] Add learning and knowledge-reuse visibility to operator surfaces.
- [ ] Add clearer intervention workflows for pause, resume, checkpoint, rollback, and note-taking.
- [ ] Add budget and digest management surfaces.
- [ ] Add better empty states, loading states, and error states.
- [ ] Add UI smoke tests.
- [ ] Add run-detail and health-check UX that exposes decision context, not just raw records.

### 16.11 Testing and verification

- [x] Add unit and integration coverage for the current baseline.
- [ ] Add transition-matrix tests for state machines.
- [x] Add repository contract tests.
- [ ] Add UI smoke tests.
- [ ] Add more worker integration tests around rollback, checkpoint restore, release-health aggregation, and digest escalation.
- [ ] Add fixture-driven tests for ranking and duplicate detection.
- [ ] Add package-install validation in CI from a clean environment.
- [ ] Add failure-path tests, not just happy-path tests.

### 16.12 Documentation and operator trust

- [x] Add this PRD/backlog document.
- [ ] Keep this backlog updated after every major refactor.
- [ ] Add architecture documentation for service boundaries and state ownership.
- [ ] Add a data model reference for persisted entities and their invariants.
- [ ] Add an operator guide describing approval boundaries, digests, rollback, and checkpoints.
- [ ] Add a contributor guide that explains the module structure and testing expectations.

## 17. Top Priority Order

If choosing what to do next, prioritize in this order:

1. Formal lifecycle state machines and invariants
2. Full repository-layer adoption and remaining helper-call cleanup
3. Better idea generation, scoring, and duplicate detection
4. Stronger safety and digest/rollback policy
5. Better observability and evaluation harnesses
6. Better operator UI

## 18. Definition of State-of-the-Art

This project can credibly claim to be state of the art only when all of the following are true:

- The core lifecycle is governed by explicit state machines and invariant enforcement.
- Research, ideas, plans, runs, digests, and rollback actions are fully auditable.
- Idea ranking is evidence-backed, explainable, and stable under test.
- Preference learning improves decisions using both human input and outcome data.
- Safety boundaries are explicit, tested, and visible in the UI.
- Operators can understand why the system acted, what it changed, and how to intervene.
- Evaluation harnesses show that new changes improve decision quality instead of just changing behavior.
- The repo remains installable, buildable, testable, and packageable from a clean clone.

## 19. Current Best Next Step

The single best next step is:

- Finish the state-machine rollout by covering digest transitions, remaining handler paths, and invariant enforcement, then continue the repository-layer adoption across the remaining action and tool modules with stronger tests around those boundaries.
