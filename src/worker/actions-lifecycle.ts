import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type ConvoyTaskStatus } from "../constants.js";
import type { ReleaseHealthCheck, RollbackAction } from "../types.js";
import { newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import {
  applyRollbackOutcomeToRun,
  buildCheckpoint,
  buildReleaseHealthCheck,
  buildRestoredConvoyTask,
  buildRollbackAction,
  canTriggerRollback,
  checkpointSummary,
  durationBetweenMs,
  validateCheckpointRestore,
  updateRollbackAction,
  updateReleaseHealthCheck,
} from "../services/lifecycle.js";
import {
  releaseProductLock as buildReleasedLock,
  releaseWorkspaceLease as buildReleasedLease,
  shouldReleaseRunResources,
} from "../services/delivery.js";
import { requireGovernancePolicy } from "../services/governance.js";
import { validateRollbackRequest } from "../services/invariants.js";
import { recordAutopilotDurationMetric, recordLifecycleSignals } from "../services/observability.js";
import { createHealthCheckFailedDigest } from "../services/orchestration.js";
import { buildRollbackClosureSummaryDraft, buildRollbackKnowledgeEntryDraft } from "../services/recovery-learning.js";
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
    if (updated.status === "failed") {
      await createHealthCheckFailedDigest(ctx, {
        companyId: a.companyId,
        projectId: a.projectId,
        runId: check.runId,
        check: {
          checkId: updated.checkId,
          companyId: updated.companyId,
          projectId: updated.projectId,
          runId: updated.runId,
          checkType: updated.checkType,
          name: updated.name,
          errorMessage: updated.errorMessage,
          createdAt: updated.createdAt,
        },
      });
    }
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
    if (resolved.rollbackType === "revert_commit") {
      requireGovernancePolicy({
        action: "revert_commit_rollback",
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

  ctx.actions.register(ACTION_KEYS.updateRollbackStatus, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      rollbackId: string;
      status: RollbackAction["status"];
      errorMessage?: string;
    };
    const rollbacks = await repo.listRollbackActions(a.companyId, a.projectId);
    const rollback = rollbacks.find((candidate) => candidate.rollbackId === a.rollbackId);
    if (!rollback) throw new Error("Rollback action not found");
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, rollback.runId);
    if (!run) throw new Error("Delivery run not found");
    const checks = await repo.listReleaseHealthChecks(a.companyId, a.projectId, rollback.runId);
    const relatedCheck = checks.find((candidate) => candidate.checkId === rollback.checkId);
    const digests = await repo.listDigests(a.companyId, a.projectId);
    const relatedDigest = digests
      .filter((candidate) => candidate.digestType === "health_check_failed" && candidate.relatedRunId === rollback.runId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

    const updatedAt = nowIso();
    const updatedRollback = updateRollbackAction(rollback, a.status, updatedAt, a.errorMessage);
    await repo.upsertRollbackAction(updatedRollback);

    let rollbackCheckpoint =
      updatedRollback.checkpointId
        ? (await repo.listCheckpoints(a.companyId, a.projectId, rollback.runId)).find(
            (candidate) => candidate.checkpointId === updatedRollback.checkpointId,
          )
        : undefined;

    if (updatedRollback.status === "completed" && updatedRollback.rollbackType === "restore_checkpoint" && updatedRollback.checkpointId) {
      if (!rollbackCheckpoint) throw new Error("Checkpoint not found for completed rollback");
      const tasks = await repo.listConvoyTasks(a.companyId, a.projectId, rollback.runId);
      validateCheckpointRestore({ run, checkpoint: rollbackCheckpoint, tasks });
      for (const [taskId, status] of Object.entries(rollbackCheckpoint.taskStates)) {
        const task = tasks.find((candidate) => candidate.taskId === taskId);
        if (task) {
          await repo.upsertConvoyTask(buildRestoredConvoyTask(task, status as ConvoyTaskStatus, updatedAt));
        }
      }
    }

    const updatedRun = applyRollbackOutcomeToRun({
      run,
      rollback: updatedRollback,
      updatedAt,
      errorMessage: a.errorMessage,
    });
    await repo.upsertDeliveryRun(updatedRun);

    if (shouldReleaseRunResources(updatedRun.status)) {
      const lease = await repo.getActiveWorkspaceLease(a.projectId, rollback.runId);
      if (lease) {
        await repo.upsertWorkspaceLease(buildReleasedLease(lease, updatedAt));
      }
      const locks = await repo.listProductLocks(a.companyId, a.projectId);
      const activeLock = locks.find((candidate) => candidate.runId === rollback.runId && candidate.isActive);
      if (activeLock) {
        await repo.upsertProductLock(buildReleasedLock(activeLock, updatedAt));
      }
    }

    if (["completed", "failed", "skipped"].includes(updatedRollback.status)) {
      const rollbackDurationMs = durationBetweenMs(updatedRollback.createdAt, updatedAt);
      if (rollbackDurationMs !== undefined) {
        await recordAutopilotDurationMetric(ctx, "rollback.duration_ms", a.companyId, rollbackDurationMs, {
          projectId: a.projectId,
          runId: rollback.runId,
          rollbackId: rollback.rollbackId,
          rollbackType: rollback.rollbackType,
          status: updatedRollback.status,
        });
      }

      const recoveryTimeMs = durationBetweenMs(relatedCheck?.failedAt ?? relatedCheck?.createdAt, updatedAt);
      if (recoveryTimeMs !== undefined) {
        await recordAutopilotDurationMetric(ctx, "rollback.recovery_time_ms", a.companyId, recoveryTimeMs, {
          projectId: a.projectId,
          runId: rollback.runId,
          rollbackId: rollback.rollbackId,
          rollbackType: rollback.rollbackType,
          checkId: rollback.checkId,
          status: updatedRollback.status,
        });
      }

      const checkpointAgeMs = durationBetweenMs(rollbackCheckpoint?.createdAt, updatedAt);
      if (checkpointAgeMs !== undefined) {
        await recordAutopilotDurationMetric(ctx, "rollback.checkpoint_age_ms", a.companyId, checkpointAgeMs, {
          projectId: a.projectId,
          runId: rollback.runId,
          rollbackId: rollback.rollbackId,
          rollbackType: rollback.rollbackType,
          checkpointId: rollbackCheckpoint?.checkpointId ?? "",
          status: updatedRollback.status,
        });
      }

      const summaryDraft = buildRollbackClosureSummaryDraft({
        companyId: a.companyId,
        projectId: a.projectId,
        run: updatedRun,
        rollback: updatedRollback,
        relatedCheck,
        checkpoint: rollbackCheckpoint,
        relatedDigestId: relatedDigest?.digestId,
        createdAt: updatedAt,
      });
      const summaryId = newId();
      await repo.upsertLearnerSummary({
        ...summaryDraft,
        summaryId,
      });
      const knowledgeDraft = buildRollbackKnowledgeEntryDraft({
        companyId: a.companyId,
        projectId: a.projectId,
        run: updatedRun,
        rollback: updatedRollback,
        relatedCheck,
        checkpoint: rollbackCheckpoint,
        relatedDigestId: relatedDigest?.digestId,
        createdAt: updatedAt,
        sourceSummaryId: summaryId,
      });
      await repo.upsertKnowledgeEntry({
        ...knowledgeDraft,
        entryId: newId(),
        updatedAt,
      });
    }

    await recordLifecycleSignals(
      ctx,
      `rollback.${updatedRollback.status}`,
      a.companyId,
      `rollback.${updatedRollback.status}`,
      1,
      {
        projectId: a.projectId,
        runId: rollback.runId,
        rollbackId: rollback.rollbackId,
        rollbackType: rollback.rollbackType,
      },
    );

    return updatedRollback;
  });
}
