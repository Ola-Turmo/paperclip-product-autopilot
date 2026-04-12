import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type ConvoyTaskStatus } from "../constants.js";
import type { ReleaseHealthCheck, RollbackAction } from "../types.js";
import {
  listCheckpoints,
  listConvoyTasks,
  listReleaseHealthChecks,
  newId,
  nowIso,
  upsertCheckpoint,
  upsertConvoyTask,
  upsertReleaseHealthCheck,
  upsertRollbackAction,
} from "../helpers.js";
import {
  buildCheckpoint,
  buildReleaseHealthCheck,
  buildRestoredConvoyTask,
  buildRollbackAction,
  checkpointSummary,
  updateReleaseHealthCheck,
} from "../services/lifecycle.js";
import { recordLifecycleSignals } from "../services/observability.js";
import { getDeliveryRun } from "../helpers.js";

export function registerLifecycleActionHandlers(ctx: PluginContext) {
  ctx.actions.register(ACTION_KEYS.createCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; label?: string; pauseReason?: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    const tasks = await listConvoyTasks(ctx, a.companyId, a.projectId, a.runId);
    const checkpoint = buildCheckpoint({
      checkpointId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      run: run ?? null,
      tasks,
      label: a.label,
      pauseReason: a.pauseReason,
      createdAt: nowIso(),
    });
    await upsertCheckpoint(ctx, checkpoint);
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
    const checkpoints = await listCheckpoints(ctx, a.companyId, a.projectId, a.runId);
    const checkpoint = checkpoints.find((candidate) => candidate.checkpointId === a.checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");

    for (const [taskId, status] of Object.entries(checkpoint.taskStates)) {
      const tasks = await listConvoyTasks(ctx, a.companyId, a.projectId, a.runId);
      const task = tasks.find((candidate) => candidate.taskId === taskId);
      if (task) {
        await upsertConvoyTask(ctx, buildRestoredConvoyTask(task, status as ConvoyTaskStatus, nowIso()));
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
    await upsertReleaseHealthCheck(ctx, check);
    await recordLifecycleSignals(ctx, "release_health_created", a.companyId, "release_health.created", 1, {
      projectId: a.projectId,
      runId: a.runId,
      checkType: a.checkType,
    });
    return check;
  });

  ctx.actions.register(ACTION_KEYS.updateReleaseHealthStatus, async (args) => {
    const a = args as { companyId: string; projectId: string; checkId: string; status: string; errorMessage?: string };
    const checks = await listReleaseHealthChecks(ctx, a.companyId, a.projectId);
    const check = checks.find((candidate) => candidate.checkId === a.checkId);
    if (!check) throw new Error("Health check not found");
    const updated = updateReleaseHealthCheck(
      check,
      a.status as ReleaseHealthCheck["status"],
      nowIso(),
      a.errorMessage,
    );
    await upsertReleaseHealthCheck(ctx, updated);
    await recordLifecycleSignals(ctx, "release_health_updated", a.companyId, "release_health.updated", 1, {
      projectId: a.projectId,
      runId: check.runId,
      status: a.status,
    });
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.triggerRollback, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkId: string; rollbackType: string; targetCommitSha?: string; checkpointId?: string };
    const rollback = buildRollbackAction({
      rollbackId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      checkId: a.checkId,
      rollbackType: a.rollbackType as RollbackAction["rollbackType"],
      targetCommitSha: a.targetCommitSha,
      checkpointId: a.checkpointId,
      createdAt: nowIso(),
    });
    await upsertRollbackAction(ctx, rollback);
    await recordLifecycleSignals(ctx, "rollback_triggered", a.companyId, "rollback.triggered", 1, {
      projectId: a.projectId,
      runId: a.runId,
      rollbackType: a.rollbackType,
    });
    return rollback;
  });
}
