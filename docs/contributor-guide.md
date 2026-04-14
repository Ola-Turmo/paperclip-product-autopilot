# Contributor Guide

## Working rules

- Keep `main` green: `npm run typecheck`, `npm test`, `npm run build`, and `npm pack --dry-run` must pass.
- Prefer repository methods over direct helper access from worker modules.
- Keep Paperclip adapter logic in `src/worker/*` thin and move reusable logic into `src/services/*`.
- Add runtime schema coverage in `src/schemas.ts` whenever you add or materially change a persisted entity.

## Testing expectations

- Add unit tests for new pure services.
- Add worker integration tests when behavior crosses repository, lifecycle, or Paperclip boundaries.
- Add regression fixtures for ranking, dedupe, safety, or policy behavior when logic becomes more sophisticated.

## Module map

- `src/worker/*`: Paperclip registration and adapter layer.
- `src/repositories/*`: entity persistence and lookup facade.
- `src/services/*`: state machines, policies, ideation, research, evaluation, audit, and observability.
- `src/ui/*`: operator console surfaces.
- `tests/*`: unit and integration coverage.

## When adding autonomy

- Prefer deterministic baselines over opaque heuristics.
- Add event names and metrics for new high-signal transitions.
- Expose operator reasoning in the UI when a ranking or policy becomes more complex.
