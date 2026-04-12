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

## 15. Living Backlog

This section replaces phase-based planning. It should be kept current as implementation progresses.

### In Progress

- [x] Add a dedicated PRD and execution document in `docs/`.
- [x] Make the root `src/*` tree the authoritative implementation path and reduce nested `src/autopilot/*` files to wrappers.
- [x] Align plugin manifest categories, capabilities, slot types, and entity types with the current Paperclip SDK.
- [x] Replace the hard-coded SDK alias in [esbuild.config.mjs](/G:/My%20Drive/_local/_myrepos/paperclip-product-autopilot/esbuild.config.mjs) with a portable build setup.
- [x] Ensure `paperclipPlugin` output paths and manifest entrypoints point to the root build artifacts.
- [x] Replace outdated UI SDK assumptions with current APIs.
- [x] Get `npm run typecheck` and `npm run build` passing from a clean clone.
- [x] Add baseline automated tests so `npm test` passes.
- [x] Add CI for install, typecheck, test, and build.
- [x] Add runtime schema validation for core persisted entities.
- [x] Extract overview aggregation and budget/stuck-run policy logic into testable services.
- [x] Extract swipe decision and maybe-pool resurfacing logic into testable services.
- [x] Extract planning artifact and delivery bootstrap builders into testable services.
- [x] Add worker integration tests for swipe actions, delivery lifecycle, and maybe-pool resurfacing jobs.
- [x] Unify the action/tool swipe paths so they create matching downstream state.
- [x] Deduplicate pending sweep digests so hourly jobs do not spam repeated alerts.
- [x] Add typed repository and orchestration layers for the main swipe/digest workflows.
- [x] Add lifecycle builders, validation, and observability for checkpoints, release health, and rollback flows.

### Next

- [ ] Split [src/worker.ts](/G:/My%20Drive/_local/_myrepos/paperclip-product-autopilot/src/worker.ts) into domain services, repositories, actions, tools, jobs, and policies.
- [ ] Formalize state machines for idea, run, digest, checkpoint, and rollback transitions.
- [ ] Introduce runtime validation for persisted entities.
- [ ] Add typed repository interfaces around `ctx.entities`.
- [ ] Add unit tests for helpers and domain services.
- [ ] Add manifest contract tests and UI smoke tests.
- [ ] Add CI for install, typecheck, build, and test.
- [ ] Define structured event logging and metrics primitives.

### Later

- [ ] Define signal ingestion interfaces.
- [ ] Add structured provenance fields to research findings.
- [ ] Add a stronger idea scoring and ranking framework.
- [ ] Improve duplicate detection beyond simple token overlap.
- [ ] Expand preference learning beyond raw swipe counts.
- [ ] Add replay evaluation for idea ranking and safety behavior.
- [ ] Add run audit timeline and evidence drill-down.
- [ ] Add policy-gated delivery actions and stronger rollback semantics.

## 16. Prioritized Backlog

### P0

- Fix manifest contract mismatches
- Fix UI SDK mismatches
- Remove duplicate source-tree ambiguity
- Make build portable
- Add tests folder and baseline test coverage
- Add CI

### P1

- Extract services from monolithic worker
- Formalize state machines
- Improve duplicate detection
- Build run audit timeline
- Add structured event taxonomy

### P2

- Rich preference learning
- Advanced ranking
- Replay evaluation harness
- Enhanced dashboarding

### P3

- Enterprise governance features
- Advanced analytics connectors
- Multi-project optimization

## 17. Open Questions

- Which Paperclip SDK version and plugin APIs are the true long-term target?
- What external systems are first-class signal sources in V1?
- What actions are allowed in full-auto mode, and which must remain supervised forever?
- How should outcome measurement be wired into product analytics?
- What organizational guardrails are required before enabling autonomous delivery by default?

## 18. Immediate Next 10 Tasks

1. Collapse the codebase to one authoritative source tree.
2. Update manifest definitions to match the Paperclip SDK.
3. Fix `package.json` plugin output paths and dev scripts.
4. Replace the non-portable esbuild alias strategy.
5. Refactor the UI to current SDK component contracts.
6. Add a minimal `tests/` suite for helper and manifest coverage.
7. Add GitHub Actions CI.
8. Split `worker.ts` into feature modules.
9. Add runtime schemas for persisted entities.
10. Define structured event logging and metrics primitives.

## 19. Definition of Done

This PRD is complete when the project can credibly claim:

- It installs, builds, tests, and packages from a clean clone.
- It matches the current Paperclip SDK contracts.
- It provides a safe, understandable, and auditable autonomy loop.
- It has measurable product and system outcomes.
- It can be trusted by a serious product team.
