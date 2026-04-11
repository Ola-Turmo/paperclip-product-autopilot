/**
 * Entity Types for Paperclip Product Autopilot Plugin
 * 
 * All entities are scoped by companyId AND projectId for multi-company isolation.
 */

// ============================================================
// Core Project Entities
// ============================================================

/**
 * AutopilotProject — Top-level configuration for the product autopilot within a project.
 * Controls automation tier, budget, scheduling, and agent assignments.
 */
export interface AutopilotProject {
  id: string;
  companyId: string;
  projectId: string;
  status: 'active' | 'paused' | 'stopped';
  automationTier: 'supervised' | 'semi-auto' | 'full-auto';
  defaultAgentAssignments?: Record<string, string>;  // role -> agentId
  budgetPolicy: BudgetPolicy;
  schedulePolicy: SchedulePolicy;
  createdAt: string;
  updatedAt: string;
}

/**
 * BudgetPolicy — Defines spending limits and warning thresholds for automation runs.
 */
export interface BudgetPolicy {
  perResearchCycle?: number;   // max cost per research run
  perBuildRun?: number;        // max cost per delivery run
  dailyProjectLimit?: number;  // daily cap
  monthlyProjectLimit?: number;// monthly cap
  companyWideCap?: number;     // optional company cap
  warnAtPercent: number;       // warn threshold (default 80)
}

/**
 * SchedulePolicy — Controls when automated research, ideation, and resurfacing runs.
 */
export interface SchedulePolicy {
  researchEnabled: boolean;
  researchCron?: string;       // cron expression
  ideationEnabled: boolean;
  ideationCron?: string;
  resurfacerEnabled: boolean;
  resurfacerCron?: string;
}

/**
 * ProductProgramRevision — Versioned snapshot of the product program document.
 * The program covers: vision, target users, core problem, key metrics,
 * current solution, competitors, SWOT, roadmap, themes, OKRs, constraints.
 */
export interface ProductProgramRevision {
  id: string;
  companyId: string;
  projectId: string;
  version: number;
  content: string;            // full program document content
  createdBy: string;           // user or agent id
  createdAt: string;
}

// ============================================================
// Research Entities
// ============================================================

/**
 * ResearchCycle — A single research run that gathers market, user, and competitor data.
 */
export interface ResearchCycle {
  id: string;
  companyId: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  triggerType: 'scheduled' | 'manual';
  startedAt: string;
  completedAt?: string;
  reportSummary?: string;
  sources?: string[];          // URLs, repos, docs researched
  cost?: number;
}

/**
 * ResearchFinding — A discrete insight extracted during a research cycle.
 */
export interface ResearchFinding {
  id: string;
  cycleId: string;
  companyId: string;
  projectId: string;
  findingType: 'opportunity' | 'threat' | 'insight' | 'competitor' | 'user-need';
  title: string;
  summary: string;
  evidence?: string;
  sourceUrl?: string;
  createdAt: string;
}

// ============================================================
// Ideation Entities
// ============================================================

/**
 * Idea — A product idea or feature candidate generated from research or user input.
 */
export interface Idea {
  id: string;
  companyId: string;
  projectId: string;
  cycleId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'done' | 'maybe';
  title: string;
  summary: string;
  category: string;           // e.g. 'feature', 'bugfix', 'refactor', 'tech-debt'
  impactScore: number;         // 1-10
  feasibilityScore: number;    // 1-10
  complexity: 'low' | 'medium' | 'high';
  approach?: string;           // how to implement
  risks?: string[];
  researchRefs?: string[];     // IDs of research findings
  createdAt: string;
  updatedAt: string;
}

/**
 * SwipeEvent — Records a human decision (swipe) on a given idea during curation.
 * pass=rejected, maybe=defer, yes=approved, now=approved+execute immediately.
 */
export interface SwipeEvent {
  id: string;
  ideaId: string;
  companyId: string;
  projectId: string;
  decision: 'pass' | 'maybe' | 'yes' | 'now';
  actor: string;              // user id who swiped
  notes?: string;
  createdAt: string;
}

/**
 * PreferenceProfile — Tunable weights and tolerances that shape idea prioritization.
 */
export interface PreferenceProfile {
  companyId: string;
  projectId: string;
  weights: {
    categoryWeights?: Record<string, number>;    // category -> weight
    tagWeights?: Record<string, number>;         // tag -> weight
    complexityTolerance?: 'low' | 'medium' | 'high';
    riskTolerance?: 'low' | 'medium' | 'high';
    impactOverFeasibility?: number;  // 0-1, higher = prefer high impact even if harder
  };
  lastUpdatedAt: string;
}

// ============================================================
// Delivery Entities
// ============================================================

/**
 * DeliveryRun — Executes a single approved idea, producing a Paperclip issue and optionally a PR.
 * Simple mode = single issue; Convoy mode = nested sub-tasks with dependency graph.
 */
export interface DeliveryRun {
  id: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  parentIssueId?: string;      // Paperclip issue this created
  mode: 'simple' | 'convoy';
  status: 'pending' | 'planned' | 'running' | 'review' | 'pr' | 'merged' | 'failed' | 'cancelled';
  workspaceRef?: string;       // workspace path or id
  prUrl?: string;
  costSummary?: {
    build?: number;
    test?: number;
    review?: number;
    total?: number;
  };
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

/**
 * ConvoyTask — A sub-task within a Convoy-mode delivery run.
 * Forms a directed acyclic graph via dependsOn for execution ordering.
 */
export interface ConvoyTask {
  id: string;
  deliveryRunId: string;
  companyId: string;
  projectId: string;
  parentConvoyTaskId?: string; // for nested tasks
  dependsOn: string[];         // IDs of prerequisite convoy tasks
  issueId?: string;            // Paperclip issue for this sub-task
  status: 'pending' | 'running' | 'done' | 'failed' | 'blocked';
  result?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Knowledge & Workspace Entities
// ============================================================

/**
 * KnowledgeEntry — Captured institutional knowledge from delivery runs.
 * Used to inform future builds and avoid repeated pitfalls.
 */
export interface KnowledgeEntry {
  id: string;
  companyId: string;
  projectId: string;
  sourceRunId?: string;        // delivery run that produced this
  type: 'procedure' | 'pitfall' | 'command' | 'script' | 'pattern' | 'lesson';
  title: string;
  content: string;
  confidence: number;           // 0-1, how confident we are this is reusable
  tags?: string[];
  createdAt: string;
}

/**
 * WorkspaceLease — Manages a coding workspace's lifecycle and isolation.
 * Supports ephemeral (throwaway), persistent, and git-worktree strategies.
 */
export interface WorkspaceLease {
  id: string;
  companyId: string;
  projectId: string;
  deliveryRunId?: string;
  strategy: 'ephemeral' | 'persistent' | 'worktree';
  workspacePath?: string;
  branch?: string;
  port?: number;
  status: 'active' | 'released' | 'expired';
  acquiredAt: string;
  releasedAt?: string;
}
