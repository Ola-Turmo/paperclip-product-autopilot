import type {
  AutomationTier,
  IdeaStatus,
  SwipeDecision,
  ResearchStatus,
  RunStatus,
  ExecutionMode,
  ApprovalMode,
  ConvoyTaskStatus,
  InterventionType,
  LockType,
  DigestType,
  DigestStatus,
  HealthCheckStatus,
  HealthCheckType,
  RollbackStatus,
  RollbackType,
  KnowledgeType,
} from "./constants.js";

// ─── AutopilotProject ─────────────────────────────────────────────────────────────
export interface AutopilotProject {
  autopilotId: string;
  companyId: string;
  projectId: string;
  enabled: boolean;
  automationTier: AutomationTier;
  budgetMinutes: number;
  repoUrl?: string;
  workspaceId?: string;
  liveUrl?: string;
  productType?: string;
  agentId?: string;
  paused: boolean;
  pauseReason?: string;
  // Research / ideation schedule overrides
  researchScheduleCron?: string;
  ideationScheduleCron?: string;
  maybePoolResurfaceDays?: number;
  maxIdeasPerCycle?: number;
  // Automation flags
  autoCreateIssues: boolean;
  autoCreatePrs: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── ProductProgramRevision ────────────────────────────────────────────────────
export interface ProductProgramRevision {
  revisionId: string;
  companyId: string;
  projectId: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── ResearchCycle ──────────────────────────────────────────────────────────────
export interface ResearchCycle {
  cycleId: string;
  companyId: string;
  projectId: string;
  status: ResearchStatus;
  query: string;
  reportContent?: string;
  findingsCount: number;
  sources?: string[];
  snapshot?: {
    findingIds: string[];
    topicCounts: Record<string, number>;
    signalFamilyCounts: Record<string, number>;
    averageFreshnessScore: number;
    averageSourceQualityScore: number;
    duplicateCount: number;
    generatedAt: string;
  };
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ─── ResearchFinding ───────────────────────────────────────────────────────────
export interface ResearchFinding {
  findingId: string;
  companyId: string;
  projectId: string;
  cycleId: string;
  title: string;
  description: string;
  sourceUrl?: string;
  sourceLabel?: string;
  evidenceText?: string;
  signalFamily?: "support" | "analytics" | "market" | "incident" | "qualitative" | "technical";
  topic?: string;
  dedupeKey?: string;
  category?:
    | "opportunity"
    | "threat"
    | "risk"
    | "competitive"
    | "user_feedback"
    | "technical";
  confidence: number; // 0-1
  sourceQualityScore: number; // 0-100
  freshnessScore: number; // 0-100
  duplicateOfFindingId?: string;
  duplicateAnnotated: boolean;
  createdAt: string;
}

// ─── Idea ─────────────────────────────────────────────────────────────────────
export interface Idea {
  ideaId: string;
  companyId: string;
  projectId: string;
  cycleId?: string;
  title: string;
  description: string;
  rationale: string;
  sourceReferences: string[];
  impactScore: number; // 0-100
  feasibilityScore: number; // 0-100
  complexityEstimate?: "low" | "medium" | "high";
  technicalApproach?: string;
  risks?: string[];
  category?: string;
  tags?: string[];
  status: IdeaStatus;
  duplicateOfIdeaId?: string;
  duplicateAnnotated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── SwipeEvent ────────────────────────────────────────────────────────────────
export interface SwipeEvent {
  swipeId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  decision: SwipeDecision;
  note?: string;
  createdAt: string;
}

// ─── PreferenceProfile ─────────────────────────────────────────────────────────
export interface PreferenceProfile {
  profileId: string;
  companyId: string;
  projectId: string;
  passCount: number;
  maybeCount: number;
  yesCount: number;
  nowCount: number;
  totalSwipes: number;
  categoryPreferences: Record<string, { pass: number; maybe: number; yes: number; now: number }>;
  tagPreferences: Record<string, { pass: number; maybe: number; yes: number; now: number }>;
  complexityPreferences: Record<string, { pass: number; maybe: number; yes: number; now: number }>;
  avgApprovedScore: number;
  avgRejectedScore: number;
  lastUpdated: string;
}

// ─── PlanningArtifact ─────────────────────────────────────────────────────────
export interface PlanningArtifact {
  artifactId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  title: string;
  goalAlignmentSummary: string;
  implementationSpec: string;
  dependencies: string[];
  rolloutPlan: string;
  testPlan: string;
  approvalChecklist: string[];
  executionMode: ExecutionMode;
  approvalMode: ApprovalMode;
  automationTier: AutomationTier;
  status: "draft" | "approved" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// ─── DeliveryRun ───────────────────────────────────────────────────────────────
export interface DeliveryRun {
  runId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  artifactId: string;
  title: string;
  status: RunStatus;
  automationTier: AutomationTier;
  branchName: string;
  workspacePath: string;
  leasedPort: number | null;
  commitSha: string | null;
  prUrl?: string;
  prNumber?: number;
  paused: boolean;
  pauseReason?: string;
  cancellationReason?: string;
  completedAt: string | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── WorkspaceLease ───────────────────────────────────────────────────────────
export interface WorkspaceLease {
  leaseId: string;
  companyId: string;
  projectId: string;
  runId: string;
  workspacePath: string;
  branchName: string;
  leasedPort: number | null;
  gitRepoRoot: string | null;
  isActive: boolean;
  createdAt: string;
  releasedAt: string | null;
}

// ─── CompanyBudget ────────────────────────────────────────────────────────────
export interface CompanyBudget {
  budgetId: string;
  companyId: string;
  totalBudgetMinutes: number;
  usedBudgetMinutes: number;
  autopilotBudgetMinutes: number;
  autopilotUsedMinutes: number;
  paused: boolean;
  pauseReason?: string;
  updatedAt: string;
}

// ─── ConvoyTask ────────────────────────────────────────────────────────────────
export interface ConvoyTask {
  taskId: string;
  companyId: string;
  projectId: string;
  runId: string;
  artifactId: string;
  title: string;
  description: string;
  status: ConvoyTaskStatus;
  dependsOnTaskIds: string[];
  startedAt: string | null;
  completedAt: string | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────
export interface Checkpoint {
  checkpointId: string;
  companyId: string;
  projectId: string;
  runId: string;
  label?: string;
  snapshotState: Record<string, unknown>;
  taskStates: Record<string, ConvoyTaskStatus>;
  workspaceSnapshot: {
    branchName: string;
    commitSha: string | null;
    workspacePath: string;
    leasedPort: number | null;
  };
  pauseReason?: string;
  createdAt: string;
}

// ─── ProductLock ──────────────────────────────────────────────────────────────
export interface ProductLock {
  lockId: string;
  companyId: string;
  projectId: string;
  runId: string;
  lockType: LockType;
  targetBranch: string;
  targetPath: string;
  acquiredAt: string;
  releasedAt: string | null;
  isActive: boolean;
  blockReason?: string;
}

// ─── OperatorIntervention ────────────────────────────────────────────────────
export interface OperatorIntervention {
  interventionId: string;
  companyId: string;
  projectId: string;
  runId: string;
  interventionType: InterventionType;
  note?: string;
  checkpointId?: string;
  linkedIssueId?: string;
  linkedIssueUrl?: string;
  linkedIssueTitle?: string;
  linkedIssueComments?: string[];
  createdAt: string;
}

// ─── LearnerSummary ───────────────────────────────────────────────────────────
export interface LearnerSummary {
  summaryId: string;
  companyId: string;
  projectId: string;
  runId: string;
  ideaId: string;
  title: string;
  summaryText: string;
  keyLearnings: string[];
  skillsReinjected: string[];
  metrics: {
    duration?: number;
    commits?: number;
    testsAdded?: number;
    testsPassed?: number;
    filesChanged?: number;
  };
  createdAt: string;
}

// ─── KnowledgeEntry ───────────────────────────────────────────────────────────
export interface KnowledgeEntry {
  entryId: string;
  companyId: string;
  projectId: string;
  knowledgeType: KnowledgeType;
  title: string;
  content: string;
  reinjectionCommand?: string;
  sourceRunId?: string;
  sourceSummaryId?: string;
  usedInRunId?: string;
  lastUsedAt?: string;
  usageCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Digest ──────────────────────────────────────────────────────────────────
export interface Digest {
  digestId: string;
  companyId: string;
  projectId: string;
  digestType: DigestType;
  dedupeKey?: string;
  escalationLevel?: number;
  title: string;
  summary: string;
  details: string[];
  priority: "low" | "medium" | "high" | "critical";
  status: DigestStatus;
  deliveredAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  cooldownUntil?: string;
  reopenCount?: number;
  relatedRunId?: string;
  relatedBudgetId?: string;
  createdAt: string;
}

// ─── ReleaseHealthCheck ───────────────────────────────────────────────────────
export interface ReleaseHealthCheck {
  checkId: string;
  companyId: string;
  projectId: string;
  runId: string;
  checkType: HealthCheckType;
  name: string;
  status: HealthCheckStatus;
  errorMessage?: string;
  failedAt?: string;
  passedAt?: string;
  createdAt: string;
}

// ─── RollbackAction ───────────────────────────────────────────────────────────
export interface RollbackAction {
  rollbackId: string;
  companyId: string;
  projectId: string;
  runId: string;
  checkId: string;
  rollbackType: RollbackType;
  status: RollbackStatus;
  targetCommitSha?: string;
  checkpointId?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
}

// ─── UI summary types ────────────────────────────────────────────────────────
export interface AutopilotOverview {
  projectCount: number;
  enabledCount: number;
  pausedCount: number;
  activeIdeasCount: number;
  maybePoolCount: number;
  approvedIdeasCount: number;
  runningRunsCount: number;
  completedRunsCount: number;
  failedRunsCount: number;
  totalSwipesToday: number;
  budgetUsagePercent: number;
}
