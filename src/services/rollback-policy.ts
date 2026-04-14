import type { Checkpoint, DeliveryRun, ReleaseHealthCheck, RollbackAction } from "../types.js";

function byCreatedAtDesc<T extends { createdAt: string }>(left: T, right: T): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

export function resolveRollbackRequest(input: {
  run: DeliveryRun;
  check: ReleaseHealthCheck;
  checkpoints: Checkpoint[];
  requestedRollbackType?: RollbackAction["rollbackType"];
  targetCommitSha?: string;
  checkpointId?: string;
}): {
  rollbackType: RollbackAction["rollbackType"];
  targetCommitSha?: string;
  checkpointId?: string;
} {
  const checkpoints = [...input.checkpoints]
    .filter((checkpoint) => checkpoint.runId === input.run.runId)
    .sort(byCreatedAtDesc);
  const selectedCheckpoint =
    (input.checkpointId
      ? checkpoints.find((checkpoint) => checkpoint.checkpointId === input.checkpointId)
      : checkpoints[0]) ?? null;

  const rollbackType =
    input.requestedRollbackType ??
    (selectedCheckpoint
      ? "restore_checkpoint"
      : input.run.commitSha
        ? "revert_commit"
        : "full_rollback");

  return {
    rollbackType,
    checkpointId: rollbackType === "restore_checkpoint" ? selectedCheckpoint?.checkpointId : undefined,
    targetCommitSha:
      rollbackType === "revert_commit"
        ? input.targetCommitSha ?? input.run.commitSha ?? undefined
        : undefined,
  };
}
