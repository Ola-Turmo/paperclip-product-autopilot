import { z } from "@paperclipai/plugin-sdk";

const automationTierSchema = z.enum(["supervised", "semiauto", "fullauto"]);
const ideaStatusSchema = z.enum([
  "active",
  "maybe",
  "approved",
  "rejected",
  "in_progress",
  "completed",
  "archived",
]);
const researchStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
const runStatusSchema = z.enum(["pending", "running", "paused", "completed", "failed", "cancelled"]);
const complexitySchema = z.enum(["low", "medium", "high"]);
const executionModeSchema = z.enum(["simple", "convoy"]);
const approvalModeSchema = z.enum(["manual", "auto_approve"]);
const convoyTaskStatusSchema = z.enum(["pending", "blocked", "running", "passed", "failed", "skipped"]);
const interventionTypeSchema = z.enum(["note", "checkpoint_request", "nudge", "linked_issue_inspection"]);
const lockTypeSchema = z.enum(["product_lock", "merge_lock"]);
const knowledgeTypeSchema = z.enum(["procedure", "pattern", "lesson", "skill"]);
const signalFamilySchema = z.enum(["support", "analytics", "market", "incident", "qualitative", "technical"]);
const digestStatusSchema = z.enum(["pending", "delivered", "read", "dismissed"]);
const digestPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
const digestTypeSchema = z.enum([
  "budget_alert",
  "stuck_run",
  "opportunity",
  "weekly_summary",
  "health_check_failed",
  "idea_resurface",
]);
const healthCheckStatusSchema = z.enum(["pending", "running", "passed", "failed", "skipped"]);
const healthCheckTypeSchema = z.enum(["smoke_test", "integration_test", "custom_check", "merge_check"]);
const rollbackStatusSchema = z.enum(["pending", "in_progress", "completed", "failed", "skipped"]);
const rollbackTypeSchema = z.enum(["revert_commit", "restore_checkpoint", "full_rollback"]);

export const autopilotProjectSchema = z.object({
  autopilotId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  enabled: z.boolean(),
  automationTier: automationTierSchema,
  budgetMinutes: z.number().nonnegative(),
  repoUrl: z.string().optional(),
  workspaceId: z.string().optional(),
  liveUrl: z.string().optional(),
  productType: z.string().optional(),
  agentId: z.string().optional(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  researchScheduleCron: z.string().optional(),
  ideationScheduleCron: z.string().optional(),
  maybePoolResurfaceDays: z.number().int().positive().optional(),
  maxIdeasPerCycle: z.number().int().positive().optional(),
  autoCreateIssues: z.boolean(),
  autoCreatePrs: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const researchCycleSchema = z.object({
  cycleId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  status: researchStatusSchema,
  query: z.string().min(1),
  reportContent: z.string().optional(),
  findingsCount: z.number().int().nonnegative(),
  sources: z.array(z.string()).optional(),
  startedAt: z.string().min(1),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export const researchFindingSchema = z.object({
  findingId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  cycleId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  sourceUrl: z.string().optional(),
  sourceLabel: z.string().optional(),
  evidenceText: z.string().optional(),
  signalFamily: signalFamilySchema.optional(),
  topic: z.string().optional(),
  dedupeKey: z.string().optional(),
  category: z.enum(["opportunity", "threat", "risk", "competitive", "user_feedback", "technical"]).optional(),
  confidence: z.number().min(0).max(1),
  sourceQualityScore: z.number().min(0).max(100),
  freshnessScore: z.number().min(0).max(100),
  duplicateOfFindingId: z.string().optional(),
  duplicateAnnotated: z.boolean(),
  createdAt: z.string().min(1),
}).superRefine((finding, ctx) => {
  if (finding.duplicateAnnotated && !finding.duplicateOfFindingId) {
    ctx.addIssue({ code: "custom", message: "duplicate findings must reference duplicateOfFindingId", path: ["duplicateOfFindingId"] });
  }
});

export const ideaSchema = z.object({
  ideaId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  cycleId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  rationale: z.string(),
  sourceReferences: z.array(z.string()),
  impactScore: z.number(),
  feasibilityScore: z.number(),
  complexityEstimate: complexitySchema.optional(),
  technicalApproach: z.string().optional(),
  risks: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: ideaStatusSchema,
  duplicateOfIdeaId: z.string().optional(),
  duplicateAnnotated: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const swipeEventSchema = z.object({
  swipeId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  ideaId: z.string().min(1),
  decision: z.enum(["pass", "maybe", "yes", "now"]),
  note: z.string().optional(),
  createdAt: z.string().min(1),
});

const swipeBreakdownSchema = z.object({
  pass: z.number().int().nonnegative(),
  maybe: z.number().int().nonnegative(),
  yes: z.number().int().nonnegative(),
  now: z.number().int().nonnegative(),
});

export const preferenceProfileSchema = z.object({
  profileId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  passCount: z.number().int().nonnegative(),
  maybeCount: z.number().int().nonnegative(),
  yesCount: z.number().int().nonnegative(),
  nowCount: z.number().int().nonnegative(),
  totalSwipes: z.number().int().nonnegative(),
  categoryPreferences: z.record(swipeBreakdownSchema),
  tagPreferences: z.record(swipeBreakdownSchema),
  avgApprovedScore: z.number(),
  avgRejectedScore: z.number(),
  lastUpdated: z.string().min(1),
});

export const planningArtifactSchema = z.object({
  artifactId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  ideaId: z.string().min(1),
  title: z.string().min(1),
  goalAlignmentSummary: z.string(),
  implementationSpec: z.string(),
  dependencies: z.array(z.string()),
  rolloutPlan: z.string(),
  testPlan: z.string(),
  approvalChecklist: z.array(z.string()),
  executionMode: executionModeSchema,
  approvalMode: approvalModeSchema,
  automationTier: automationTierSchema,
  status: z.enum(["draft", "approved", "in_progress", "completed", "cancelled"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const deliveryRunSchema = z.object({
  runId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  ideaId: z.string().min(1),
  artifactId: z.string().min(1),
  title: z.string().min(1),
  status: runStatusSchema,
  automationTier: automationTierSchema,
  branchName: z.string().min(1),
  workspacePath: z.string().min(1),
  leasedPort: z.number().nullable(),
  commitSha: z.string().nullable(),
  prUrl: z.string().optional(),
  prNumber: z.number().optional(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  completedAt: z.string().nullable(),
  error: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).superRefine((run, ctx) => {
  if (run.status === "paused" && !run.paused) {
    ctx.addIssue({ code: "custom", message: "paused runs must set paused=true", path: ["paused"] });
  }
  if (run.status !== "paused" && run.paused) {
    ctx.addIssue({ code: "custom", message: "only paused runs may set paused=true", path: ["status"] });
  }
  if (["completed", "failed", "cancelled"].includes(run.status) && run.completedAt === null) {
    ctx.addIssue({ code: "custom", message: "terminal runs must include completedAt", path: ["completedAt"] });
  }
  if (!["completed", "failed", "cancelled"].includes(run.status) && run.completedAt !== null) {
    ctx.addIssue({ code: "custom", message: "non-terminal runs cannot include completedAt", path: ["completedAt"] });
  }
});

export const companyBudgetSchema = z.object({
  budgetId: z.string().min(1),
  companyId: z.string().min(1),
  totalBudgetMinutes: z.number().nonnegative(),
  usedBudgetMinutes: z.number().nonnegative(),
  autopilotBudgetMinutes: z.number().nonnegative(),
  autopilotUsedMinutes: z.number().nonnegative(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  updatedAt: z.string().min(1),
});

export const workspaceLeaseSchema = z.object({
  leaseId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  workspacePath: z.string().min(1),
  branchName: z.string().min(1),
  leasedPort: z.number().nullable(),
  gitRepoRoot: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  releasedAt: z.string().nullable(),
}).superRefine((lease, ctx) => {
  if (lease.isActive && lease.releasedAt !== null) {
    ctx.addIssue({ code: "custom", message: "active leases cannot include releasedAt", path: ["releasedAt"] });
  }
  if (!lease.isActive && lease.releasedAt === null) {
    ctx.addIssue({ code: "custom", message: "released leases must include releasedAt", path: ["releasedAt"] });
  }
});

export const convoyTaskSchema = z.object({
  taskId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  artifactId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: convoyTaskStatusSchema,
  dependsOnTaskIds: z.array(z.string()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  error: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).superRefine((task, ctx) => {
  if (task.dependsOnTaskIds.includes(task.taskId)) {
    ctx.addIssue({ code: "custom", message: "tasks cannot depend on themselves", path: ["dependsOnTaskIds"] });
  }
  if (task.status === "running" && task.startedAt === null) {
    ctx.addIssue({ code: "custom", message: "running tasks must include startedAt", path: ["startedAt"] });
  }
  if (["passed", "failed", "skipped"].includes(task.status) && task.completedAt === null) {
    ctx.addIssue({ code: "custom", message: "terminal tasks must include completedAt", path: ["completedAt"] });
  }
  if (["pending", "blocked", "running"].includes(task.status) && task.completedAt !== null) {
    ctx.addIssue({ code: "custom", message: "non-terminal tasks cannot include completedAt", path: ["completedAt"] });
  }
});

export const checkpointSchema = z.object({
  checkpointId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  label: z.string().optional(),
  snapshotState: z.record(z.unknown()),
  taskStates: z.record(convoyTaskStatusSchema),
  workspaceSnapshot: z.object({
    branchName: z.string(),
    commitSha: z.string().nullable(),
    workspacePath: z.string(),
    leasedPort: z.number().nullable(),
  }),
  pauseReason: z.string().optional(),
  createdAt: z.string().min(1),
});

export const productLockSchema = z.object({
  lockId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  lockType: lockTypeSchema,
  targetBranch: z.string().min(1),
  targetPath: z.string(),
  acquiredAt: z.string().min(1),
  releasedAt: z.string().nullable(),
  isActive: z.boolean(),
  blockReason: z.string().optional(),
}).superRefine((lock, ctx) => {
  if (lock.isActive && lock.releasedAt !== null) {
    ctx.addIssue({ code: "custom", message: "active locks cannot include releasedAt", path: ["releasedAt"] });
  }
  if (!lock.isActive && lock.releasedAt === null) {
    ctx.addIssue({ code: "custom", message: "released locks must include releasedAt", path: ["releasedAt"] });
  }
});

export const operatorInterventionSchema = z.object({
  interventionId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  interventionType: interventionTypeSchema,
  note: z.string().optional(),
  checkpointId: z.string().optional(),
  linkedIssueId: z.string().optional(),
  linkedIssueUrl: z.string().optional(),
  linkedIssueTitle: z.string().optional(),
  linkedIssueComments: z.array(z.string()).optional(),
  createdAt: z.string().min(1),
}).superRefine((intervention, ctx) => {
  if (intervention.interventionType === "note" && !intervention.note) {
    ctx.addIssue({ code: "custom", message: "note interventions require note text", path: ["note"] });
  }
  if (intervention.interventionType === "linked_issue_inspection" && !intervention.linkedIssueId && !intervention.linkedIssueUrl) {
    ctx.addIssue({ code: "custom", message: "linked issue inspections require linked issue metadata", path: ["linkedIssueId"] });
  }
});

export const learnerSummarySchema = z.object({
  summaryId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  ideaId: z.string().min(1),
  title: z.string().min(1),
  summaryText: z.string().min(1),
  keyLearnings: z.array(z.string()),
  skillsReinjected: z.array(z.string()),
  metrics: z.object({
    duration: z.number().nonnegative().optional(),
    commits: z.number().int().nonnegative().optional(),
    testsAdded: z.number().int().nonnegative().optional(),
    testsPassed: z.number().int().nonnegative().optional(),
    filesChanged: z.number().int().nonnegative().optional(),
  }),
  createdAt: z.string().min(1),
});

export const knowledgeEntrySchema = z.object({
  entryId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  knowledgeType: knowledgeTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  reinjectionCommand: z.string().optional(),
  sourceRunId: z.string().optional(),
  sourceSummaryId: z.string().optional(),
  usedInRunId: z.string().optional(),
  lastUsedAt: z.string().optional(),
  usageCount: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).superRefine((entry, ctx) => {
  if (entry.usedInRunId && !entry.lastUsedAt) {
    ctx.addIssue({ code: "custom", message: "used knowledge entries must include lastUsedAt", path: ["lastUsedAt"] });
  }
});

export const digestSchema = z.object({
  digestId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  digestType: digestTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  details: z.array(z.string()),
  priority: digestPrioritySchema,
  status: digestStatusSchema,
  deliveredAt: z.string().nullable(),
  readAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  relatedRunId: z.string().optional(),
  relatedBudgetId: z.string().optional(),
  createdAt: z.string().min(1),
}).superRefine((digest, ctx) => {
  if (digest.status === "pending") {
    if (digest.deliveredAt || digest.readAt || digest.dismissedAt) {
      ctx.addIssue({ code: "custom", message: "pending digests cannot have lifecycle timestamps", path: ["status"] });
    }
  }
  if (digest.status === "delivered" && !digest.deliveredAt) {
    ctx.addIssue({ code: "custom", message: "delivered digests must include deliveredAt", path: ["deliveredAt"] });
  }
  if (digest.status === "read" && !digest.readAt) {
    ctx.addIssue({ code: "custom", message: "read digests must include readAt", path: ["readAt"] });
  }
  if (digest.status === "dismissed" && !digest.dismissedAt) {
    ctx.addIssue({ code: "custom", message: "dismissed digests must include dismissedAt", path: ["dismissedAt"] });
  }
});

export const releaseHealthCheckSchema = z.object({
  checkId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  checkType: healthCheckTypeSchema,
  name: z.string().min(1),
  status: healthCheckStatusSchema,
  errorMessage: z.string().optional(),
  failedAt: z.string().optional(),
  passedAt: z.string().optional(),
  createdAt: z.string().min(1),
}).superRefine((check, ctx) => {
  if (check.status === "passed" && !check.passedAt) {
    ctx.addIssue({ code: "custom", message: "passed checks must include passedAt", path: ["passedAt"] });
  }
  if (check.status === "failed" && !check.failedAt) {
    ctx.addIssue({ code: "custom", message: "failed checks must include failedAt", path: ["failedAt"] });
  }
  if (check.status !== "failed" && check.errorMessage) {
    ctx.addIssue({ code: "custom", message: "only failed checks may include errorMessage", path: ["errorMessage"] });
  }
});

export const rollbackActionSchema = z.object({
  rollbackId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  checkId: z.string().min(1),
  rollbackType: rollbackTypeSchema,
  status: rollbackStatusSchema,
  targetCommitSha: z.string().optional(),
  checkpointId: z.string().optional(),
  errorMessage: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string().min(1),
}).superRefine((rollback, ctx) => {
  if (rollback.rollbackType === "restore_checkpoint" && !rollback.checkpointId) {
    ctx.addIssue({ code: "custom", message: "restore_checkpoint requires checkpointId", path: ["checkpointId"] });
  }
  if (rollback.rollbackType === "revert_commit" && !rollback.targetCommitSha) {
    ctx.addIssue({ code: "custom", message: "revert_commit requires targetCommitSha", path: ["targetCommitSha"] });
  }
  if (rollback.status === "completed" && !rollback.completedAt) {
    ctx.addIssue({ code: "custom", message: "completed rollbacks must include completedAt", path: ["completedAt"] });
  }
  if (rollback.status === "pending" && rollback.completedAt) {
    ctx.addIssue({ code: "custom", message: "pending rollbacks cannot include completedAt", path: ["completedAt"] });
  }
});
