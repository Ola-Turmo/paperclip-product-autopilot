import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type ConvoyTaskStatus } from "../constants.js";
import type { ReleaseHealthCheck, RollbackAction } from "../types.js";
import { newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import {
  buildCheckpoint,
  buildReleaseHealthCheck,
  buildRestoredConvoyTask,
  buildRollbackAction,
  canTriggerRollback,
  checkpointSummary,
  validateCheckpointRestore,
  updateReleaseHealthCheck,
} from "../services/lifecycle.js";
import { requireGovernancePolicy } from "../services/governance.js";
import { validateRollbackRequest } from "../services/invariants.js";
import { recordLifecycleSignals } from "../services/observability.js";
import { resolveRollbackRequest } from "../services/rollback-policy.js";

export function registerLifecycleActionHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);
  ctx.actions.register(ACTION_KEYS.createCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; label?: string; pauseReason?: string };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    if (run.status !== "running" && run.status !== "paused") {
      throw new Error(`Cannot checkpoint a run in status ${run.status}`);
    }
    const tasks = await repo.listConvoyTasks(a.companyId, a.projectId, a.runId);
    const checkpoint = buildCheckpoint({
      checkpointId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      run,
      tasks,
      label: a.label,
      pauseReason: a.pauseReason,
      createdAt: nowIso(),
    });
    await repo.upsertCheckpoint(checkpoint);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Checkpoint created for run ${a.runId.slice(0, 8)}: ${checkpointSummary(checkpoint)}`,
      entityType: "checkpoint",
      entityId: checkpoint.checkpointId,
    });
    await recordLifecycleSignals(ctx, "checkpoint_created", a.companyId, "checkpoint.created", 1, {
      projectId: a.projectId,
      runId: a.runId,
    });
    return checkpoint;
  });

  ctx.actions.register(ACTION_KEYS.resumeFromCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkpointId: string };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    const checkpoints = await repo.listCheckpoints(a.companyId, a.projectId, a.runId);
    const checkpoint = checkpoints.find((candidate) => candidate.checkpointId === a.checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");
    const tasks = await repo.listConvoyTasks(a.companyId, a.projectId, a.runId);
    validateCheckpointRestore({ run, checkpoint, tasks });

    for (const [taskId, status] of Object.entries(checkpoint.taskStates)) {
      const task = tasks.find((candidate) => candidate.taskId === taskId);
      if (task) {
        await repo.upsertConvoyTask(buildRestoredConvoyTask(task, status as ConvoyTaskStatus, nowIso()));
      }
    }
    await recordLifecycleSignals(ctx, "checkpoint_restored", a.companyId, "checkpoint.restored", 1, {
      projectId: a.projectId,
      runId: a.runId,
    });
    return checkpoint;
  });

  ctx.actions.register(ACTION_KEYS.createReleaseHealthCheck, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkType: string; name: string };
    const check = buildReleaseHealthCheck({
      checkId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      checkType: a.checkType as ReleaseHealthCheck["checkType"],
      name: a.name,
      createdAt: nowIso(),
    });
    await repo.upsertReleaseHealthCheck(check);
    await recordLifecycleSignals(ctx, "release_health_created", a.companyId, "release_health.created", 1, {
      projectId: a.projectId,
      runId: a.runId,
      checkType: a.checkType,
    });
    return check;
  });

  ctx.actions.register(ACTION_KEYS.updateReleaseHealthStatus, async (args) => {
    const a = args as { companyId: string; projectId: string; checkId: string; status: string; errorMessage?: string };
    const checks = await repo.listReleaseHealthChecks(a.companyId, a.projectId);
    const check = checks.find((candidate) => candidate.checkId === a.checkId);
    if (!check) throw new Error("Health check not found");
    const updated = updateReleaseHealthCheck(
      check,
      a.status as ReleaseHealthCheck["status"],
      nowIso(),
      a.errorMessage,
    );
    await repo.upsertReleaseHealthCheck(updated);
    await recordLifecycleSignals(ctx, "release_health_updated", a.companyId, "release_health.updated", 1, {
      projectId: a.projectId,
      runId: check.runId,
      status: a.status,
    });
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.triggerRollback, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      checkId: string;
      rollbackType: string;
      targetCommitSha?: string;
      checkpointId?: string;
      governanceNote?: string;
      operatorAcknowledged?: boolean;
    };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const checks = await repo.listReleaseHealthChecks(a.companyId, a.projectId, a.runId);
    const check = checks.find((candidate) => candidate.checkId === a.checkId);
    if (!check) throw new Error("Health check not found");
    if (!canTriggerRollback(check)) {
      throw new Error(`Rollback can only be triggered from a failed health check, got ${check.status}`);
    }
    const checkpoints = await repo.listCheckpoints(a.companyId, a.projectId, a.runId);
    const existingRollbacks = await repo.listRollbackActions(a.companyId, a.projectId, a.runId);
    const resolved = resolveRollbackRequest({
      run,
      check,
      checkpoints,
      requestedRollbackType: a.rollbackType as RollbackAction["rollbackType"],
      targetCommitSha: a.targetCommitSha,
      checkpointId: a.checkpointId,
    });
    const checkpoint =
      resolved.checkpointId
        ? checkpoints.find((candidate) => candidate.checkpointId === resolved.checkpointId)
        : undefined;
    if (resolved.rollbackType === "full_rollback") {
      requireGovernancePolicy({
        action: "full_rollback",
        governanceNote: a.governanceNote,
        operatorAcknowledged: a.operatorAcknowledged,
      });
    }
    validateRollbackRequest({
      run,
      check,
      existingRollbacks,
      rollbackType: resolved.rollbackType,
      checkpoint,
      targetCommitSha: resolved.targetCommitSha,
    });
    const rollback = buildRollbackAction({
      rollbackId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      checkId: a.checkId,
      rollbackType: resolved.rollbackType,
      targetCommitSha: resolved.targetCommitSha,
      checkpointId: resolved.checkpointId,
      createdAt: nowIso(),
    });
    await repo.upsertRollbackAction(rollback);
    await recordLifecycleSignals(ctx, "rollback_triggered", a.companyId, "rollback.triggered", 1, {
      projectId: a.projectId,
      runId: a.runId,
      rollbackType: rollback.rollbackType,
    });
    return rollback;
  });
}
