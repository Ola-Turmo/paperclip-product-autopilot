import type { ConvoyTaskStatus, RunStatus } from "../constants.js";
import type {
  Checkpoint,
  ConvoyTask,
  DeliveryRun,
  PlanningArtifact,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";
import {
  canTriggerRollback,
  transitionRollback,
  transitionHealthCheck,
} from "./state-machines.js";

export function buildCheckpoint(input: {
  checkpointId: string;
  companyId: string;
  projectId: string;
  runId: string;
  run: DeliveryRun | null;
  tasks: ConvoyTask[];
  createdAt: string;
  label?: string;
  pauseReason?: string;
}): Checkpoint {
  return {
    checkpointId: input.checkpointId,
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.runId,
    label: input.label,
    snapshotState: { runStatus: input.run?.status },
    taskStates: Object.fromEntries(input.tasks.map((task) => [task.taskId, task.status])),
    workspaceSnapshot: {
      branchName: input.run?.branchName ?? "",
      commitSha: input.run?.commitSha ?? null,
      workspacePath: input.run?.workspacePath ?? "",
      leasedPort: input.run?.leasedPort ?? null,
    },
    pauseReason: input.pauseReason,
    createdAt: input.createdAt,
  };
}

export function buildRestoredConvoyTask(task: ConvoyTask, status: ConvoyTaskStatus, updatedAt: string): ConvoyTask {
  return {
    ...task,
    status,
    updatedAt,
  };
}

export function buildReleaseHealthCheck(input: {
  checkId: string;
  companyId: string;
  projectId: string;
  runId: string;
  checkType: ReleaseHealthCheck["checkType"];
  name: string;
  createdAt: string;
}): ReleaseHealthCheck {
  return {
    checkId: input.checkId,
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.runId,
    checkType: input.checkType,
    name: input.name,
    status: "pending",
    createdAt: input.createdAt,
  };
}

export function updateReleaseHealthCheck(
  check: ReleaseHealthCheck,
  status: ReleaseHealthCheck["status"],
  updatedAt: string,
  errorMessage?: string,
): ReleaseHealthCheck {
  return transitionHealthCheck(check, status, updatedAt, errorMessage);
}

export function buildRollbackAction(input: {
  rollbackId: string;
  companyId: string;
  projectId: string;
  runId: string;
  checkId: string;
  rollbackType: RollbackAction["rollbackType"];
  createdAt: string;
  targetCommitSha?: string;
  checkpointId?: string;
}): RollbackAction {
  if (input.rollbackType === "restore_checkpoint" && !input.checkpointId) {
    throw new Error("checkpointId is required for restore_checkpoint rollbacks");
  }
  if (input.rollbackType === "revert_commit" && !input.targetCommitSha) {
    throw new Error("targetCommitSha is required for revert_commit rollbacks");
  }
  return {
    rollbackId: input.rollbackId,
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.runId,
    checkId: input.checkId,
    rollbackType: input.rollbackType,
    status: "pending",
    targetCommitSha: input.targetCommitSha,
    checkpointId: input.checkpointId,
    createdAt: input.createdAt,
  };
}

export function updateRollbackAction(
  rollback: RollbackAction,
  status: RollbackAction["status"],
  updatedAt: string,
  errorMessage?: string,
): RollbackAction {
  return transitionRollback(rollback, status, updatedAt, errorMessage);
}

export function applyRollbackOutcomeToRun(input: {
  run: DeliveryRun;
  rollback: Pick<RollbackAction, "rollbackType" | "status">;
  updatedAt: string;
  errorMessage?: string;
}): DeliveryRun {
  if (input.rollback.status === "completed") {
    return {
      ...input.run,
      status: "paused",
      paused: true,
      pauseReason: `Rollback completed: ${input.rollback.rollbackType}`,
      error: undefined,
      updatedAt: input.updatedAt,
    };
  }

  if (input.rollback.status === "failed") {
    return {
      ...input.run,
      status: "failed",
      paused: false,
      pauseReason: undefined,
      completedAt: input.updatedAt,
      error: input.errorMessage ?? `Rollback failed: ${input.rollback.rollbackType}`,
      updatedAt: input.updatedAt,
    };
  }

  if (input.rollback.status === "skipped") {
    return {
      ...input.run,
      status: "paused",
      paused: true,
      pauseReason: `Rollback skipped: ${input.rollback.rollbackType}`,
      updatedAt: input.updatedAt,
    };
  }

  return {
    ...input.run,
    status: "paused",
    paused: true,
    pauseReason: `Rollback in progress: ${input.rollback.rollbackType}`,
    updatedAt: input.updatedAt,
  };
}

export function checkpointSummary(checkpoint: Checkpoint): string {
  return checkpoint.label ?? `Checkpoint ${checkpoint.checkpointId.slice(0, 8)}`;
}

export function durationBetweenMs(startAt?: string | null, endAt?: string | null): number | undefined {
  if (!startAt || !endAt) return undefined;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  const delta = end - start;
  return delta >= 0 ? delta : undefined;
}

export function formatDurationLabel(durationMs?: number): string | undefined {
  if (durationMs === undefined) return undefined;
  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export interface RunRemediationSummary {
  status: "healthy" | "attention" | "blocked" | "recovering" | "recovered";
  headline: string;
  detail: string;
  nextSteps: string[];
  latestCheckpointLabel?: string;
  rollbackDurationLabel?: string;
  recoveryTimeLabel?: string;
  checkpointAgeLabel?: string;
}

export function summarizeRunRemediationState(input: {
  run: DeliveryRun;
  checks: ReleaseHealthCheck[];
  rollbacks: RollbackAction[];
  checkpoints: Checkpoint[];
  artifact?: PlanningArtifact | null;
}): RunRemediationSummary {
  const latestCheckpoint = [...input.checkpoints].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];
  const latestFailedCheck = input.checks
    .filter((check) => check.status === "failed")
    .sort((left, right) =>
      new Date(right.failedAt ?? right.createdAt).getTime() - new Date(left.failedAt ?? left.createdAt).getTime(),
    )[0];
  const activeRollback = input.rollbacks
    .filter((rollback) => rollback.status === "pending" || rollback.status === "in_progress")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const terminalRollback = input.rollbacks
    .filter((rollback) => ["completed", "failed", "skipped"].includes(rollback.status))
    .sort((left, right) =>
      new Date(right.completedAt ?? right.createdAt).getTime() - new Date(left.completedAt ?? left.createdAt).getTime(),
    )[0];

  const latestCheckpointLabel = latestCheckpoint ? checkpointSummary(latestCheckpoint) : undefined;

  if (activeRollback) {
    return {
      status: "recovering",
      headline: `Rollback in progress: ${activeRollback.rollbackType}`,
      detail: latestFailedCheck
        ? `${latestFailedCheck.name} failed and recovery is now underway. Keep the run paused until rollback reaches a terminal state.`
        : "Recovery is underway for this run. Keep the run paused until rollback reaches a terminal state.",
      nextSteps: [
        "Wait for rollback to finish before resuming delivery work.",
        "Re-run the failed health check as soon as recovery completes.",
        activeRollback.rollbackType !== "restore_checkpoint"
          ? "Capture the operator rationale for the destructive rollback path."
          : "Verify that restored task state still matches the intended delivery plan.",
      ],
      latestCheckpointLabel,
    };
  }

  if (terminalRollback?.status === "completed") {
    const rollbackDurationLabel = formatDurationLabel(
      durationBetweenMs(terminalRollback.createdAt, terminalRollback.completedAt),
    );
    const recoveryTimeLabel = formatDurationLabel(
      durationBetweenMs(latestFailedCheck?.failedAt ?? latestFailedCheck?.createdAt, terminalRollback.completedAt),
    );
    const checkpointAgeLabel = formatDurationLabel(
      durationBetweenMs(latestCheckpoint?.createdAt, terminalRollback.completedAt),
    );

    return {
      status: "recovered",
      headline: `Rollback completed: ${terminalRollback.rollbackType}`,
      detail: latestFailedCheck
        ? `${latestFailedCheck.name} failed, rollback completed, and the run is now paused for verification before retry.`
        : "Rollback completed and the run is now paused for verification before retry.",
      nextSteps: [
        "Verify release-health checks before resuming or retrying the delivery.",
        "Record the root cause and operator decision before attempting another rollout.",
        terminalRollback.rollbackType === "restore_checkpoint"
          ? "Confirm that the restored checkpoint still reflects the intended branch and task plan."
          : "Review whether the destructive rollback path should remain blocked behind governance until the next attempt.",
      ],
      latestCheckpointLabel,
      rollbackDurationLabel,
      recoveryTimeLabel,
      checkpointAgeLabel,
    };
  }

  if (terminalRollback?.status === "failed") {
    return {
      status: "blocked",
      headline: `Rollback failed: ${terminalRollback.rollbackType}`,
      detail: terminalRollback.errorMessage ?? "The last rollback attempt failed and the run now requires operator intervention.",
      nextSteps: [
        "Capture why the rollback failed before attempting another intervention.",
        latestCheckpoint
          ? "Consider restoring the latest checkpoint or escalate to a governed destructive rollback."
          : "Create a checkpoint as soon as the workspace is stable, or escalate to a governed destructive rollback.",
        "Pause further delivery changes until release health is re-evaluated.",
      ],
      latestCheckpointLabel,
    };
  }

  if (latestFailedCheck) {
    const recommendedFallback = latestCheckpoint
      ? "Restore the latest checkpoint or document why a destructive rollback is required."
      : input.run.commitSha
        ? "Create a checkpoint first, or use revert-commit rollback with an explicit governance note if recovery cannot wait."
        : "Create a checkpoint first, or escalate to a full rollback with explicit operator acknowledgment if no safer recovery path exists.";

    return {
      status: "blocked",
      headline: `Health check failed: ${latestFailedCheck.name}`,
      detail: latestFailedCheck.errorMessage ?? "A failed release-health check is blocking further rollout decisions.",
      nextSteps: [
        !latestCheckpoint && ["running", "paused"].includes(input.run.status)
          ? "Create a checkpoint before attempting remediation."
          : recommendedFallback,
        "Add an operator note describing impact, rollback choice, and verification plan.",
        "Keep the run paused until the failed check has a clear remediation path.",
      ],
      latestCheckpointLabel,
    };
  }

  if (input.artifact?.checkpointRequired && input.checkpoints.length === 0) {
    return {
      status: "attention",
      headline: "Checkpoint still required",
      detail: input.artifact.checkpointReason ?? "This run still needs a checkpoint before risky execution continues.",
      nextSteps: [
        "Create a checkpoint before continuing risky work on this run.",
        "Verify that release-health checks are defined for the next rollout boundary.",
      ],
    };
  }

  return {
    status: "healthy",
    headline: "No remediation required",
    detail: "The run has no failed health checks or active rollback work right now.",
    nextSteps: [
      "Continue delivery while monitoring release-health checks.",
      input.artifact?.checkpointRequired
        ? "Keep the latest checkpoint available until the rollout is verified."
        : "Capture a checkpoint before any risky or multi-step change set.",
    ],
    latestCheckpointLabel,
  };
}

export function validateCheckpointRestore(input: {
  run: DeliveryRun | null;
  checkpoint: Checkpoint;
  tasks: ConvoyTask[];
}): void {
  if (!input.run) {
    throw new Error("Delivery run not found for checkpoint restore");
  }
  if (isTerminalRunStatus(input.run.status)) {
    throw new Error(`Cannot restore checkpoint for terminal run status ${input.run.status}`);
  }
  if (input.checkpoint.workspaceSnapshot.branchName !== input.run.branchName) {
    throw new Error("Checkpoint branch does not match current run branch");
  }
  const currentTaskIds = new Set(input.tasks.map((task) => task.taskId));
  for (const taskId of Object.keys(input.checkpoint.taskStates)) {
    if (!currentTaskIds.has(taskId)) {
      throw new Error(`Checkpoint references missing convoy task ${taskId}`);
    }
  }
}

export function summarizeReleaseHealthChecks(checks: ReleaseHealthCheck[]): {
  overallStatus: "healthy" | "degraded" | "blocked" | "idle";
  total: number;
  passed: number;
  failed: number;
  pending: number;
  running: number;
  skipped: number;
} {
  const summary = {
    overallStatus: "idle" as "healthy" | "degraded" | "blocked" | "idle",
    total: checks.length,
    passed: 0,
    failed: 0,
    pending: 0,
    running: 0,
    skipped: 0,
  };

  for (const check of checks) {
    summary[check.status] += 1;
  }

  if (summary.failed > 0) summary.overallStatus = "blocked";
  else if (summary.running > 0 || summary.pending > 0) summary.overallStatus = "degraded";
  else if (summary.total > 0) summary.overallStatus = "healthy";

  return summary;
}

export function describeCheckpointPolicy(artifact: PlanningArtifact | null | undefined): string {
  if (!artifact) return "No planning artifact linked to this run.";
  if (!artifact.checkpointRequired) return "Checkpoint is optional for this run.";
  return artifact.checkpointReason ?? "Checkpoint is required before high-risk execution.";
}

export function isTerminalRunStatus(status: string): status is Extract<RunStatus, "completed" | "failed" | "cancelled"> {
  return ["completed", "failed", "cancelled"].includes(status);
}

export { canTriggerRollback };
