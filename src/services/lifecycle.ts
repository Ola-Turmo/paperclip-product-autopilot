import type { ConvoyTaskStatus, RunStatus } from "../constants.js";
import type {
  Checkpoint,
  ConvoyTask,
  DeliveryRun,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";

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
  return {
    ...check,
    status,
    errorMessage,
    passedAt: status === "passed" ? updatedAt : check.passedAt,
    failedAt: status === "failed" ? updatedAt : check.failedAt,
  };
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

export function checkpointSummary(checkpoint: Checkpoint): string {
  return checkpoint.label ?? `Checkpoint ${checkpoint.checkpointId.slice(0, 8)}`;
}

export function isTerminalRunStatus(status: string): status is Extract<RunStatus, "completed" | "failed" | "cancelled"> {
  return ["completed", "failed", "cancelled"].includes(status);
}
