# PRD: Paperclip Product Autopilot Plugin

**Subtitle:** Autensa-inspired product-improvement engine built directly inside Paperclip, with no separate Autensa deployment  
**Status:** Proposed  
**Date:** 2026-04-08  
**Audience:** Product, platform, and engineering operators building autonomous software teams on Paperclip

---

## 1. Executive Summary

This PRD proposes building an Autensa-inspired **Product Autopilot plugin** directly inside Paperclip instead of running Autensa as a separate system.

The research conclusion is:

- **Autensa is special because it is product-native, not company-native.** Its strongest idea is a closed-loop system for software products: research the market and product, generate scored ideas, let a human approve them with a lightweight decision interface, then drive build, test, review, and PR creation automatically.
- **Paperclip already provides most of the control-plane primitives needed to host that system**: companies, projects, issues, goals, budgets, recurring routines, multiple adapter types, plugin workers, plugin UI surfaces, outbound HTTP, state/entities, agent session hooks, and experimental execution workspaces.
- **Therefore, most of Autensa can be recreated inside Paperclip as a plugin** without using Autensa itself.
- **The hardest parts are execution-plane features**, not UI features: dependency-aware convoy execution, robust worktree isolation, merge coordination, port allocation, checkpoint/resume, and rich mid-run intervention.

**Decision:** Build a first-party or trusted Paperclip plugin named **Product Autopilot**. Do not deploy Autensa as a separate product. Use Autensa only as architectural inspiration.

**Expected outcome:** one control plane, one source of truth, native multi-company support, and an opinionated product-improvement loop that fits Paperclip's company/project model.

---

## 2. Why This Exists

Running both Paperclip and Autensa creates avoidable duplication:

- duplicate dashboards
- duplicate budgets and cost views
- duplicate task concepts
- duplicate operator workflows
- duplicate secrets and infrastructure
- uncertainty about which system is the source of truth

Paperclip is already designed to be the **control plane for AI companies**, with companies, org structure, budgets, goals, issues, approvals, adapters, and multi-company isolation. The missing piece is a **product-native loop** for continuously improving software products. That is what this PRD adds.

---

## 3. Research Findings

### 3.1 What Paperclip is

Paperclip is a control plane for AI-agent companies. It models **companies**, **agents**, **issues**, **goals**, **budgets**, and **governance**, and one Paperclip instance can run **multiple companies** with company-scoped boundaries. It explicitly describes itself as the company layer above agent runtimes, not the execution runtime itself.

Important Paperclip properties discovered in the research:

- Multi-company instance model
- Goal-aware task hierarchy
- Atomic issue checkout
- Agent adapters for local and remote runtimes
- Persistent agent state and session continuity
- Runtime skill injection and company skills
- Recurring routines and scheduled work
- Plugin SDK with worker processes, UI slots, jobs, events, state, entities, actions, tools, outbound HTTP, and agent session hooks
- Experimental execution workspaces and project workspace surfaces
- Comment interrupts and issue document revisions

### 3.2 What Autensa is

Autensa is not just a generic agent dashboard. It is a specialized **autonomous product engine**.

Its core loop is:

1. research a product and its market
2. generate scored ideas
3. collect lightweight human decisions through a swipe interface
4. plan and build approved ideas
5. test and review them
6. create PRs
7. learn from outcomes and preferences

Autensa's data model and control surface are very product-specific:

- Product
- Product Program
- Research cycles
- Ideas
- Swipe decisions
- Preference model
- Maybe pool
- Build pipeline
- Convoy DAGs for complex work
- Learner knowledge
- Per-product cost caps and automation tiers

### 3.3 What is special about Autensa

Autensa's distinctive value is **not** “multi-agent orchestration” in the abstract. Paperclip already does orchestration. What is special is the combination of the following product-native ideas:

#### A. Product Program
A living per-product instruction document that shapes what research and ideation should care about. This is much more specific than a generic company goal.

#### B. Swipe-based decisioning
Autensa reduces human involvement to a narrow, fast approval layer: Pass, Maybe, Yes, Now. That makes continuous product steering feel light instead of managerial.

#### C. Preference learning from product decisions
Every decision updates a per-product preference model. Over time the idea engine gets better at matching the owner's taste.

#### D. Research-first backlog generation
Autensa starts with codebase, live site, competitors, SEO gaps, and user intent, then turns that into scored ideas. That is different from a normal issue tracker.

#### E. Vertical delivery pipeline
Autensa is opinionated about how approved ideas become shipped work: planning, build, test, review, PR, rollback.

#### F. Execution safety for autonomous coding
Autensa treats isolated workspaces, port allocation, merge queues, product locks, and checkpoint recovery as first-class parts of autonomous delivery.

#### G. Learner and skills loop
Autensa tries to extract reusable build/deploy procedures from completed work and re-inject them in future runs.

### 3.4 Can Paperclip absorb this?

Yes, mostly.

Paperclip already has the company-level substrate. The plugin can add the product-level substrate.

The overall conclusion from the research is:

- **Yes, Paperclip can host most of Autensa's functionality as a plugin.**
- **No, Paperclip does not already have all of it natively.**
- **The remaining gap is primarily execution orchestration and workspace engineering, not product UX or orchestration theory.**

---

## 4. Product Decision

### 4.1 Recommendation

Build **Product Autopilot** directly inside Paperclip as a plugin and do not run Autensa separately.

### 4.2 Confidence by feature area

| Feature area | Build inside Paperclip plugin? | Confidence | Notes |
|---|---:|---:|---|
| Product entity and settings | Yes | High | Plugin-owned entity keyed to `companyId` + `projectId` |
| Product Program editor | Yes | High | Plugin UI + document storage |
| Research scheduling | Yes | High | Use routines, jobs, or both |
| Research reports | Yes | High | Plugin-owned documents/entities |
| Idea generation and scoring | Yes | High | Plugin worker + agents |
| Swipe UI and decision capture | Yes | High | Plugin page/detail tab |
| Maybe pool and resurfacing | Yes | High | Plugin state + scheduled jobs |
| Preference model | Yes | High | Plugin state/entities |
| Idea deduplication | Yes | High | Plugin-owned matching logic |
| Cost rollups and product caps | Yes | High | Reuse Paperclip cost data plus plugin attribution |
| Automation tiers | Yes | High | Policy layer in plugin |
| Planning phase | Yes | High | Use Paperclip issues and approvals |
| Build -> test -> review -> PR pipeline | Yes | Medium | Requires careful agent orchestration |
| Learner summaries | Yes | Medium | Straightforward as plugin feature |
| Skill extraction and reinjection | Yes | Medium | Best if Paperclip skills APIs are available; otherwise plugin-owned library |
| Operator notes and interrupts | Yes | Medium | Use comments, queued interrupts, and agent session hooks where supported |
| Convoy DAG execution | Yes, but expensive | Medium-Low | Requires plugin scheduler and dependency tracking |
| Checkpoint/resume | Partial at first | Medium-Low | Full reliability likely needs additional runtime conventions |
| Worktree isolation and merge queue | Yes, but hard | Medium-Low | Can leverage execution workspaces, but needs serious engineering |
| Port allocation and product locks | Yes | Medium | Plugin-managed resource allocator |
| Rollback pipeline | Yes | Medium | Plugin webhooks + health checks + revert flow |
| Full Autensa polish parity | Not in first phase | Low | Achievable over multiple phases |

### 4.3 Final answer to the strategy question

**You should treat Autensa as a reference architecture, not as a required dependency.**

A Paperclip-native plugin is the better long-term product architecture because:

- it preserves Paperclip as the only source of truth
- it inherits Paperclip multi-company isolation
- it keeps governance, approvals, projects, issues, and skills in one system
- it avoids parallel auth, databases, ports, and operator habits

---

## 5. Product Vision

### 5.1 Product statement

**Product Autopilot** is a Paperclip plugin that continuously improves software products by turning product context and market research into prioritized, reviewable, and optionally self-executing engineering work.

### 5.2 User promise

“Point Paperclip at a product, review a stream of good ideas, and let the system turn approved ideas into controlled software delivery.”

### 5.3 Product principles

1. **Paperclip remains the control plane.**
2. **Projects are the anchor.** Every autopilot belongs to one company and one project.
3. **Human control is lightweight but real.** Decisions should feel like steering, not babysitting.
4. **Safety beats raw autonomy.** Isolation, budgeting, and approvals are mandatory.
5. **Learning must be reusable.** Research, preferences, and successful procedures should compound.
6. **Multi-company isolation is absolute.** No cross-company data sharing or accidental context bleed.

---

## 6. Goals and Non-Goals

### 6.1 Goals

- Add a product-native autonomous improvement loop to Paperclip
- Support one Paperclip instance with many companies and many products
- Make the product owner's main workflow lightweight and fast
- Reuse Paperclip issues, projects, routines, comments, costs, and approvals wherever possible
- Support local or remote build agents through existing Paperclip adapters
- Build a path from research to PR without introducing a second control plane

### 6.2 Non-Goals

- Build a second standalone dashboard outside Paperclip
- Replace Paperclip's core issue, company, or governance models
- Depend on a running Autensa instance
- Introduce cross-company shared research or preferences
- Override Paperclip's approval, auth, or budget invariants
- Promise full Autensa parity in the initial release

---

## 7. Primary Users

### 7.1 Board operator
Wants governance, budgets, approvals, auditability, and the ability to pause or override autopilot.

### 7.2 CTO / Head of Product
Wants a research-backed stream of product opportunities and clear control over automation level.

### 7.3 Product operator
Wants to review ideas quickly, inspect research backing, and promote approved work into delivery.

### 7.4 Delivery agents
Builder, tester, reviewer, learner, and optional release/rollback agents that execute the work.

---

## 8. Mapping to Native Paperclip Concepts

| Paperclip concept | Product Autopilot meaning |
|---|---|
| Company | Business boundary and top-level data/security scope |
| Project | The software product or service being improved |
| Goal | Company or project objective the product work aligns to |
| Issue | Unit of planning/delivery work |
| Routine | Scheduled research, ideation, digests, or health checks |
| Agent | Researcher, ideator, planner, builder, tester, reviewer, learner, release agent |
| Project workspace | Attached local repo/workspace root |
| Execution workspace | Isolated run/worktree/sandbox context for delivery |
| Comment thread | Human intervention, queued notes, and run-time feedback |
| Cost model | Budgeting, rollups, caps, and alerts |
| Skill system | Reusable procedures and learned implementation patterns |

---

## 9. Product Scope

### 9.1 In scope

- Product onboarding
- Product Program authoring and versioning
- Research engine
- Research reports and findings
- Idea generation, scoring, and deduplication
- Swipe review flow
- Preference learning
- Maybe pool
- Planning and approval flow
- Build/test/review/PR orchestration for approved ideas
- Cost tracking and caps
- Product dashboards
- Learner summaries
- Product scheduling
- Multi-company safe operation

### 9.2 Later-phase scope

- Convoy DAG for large work
- Full checkpoint/resume model
- Merge queue with automatic conflict handling
- Product Program A/B testing
- Release health monitoring and automated rollback
- Native sync into Paperclip's company skills system if APIs are not yet clean enough

---

## 10. Functional Requirements

### 10.1 Product onboarding

The plugin must allow an operator to enable Product Autopilot on a Paperclip project.

The onboarding flow must capture:

- `companyId`
- `projectId`
- repo URL
- primary local workspace
- live URL (optional)
- product type
- research schedule
- ideation schedule
- automation tier
- budget caps
- default agent assignments
- PR provider configuration
- CI/health-check hooks (optional)

The plugin must support an **AI-assisted setup** mode that drafts an initial Product Program from the repo, live site, and project description.

### 10.2 Product Program

Each autopilot-enabled project must have one versioned **Product Program**.

Required sections:

- product mission
- target users
- business model
- competitive landscape
- priorities and weights
- constraints
- quality standards
- release boundaries
- research directives
- excluded work

The Product Program must be editable in a project detail tab and must keep revision history.

### 10.3 Research engine

The plugin must support on-demand and scheduled research.

Research inputs may include:

- project repo/workspace
- README and docs
- live product/site
- competitor pages
- search results and public web evidence
- issue backlog
- prior research reports
- prior swipe history

Research output must include:

- findings
- opportunities
- threats/risks
- evidence links
- suggested focus areas
- suggested idea categories

Every research cycle must be attributable to a company and project.

### 10.4 Idea generation

The plugin must generate ideas from the latest Product Program, research findings, and preference profile.

Each idea must include:

- title
- summary
- category
- impact score
- feasibility score
- complexity estimate
- expected value or rationale
- technical approach
- risks
- research backing
- source references
- status

### 10.5 Deduplication

The plugin must compare new ideas against:

- existing pending ideas
- approved ideas
- rejected ideas
- maybe pool ideas

The plugin should suppress or annotate near-duplicate ideas.

### 10.6 Swipe review

The plugin must provide a **swipe-style review surface** inside Paperclip.

Required actions:

- Pass
- Maybe
- Yes
- Now

Behavior:

- **Pass** rejects the idea and updates the preference model
- **Maybe** moves the idea into a resurfacing queue
- **Yes** creates planning/delivery work
- **Now** creates urgent work and bypasses normal queue priority

The UI must support both quick-review and detail-review modes.

### 10.7 Preference model

The plugin must maintain a per-project preference model derived from swipe history.

Signals may include:

- category approval rates
- tag approval rates
- complexity tolerance
- urgency tolerance
- preference for certain risk or reward profiles
- preference for certain research sources

The model must influence later idea ranking and generation.

### 10.8 Maybe pool

Ideas sent to **Maybe** must reappear later based on configurable rules.

Required behavior:

- resurfacing after a configurable delay
- optional resurfacing when new research changes the context
- optional bulk review mode

### 10.9 Planning phase

Approved ideas must pass through a planning step before execution.

Planning outputs:

- goal alignment summary
- implementation spec
- dependencies
- rollout plan
- test plan
- approval checklist
- recommended execution mode: simple or convoy

The planning output should live in a Paperclip issue document or plugin-owned project document.

### 10.10 Delivery pipeline

For approved ideas, the plugin must be able to orchestrate:

- build
- test
- review
- PR creation

Recommended implementation:

- create a parent Paperclip issue for the approved idea
- create child issues for build, test, and review when useful
- assign agents by role
- attach product context, Product Program, relevant research, and prior knowledge

### 10.11 Automation tiers

The plugin must support per-project automation policies.

#### Supervised
- create PRs automatically
- human reviews and merges

#### Semi-Auto
- auto-merge only when policy checks pass

#### Full Auto
- system may move from approved idea to merged change within configured safety limits

### 10.12 Convoy mode

For complex work, the plugin should support a **Convoy** execution mode.

Convoy requirements:

- decompose work into sub-tasks
- track dependencies
- schedule parallel sub-task execution
- surface dependency graph in UI
- block downstream tasks until prerequisites pass
- join results back into a parent delivery run

This is a later-phase requirement but must be reflected in the architecture from day one.

### 10.13 Workspaces and isolation

Every delivery run must execute in an isolated workspace.

Required capabilities:

- one workspace or worktree per active delivery run
- per-run branch naming
- product-scoped resource locking
- port allocation for dev servers or preview tasks
- merge coordination after completion
- ability to inspect diff/status from the UI

When possible, the plugin should use Paperclip execution workspaces. Where Paperclip primitives are not sufficient, the plugin worker will manage additional metadata and orchestration itself.

### 10.14 Operator intervention

Operators must be able to intervene without breaking the flow.

Supported interventions:

- add queued notes to a run
- open linked issue/comments
- send direct session messages when adapter/runtime supports it
- request checkpoint
- nudge or resume stuck work
- pause autopilot per project
- pause a specific delivery run

### 10.15 Learner and reusable knowledge

After a run completes, the plugin must produce a learner summary containing:

- what succeeded
- what failed
- useful project-specific procedures
- pitfalls to avoid
- commands/scripts worth reusing

The plugin must store reusable knowledge in a project-scoped library and inject relevant items into future planning/build runs.

### 10.16 Cost controls

The plugin must support caps at these levels:

- per research cycle
- per idea/build run
- daily per project
- monthly per project
- optional company-wide autopilot cap

The plugin must warn before thresholds and automatically pause autopilot when hard caps are exceeded.

### 10.17 Rollback and release health

Later phase, but planned from the beginning:

- listen for PR merge events
- run post-merge health checks
- open rollback issue or revert PR when configured health checks fail

### 10.18 Digests and routines

The plugin must support recurring digests such as:

- morning swipe briefing
- daily product health summary
- weekly opportunities digest
- over-budget alert digest
- stuck-run escalation digest

---

## 11. Plugin UX

### 11.1 Company-level surfaces

#### Dashboard widget: Product Autopilot Health
Shows:

- products with pending ideas
- products over budget
- products paused
- products with stuck runs
- products awaiting approvals

#### Company page: Product Autopilot
A company page listing all autopilot-enabled projects, grouped by state.

### 11.2 Project-level surfaces

Required project UI surfaces:

- **Overview tab**
- **Program tab**
- **Ideas tab**
- **Swipe view**
- **Research tab**
- **Runs tab**
- **Costs tab**
- **Knowledge tab**
- **Workspaces tab**

### 11.3 Toolbar and sidebar actions

- Start research now
- Generate ideas now
- Open swipe deck
- Pause/resume autopilot
- Queue planning
- Open latest run

### 11.4 Design rules

- primary workflows should be deep-linkable pages or tabs
- modals should be reserved for confirmations or compact edits
- every UI view must show company/project context clearly
- every automation action must show the current safety tier

---

## 12. Agent Model

The plugin does not replace Paperclip agents. It organizes them around a product loop.

Recommended roles:

- **Research Agent**
- **Ideation Agent**
- **Planning Agent**
- **Builder Agent**
- **Tester Agent**
- **Reviewer Agent**
- **Learner Agent**
- **Release/Recovery Agent** (later)

These may be separate agents or role modes of fewer agents, depending on the company's operating style.

---

## 13. Data Model

The plugin must maintain company-scoped and project-scoped data only.

### 13.1 Core plugin entities

#### `autopilot_project`
- `id`
- `companyId`
- `projectId`
- `status`
- `automationTier`
- `defaultAgentAssignments`
- `budgetPolicy`
- `schedulePolicy`

#### `product_program_revision`
- `id`
- `companyId`
- `projectId`
- `version`
- `content`
- `createdBy`
- `createdAt`

#### `research_cycle`
- `id`
- `companyId`
- `projectId`
- `status`
- `triggerType`
- `startedAt`
- `completedAt`
- `reportSummary`

#### `research_finding`
- `id`
- `cycleId`
- `findingType`
- `title`
- `summary`
- `evidence`
- `sourceUrl`

#### `idea`
- `id`
- `companyId`
- `projectId`
- `cycleId`
- `status`
- `title`
- `summary`
- `category`
- `impactScore`
- `feasibilityScore`
- `complexity`
- `approach`
- `risks`
- `researchRefs`

#### `swipe_event`
- `id`
- `ideaId`
- `companyId`
- `projectId`
- `decision`
- `actor`
- `createdAt`

#### `preference_profile`
- `companyId`
- `projectId`
- `weights`
- `lastUpdatedAt`

#### `delivery_run`
- `id`
- `companyId`
- `projectId`
- `ideaId`
- `parentIssueId`
- `mode`
- `status`
- `workspaceRef`
- `prUrl`
- `costSummary`

#### `convoy_task`
- `id`
- `deliveryRunId`
- `parentConvoyTaskId`
- `dependsOn`
- `issueId`
- `status`

#### `knowledge_entry`
- `id`
- `companyId`
- `projectId`
- `sourceRunId`
- `type`
- `title`
- `content`
- `confidence`

#### `workspace_lease`
- `id`
- `companyId`
- `projectId`
- `deliveryRunId`
- `strategy`
- `workspacePath`
- `branch`
- `port`
- `status`

---

## 14. System Architecture

### 14.1 Components

#### Paperclip core
Provides:

- company/project/issue/governance model
- adapters and agent execution
- comments and approvals
- costs and activity
- routines
- plugin host
- experimental execution workspaces

#### Product Autopilot plugin worker
Provides:

- scheduling and orchestration logic
- research and ideation job coordination
- idea state management
- swipe learning
- delivery run orchestration
- convoy scheduling
- knowledge extraction
- integration/webhook handlers

#### Product Autopilot plugin UI
Provides:

- project tabs and product control surfaces
- swipe deck
- dashboards
- operator actions

#### Paperclip agents/adapters
Provide:

- actual execution of research, planning, build, test, review, and learning tasks

### 14.2 Preferred execution pattern

1. plugin schedules or triggers research
2. plugin invokes or creates issues for research agent work
3. research results are stored as plugin entities/documents
4. plugin generates ideas
5. operator reviews ideas
6. approved ideas become issues/runs
7. build/test/review agents execute via Paperclip adapters
8. plugin tracks progress and costs
9. learner writes reusable knowledge
10. future cycles reuse the knowledge and preference profile

---

## 15. Required Paperclip Plugin Capabilities

The implementation depends on the current Paperclip plugin model and should request capabilities at install time.

Required capability categories include:

- company and project read access
- issue and comment read/write
- goals read/create/update as needed
- activity and costs read
- plugin state read/write
- plugin entities read/write
- events subscribe
- jobs schedule
- outbound HTTP
- secret references
- agent invocation and session controls where supported
- UI slots for pages, tabs, dashboard widgets, toolbar buttons, and project sidebar items

### 15.1 Important current-plugin assumptions

The plugin will be treated as a **trusted plugin** running on a self-hosted, single-node, filesystem-persistent Paperclip deployment.

That is acceptable for this product because:

- the user explicitly wants one VPS deployment
- company isolation is enforced in data and secret scoping, not by hostile multi-tenant sandboxing
- the plugin is a first-party or operator-trusted extension

---

## 16. Multi-Company Isolation Requirements

This product must respect Paperclip's multi-company model.

### 16.1 Hard rules

- every plugin entity must be scoped by `companyId`
- every product autopilot must also be scoped by `projectId`
- no idea, research finding, preference model, or knowledge entry may be shared across companies
- secret refs must be company-specific or project-specific
- job handlers must require company context
- logs and metrics must include company scope

### 16.2 Operational rules

- a company's autopilot can only see that company's projects and issues
- project-level product programs are never inherited across companies by default
- exports/imports should preserve company boundaries
- any future “template” feature must scrub company-specific secrets and URLs

---

## 17. Detailed Workflow Requirements

### 17.1 Research cycle flow

1. trigger fires or operator starts cycle
2. plugin resolves project context and latest Product Program
3. research agent(s) gather findings
4. plugin stores research report and findings
5. plugin updates project overview and optional digest
6. plugin optionally chains ideation automatically

### 17.2 Ideation flow

1. plugin reads latest Product Program, findings, and preference profile
2. ideation agent generates scored ideas
3. plugin deduplicates and ranks ideas
4. ideas appear in swipe queue and ideas list

### 17.3 Approval flow

1. operator swipes an idea
2. plugin records the decision
3. preference model updates
4. if `Yes` or `Now`, plugin creates a planning/delivery issue flow

### 17.4 Delivery flow

1. planning artifact is generated
2. if policy requires approval, approval is requested in Paperclip
3. builder/tester/reviewer work is dispatched
4. PR is opened
5. if configured, merge is manual, conditional, or automatic
6. learner generates reusable knowledge after completion

### 17.5 Stuck-run flow

1. plugin detects inactivity or failed checks
2. project surfaces enter warning state
3. digest or alert issue is created if needed
4. operator can nudge, interrupt, pause, or reroute

---

## 18. MVP Definition

The MVP is successful when a single Paperclip deployment can do the following without any Autensa deployment:

1. enable Product Autopilot on a project
2. create and revise a Product Program
3. run scheduled and manual research
4. generate scored ideas
5. provide a swipe-based review UI
6. learn from swipe outcomes
7. create planning/build/test/review flows for approved ideas
8. produce PRs for simple approved work
9. enforce product-level budgets and pauses
10. support many companies safely in one Paperclip instance

The MVP does **not** require full convoy DAG execution, full checkpoint restore, or polished rollback automation.

---

## 19. Phased Delivery Plan

### Phase 1: Product loop foundation

Deliver:

- project onboarding
- Product Program
- research cycles
- idea generation
- swipe UI
- preference profile
- maybe pool
- scheduled routines
- dashboard widgets
- basic digests

Exit criteria:

- at least one project can run daily research and ideation
- operator can approve ideas entirely inside Paperclip

### Phase 2: Delivery automation

Deliver:

- planning flow
- build/test/review orchestration
- PR creation
- product budgets and caps
- learner summaries
- cost dashboard
- operator intervention actions

Exit criteria:

- approved simple ideas reliably produce PRs
- product costs are visible and enforced

### Phase 3: Advanced execution

Deliver:

- convoy decomposition
- dependency graph UI
- workspace leasing and worktree isolation
- merge coordination
- product locks and port allocation
- stuck-run recovery actions

Exit criteria:

- multiple complex ideas can be run safely with isolation and clear operator visibility

### Phase 4: Closed-loop operations

Deliver:

- release health monitoring
- rollback automation
- Product Program experiments
- skill extraction confidence model
- deeper Paperclip skills integration

Exit criteria:

- product loop compounds knowledge and release outcomes with minimal operator input

---

## 20. Key Risks

### 20.1 Plugin-runtime maturity
Paperclip's plugin model is already usable, but still early in deployment model and capability boundaries. The product should assume a trusted, self-hosted environment.

### 20.2 Execution isolation complexity
The difference between “works in demo” and “safe for parallel autonomous coding” is workspace isolation, merge logic, conflict handling, and resource cleanup.

### 20.3 Adapter variability
Not every adapter/runtime supports the same session or interrupt semantics. The plugin must degrade gracefully.

### 20.4 Skills integration gap
If the clean API surface for company skills is incomplete for plugins, the plugin may need its own knowledge library first and sync later.

### 20.5 Research quality
Autopilot value depends on the quality of the research and ideation prompts, sources, and ranking logic.

---

## 21. Required Core Enhancements (If Needed)

This product should begin as a plugin, but the following Paperclip core enhancements may be valuable:

1. first-class plugin access to company skills APIs
2. richer execution workspace APIs for plugins
3. more explicit agent interrupt/session primitives
4. optional DAG/dependency support for issues or plugin-owned runs
5. better cost-attribution hooks for plugin-defined phases

These are enhancements, not blockers for the first phase.

---

## 22. Acceptance Criteria

### 22.1 Functional acceptance

- The operator can enable autopilot on a Paperclip project.
- The system stores a Product Program with revisions.
- Research can run on a schedule and on demand.
- The system produces ideas with scores and evidence.
- The operator can Pass, Maybe, Yes, or Now ideas from inside Paperclip.
- Approved ideas create delivery work inside Paperclip.
- At least one supported build path can produce PRs.
- Product-level cost caps pause future runs when exceeded.
- A single Paperclip instance can safely run this for multiple companies.

### 22.2 Platform acceptance

- No separate Autensa app is required.
- All product-autopilot state remains inside Paperclip plugin state/entities or Paperclip-owned resources.
- All control surfaces are inside Paperclip UI.
- Company data boundaries remain intact.

---

## 23. Final Recommendation

Build the Autensa-inspired functionality directly into Paperclip as a plugin.

Do **not** deploy Autensa alongside Paperclip.

Autensa's special contribution is the **product-improvement loop** and the **product-native control surface**, not the existence of a second control plane. Paperclip already supplies the underlying company/governance/orchestration substrate. The right product strategy is to bring Autensa's best ideas into Paperclip and let Paperclip remain the only system operators need.

---

## Appendix A: Research Basis

This PRD is based on direct review of public Paperclip and Autensa materials on 2026-04-08.

### Autensa sources reviewed

- https://autensa.com/
- https://github.com/crshdn/mission-control
- https://raw.githubusercontent.com/crshdn/mission-control/main/README.md
- https://raw.githubusercontent.com/crshdn/mission-control/main/specs/product-autopilot-spec.md
- https://raw.githubusercontent.com/crshdn/mission-control/main/specs/parallel-build-isolation-spec.md
- https://raw.githubusercontent.com/crshdn/mission-control/main/PRODUCTION_SETUP.md

### Paperclip sources reviewed

- https://paperclip.ing/
- https://docs.paperclip.ing/start/what-is-paperclip
- https://docs.paperclip.ing/start/core-concepts
- https://docs.paperclip.ing/start/architecture
- https://docs.paperclip.ing/adapters/overview
- https://paperclip.inc/docs/adapters/process
- https://raw.githubusercontent.com/paperclipai/paperclip/master/doc/plugins/PLUGIN_SPEC.md
- https://raw.githubusercontent.com/paperclipai/paperclip/master/packages/plugins/sdk/README.md
- https://raw.githubusercontent.com/paperclipai/paperclip/master/skills/paperclip/references/routines.md
- https://newreleases.io/project/github/paperclipai/paperclip/release/v2026.325.0
- https://newreleases.io/project/github/paperclipai/paperclip/release/v2026.403.0

### Research conclusion in one sentence

Paperclip already has enough control-plane surface area to host an Autensa-style product autopilot plugin; the only major difficulty is reproducing Autensa's higher-end execution safety and parallel delivery machinery with the same reliability and polish.
