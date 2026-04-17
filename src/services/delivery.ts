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
import { transitionRunStatus } from "./state-machines.js";

type PlanningRiskLevel = NonNullable<PlanningArtifact["riskLevel"]>;
type CancellationPolicy = NonNullable<PlanningArtifact["cancellationPolicy"]>;

export function deriveCheckpointRequirement(input: {
  automationTier: AutomationTier;
  executionMode: "simple" | "convoy";
  complexityEstimate?: Idea["complexityEstimate"];
  riskLevel?: PlanningRiskLevel;
}): { required: boolean; reason?: string } {
  if (input.riskLevel === "high") {
    return { required: true, reason: "High-risk plans require a checkpoint before execution or cancellation." };
  }
  if (input.executionMode === "convoy") {
    return { required: true, reason: "Convoy execution requires a checkpoint before risky multi-step delivery." };
  }
  if (input.complexityEstimate === "high") {
    return { required: true, reason: "High-complexity work requires a checkpoint before execution." };
  }
  if (input.automationTier === "fullauto") {
    return { required: true, reason: "Fullauto runs require a checkpoint for operator-safe recovery." };
  }
  return { required: false, reason: undefined };
}

function deriveRiskFactors(input: {
  automationTier: AutomationTier;
  executionMode: "simple" | "convoy";
  complexityEstimate?: Idea["complexityEstimate"];
  dependencies?: string[];
  risks?: string[];
}): string[] {
  const factors = new Set<string>();
  if (input.executionMode === "convoy") factors.add("multi_step_execution");
  if (input.automationTier === "fullauto") factors.add("autonomous_execution");
  if (input.complexityEstimate === "high") factors.add("high_complexity");
  if ((input.dependencies?.length ?? 0) > 0) factors.add("delivery_dependencies");
  for (const risk of input.risks ?? []) {
    const trimmed = risk.trim();
    if (trimmed) factors.add(trimmed);
  }
  return [...factors];
}

function deriveRiskLevel(input: {
  automationTier: AutomationTier;
  executionMode: "simple" | "convoy";
  complexityEstimate?: Idea["complexityEstimate"];
  dependencies?: string[];
  riskFactors: string[];
}): PlanningRiskLevel {
  if (
    input.executionMode === "convoy" ||
    input.automationTier === "fullauto" ||
    input.complexityEstimate === "high" ||
    input.riskFactors.length >= 3
  ) {
    return "high";
  }
  if (
    input.automationTier === "semiauto" ||
    input.complexityEstimate === "medium" ||
    (input.dependencies?.length ?? 0) > 0 ||
    input.riskFactors.length > 0
  ) {
    return "medium";
  }
  return "low";
}

function deriveRolloutGuardrails(input: {
  executionMode: "simple" | "convoy";
  automationTier: AutomationTier;
  riskLevel: PlanningRiskLevel;
}): string[] {
  const guardrails = [
    "Run release-health checks before marking the run complete",
    "Keep rollback recovery available until the rollout is verified",
  ];
  if (input.executionMode === "convoy") {
    guardrails.push("Advance convoy tasks in order and checkpoint before cross-cutting steps");
  }
  if (input.automationTier === "fullauto" || input.riskLevel === "high") {
    guardrails.push("Require an operator-visible audit trail for any forced cancellation or rollback");
  }
  return guardrails;
}

function deriveCancellationPolicy(checkpointRequired: boolean): CancellationPolicy {
  return checkpointRequired ? "checkpoint_or_acknowledged_force" : "operator_cancel";
}

function deriveApprovalMode(input: {
  approvalMode?: "manual" | "auto_approve";
  automationTier: AutomationTier;
  executionMode: "simple" | "convoy";
  complexityEstimate?: Idea["complexityEstimate"];
  riskLevel: PlanningRiskLevel;
}): "manual" | "auto_approve" {
  if (input.approvalMode) return input.approvalMode;
  if (input.automationTier !== "fullauto") return "manual";
  if (input.executionMode === "convoy") return "manual";
  if (input.complexityEstimate === "high") return "manual";
  if (input.riskLevel === "high") return "manual";
  return "auto_approve";
}

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
  executionMode?: "simple" | "convoy";
  approvalMode?: "manual" | "auto_approve";
}): PlanningArtifact {
  const executionMode = input.executionMode ?? ((input.dependencies?.length ?? 0) > 0 ? "convoy" : "simple");
  const riskFactors = deriveRiskFactors({
    automationTier: input.automationTier,
    executionMode,
    complexityEstimate: input.idea.complexityEstimate,
    dependencies: input.dependencies,
    risks: input.idea.risks,
  });
  const riskLevel = deriveRiskLevel({
    automationTier: input.automationTier,
    executionMode,
    complexityEstimate: input.idea.complexityEstimate,
    dependencies: input.dependencies,
    riskFactors,
  });
  const checkpointPolicy = deriveCheckpointRequirement({
    automationTier: input.automationTier,
    executionMode,
    complexityEstimate: input.idea.complexityEstimate,
    riskLevel,
  });
  const cancellationPolicy = deriveCancellationPolicy(checkpointPolicy.required);
  const approvalMode = deriveApprovalMode({
    approvalMode: input.approvalMode,
    automationTier: input.automationTier,
    executionMode,
    complexityEstimate: input.idea.complexityEstimate,
    riskLevel,
  });
  return {
    artifactId: input.artifactId,
    companyId: input.companyId,
    projectId: input.projectId,
    ideaId: input.ideaId,
    title: input.title ?? `Plan: ${input.idea.title.slice(0, 60)}`,
    goalAlignmentSummary: input.goalAlignmentSummary ?? input.idea.rationale,
    implementationSpec:
      input.implementationSpec ??
      input.idea.technicalApproach ??
      input.idea.description ??
      input.idea.rationale,
    dependencies: input.dependencies ?? [],
    rolloutPlan:
      input.rolloutPlan ?? "Ship behind a controlled rollout and verify operator-facing acceptance criteria.",
    testPlan:
      input.testPlan ?? "Run targeted validation, regression checks, and release-health verification before completion.",
    approvalChecklist:
      input.approvalChecklist ?? [
        "Confirm implementation scope matches the idea rationale",
        "Confirm rollback and release-health checks are defined",
        ...(checkpointPolicy.required ? ["Confirm a checkpoint strategy exists before risky execution"] : []),
      ],
    executionMode,
    approvalMode,
    checkpointRequired: checkpointPolicy.required,
    checkpointReason: checkpointPolicy.reason,
    riskLevel,
    riskFactors,
    rolloutGuardrails: deriveRolloutGuardrails({
      executionMode,
      automationTier: input.automationTier,
      riskLevel,
    }),
    cancellationPolicy,
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
  approvalMode?: "manual" | "auto_approve";
}): boolean {
  if (!input.autopilotEnabled) return false;
  if (input.decision === "now") return true;
  if (input.decision !== "yes") return false;
  if (input.automationTier === "semiauto") return true;
  if (input.automationTier === "fullauto") return input.approvalMode === "auto_approve";
  return false;
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
  cancellationReason?: string;
}): DeliveryRun {
  return {
    ...input.run,
    ...transitionRunStatus(input.run, input.status, input.updatedAt, {
      commitSha: input.commitSha,
      prUrl: input.prUrl,
      error: input.error,
      cancellationReason: input.cancellationReason,
    }),
  };
}

export function pauseDeliveryRun(run: DeliveryRun, updatedAt: string, reason?: string): DeliveryRun {
  return {
    ...run,
    ...transitionRunStatus(run, "paused", updatedAt, {
      paused: true,
      pauseReason: reason,
    }),
  };
}

export function resumeDeliveryRun(run: DeliveryRun, updatedAt: string): DeliveryRun {
  return {
    ...run,
    ...transitionRunStatus(run, "running", updatedAt, {
      paused: false,
      pauseReason: undefined,
    }),
  };
}

export function cancelDeliveryRun(run: DeliveryRun, updatedAt: string, cancellationReason: string): DeliveryRun {
  return {
    ...run,
    ...transitionRunStatus(run, "cancelled", updatedAt, {
      paused: false,
      pauseReason: undefined,
      cancellationReason,
    }),
  };
}

export function requiresCheckpointForRunGate(input: {
  artifact?: PlanningArtifact | null;
  checkpoints?: { checkpointId: string }[];
}): { required: boolean; satisfied: boolean; reason?: string } {
  const required = input.artifact?.checkpointRequired ?? false;
  const satisfied = !required || (input.checkpoints?.length ?? 0) > 0;
  return {
    required,
    satisfied,
    reason: input.artifact?.checkpointReason,
  };
}

export function getRunCancellationPolicy(
  artifact?: PlanningArtifact | null,
): {
  policy: CancellationPolicy;
  riskLevel: PlanningRiskLevel;
  guardrails: string[];
} {
  return {
    policy: artifact?.cancellationPolicy ?? (artifact?.checkpointRequired ? "checkpoint_or_acknowledged_force" : "operator_cancel"),
    riskLevel: artifact?.riskLevel ?? (artifact?.checkpointRequired ? "high" : "medium"),
    guardrails: artifact?.rolloutGuardrails ?? [],
  };
}

export function describeCancellationPolicy(artifact?: PlanningArtifact | null): string {
  const { policy } = getRunCancellationPolicy(artifact);
  if (policy === "checkpoint_or_acknowledged_force") {
    return "Checkpoint first, or use a force-cancel with explicit operator acknowledgment.";
  }
  return "Operator can cancel directly with a clear reason.";
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
