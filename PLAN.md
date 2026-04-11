# Plan: Paperclip Product Autopilot Plugin

## Context

This is a NEW Paperclip plugin project. The PRD defines an Autensa-inspired product-improvement engine built as a Paperclip plugin.
Paperclip plugin architecture: TypeScript/React, worker process, manifest-driven, capability-gated, company/project-scoped.
MVP scope (Phase 1): project onboarding, Product Program, research cycles, idea generation, swipe review, preference model, maybe pool, dashboard widgets, company page, project tabs.

## Task List

### TASK-1: Scaffold plugin project structure
Create the complete project scaffold:
- package.json with @paperclipai/plugin-sdk dependencies
- tsconfig.json
- esbuild config for worker + UI bundles
- dist/ directory structure
- Plugin entrypoints

### TASK-2: Write plugin manifest (manifest.ts)
Define:
- plugin id, name, version
- capabilities (companies.read, projects.read, entities.read/write, plugin.state.write, jobs.schedule, events.subscribe, ui.*)
- UI slots: company page, project detailTabs (overview, program, ideas, research, runs, costs, knowledge), dashboardWidget
- Jobs: research-scheduler, idea-scheduler, maybe-pool-resurfacer
- Plugin categories: automation, ui

### TASK-3: Define TypeScript entity types
Create src/types/entities.ts with ALL entity interfaces:
- AutopilotProject, ProductProgramRevision, ResearchCycle, ResearchFinding, Idea, SwipeEvent, PreferenceProfile, DeliveryRun, ConvoyTask, KnowledgeEntry, WorkspaceLease
All scoped by companyId + projectId per the multi-company isolation requirements.

### TASK-4: Implement worker: data layer (src/worker/)
- PluginEntities registry for each entity type
- CRUD operations for all entities
- State helpers for preference model, maybe pool

### TASK-5: Implement worker: job handlers (src/worker/jobs/)
- Research job: trigger research, store findings
- Ideation job: generate ideas from Product Program + findings
- Maybe pool resurfacer: check and re-queue maybed ideas

### TASK-6: Implement worker: idea engine (src/worker/ideation.ts)
- Generate scored ideas from Product Program + research findings + preference profile
- Deduplication against existing ideas
- Each idea: title, summary, category, impactScore, feasibilityScore, complexity, approach, risks, researchRefs, status

### TASK-7: Implement worker: delivery orchestrator (src/worker/delivery.ts)
- Create Paperclip issues for approved ideas
- Dispatch build/test/review agents via ctx.agents
- Track delivery_run status
- Basic PR creation flow

### TASK-8: Implement worker: learner engine (src/worker/learner.ts)
- After run completion: extract reusable knowledge
- Store as knowledge_entry entities
- Inject into future planning runs

### TASK-9: Implement worker: plugin entrypoint (src/worker/index.ts)
- Register all entity handlers
- Register all jobs
- Register tools (startResearch, generateIdeas, swipeIdea, getSwipeQueue, etc.)
- Event handlers
- All capability-gated API calls properly scoped by companyId/projectId

### TASK-10: UI — shared components and layout (src/ui/)
- PluginLayout, CompanyContext, ProjectContext wrappers
- LoadingStates, EmptyStates
- Card, Button, Badge, Modal primitives
- API client hooks (useApi, usePluginData)

### TASK-11: UI — Company page and dashboard widgets
- CompanyAutopilotPage: list all autopilot projects, grouped by status
- AutopilotHealthWidget: pending ideas, over budget, paused, stuck runs, awaiting approvals
- Sidebar launcher

### TASK-12: UI — Project tabs: Overview
- ProjectAutopilotOverview: key metrics, quick actions, status panel
- StartResearch button, GenerateIdeas button
- Pause/resume autopilot

### TASK-13: UI — Project tabs: Program editor
- ProductProgramEditor: edit all 10 required sections
- Version history sidebar
- Save/revision logic

### TASK-14: UI — Project tabs: Ideas and Swipe view
- IdeasList: filterable/sortable list of all ideas
- IdeaCard: scores, summary, research refs, status badge
- SwipeDeck: Pass/Maybe/Yes/Now action buttons
- Quick-review and detail-review modes

### TASK-15: UI — Project tabs: Research
- ResearchCycleList: history of research runs
- ResearchReportView: findings, opportunities, threats
- StartResearchForm: configure inputs

### TASK-16: UI — Project tabs: Runs, Costs, Knowledge
- RunsTab: delivery run list, status, workspace refs
- CostsTab: budget caps, usage bars, alerts
- KnowledgeTab: searchable library of past learnings

### TASK-17: Build verification
- Build the plugin: pnpm build
- Verify all TypeScript compiles
- Verify worker and UI bundles are produced in dist/
