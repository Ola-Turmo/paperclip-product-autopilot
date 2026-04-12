import type { AutomationTier } from "../constants.js";
import type {
  AutopilotProject,
  DeliveryRun,
  Idea,
  PlanningArtifact,
  ProductLock,
  WorkspaceLease,
} from "../types.js";
import type { RunStatus } from "../constants.js";

export function buildPlanningArtifact(input: {
  artifactId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  idea: Idea;
  automationTier: AutomationTier;
  createdAt: string;
  title?: string;
  goalAlignmentSummary?: string;
  implementationSpec?: string;
  dependencies?: string[];
  rolloutPlan?: string;
  testPlan?: string;
  approvalChecklist?: string[];
  approvalMode?: "manual" | "auto_approve";
}): PlanningArtifact {
  return {
    artifactId: input.artifactId,
    companyId: input.companyId,
    projectId: input.projectId,
    ideaId: input.ideaId,
    title: input.title ?? `Plan: ${input.idea.title.slice(0, 60)}`,
    goalAlignmentSummary: input.goalAlignmentSummary ?? input.idea.rationale,
    implementationSpec: input.implementationSpec ?? input.idea.technicalApproach ?? "",
    dependencies: input.dependencies ?? [],
    rolloutPlan: input.rolloutPlan ?? "",
    testPlan: input.testPlan ?? "",
    approvalChecklist: input.approvalChecklist ?? [],
    executionMode: "simple",
    approvalMode: input.approvalMode ?? (input.automationTier === "fullauto" ? "auto_approve" : "manual"),
    automationTier: input.automationTier,
    status: "draft",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function shouldCreateDeliveryRun(input: {
  decision: "pass" | "maybe" | "yes" | "now";
  autopilotEnabled: boolean;
  automationTier: AutomationTier;
}): boolean {
  if (!input.autopilotEnabled) return false;
  if (input.decision === "now") return true;
  return input.decision === "yes" && input.automationTier !== "supervised";
}

export function buildPendingDeliveryRun(input: {
  runId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  artifactId: string;
  idea: Idea;
  automationTier: AutomationTier;
  branchName: string;
  workspacePath: string;
  leasedPort: number | null;
  createdAt: string;
  title?: string;
}): DeliveryRun {
  return {
    runId: input.runId,
    companyId: input.companyId,
    projectId: input.projectId,
    ideaId: input.ideaId,
    artifactId: input.artifactId,
    title: input.title ?? `Delivery: ${input.idea.title.slice(0, 60)}`,
    status: "pending",
    automationTier: input.automationTier,
    branchName: input.branchName,
    workspacePath: input.workspacePath,
    leasedPort: input.leasedPort,
    commitSha: null,
    paused: false,
    completedAt: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function buildWorkspaceLease(input: {
  leaseId: string;
  companyId: string;
  projectId: string;
  runId: string;
  workspacePath: string;
  branchName: string;
  leasedPort: number | null;
  gitRepoRoot: string | null;
  createdAt: string;
}): WorkspaceLease {
  return {
    leaseId: input.leaseId,
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.runId,
    workspacePath: input.workspacePath,
    branchName: input.branchName,
    leasedPort: input.leasedPort,
    gitRepoRoot: input.gitRepoRoot,
    isActive: true,
    createdAt: input.createdAt,
    releasedAt: null,
  };
}

export function buildProductLock(input: {
  lockId: string;
  companyId: string;
  projectId: string;
  runId: string;
  branchName: string;
  targetPath?: string;
  acquiredAt: string;
}): ProductLock {
  return {
    lockId: input.lockId,
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.runId,
    lockType: "product_lock",
    targetBranch: input.branchName,
    targetPath: input.targetPath ?? "",
    acquiredAt: input.acquiredAt,
    releasedAt: null,
    isActive: true,
  };
}

export function getAutomationTier(project: AutopilotProject | null | undefined, fallback: AutomationTier = "supervised"): AutomationTier {
  return project?.automationTier ?? fallback;
}

export function shouldReleaseRunResources(status: string): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

export function updateDeliveryRunStatus(input: {
  run: DeliveryRun;
  status: RunStatus;
  updatedAt: string;
  commitSha?: string;
  prUrl?: string;
  error?: string;
}): DeliveryRun {
  return {
    ...input.run,
    status: input.status,
    commitSha: input.commitSha ?? input.run.commitSha,
    prUrl: input.prUrl,
    error: input.error,
    completedAt: shouldReleaseRunResources(input.status) ? input.updatedAt : null,
    updatedAt: input.updatedAt,
  };
}

export function pauseDeliveryRun(run: DeliveryRun, updatedAt: string, reason?: string): DeliveryRun {
  return {
    ...run,
    status: "paused",
    paused: true,
    pauseReason: reason,
    updatedAt,
  };
}

export function resumeDeliveryRun(run: DeliveryRun, updatedAt: string): DeliveryRun {
  return {
    ...run,
    status: "running",
    paused: false,
    pauseReason: undefined,
    updatedAt,
  };
}

export function releaseWorkspaceLease(lease: WorkspaceLease, releasedAt: string): WorkspaceLease {
  return {
    ...lease,
    isActive: false,
    releasedAt,
  };
}

export function releaseProductLock(lock: ProductLock, releasedAt: string): ProductLock {
  return {
    ...lock,
    isActive: false,
    releasedAt,
  };
}
