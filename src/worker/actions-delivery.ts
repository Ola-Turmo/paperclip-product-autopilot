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
  getAutomationTier,
  pauseDeliveryRun as buildPausedRun,
  releaseProductLock as buildReleasedLock,
  releaseWorkspaceLease as buildReleasedLease,
  resumeDeliveryRun as buildResumedRun,
  shouldReleaseRunResources,
  updateDeliveryRunStatus,
} from "../services/delivery.js";
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
      executionMode?: Idea["complexityEstimate"];
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
      approvalMode: a.approvalMode,
    });
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
    if (idea.status !== "approved" && idea.status !== "in_progress") {
      throw new Error(`Delivery run requires an approved idea, got ${idea.status}`);
    }

    const autopilot = await repo.getAutopilotProject(a.companyId, a.projectId);
    const runId = newId();
    const branchName = generateBranchName(a.projectId, a.ideaId);
    const port = allocatePort();
    const createdAt = nowIso();

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

    const updated = updateDeliveryRunStatus({
      run,
      status: a.status as RunStatus,
      commitSha: a.commitSha,
      prUrl: a.prUrl,
      error: a.error,
      updatedAt: nowIso(),
    });
    await repo.upsertDeliveryRun(updated);

    if (shouldReleaseRunResources(a.status)) {
      const lease = await repo.getActiveWorkspaceLease(a.projectId, a.runId);
      if (lease) {
        await repo.upsertWorkspaceLease(buildReleasedLease(lease, nowIso()));
      }
      const locks = await repo.listProductLocks(a.companyId, a.projectId);
      const activeLock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
      if (activeLock) {
        await repo.upsertProductLock(buildReleasedLock(activeLock, nowIso()));
      }
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
    const a = args as { companyId: string; projectId: string; runId: string };
    const locks = await repo.listProductLocks(a.companyId, a.projectId);
    const lock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
    if (!lock) throw new Error("No active lock found for this run");
    await repo.upsertProductLock({ ...lock, isActive: false, releasedAt: nowIso() });
    return lock;
  });
}
