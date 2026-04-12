import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type AutomationTier, type ConvoyTaskStatus, type IdeaStatus, type KnowledgeType, type RunStatus, type SwipeDecision } from "../constants.js";
import type {
  AutopilotProject,
  CompanyBudget,
  ConvoyTask,
  Digest,
  Idea,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
  ProductLock,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
} from "../types.js";
import {
  allocatePort,
  findDuplicateIdea,
  generateBranchName,
  getActiveProductLock,
  getActiveWorkspaceLease,
  getAutopilotProject,
  getCompanyBudget,
  getDeliveryRun,
  getIdea,
  getLatestProductProgram,
  listConvoyTasks,
  listProductLocks,
  listResearchCycles,
  listResearchFindings,
  listStuckRuns,
  newId,
  nowIso,
  upsertAutopilotProject,
  upsertCompanyBudget,
  upsertConvoyTask,
  upsertDeliveryRun,
  upsertDigest,
  upsertIdea,
  upsertKnowledgeEntry,
  upsertLearnerSummary,
  upsertOperatorIntervention,
  upsertPlanningArtifact,
  upsertProductLock,
  upsertProductProgramRevision,
  upsertResearchCycle,
  upsertResearchFinding,
  upsertWorkspaceLease,
} from "../helpers.js";
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
import {
  createBudgetAlertDigest,
  createStuckRunDigest,
  processSwipeDecision,
} from "../services/orchestration.js";
import { registerLifecycleActionHandlers } from "./actions-lifecycle.js";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isAutomationTier(value: unknown): value is AutomationTier {
  return value === "supervised" || value === "semiauto" || value === "fullauto";
}

function parseAutomationTier(value: unknown, fallback: AutomationTier = "supervised"): AutomationTier {
  return isAutomationTier(value) ? value : fallback;
}

function isSwipeDecision(value: unknown): value is SwipeDecision {
  return value === "pass" || value === "maybe" || value === "yes" || value === "now";
}

function isConvoyTaskStatus(value: unknown): value is ConvoyTaskStatus {
  return ["pending", "blocked", "running", "passed", "failed", "skipped"].includes(String(value));
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requireCompanyAndProject(
  args: Record<string, unknown>,
): { companyId: string; projectId: string } | string {
  if (!isNonEmptyString(args.companyId)) return "companyId is required";
  if (!isNonEmptyString(args.projectId)) return "projectId is required";
  return { companyId: args.companyId, projectId: args.projectId };
}

export function registerActionHandlers(ctx: PluginContext) {
  ctx.actions.register(ACTION_KEYS.saveAutopilotProject, async (args) => {
    const a = args as Partial<AutopilotProject> & { companyId: string; projectId: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");

    const existing = await getAutopilotProject(ctx, a.companyId, a.projectId);
    const now = nowIso();
    const autopilot: AutopilotProject = {
      autopilotId: existing?.autopilotId ?? newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      enabled: a.enabled ?? existing?.enabled ?? false,
      automationTier: parseAutomationTier(a.automationTier, existing?.automationTier),
      budgetMinutes: parsePositiveInt(a.budgetMinutes, existing?.budgetMinutes ?? 120),
      repoUrl: a.repoUrl,
      workspaceId: a.workspaceId,
      liveUrl: a.liveUrl,
      productType: a.productType,
      paused: a.paused ?? existing?.paused ?? false,
      pauseReason: a.pauseReason,
      researchScheduleCron: a.researchScheduleCron,
      ideationScheduleCron: a.ideationScheduleCron,
      maybePoolResurfaceDays: a.maybePoolResurfaceDays,
      maxIdeasPerCycle: a.maxIdeasPerCycle,
      autoCreateIssues: a.autoCreateIssues ?? existing?.autoCreateIssues ?? true,
      autoCreatePrs: a.autoCreatePrs ?? existing?.autoCreatePrs ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const record = await upsertAutopilotProject(ctx, autopilot);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Autopilot project ${existing ? "updated" : "created"} for project ${a.projectId.slice(0, 8)}`,
      entityType: "autopilot-project",
      entityId: autopilot.autopilotId,
    });
    return record.data;
  });

  ctx.actions.register(ACTION_KEYS.enableAutopilot, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const existing = await getAutopilotProject(ctx, resolved.companyId, resolved.projectId);
    if (!existing) throw new Error("Autopilot project not found");
    const updated = { ...existing, enabled: true, paused: false, updatedAt: nowIso() };
    await upsertAutopilotProject(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.disableAutopilot, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const existing = await getAutopilotProject(ctx, resolved.companyId, resolved.projectId);
    if (!existing) throw new Error("Autopilot project not found");
    const updated = { ...existing, enabled: false, updatedAt: nowIso() };
    await upsertAutopilotProject(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.createProductProgramRevision, async (args) => {
    const a = args as { companyId: string; projectId: string; content: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");
    if (!isNonEmptyString(a.content)) throw new Error("content required");

    const existing = await getLatestProductProgram(ctx, a.companyId, a.projectId);
    const version = (existing?.version ?? 0) + 1;
    const now = nowIso();
    const revision: ProductProgramRevision = {
      revisionId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      content: a.content,
      version,
      createdAt: now,
      updatedAt: now,
    };
    const record = await upsertProductProgramRevision(ctx, revision);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Product Program v${version} created for project ${a.projectId.slice(0, 8)}`,
      entityType: "product-program-revision",
      entityId: revision.revisionId,
    });
    return record.data;
  });

  ctx.actions.register(ACTION_KEYS.getLatestProductProgram, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    return (await getLatestProductProgram(ctx, resolved.companyId, resolved.projectId)) ?? undefined;
  });

  ctx.actions.register(ACTION_KEYS.startResearchCycle, async (args) => {
    const a = args as { companyId: string; projectId: string; query?: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");

    const cycle: ResearchCycle = {
      cycleId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      status: "running",
      query: a.query ?? "Research product improvement opportunities",
      findingsCount: 0,
      startedAt: nowIso(),
    };
    await upsertResearchCycle(ctx, cycle);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Research cycle started: ${cycle.query.slice(0, 60)}`,
      entityType: "research-cycle",
      entityId: cycle.cycleId,
    });
    return cycle;
  });

  ctx.actions.register(ACTION_KEYS.completeResearchCycle, async (args) => {
    const a = args as { companyId: string; projectId: string; cycleId: string; reportContent?: string };
    const cycles = await listResearchCycles(ctx, a.companyId, a.projectId);
    const cycle = cycles.find((candidate) => candidate.cycleId === a.cycleId);
    if (!cycle) throw new Error("Research cycle not found");

    const findings = await listResearchFindings(ctx, a.companyId, a.projectId, a.cycleId);
    const updated: ResearchCycle = {
      ...cycle,
      status: "completed",
      reportContent: a.reportContent,
      findingsCount: findings.length,
      completedAt: nowIso(),
    };
    await upsertResearchCycle(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.addResearchFinding, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      cycleId: string;
      title: string;
      description: string;
      confidence?: number;
      sourceUrl?: string;
      sourceLabel?: string;
      category?: ResearchFinding["category"];
    };
    const finding: ResearchFinding = {
      findingId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      cycleId: a.cycleId,
      title: a.title,
      description: a.description,
      confidence: a.confidence ?? 0.7,
      sourceUrl: a.sourceUrl,
      sourceLabel: a.sourceLabel,
      category: a.category,
      createdAt: nowIso(),
    };
    await upsertResearchFinding(ctx, finding);
    return finding;
  });

  ctx.actions.register(ACTION_KEYS.createIdea, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      title: string;
      description?: string;
      rationale?: string;
      sourceReferences?: string[];
      impactScore?: number;
      feasibilityScore?: number;
      category?: string;
      tags?: string[];
    };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");
    if (!isNonEmptyString(a.title)) throw new Error("title required");

    const duplicate = await findDuplicateIdea(ctx, a.companyId, a.projectId, a.title, a.description ?? "");
    const idea: Idea = {
      ideaId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      title: a.title,
      description: a.description ?? "",
      rationale: a.rationale ?? "",
      sourceReferences: a.sourceReferences ?? [],
      impactScore: a.impactScore ?? 50,
      feasibilityScore: a.feasibilityScore ?? 50,
      complexityEstimate: "medium",
      category: a.category,
      tags: a.tags,
      status: "active",
      duplicateOfIdeaId: duplicate?.idea.ideaId,
      duplicateAnnotated: !!duplicate,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await upsertIdea(ctx, idea);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Idea created: ${a.title.slice(0, 60)}`,
      entityType: "idea",
      entityId: idea.ideaId,
    });
    return { ...idea, duplicateSimilarity: duplicate?.similarity };
  });

  ctx.actions.register(ACTION_KEYS.updateIdea, async (args) => {
    const a = args as { companyId: string; projectId: string; ideaId: string; status?: IdeaStatus };
    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");
    const updated: Idea = { ...idea, status: a.status ?? idea.status, updatedAt: nowIso() };
    await upsertIdea(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.recordSwipe, async (args) => {
    const a = args as { companyId: string; projectId: string; ideaId: string; decision: SwipeDecision; note?: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");
    if (!isNonEmptyString(a.ideaId)) throw new Error("ideaId required");
    if (!isSwipeDecision(a.decision)) throw new Error("Invalid swipe decision");
    return await processSwipeDecision(ctx, a);
  });

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
    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");
    const autopilot = await getAutopilotProject(ctx, a.companyId, a.projectId);
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
    await upsertPlanningArtifact(ctx, artifact);
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
    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");

    const autopilot = await getAutopilotProject(ctx, a.companyId, a.projectId);
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
    await upsertDeliveryRun(ctx, run);

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
    await upsertWorkspaceLease(ctx, lease);

    const lock = buildProductLock({
      lockId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId,
      branchName,
      acquiredAt: createdAt,
    });
    await upsertProductLock(ctx, lock);

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
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");

    const updated = updateDeliveryRunStatus({
      run,
      status: a.status as RunStatus,
      commitSha: a.commitSha,
      prUrl: a.prUrl,
      error: a.error,
      updatedAt: nowIso(),
    });
    await upsertDeliveryRun(ctx, updated);

    if (shouldReleaseRunResources(a.status)) {
      const lease = await getActiveWorkspaceLease(ctx, a.projectId, a.runId);
      if (lease) {
        await upsertWorkspaceLease(ctx, buildReleasedLease(lease, nowIso()));
      }
      const locks = await listProductLocks(ctx, a.companyId, a.projectId);
      const activeLock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
      if (activeLock) {
        await upsertProductLock(ctx, buildReleasedLock(activeLock, nowIso()));
      }
    }

    return updated;
  });

  ctx.actions.register(ACTION_KEYS.pauseDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; reason?: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated = buildPausedRun(run, nowIso(), a.reason);
    await upsertDeliveryRun(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.resumeDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated = buildResumedRun(run, nowIso());
    await upsertDeliveryRun(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.updateCompanyBudget, async (args) => {
    const a = args as { companyId: string; autopilotUsedMinutes?: number; autopilotBudgetMinutes?: number };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    const existing = await getCompanyBudget(ctx, a.companyId);
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
    await upsertCompanyBudget(ctx, budget);
    return budget;
  });

  ctx.actions.register(ACTION_KEYS.checkBudgetAndPauseIfNeeded, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const budget = await getCompanyBudget(ctx, resolved.companyId);
    const autopilot = await getAutopilotProject(ctx, resolved.companyId, resolved.projectId);
    if (!autopilot) return { paused: false, reason: undefined };

    if (shouldPauseForBudget(autopilot, budget)) {
      const updated: AutopilotProject = {
        ...autopilot,
        paused: true,
        pauseReason: "Budget exhausted",
        updatedAt: nowIso(),
      };
      await upsertAutopilotProject(ctx, updated);
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
      await upsertConvoyTask(ctx, task);
    }
    return tasks;
  });

  ctx.actions.register(ACTION_KEYS.updateConvoyTaskStatus, async (args) => {
    const a = args as { companyId: string; projectId: string; taskId: string; status: ConvoyTaskStatus; error?: string };
    if (!isConvoyTaskStatus(a.status)) throw new Error("Invalid convoy task status");

    const tasks = await listConvoyTasks(ctx, a.companyId, a.projectId);
    const task = tasks.find((candidate) => candidate.taskId === a.taskId);
    if (!task) throw new Error("Convoy task not found");

    const now = nowIso();
    const updated: ConvoyTask = {
      ...task,
      status: a.status,
      error: a.error,
      startedAt: a.status === "running" ? (task.startedAt ?? now) : task.startedAt,
      completedAt: ["passed", "failed", "skipped"].includes(a.status) ? now : task.completedAt,
      updatedAt: now,
    };
    await upsertConvoyTask(ctx, updated);

    if (a.status === "passed") {
      for (const candidate of tasks) {
        if (candidate.status === "blocked" && candidate.dependsOnTaskIds.includes(a.taskId)) {
          const allMet = candidate.dependsOnTaskIds.every((dependencyId) => {
            const dependency = tasks.find((item) => item.taskId === dependencyId);
            return dependency?.status === "passed" || dependency?.status === "skipped";
          });
          if (allMet) {
            await upsertConvoyTask(ctx, { ...candidate, status: "pending", updatedAt: now });
          }
        }
      }
    }

    return updated;
  });

  registerLifecycleActionHandlers(ctx);

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
    const existing = await getActiveProductLock(ctx, a.projectId, a.targetBranch);
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
    await upsertProductLock(ctx, lock);
    return lock;
  });

  ctx.actions.register(ACTION_KEYS.releaseProductLock, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string };
    const locks = await listProductLocks(ctx, a.companyId, a.projectId);
    const lock = locks.find((candidate) => candidate.runId === a.runId && candidate.isActive);
    if (!lock) throw new Error("No active lock found for this run");
    await upsertProductLock(ctx, { ...lock, isActive: false, releasedAt: nowIso() });
    return lock;
  });

  ctx.actions.register(ACTION_KEYS.addOperatorNote, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; note: string };
    const intervention: OperatorIntervention = {
      interventionId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      interventionType: "note",
      note: a.note,
      createdAt: nowIso(),
    };
    await upsertOperatorIntervention(ctx, intervention);
    return intervention;
  });

  ctx.actions.register(ACTION_KEYS.requestCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; reason?: string };
    const intervention: OperatorIntervention = {
      interventionId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      interventionType: "checkpoint_request",
      note: a.reason,
      createdAt: nowIso(),
    };
    await upsertOperatorIntervention(ctx, intervention);
    return intervention;
  });

  ctx.actions.register(ACTION_KEYS.nudgeRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; note?: string };
    const intervention: OperatorIntervention = {
      interventionId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      interventionType: "nudge",
      note: a.note,
      createdAt: nowIso(),
    };
    await upsertOperatorIntervention(ctx, intervention);
    return intervention;
  });

  ctx.actions.register(ACTION_KEYS.createLearnerSummary, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      runId: string;
      ideaId: string;
      title: string;
      summaryText: string;
      keyLearnings?: string[];
      skillsReinjected?: string[];
      metrics?: LearnerSummary["metrics"];
    };
    const summary: LearnerSummary = {
      summaryId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      ideaId: a.ideaId,
      title: a.title,
      summaryText: a.summaryText,
      keyLearnings: a.keyLearnings ?? [],
      skillsReinjected: a.skillsReinjected ?? [],
      metrics: a.metrics ?? {},
      createdAt: nowIso(),
    };
    await upsertLearnerSummary(ctx, summary);
    return summary;
  });

  ctx.actions.register(ACTION_KEYS.createKnowledgeEntry, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      knowledgeType: KnowledgeType;
      title: string;
      content: string;
      reinjectionCommand?: string;
      tags?: string[];
      sourceRunId?: string;
      sourceSummaryId?: string;
    };
    const entry: KnowledgeEntry = {
      entryId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      knowledgeType: a.knowledgeType,
      title: a.title,
      content: a.content,
      reinjectionCommand: a.reinjectionCommand,
      sourceRunId: a.sourceRunId,
      sourceSummaryId: a.sourceSummaryId,
      usageCount: 0,
      tags: a.tags ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await upsertKnowledgeEntry(ctx, entry);
    return entry;
  });

  ctx.actions.register(ACTION_KEYS.createDigest, async (args) => {
    const a = args as {
      companyId: string;
      projectId: string;
      digestType: string;
      title: string;
      summary: string;
      details?: string[];
      priority?: "low" | "medium" | "high" | "critical";
      relatedRunId?: string;
      relatedBudgetId?: string;
    };
    const digest: Digest = {
      digestId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      digestType: a.digestType as Digest["digestType"],
      title: a.title,
      summary: a.summary,
      details: a.details ?? [],
      priority: a.priority ?? "medium",
      status: "pending",
      deliveredAt: null,
      readAt: null,
      dismissedAt: null,
      relatedRunId: a.relatedRunId,
      relatedBudgetId: a.relatedBudgetId,
      createdAt: nowIso(),
    };
    await upsertDigest(ctx, digest);
    return digest;
  });

  ctx.actions.register(ACTION_KEYS.generateStuckRunDigest, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    return await createStuckRunDigest(ctx, resolved.companyId, resolved.projectId);
  });

  ctx.actions.register(ACTION_KEYS.generateBudgetAlertDigest, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    return await createBudgetAlertDigest(ctx, resolved.companyId, resolved.projectId);
  });

  ctx.actions.register(ACTION_KEYS.checkStuckRuns, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    return await listStuckRuns(ctx, resolved.companyId, resolved.projectId);
  });
}
