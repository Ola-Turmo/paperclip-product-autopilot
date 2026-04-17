import type { PluginContext } from "@paperclipai/plugin-sdk";
import {
  ACTION_KEYS,
  type AutomationTier,
  type ConvoyTaskStatus,
  type RunStatus,
} from "../constants.js";
import type {
  AutopilotProject,
  CompanyBudget,
  ConvoyTask,
  Idea,
  ProductLock,
} from "../types.js";
import {
  allocatePort,
  generateBranchName,
  newId,
  nowIso,
} from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import {
  buildPendingDeliveryRun,
  buildPlanningArtifact,
  buildProductLock,
  buildWorkspaceLease,
  cancelDeliveryRun as buildCancelledRun,
  getAutomationTier,
  pauseDeliveryRun as buildPausedRun,
  releaseProductLock as buildReleasedLock,
  releaseWorkspaceLease as buildReleasedLease,
  resumeDeliveryRun as buildResumedRun,
  shouldReleaseRunResources,
  updateDeliveryRunStatus,
} from "../services/delivery.js";
import { requireGovernancePolicy } from "../services/governance.js";
import {
  validateConvoyDependencies,
  validateDeliveryRunCancellation,
  validateDeliveryRunCreation,
  validatePlanningArtifactInvariant,
} from "../services/invariants.js";
import { recordAutopilotDurationMetric, recordAutopilotEvent } from "../services/observability.js";
import { shouldPauseForBudget } from "../services/policy.js";
import { transitionConvoyTask } from "../services/state-machines.js";
import {
  isConvoyTaskStatus,
  isNonEmptyString,
  requireCompanyAndProject,
} from "./action-utils.js";

export function registerDeliveryActionHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);
  ctx.actions.register(ACTION_KEYS.createPlanningArtifact, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      ideaId: string;
      title?: string;
      goalAlignmentSummary?: string;
      implementationSpec?: string;
      dependencies?: string[];
      rolloutPlan?: string;
      testPlan?: string;
      approvalChecklist?: string[];
      executionMode?: "simple" | "convoy";
      approvalMode?: "manual" | "auto_approve";
    };
    const idea = await repo.getIdea(a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");
    const autopilot = await repo.getAutopilotProject(a.companyId, a.projectId);
    const artifact = buildPlanningArtifact({
      artifactId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      idea,
      automationTier: getAutomationTier(autopilot),
      createdAt: nowIso(),
      title: a.title,
      goalAlignmentSummary: a.goalAlignmentSummary,
      implementationSpec: a.implementationSpec,
      dependencies: a.dependencies,
      rolloutPlan: a.rolloutPlan,
      testPlan: a.testPlan,
      approvalChecklist: a.approvalChecklist,
      executionMode: a.executionMode,
      approvalMode: a.approvalMode,
    });
    if (artifact.approvalMode === "auto_approve") {
      requireGovernancePolicy({
        action: "auto_approve_plan",
        automationTier: artifact.automationTier,
        executionMode: artifact.executionMode,
        complexityEstimate: idea.complexityEstimate,
      });
    }
    validatePlanningArtifactInvariant(artifact);
    await repo.upsertPlanningArtifact(artifact);
    return artifact;
  });

  ctx.actions.register(ACTION_KEYS.createDeliveryRun, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      ideaId: string;
      artifactId?: string;
      title?: string;
      automationTier?: AutomationTier;
    };
    const idea = await repo.getIdea(a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");

    const autopilot = await repo.getAutopilotProject(a.companyId, a.projectId);
    const runId = newId();
    const branchName = generateBranchName(a.projectId, a.ideaId);
    const activeLock = await repo.getActiveProductLock(a.projectId, branchName);
    const port = allocatePort();
    const createdAt = nowIso();
    const artifact = a.artifactId
      ? await repo.getPlanningArtifact(a.companyId, a.projectId, a.artifactId)
      : null;

    const run = buildPendingDeliveryRun({
      runId,
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      artifactId: a.artifactId ?? "",
      idea,
      automationTier: a.automationTier ?? getAutomationTier(autopilot),
      branchName,
      workspacePath: autopilot?.workspaceId ?? "",
      leasedPort: port,
      createdAt,
      title: a.title,
    });
    validateDeliveryRunCreation({
      run,
      ideaStatus: idea.status,
      activeLock,
      artifact,
    });
    await repo.upsertDeliveryRun(run);

    const lease = buildWorkspaceLease({
      leaseId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId,
      workspacePath: autopilot?.workspaceId ?? "",
      branchName,
      leasedPort: port,
      gitRepoRoot: autopilot?.repoUrl ?? null,
      createdAt,
    });
    await repo.upsertWorkspaceLease(lease);

    const lock = buildProductLock({
      lockId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId,
      branchName,
      acquiredAt: createdAt,
    });
    await repo.upsertProductLock(lock);

    await ctx.activity.log({
      companyId: a.companyId,
      message: `Delivery run created: ${run.title.slice(0, 60)}`,
      entityType: "delivery-run",
      entityId: runId,
    });
    await recordAutopilotEvent(ctx, "deliveryRunCreated", a.companyId, {
      projectId: a.projectId,
      runId,
      automationTier: run.automationTier,
    });
    return run;
  });

  ctx.actions.register(ACTION_KEYS.completeDeliveryRun, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      status: string;
      commitSha?: string;
      prUrl?: string;
      error?: string;
    };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const completedAt = nowIso();

    const updated = updateDeliveryRunStatus({
      run,
      status: a.status as RunStatus,
      commitSha: a.commitSha,
      prUrl: a.prUrl,
      error: a.error,
      cancellationReason: a.status === "cancelled" ? (a.error ?? "Cancelled") : undefined,
      updatedAt: completedAt,
    });
    await repo.upsertDeliveryRun(updated);

    if (shouldReleaseRunResources(a.status)) {
      const lease = await repo.getActiveWorkspaceLease(a.projectId, a.runId);
      if (lease) {
        await repo.upsertWorkspaceLease(buildReleasedLease(lease, completedAt));
      }
      const locks = await repo.listProductLocks(a.companyId, a.projectId);
      const activeLock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
      if (activeLock) {
        await repo.upsertProductLock(buildReleasedLock(activeLock, completedAt));
      }
    }

    if (["completed", "failed", "cancelled"].includes(a.status)) {
      await recordAutopilotEvent(ctx, "deliveryRunCompleted", a.companyId, {
        projectId: a.projectId,
        runId: a.runId,
        status: a.status,
      });
      await recordAutopilotDurationMetric(
        ctx,
        "delivery_run.duration_ms",
        a.companyId,
        Math.max(0, new Date(completedAt).getTime() - new Date(run.createdAt).getTime()),
        {
          projectId: a.projectId,
          runId: a.runId,
          status: a.status,
        },
      );
    }

    return updated;
  });

  ctx.actions.register(ACTION_KEYS.pauseDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; reason?: string };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated = buildPausedRun(run, nowIso(), a.reason);
    await repo.upsertDeliveryRun(updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.cancelDeliveryRun, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      reason?: string;
      force?: boolean;
      operatorAcknowledged?: boolean;
    };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const artifact = run.artifactId
      ? await repo.getPlanningArtifact(a.companyId, a.projectId, run.artifactId)
      : null;
    const checkpoints = await repo.listCheckpoints(a.companyId, a.projectId, a.runId);
    validateDeliveryRunCancellation({
      run,
      artifact,
      checkpoints,
      reason: a.reason,
      force: a.force,
    });
    if (a.force) {
      requireGovernancePolicy({
        action: "force_cancel_run",
        governanceNote: a.reason,
        operatorAcknowledged: a.operatorAcknowledged,
      });
    }
    const timestamp = nowIso();
    const updated = buildCancelledRun(run, timestamp, a.reason!.trim());
    await repo.upsertDeliveryRun(updated);

    const lease = await repo.getActiveWorkspaceLease(a.projectId, a.runId);
    if (lease) {
      await repo.upsertWorkspaceLease(buildReleasedLease(lease, timestamp));
    }
    const locks = await repo.listProductLocks(a.companyId, a.projectId);
    const activeLock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
    if (activeLock) {
      await repo.upsertProductLock(buildReleasedLock(activeLock, timestamp));
    }

    await recordAutopilotEvent(ctx, "deliveryRunCompleted", a.companyId, {
      projectId: a.projectId,
      runId: a.runId,
      status: "cancelled",
    });
    await recordAutopilotDurationMetric(
      ctx,
      "delivery_run.duration_ms",
      a.companyId,
      Math.max(0, new Date(timestamp).getTime() - new Date(run.createdAt).getTime()),
      {
        projectId: a.projectId,
        runId: a.runId,
        status: "cancelled",
      },
    );
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.resumeDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string };
    const run = await repo.getDeliveryRun(a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated = buildResumedRun(run, nowIso());
    await repo.upsertDeliveryRun(updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.updateCompanyBudget, async (args) => {
    const a = args as { companyId: string; autopilotUsedMinutes?: number; autopilotBudgetMinutes?: number };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    const existing = await repo.getCompanyBudget(a.companyId);
    const budget: CompanyBudget = {
      budgetId: existing?.budgetId ?? newId(),
      companyId: a.companyId,
      totalBudgetMinutes: existing?.totalBudgetMinutes ?? 10000,
      usedBudgetMinutes: existing?.usedBudgetMinutes ?? 0,
      autopilotBudgetMinutes: a.autopilotBudgetMinutes ?? existing?.autopilotBudgetMinutes ?? 120,
      autopilotUsedMinutes: a.autopilotUsedMinutes ?? existing?.autopilotUsedMinutes ?? 0,
      paused: existing?.paused ?? false,
      pauseReason: existing?.pauseReason,
      updatedAt: nowIso(),
    };
    await repo.upsertCompanyBudget(budget);
    return budget;
  });

  ctx.actions.register(ACTION_KEYS.checkBudgetAndPauseIfNeeded, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const budget = await repo.getCompanyBudget(resolved.companyId);
    const autopilot = await repo.getAutopilotProject(resolved.companyId, resolved.projectId);
    if (!autopilot) return { paused: false, reason: undefined };

    if (shouldPauseForBudget(autopilot, budget)) {
      const updated: AutopilotProject = {
        ...autopilot,
        paused: true,
        pauseReason: "Budget exhausted",
        updatedAt: nowIso(),
      };
      await repo.upsertAutopilotProject(updated);
      return { paused: true, reason: "Budget exhausted" };
    }

    return { paused: false, reason: undefined };
  });

  ctx.actions.register(ACTION_KEYS.decomposeIntoConvoyTasks, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      artifactId: string;
      taskTitles: string[];
      dependencies?: string[][];
    };
    validateConvoyDependencies({ taskTitles: a.taskTitles, dependencies: a.dependencies });
    const tasks: ConvoyTask[] = a.taskTitles.map((title, index) => ({
      taskId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      artifactId: a.artifactId,
      title,
      description: "",
      status: index === 0 ? "pending" : "blocked",
      dependsOnTaskIds: a.dependencies?.[index] ?? [],
      startedAt: null,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }));
    for (const task of tasks) {
      await repo.upsertConvoyTask(task);
    }
    return tasks;
  });

  ctx.actions.register(ACTION_KEYS.updateConvoyTaskStatus, async (args) => {
    const a = args as { companyId: string; projectId: string; taskId: string; status: ConvoyTaskStatus; error?: string };
    if (!isConvoyTaskStatus(a.status)) throw new Error("Invalid convoy task status");

    const tasks = await repo.listConvoyTasks(a.companyId, a.projectId);
    const task = tasks.find((candidate) => candidate.taskId === a.taskId);
    if (!task) throw new Error("Convoy task not found");

    const now = nowIso();
    const updated: ConvoyTask = transitionConvoyTask(task, a.status, now, a.error);
    await repo.upsertConvoyTask(updated);

    if (a.status === "passed") {
      for (const candidate of tasks) {
        if (candidate.status === "blocked" && candidate.dependsOnTaskIds.includes(a.taskId)) {
          const allMet = candidate.dependsOnTaskIds.every((dependencyId) => {
            const dependency = tasks.find((item) => item.taskId === dependencyId);
            return dependency?.status === "passed" || dependency?.status === "skipped";
          });
          if (allMet) {
            await repo.upsertConvoyTask({ ...candidate, status: "pending", updatedAt: now });
          }
        }
      }
    }

    return updated;
  });

  ctx.actions.register(ACTION_KEYS.acquireProductLock, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      lockType: string;
      targetBranch: string;
      targetPath?: string;
      blockReason?: string;
    };
    if (a.lockType === "merge_lock") {
      requireGovernancePolicy({
        action: "merge_lock",
        governanceNote: a.blockReason,
      });
    }
    const existing = await repo.getActiveProductLock(a.projectId, a.targetBranch);
    if (existing) throw new Error(`Branch ${a.targetBranch} is already locked`);

    const lock: ProductLock = {
      lockId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      lockType: a.lockType as "product_lock" | "merge_lock",
      targetBranch: a.targetBranch,
      targetPath: a.targetPath ?? "",
      acquiredAt: nowIso(),
      releasedAt: null,
      isActive: true,
      blockReason: a.blockReason,
    };
    await repo.upsertProductLock(lock);
    return lock;
  });

  ctx.actions.register(ACTION_KEYS.releaseProductLock, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      governanceNote?: string;
      operatorAcknowledged?: boolean;
    };
    const locks = await repo.listProductLocks(a.companyId, a.projectId);
    const lock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
    if (!lock) throw new Error("No active lock found for this run");
    if (lock.lockType === "merge_lock") {
      requireGovernancePolicy({
        action: "release_merge_lock",
        governanceNote: a.governanceNote,
        operatorAcknowledged: a.operatorAcknowledged,
      });
    }
    const updated = { ...lock, isActive: false, releasedAt: nowIso() };
    await repo.upsertProductLock(updated);
    return updated;
  });
}
