import type {
  Checkpoint,
  DeliveryRun,
  PlanningArtifact,
  ProductLock,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";
import { canTriggerRollback, isTerminalRunStatus } from "./lifecycle.js";

export function validatePlanningArtifactInvariant(artifact: PlanningArtifact): void {
  if (!artifact.title.trim()) {
    throw new Error("Planning artifact title is required");
  }
  if (!artifact.implementationSpec.trim()) {
    throw new Error("Planning artifacts require an implementationSpec");
  }
  if (!artifact.rolloutPlan.trim()) {
    throw new Error("Planning artifacts require a rolloutPlan");
  }
  if (!artifact.testPlan.trim()) {
    throw new Error("Planning artifacts require a testPlan");
  }
  if (artifact.approvalChecklist.length === 0) {
    throw new Error("Planning artifacts require an approvalChecklist");
  }
  if (artifact.approvalMode === "auto_approve" && artifact.approvalChecklist.length < 2) {
    throw new Error("Auto-approved plans require at least two checklist items");
  }
  if (artifact.checkpointRequired && !artifact.checkpointReason?.trim()) {
    throw new Error("Checkpoint-required plans must include checkpointReason");
  }
  if (artifact.riskLevel === "high" && !artifact.checkpointRequired) {
    throw new Error("High-risk plans must require a checkpoint");
  }
  if (
    artifact.checkpointRequired &&
    artifact.cancellationPolicy &&
    artifact.cancellationPolicy !== "checkpoint_or_acknowledged_force"
  ) {
    throw new Error("Checkpoint-required plans must use checkpoint_or_acknowledged_force cancellation");
  }
  if (artifact.riskLevel === "high" && (artifact.rolloutGuardrails?.length ?? 0) === 0) {
    throw new Error("High-risk plans require rollout guardrails");
  }
}

export function validateDeliveryRunCreation(input: {
  run: Pick<DeliveryRun, "artifactId" | "branchName" | "workspacePath" | "ideaId">;
  ideaStatus: string;
  activeLock: ProductLock | null;
  artifact?: Pick<PlanningArtifact, "artifactId" | "ideaId" | "status"> | null;
}): void {
  if (input.ideaStatus !== "approved" && input.ideaStatus !== "in_progress") {
    throw new Error(`Delivery run requires an approved idea, got ${input.ideaStatus}`);
  }
  if (!input.run.artifactId.trim()) {
    throw new Error("Delivery runs require an artifactId");
  }
  if (!input.run.branchName.trim()) {
    throw new Error("Delivery runs require a branchName");
  }
  if (!input.run.workspacePath.trim()) {
    throw new Error("Delivery runs require a workspacePath");
  }
  if (input.activeLock?.isActive) {
    throw new Error(`Branch ${input.run.branchName} is already locked`);
  }
  if (input.artifact) {
    if (input.artifact.ideaId !== input.run.ideaId) {
      throw new Error("Delivery run artifact does not belong to the target idea");
    }
    if (input.artifact.status === "cancelled") {
      throw new Error("Cannot create a delivery run from a cancelled planning artifact");
    }
  }
}

export function validateDeliveryRunCancellation(input: {
  run: Pick<DeliveryRun, "status">;
  artifact?: Pick<PlanningArtifact, "cancellationPolicy"> | null;
  checkpoints?: { checkpointId: string }[];
  reason?: string;
  force?: boolean;
}): void {
  if (!input.reason?.trim()) {
    throw new Error("Cancellation reason is required");
  }
  if (!["pending", "running", "paused"].includes(input.run.status)) {
    throw new Error(`Cannot cancel a run in status ${input.run.status}`);
  }
  const policy = input.artifact?.cancellationPolicy ?? "operator_cancel";
  if (
    policy === "checkpoint_or_acknowledged_force" &&
    ["running", "paused"].includes(input.run.status) &&
    (input.checkpoints?.length ?? 0) === 0 &&
    !input.force
  ) {
    throw new Error("This run requires a checkpoint before cancellation unless the operator uses an acknowledged force-cancel");
  }
}

export function validateRollbackRequest(input: {
  run: DeliveryRun;
  check: ReleaseHealthCheck;
  existingRollbacks: RollbackAction[];
  rollbackType: RollbackAction["rollbackType"];
  checkpoint?: Checkpoint;
  targetCommitSha?: string;
}): void {
  if (isTerminalRunStatus(input.run.status)) {
    throw new Error(`Cannot trigger rollback for terminal run status ${input.run.status}`);
  }
  if (!canTriggerRollback(input.check)) {
    throw new Error(`Rollback can only be triggered from a failed health check, got ${input.check.status}`);
  }

  const activeExisting = input.existingRollbacks.find(
    (candidate) =>
      candidate.checkId === input.check.checkId &&
      (candidate.status === "pending" || candidate.status === "in_progress"),
  );
  if (activeExisting) {
    throw new Error("A rollback is already pending for this failed health check");
  }

  if (input.rollbackType === "restore_checkpoint") {
    if (!input.checkpoint) {
      throw new Error("Checkpoint not found for restore_checkpoint rollback");
    }
    if (input.checkpoint.runId !== input.run.runId) {
      throw new Error("Rollback checkpoint does not belong to the target run");
    }
    if (input.checkpoint.workspaceSnapshot.branchName !== input.run.branchName) {
      throw new Error("Rollback checkpoint branch does not match the target run");
    }
  }

  if (input.rollbackType === "revert_commit" && !input.targetCommitSha?.trim()) {
    throw new Error("Rollback requires a targetCommitSha for revert_commit rollbacks");
  }
}

export function validateConvoyDependencies(input: {
  taskTitles: string[];
  dependencies?: string[][];
}): void {
  const dependencies = input.dependencies ?? [];
  const visitState = new Map<number, "visiting" | "visited">();

  function dfs(index: number) {
    const state = visitState.get(index);
    if (state === "visiting") {
      throw new Error("Convoy task dependencies cannot contain cycles");
    }
    if (state === "visited") return;

    visitState.set(index, "visiting");
    for (const dependency of dependencies[index] ?? []) {
      const dependencyIndex = Number.parseInt(dependency, 10);
      if (!Number.isInteger(dependencyIndex) || dependencyIndex < 0 || dependencyIndex >= input.taskTitles.length) {
        throw new Error(`Convoy dependency index ${dependency} is out of range`);
      }
      if (dependencyIndex === index) {
        throw new Error("Convoy tasks cannot depend on themselves");
      }
      dfs(dependencyIndex);
    }
    visitState.set(index, "visited");
  }

  for (let index = 0; index < input.taskTitles.length; index += 1) {
    dfs(index);
  }
}
