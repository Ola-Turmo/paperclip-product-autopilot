# Archived Autoresearch Improver Porting Matrix

This matrix maps the salvageable functionality from
`paperclip-autoresearch-improver` into the live
`paperclip-product-autopilot` repo.

Priority scale:

- `P1` ship first because it creates the new evaluator loop
- `P2` important integration work after the loop exists
- `P3` optional acceleration or polish

| Feature cluster | Archived source file(s) | Live destination module(s) | Priority | Notes |
| --- | --- | --- | --- | --- |
| Optimizer definition model | `src/types.ts`, `src/lib/optimizer.ts` | `src/services/evaluation.ts`, `src/services/policy-evaluation.ts`, `src/schemas.ts`, `src/types.ts` | P1 | Import the optimizer concepts into live evaluation primitives instead of keeping a parallel type system. |
| Score extraction and normalization helpers | `src/lib/optimizer.ts` | `src/services/evaluation.ts`, `src/services/quality-scorecard.ts`, `src/helpers.ts` | P1 | The archived helpers already cover raw number extraction, regex parsing, dot-path access, and metric normalization. |
| Score-improvement policies | `src/types.ts`, `src/lib/optimizer.ts` | `src/services/policy-evaluation.ts`, `src/services/governance.ts`, `src/services/invariants.ts` | P1 | Add `threshold`, `confidence`, and `epsilon` policies as first-class evaluator acceptance strategies. |
| Worktree sandbox execution | `src/worker.ts` | `src/services/execution-backend.ts`, `src/worker/actions-delivery.ts`, `src/worker/jobs.ts` | P1 | Keep repo mutation isolated from the main workspace and reuse existing delivery / execution plumbing. |
| Diff artifact and patch conflict handling | `src/types.ts`, `src/worker.ts` | `src/services/delivery.ts`, `src/services/audit.ts`, `src/worker/actions-delivery.ts` | P1 | The archived repo already models diff artifacts and PR metadata; the live repo should absorb those into delivery records. |
| Mutable path scoping | `src/lib/optimizer.ts` | `src/services/policy.ts`, `src/services/governance.ts`, `src/worker/actions-delivery.ts` | P2 | Treat mutable-path restrictions as governance boundaries, not just worker convenience. |
| Optimizer worker loop | `src/worker.ts`, `src/autopilot/worker.ts` | `src/services/orchestration.ts`, `src/services/lifecycle.ts`, `src/worker/actions-operations.ts`, `src/worker/jobs-sweep.ts` | P2 | Map the archived optimizer run lifecycle onto the live orchestration model instead of introducing another top-level worker. |
| Autopilot entity helpers | `src/autopilot/helpers.ts` | `src/repositories/autopilot.ts`, `src/services/overview.ts`, `src/services/preference-learning.ts` | P2 | Reuse only the parts that improve entity handling. Avoid duplicating the live repository layer. |
| Built-in scoring templates | `scripts/eslint-score.mjs`, `scripts/lighthouse-score.mjs`, `scripts/quality-score.mjs`, `scripts/score-json.mjs`, `scripts/test-score.mjs` | `src/services/evaluation-fixtures.ts`, `docs/`, `scripts/` | P2 | These are useful starter packs for operators and demos. |
| Optimizer UI | `src/autopilot/ui/index.tsx`, `src/ui/index.tsx` | `src/ui/index.tsx`, `preview/mock-plugin-ui.tsx` | P3 | The live product should absorb concepts, not copy the old UI wholesale. |

## Implementation Order

1. Add optimizer types, score extraction helpers, and acceptance policies.
2. Add isolated worktree execution and diff artifacts.
3. Integrate accepted candidates into live delivery records and audit trails.
4. Expose operator-facing templates and UI once the execution model is stable.
