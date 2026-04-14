# Architecture

Paperclip Product Autopilot is structured around four layers:

- Worker adapters in `src/worker/*` register Paperclip data, actions, tools, and jobs.
- Repository adapters in `src/repositories/*` isolate entity persistence and lookup semantics.
- Domain and application services in `src/services/*` implement scoring, lifecycle, research, policy, and audit logic.
- UI adapters in `src/ui/*` render operator-facing state and invoke registered actions.

## State ownership

- `AutopilotProject` owns project-level configuration, automation mode, and pause state.
- `ResearchCycle` and `ResearchFinding` own evidence collection and reproducible snapshots.
- `Idea` and `PreferenceProfile` own the opportunity queue and learned ranking signals.
- `PlanningArtifact`, `DeliveryRun`, `Checkpoint`, `ReleaseHealthCheck`, and `RollbackAction` own delivery execution and safety controls.
- `Digest`, `OperatorIntervention`, `LearnerSummary`, and `KnowledgeEntry` own operator awareness and feedback loops.

## Service boundaries

- `research.ts`, `ideation.ts`, `duplicates.ts`, and `preference-learning.ts` are decision-quality services.
- `delivery.ts`, `lifecycle.ts`, `state-machines.ts`, `invariants.ts`, and `rollback-policy.ts` are safety and execution services.
- `overview.ts`, `audit.ts`, `policy.ts`, `policy-evaluation.ts`, and `quality-scorecard.ts` are read-model and evaluation services.
- `observability.ts` and `event-taxonomy.ts` own counters, duration metrics, and telemetry naming.

## Current invariants

- Lifecycle transitions are explicit and test-covered.
- Persisted entities are runtime validated through `src/schemas.ts`.
- Planning artifacts must be actionable, non-empty, and approval-safe.
- Delivery runs cannot start on locked branches or missing workspace paths.
- Rollbacks cannot be duplicated for the same failed health check and must target a valid checkpoint or commit when required.

## Evolution guidance

- New Paperclip handlers should stay thin and delegate to repository and service layers.
- New persisted entity types should add both runtime schema coverage and repository methods.
- New autonomy features should ship with replay fixtures or regression tests before being surfaced in the UI.
