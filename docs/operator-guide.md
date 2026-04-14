# Operator Guide

## Approval boundaries

- `supervised`: operators decide when approved ideas become delivery runs.
- `semiauto`: approved ideas can progress more aggressively, but budget and health controls still gate execution.
- `fullauto`: the system may auto-approve planning artifacts, but rollback, checkpoint, digest, and intervention controls remain visible and auditable.

## Daily workflow

1. Review research snapshots and the idea queue.
2. Use swipe decisions to teach the ranking system.
3. Inspect planning artifacts before high-risk work.
4. Monitor active delivery runs, release-health checks, and digests.
5. Add notes, request checkpoints, pause/resume runs, or trigger rollback when needed.
6. Review learner summaries and knowledge entries after runs complete.

## Safety controls

- Budget exhaustion pauses autonomous work.
- Product locks prevent concurrent writes to the same branch.
- Checkpoints capture resumable execution state.
- Failed release-health checks are the trigger point for rollback actions.
- Duplicate rollback requests for the same failed check are rejected.
- `merge_lock` acquisition requires an explicit governance note.
- `full_rollback` requires explicit operator acknowledgment plus a governance note.
- Auto-approved plans are limited to `fullauto` mode and cannot be convoy or high-complexity plans.

## Auditability

- Use the run audit timeline to inspect checkpoints, health checks, interventions, digests, and rollback actions together.
- Use the evaluation scorecard to see whether idea ranking and digest policy are improving.
