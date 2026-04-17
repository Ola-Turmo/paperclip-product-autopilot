# Schema Compatibility Policy

Status: Active  
Owner: Paperclip Product Autopilot

This document defines how persisted entity schemas may evolve without breaking existing plugin state, tests, or operator workflows.

## Compatibility Rules

1. Additive changes are the default.
New fields may be added as optional fields first.

2. Required fields require a safe transition.
If a field must become required, first ship it as optional plus runtime backfill logic and tests, then make it required after existing state can be parsed safely.

3. Entity keys and scopes are stable contracts.
Do not change `entityType`, `scopeKind`, `scopeId`, or lookup semantics for an entity without a migration plan and repository coverage.

4. Persisted enums must evolve conservatively.
Adding a new enum value requires:
- schema updates
- runtime handling
- UI handling where relevant
- tests for old and new values

5. Derived fields must be reproducible.
If a persisted field is derived from other inputs, its derivation logic must live in a service or repository boundary and have deterministic test coverage.

## Migration Approach

When a persisted shape changes materially:

1. Add parse-safe schema support for both old and new shapes.
2. Backfill or normalize on read or write through a single service boundary.
3. Add repository or integration tests that cover pre-change and post-change records.
4. Only then tighten runtime validation if the old shape is no longer accepted.

## Current High-Risk Areas

- `ResearchFinding`
These records carry normalized provenance and should stay backward-compatible as source metadata grows.

- `PlanningArtifact`
These records now encode runtime policy, so new policy fields should be introduced additively.

- `RollbackAction`
Lifecycle closure fields must remain consistent with rollback status transitions.

## Verification Requirements

Any schema-affecting change should include:

- schema tests
- repository round-trip coverage when the entity is persisted
- worker integration coverage when actions create or mutate the entity
- a note in `docs/world-class-prd.md` if the backlog status changes materially
