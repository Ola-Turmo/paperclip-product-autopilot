// Root plugin constants — tools, jobs, capabilities
export const PLUGIN_ID = "ola-turmo.paperclip-product-autopilot";
export const PLUGIN_VERSION = "0.1.0";

// Entity types for all plugin-owned entities
export const ENTITY_TYPES = {
  autopilotProject: "autopilot-project",
  productProgramRevision: "product-program-revision",
  researchCycle: "research-cycle",
  researchFinding: "research-finding",
  idea: "idea",
  swipeEvent: "swipe-event",
  preferenceProfile: "preference-profile",
  planningArtifact: "planning-artifact",
  deliveryRun: "delivery-run",
  workspaceLease: "workspace-lease",
  companyBudget: "company-budget",
  convoyTask: "convoy-task",
  checkpoint: "checkpoint",
  productLock: "product-lock",
  operatorIntervention: "operator-intervention",
  learnerSummary: "learner-summary",
  knowledgeEntry: "knowledge-entry",
  digest: "digest",
  releaseHealth: "release-health",
  rollbackAction: "rollback-action",
} as const;

// Data query keys
export const DATA_KEYS = {
  autopilotProject: "autopilot-project",
  autopilotProjects: "autopilot-projects",
  productProgramRevision: "product-program-revision",
  productProgramRevisions: "product-program-revisions",
  researchCycle: "research-cycle",
  researchCycles: "research-cycles",
  researchFinding: "research-finding",
  researchFindings: "research-findings",
  idea: "idea",
  ideas: "ideas",
  maybePoolIdeas: "maybe-pool-ideas",
  swipeEvent: "swipe-event",
  swipeEvents: "swipe-events",
  preferenceProfile: "preference-profile",
  planningArtifact: "planning-artifact",
  planningArtifacts: "planning-artifacts",
  deliveryRun: "delivery-run",
  deliveryRuns: "delivery-runs",
  workspaceLease: "workspace-lease",
  workspaceLeases: "workspace-leases",
  companyBudget: "company-budget",
  companyBudgets: "company-budgets",
  convoyTask: "convoy-task",
  convoyTasks: "convoy-tasks",
  checkpoint: "checkpoint",
  checkpoints: "checkpoints",
  productLock: "product-lock",
  productLocks: "product-locks",
  operatorIntervention: "operator-intervention",
  operatorInterventions: "operator-interventions",
  learnerSummary: "learner-summary",
  learnerSummaries: "learner-summaries",
  knowledgeEntry: "knowledge-entry",
  knowledgeEntries: "knowledge-entries",
  digest: "digest",
  digests: "digests",
  releaseHealth: "release-health",
  releaseHealthChecks: "release-health-checks",
  rollbackAction: "rollback-action",
  rollbackActions: "rollback-actions",
} as const;

// Action handler keys
export const ACTION_KEYS = {
  // Project management
  saveAutopilotProject: "save-autopilot-project",
  enableAutopilot: "enable-autopilot",
  disableAutopilot: "disable-autopilot",
  deleteAutopilotProject: "delete-autopilot-project",

  // Product Program
  saveProductProgramRevision: "save-product-program-revision",
  createProductProgramRevision: "create-product-program-revision",
  getLatestProductProgram: "get-latest-product-program",

  // Research
  startResearchCycle: "start-research-cycle",
  completeResearchCycle: "complete-research-cycle",
  addResearchFinding: "add-research-finding",
  listResearchCycles: "list-research-cycles",

  // Ideas
  generateIdeas: "generate-ideas",
  createIdea: "create-idea",
  updateIdea: "update-idea",
  getIdea: "get-idea",
  listIdeas: "list-ideas",

  // Swipe
  recordSwipe: "record-swipe",
  getSwipeQueue: "get-swipe-queue",
  listSwipeEvents: "list-swipe-events",

  // Preference
  updatePreferenceProfile: "update-preference-profile",
  getPreferenceProfile: "get-preference-profile",

  // Maybe pool
  resurfaceMaybeIdeas: "resurface-maybe-ideas",
  moveIdeaToMaybe: "move-idea-to-maybe",

  // Planning
  createPlanningArtifact: "create-planning-artifact",
  getPlanningArtifact: "get-planning-artifact",
  listPlanningArtifacts: "list-planning-artifacts",

  // Delivery runs
  createDeliveryRun: "create-delivery-run",
  completeDeliveryRun: "complete-delivery-run",
  pauseDeliveryRun: "pause-delivery-run",
  resumeDeliveryRun: "resume-delivery-run",
  getDeliveryRun: "get-delivery-run",
  listDeliveryRuns: "list-delivery-runs",
  createIssueFromRun: "create-issue-from-run",
  createPullRequestFromRun: "create-pull-request-from-run",

  // Budget
  updateCompanyBudget: "update-company-budget",
  getCompanyBudget: "get-company-budget",
  checkBudgetAndPauseIfNeeded: "check-budget-and-pause-if-needed",

  // Convoys
  decomposeIntoConvoyTasks: "decompose-into-convoy-tasks",
  updateConvoyTaskStatus: "update-convoy-task-status",
  getConvoyTasks: "get-convoy-tasks",

  // Checkpoints
  createCheckpoint: "create-checkpoint",
  resumeFromCheckpoint: "resume-from-checkpoint",
  getCheckpoints: "get-checkpoints",

  // Product locks
  acquireProductLock: "acquire-product-lock",
  releaseProductLock: "release-product-lock",
  checkMergeConflict: "check-merge-conflict",
  getProductLocks: "get-product-locks",

  // Operator interventions
  addOperatorNote: "add-operator-note",
  requestCheckpoint: "request-checkpoint",
  nudgeRun: "nudge-run",
  inspectLinkedIssue: "inspect-linked-issue",
  listOperatorInterventions: "list-operator-interventions",

  // Learner / knowledge
  createLearnerSummary: "create-learner-summary",
  createKnowledgeEntry: "create-knowledge-entry",
  getKnowledgeForRun: "get-knowledge-for-run",
  markKnowledgeAsUsed: "mark-knowledge-as-used",
  listLearnerSummaries: "list-learner-summaries",
  listKnowledgeEntries: "list-knowledge-entries",

  // Digests
  createDigest: "create-digest",
  generateStuckRunDigest: "generate-stuck-run-digest",
  generateBudgetAlertDigest: "generate-budget-alert-digest",
  listDigests: "list-digests",
  dismissDigest: "dismiss-digest",

  // Release health
  createReleaseHealthCheck: "create-release-health-check",
  updateReleaseHealthStatus: "update-release-health-status",

  // Rollback
  triggerRollback: "trigger-rollback",

  // Admin / health
  checkStuckRuns: "check-stuck-runs",
  runAutopilotSweep: "run-autopilot-sweep",
} as const;

// Job keys
export const JOB_KEYS = {
  autopilotSweep: "autopilot-sweep",
  maybePoolResurface: "maybe-pool-resurface",
  deliveryRunMonitor: "delivery-run-monitor",
} as const;

// Tool keys (must match manifest tool names)
export const TOOL_KEYS = {
  listAutopilotProjects: "list-autopilot-projects",
  createIdea: "create-idea",
  getSwipeQueue: "get-swipe-queue",
  recordSwipeDecision: "record-swipe-decision",
  startResearchCycle: "start-research-cycle",
  generateIdeas: "generate-ideas",
} as const;

// Automation tiers
export type AutomationTier = "supervised" | "semiauto" | "fullauto";

// Idea lifecycle status
export type IdeaStatus =
  | "active"
  | "maybe"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "archived";

// Swipe decisions
export type SwipeDecision = "pass" | "maybe" | "yes" | "now";

// Research cycle status
export type ResearchStatus = "pending" | "running" | "completed" | "failed";

// Delivery run status
export type RunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

// Execution modes
export type ExecutionMode = "simple" | "convoy";
export type ApprovalMode = "manual" | "auto_approve";

// Convoy task status
export type ConvoyTaskStatus =
  | "pending"
  | "blocked"
  | "running"
  | "passed"
  | "failed"
  | "skipped";

// Operator intervention types
export type InterventionType =
  | "note"
  | "checkpoint_request"
  | "nudge"
  | "linked_issue_inspection";

// Lock types
export type LockType = "product_lock" | "merge_lock";

// Digest types and status
export type DigestType =
  | "budget_alert"
  | "stuck_run"
  | "opportunity"
  | "weekly_summary"
  | "health_check_failed"
  | "idea_resurface";
export type DigestStatus = "pending" | "delivered" | "read" | "dismissed";

// Release health
export type HealthCheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped";
export type HealthCheckType =
  | "smoke_test"
  | "integration_test"
  | "custom_check"
  | "merge_check";

// Rollback
export type RollbackStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";
export type RollbackType = "revert_commit" | "restore_checkpoint" | "full_rollback";

// Knowledge entry types
export type KnowledgeType = "procedure" | "pattern" | "lesson" | "skill";
