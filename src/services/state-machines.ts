import type {
  ConvoyTaskStatus,
  DigestStatus,
  HealthCheckStatus,
  IdeaStatus,
  RollbackStatus,
  RunStatus,
} from "../constants.js";
import type {
  ConvoyTask,
  Digest,
  Idea,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";

const ideaTransitions: Record<IdeaStatus, readonly IdeaStatus[]> = {
  active: ["maybe", "approved", "rejected", "archived"],
  maybe: ["active", "approved", "rejected", "archived"],
  approved: ["in_progress", "archived"],
  rejected: ["active", "maybe", "archived"],
  in_progress: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

const runTransitions: Record<RunStatus, readonly RunStatus[]> = {
  pending: ["running", "paused", "cancelled", "failed", "completed"],
  running: ["paused", "completed", "failed", "cancelled"],
  paused: ["running", "cancelled", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const healthCheckTransitions: Record<HealthCheckStatus, readonly HealthCheckStatus[]> = {
  pending: ["running", "passed", "failed", "skipped"],
  running: ["passed", "failed", "skipped"],
  passed: [],
  failed: [],
  skipped: [],
};

const rollbackTransitions: Record<RollbackStatus, readonly RollbackStatus[]> = {
  pending: ["in_progress", "completed", "failed", "skipped"],
  in_progress: ["completed", "failed", "skipped"],
  completed: [],
  failed: [],
  skipped: [],
};

const digestTransitions: Record<DigestStatus, readonly DigestStatus[]> = {
  pending: ["delivered", "read", "dismissed"],
  delivered: ["read", "dismissed"],
  read: ["dismissed"],
  dismissed: [],
};

const convoyTaskTransitions: Record<ConvoyTaskStatus, readonly ConvoyTaskStatus[]> = {
  pending: ["running", "skipped", "failed"],
  blocked: ["pending", "skipped"],
  running: ["passed", "failed", "skipped"],
  passed: [],
  failed: [],
  skipped: [],
};

function assertTransition<State extends string>(
  current: State,
  next: State,
  graph: Record<State, readonly State[]>,
  label: string,
): void {
  if (current === next) return;
  if (!graph[current].includes(next)) {
    throw new Error(`Invalid ${label} transition: ${current} -> ${next}`);
  }
}

export function transitionIdeaStatus(idea: Idea, nextStatus: IdeaStatus, updatedAt: string): Idea {
  assertTransition(idea.status, nextStatus, ideaTransitions, "idea");
  return {
    ...idea,
    status: nextStatus,
    updatedAt,
  };
}

export function transitionRunStatus(input: {
  status: RunStatus;
  paused: boolean;
  pauseReason?: string;
  cancellationReason?: string;
  completedAt: string | null;
  commitSha: string | null;
  prUrl?: string;
  error?: string;
}, nextStatus: RunStatus, updatedAt: string, patch?: {
  paused?: boolean;
  pauseReason?: string;
  cancellationReason?: string;
  commitSha?: string;
  prUrl?: string;
  error?: string;
}): {
  status: RunStatus;
  paused: boolean;
  pauseReason?: string;
  cancellationReason?: string;
  completedAt: string | null;
  commitSha: string | null;
  prUrl?: string;
  error?: string;
  updatedAt: string;
} {
  assertTransition(input.status, nextStatus, runTransitions, "delivery run");
  return {
    ...input,
    status: nextStatus,
    paused: patch?.paused ?? input.paused,
    pauseReason: patch?.pauseReason,
    cancellationReason: patch?.cancellationReason,
    commitSha: patch?.commitSha ?? input.commitSha,
    prUrl: patch?.prUrl,
    error: patch?.error,
    completedAt: ["completed", "failed", "cancelled"].includes(nextStatus) ? updatedAt : null,
    updatedAt,
  };
}

export function transitionHealthCheck(
  check: ReleaseHealthCheck,
  nextStatus: HealthCheckStatus,
  updatedAt: string,
  errorMessage?: string,
): ReleaseHealthCheck {
  assertTransition(check.status, nextStatus, healthCheckTransitions, "release health");
  return {
    ...check,
    status: nextStatus,
    errorMessage,
    passedAt: nextStatus === "passed" ? updatedAt : check.passedAt,
    failedAt: nextStatus === "failed" ? updatedAt : check.failedAt,
  };
}

export function transitionRollback(
  rollback: RollbackAction,
  nextStatus: RollbackStatus,
  updatedAt: string,
  errorMessage?: string,
): RollbackAction {
  assertTransition(rollback.status, nextStatus, rollbackTransitions, "rollback");
  return {
    ...rollback,
    status: nextStatus,
    errorMessage,
    completedAt: nextStatus === "completed" ? updatedAt : rollback.completedAt,
  };
}

export function transitionDigest(
  digest: Digest,
  nextStatus: DigestStatus,
  updatedAt: string,
): Digest {
  assertTransition(digest.status, nextStatus, digestTransitions, "digest");
  return {
    ...digest,
    status: nextStatus,
    deliveredAt: nextStatus === "delivered" ? updatedAt : digest.deliveredAt,
    readAt: nextStatus === "read" ? updatedAt : digest.readAt,
    dismissedAt: nextStatus === "dismissed" ? updatedAt : digest.dismissedAt,
  };
}

export function transitionConvoyTask(
  task: ConvoyTask,
  nextStatus: ConvoyTaskStatus,
  updatedAt: string,
  error?: string,
): ConvoyTask {
  assertTransition(task.status, nextStatus, convoyTaskTransitions, "convoy task");
  return {
    ...task,
    status: nextStatus,
    error,
    startedAt: nextStatus === "running" ? (task.startedAt ?? updatedAt) : task.startedAt,
    completedAt: ["passed", "failed", "skipped"].includes(nextStatus) ? updatedAt : task.completedAt,
    updatedAt,
  };
}

export function canTriggerRollback(check: ReleaseHealthCheck): boolean {
  return check.status === "failed";
}
