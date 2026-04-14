# Data Model Reference

## Core entities

- `AutopilotProject`: project-level configuration, automation tier, scheduling, and pause state.
- `ProductProgramRevision`: versioned product strategy context.
- `ResearchCycle`: a bounded research run with query, status, report content, and reproducible snapshot metadata.
- `ResearchFinding`: normalized evidence with provenance, confidence, freshness, source quality, topic, signal family, and dedupe annotations.
- `Idea`: a ranked product opportunity linked back to research evidence and operator learning signals.
- `PreferenceProfile`: deterministic aggregate of swipe and approval signals used by ideation.
- `PlanningArtifact`: structured execution plan with implementation, rollout, test, and approval data.
- `DeliveryRun`: one execution instance for an approved idea.
- `Checkpoint`: a resumable snapshot of run state and convoy task states.
- `ReleaseHealthCheck`: post-change validation scoped to a run.
- `RollbackAction`: the rollback response to a failed health check.

## Operator entities

- `Digest`: operator-facing alerts and summaries with lifecycle state.
- `OperatorIntervention`: notes, nudges, and checkpoint requests logged against runs.
- `LearnerSummary`: run retrospective and measurable outputs.
- `KnowledgeEntry`: reusable procedure, lesson, pattern, or skill captured from completed work.

## Key invariants

- Research finding duplicates must reference `duplicateOfFindingId`.
- Terminal delivery runs must have `completedAt`; non-terminal runs must not.
- Active workspace leases and product locks cannot have `releasedAt`.
- Dismissed digests must have `dismissedAt`.
- Failed release-health checks must have `failedAt`; passed checks must have `passedAt`.
- `restore_checkpoint` rollbacks require a checkpoint; `revert_commit` rollbacks require a commit SHA.

## Lookup conventions

- All project-scoped entities use `companyId` plus `projectId`.
- Run-scoped data additionally keys on `runId`.
- Cross-entity lookup semantics should go through `src/repositories/autopilot.ts` instead of raw helper calls.
