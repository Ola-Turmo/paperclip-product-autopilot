# End-User Test Guide

This document is the complete end-user validation guide for Product Autopilot.

It is designed for:

- operators
- product leads
- implementation teams
- QA
- anyone validating the plugin inside a real Paperclip instance

The goal is to test the full operator experience from installation through research, ideation, delivery, safety controls, and host integration.

## 1. Scope

This guide covers:

- plugin install and startup
- settings and project configuration
- project tab and operator workflow
- run detail workflow
- dashboard and widget surfaces
- idea and research flows
- digest and intervention flows
- checkpoint, health-check, and rollback flows
- packaging and smoke validation
- live Paperclip host validation

## 2. Preconditions

Before starting, ensure:

1. You have access to a Paperclip instance with board-level access.
2. The plugin is installed from the current build or published package.
3. The Paperclip host can run plugin workers and serve plugin UI bundles.
4. If you are validating live-host behavior, you have API access and host access as needed.

Recommended validation environments:

- local clean checkout
- one real Paperclip host

## 3. Build and Package Validation

Run these from the repo root:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run smoke:plugin
npm run smoke:devserver
npm pack --dry-run
```

Expected result:

- all commands succeed
- the package tarball includes:
  - `dist/`
  - `README.md`
  - readme image assets
  - docs shipped by package policy

## 4. Plugin Install Test

### 4.1 Install in Paperclip

Install the plugin in a Paperclip workspace or host.

Expected result:

- plugin shows up in the Paperclip plugin list
- plugin transitions to `ready`
- plugin health endpoint returns healthy
- UI contributions are visible

### 4.2 Worker startup

Verify:

- worker starts without crash loops
- plugin tools are registered
- scheduled jobs are registered
- UI bundle is served

Expected result:

- no manifest load errors
- no worker entrypoint resolution errors
- no missing UI export errors

## 5. Settings Page Test

Open the plugin settings page.

Verify:

1. The page renders.
2. Existing configured projects are visible.
3. Status pills are correct.
4. Tier and budget summaries are readable.

Expected result:

- settings view is not empty if projects exist
- active vs paused states are correct
- no broken or missing fields

## 6. Project Setup Test

Open a project and go to the Product Autopilot detail tab.

### 6.1 Save project configuration

Set:

- enabled = true
- automation tier
- budget minutes
- repository URL

Save.

Expected result:

- success feedback appears
- values persist after refresh
- partial saves do not wipe existing optional fields

### 6.2 Sidebar entry

Check the project sidebar.

Expected result:

- Product Autopilot entry is visible
- status is correct
- service/project context is visible

## 7. Overview and Metrics Test

On the project tab, verify:

- hero section
- KPI cards
- overview counts
- budget status

Expected result:

- overview data is consistent with current entity state
- counts reflect ideas, runs, completed runs, failed runs, and swipes

## 8. Research Flow Test

### 8.1 Start a research cycle

Start a new research cycle from the project tab or action path.

Expected result:

- research cycle record is created
- status is `running`
- query is stored

### 8.2 Add research findings

Add findings with:

- title
- description
- source URL
- source label
- source type
- optional source id and source timestamp

Expected result:

- findings are stored
- source normalization occurs
- `ingestedAt` is set for typed sources
- source quality and freshness scores are present
- topic and signal family are derived

### 8.3 Duplicate-finding test

Add another very similar research finding.

Expected result:

- duplicate is detected when similarity threshold is met
- duplicate annotation is stored

### 8.4 Complete research cycle

Complete the research cycle.

Expected result:

- cycle becomes `completed`
- snapshot is generated
- snapshot includes:
  - finding ids
  - topic counts
  - signal family counts
  - average freshness
  - average source quality
  - duplicate count

## 9. Idea Generation and Ranking Test

### 9.1 Generate ideas

Run idea generation for a project with research findings.

Expected result:

- ideas are created deterministically
- ideas include rationale
- source references are preserved
- duplicate annotation is applied where appropriate

### 9.2 Manual idea creation

Create an idea manually.

Expected result:

- manual idea is stored
- duplicate lookup is applied against existing active/maybe ideas

### 9.3 Review idea cards

Verify on the project tab:

- rationale is visible
- source reference is visible
- preference/outcome boost language is visible
- duplicate markers are visible

## 10. Swipe and Preference Learning Test

Record swipe decisions:

- pass
- maybe
- yes
- now

Expected result:

- swipe events are recorded
- idea statuses change correctly
- preference profile updates
- category/tag/complexity preferences update

Verify on the UI:

- Preference Signals section reflects the new state
- top category and complexity preference change when enough input exists

## 11. Planning Artifact Test

Create or trigger a planning artifact from an approved idea.

Expected result:

- planning artifact is created
- execution mode and approval mode are stored
- checkpoint requirement is derived correctly

Specifically verify:

- convoy plans require checkpoints
- high-complexity plans require checkpoints
- fullauto plans require checkpoints

## 12. Delivery Run Test

### 12.1 Create a run

Trigger a delivery run from an approved idea.

Expected result:

- run is created
- workspace lease is created
- product lock is created
- branch name is set

### 12.2 Pause and resume

Pause the run, then resume it.

Expected result:

- status changes correctly
- pause reason is stored and cleared appropriately

### 12.3 Cancel

Cancel the run.

Expected result:

- status becomes `cancelled`
- cancellation reason is stored
- lease and lock are released

## 13. Digest Test

Create conditions for:

- stuck run digest
- budget alert digest

Expected result:

- digests are created only when policy allows
- urgency is visible
- recommended action is visible
- recurrence/reopen/escalation data is preserved

### 13.1 Dismiss and cooldown

Dismiss a digest.

Expected result:

- digest transitions through the proper state machine
- cooldown metadata is stored

### 13.2 Reopen/escalation

Trigger the same underlying issue again after cooldown.

Expected result:

- digest can reopen
- escalation level increases when policy says so

## 14. Operator Intervention Test

On the run detail page:

- add operator note
- request checkpoint
- nudge run if available in flow

Expected result:

- interventions are recorded
- audit trail reflects them
- operator note text is preserved

## 15. Release Health Test

Create release health checks for a run.

Verify:

- pending checks render
- failed checks render with error detail
- overall health summary updates
- failure classification is visible when applicable

## 16. Checkpoint and Resume Test

Create a checkpoint for a running or paused run.

Expected result:

- checkpoint record is created
- checkpoint appears in audit trail

Resume from checkpoint.

Expected result:

- checkpoint restore only works when validation passes
- task states are restored correctly

## 17. Rollback Test

Trigger rollback from a failed health check.

Expected result:

- rollback action is created only from valid failed checks
- duplicate rollback requests are blocked
- checkpoint-based rollback requires a valid checkpoint
- full rollback requires explicit governance inputs

## 18. Learning and Knowledge Test

Create learner summary and knowledge entry records.

Expected result:

- summaries render in project and run contexts
- reusable knowledge renders correctly
- run-linked knowledge appears under the relevant run

## 19. UI Surface Checklist

Validate each surface individually:

### Project tab

- hero renders
- KPI cards render
- settings form works
- budget panel works
- research panel works
- digest inbox works
- evaluation scorecard renders
- learning section renders
- ideas and runs sections render

### Run detail tab

- status and controls render
- health section renders
- interventions section renders
- learning section renders
- audit timeline renders

### Dashboard widget

- renders with or without projects
- shows active projects clearly

### Project widget

- shows compact project summary
- status reflects current run health situation

### Sidebar item

- visible in project navigation
- reflects active/paused state

### Settings page

- lists configured projects
- reflects tier and budget summaries

## 20. Live Paperclip Host Validation

Use this only when validating against a real host.

Verify:

1. `GET /api/health`
2. authenticated session works
3. plugin appears in `/api/plugins`
4. plugin health endpoint returns healthy
5. `/api/plugins/ui-contributions` includes the plugin
6. `/api/plugins/tools` includes the expected tool list
7. `/api/plugins/tools/execute` succeeds for at least one real tool
8. at least one scheduled job runs successfully on the host

Expected result:

- local smoke should match live host behavior
- if live host differs, the gap should be documented as host/runtime behavior, not guessed

## 21. Pass Criteria

The plugin passes end-user validation when:

- install and startup succeed
- all UI surfaces render correctly
- core research, ideation, swipe, and delivery loops work
- digests, checkpoints, health checks, and rollback flows behave correctly
- local smoke and package validation pass
- live host validation confirms real tool execution and healthy plugin lifecycle

## 22. Failure Logging

When a test fails, record:

- exact step
- environment
- screenshot if UI-related
- request/response if API-related
- host logs if Paperclip-runtime-related
- whether the failure is:
  - plugin logic
  - plugin packaging
  - host runtime
  - environment/config

That distinction matters because the plugin and the Paperclip host are not the same thing.
