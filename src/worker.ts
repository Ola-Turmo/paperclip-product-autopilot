import { randomUUID } from "node:crypto";
import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginJobContext,
  type ToolResult,
} from "@paperclipai/plugin-sdk";
import {
  ACTION_KEYS,
  DATA_KEYS,
  ENTITY_TYPES,
  JOB_KEYS,
  PLUGIN_ID,
  TOOL_KEYS,
} from "./constants.js";
import type {
  AutomationTier,
  IdeaStatus,
  SwipeDecision,
  ConvoyTaskStatus,
  KnowledgeType,
  RunStatus,
} from "./constants.js";
import type {
  AutopilotProject,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
  Idea,
  SwipeEvent,
  PreferenceProfile,
  PlanningArtifact,
  DeliveryRun,
  CompanyBudget,
  ConvoyTask,
  Checkpoint,
  ProductLock,
  OperatorIntervention,
  LearnerSummary,
  KnowledgeEntry,
  Digest,
  ReleaseHealthCheck,
  RollbackAction,
  AutopilotOverview,
} from "./types.js";
import {
  nowIso,
  daysAgo,
  newId,
  generateBranchName,
  allocatePort,
  upsertAutopilotProject,
  getAutopilotProject,
  listAutopilotProjectEntities,
  upsertProductProgramRevision,
  getLatestProductProgram,
  listProductProgramRevisions,
  upsertResearchCycle,
  listResearchCycles,
  upsertResearchFinding,
  listResearchFindings,
  upsertIdea,
  getIdea,
  listIdeas,
  listMaybePoolIdeas,
  findDuplicateIdea,
  upsertSwipeEvent,
  listSwipeEvents,
  upsertPreferenceProfile,
  getPreferenceProfile,
  upsertPlanningArtifact,
  getPlanningArtifact,
  listPlanningArtifacts,
  upsertDeliveryRun,
  getDeliveryRun,
  listDeliveryRuns,
  listStuckRuns,
  upsertWorkspaceLease,
  getActiveWorkspaceLease,
  upsertCompanyBudget,
  getCompanyBudget,
  upsertConvoyTask,
  listConvoyTasks,
  upsertCheckpoint,
  listCheckpoints,
  upsertProductLock,
  getActiveProductLock,
  listProductLocks,
  upsertOperatorIntervention,
  listOperatorInterventions,
  upsertLearnerSummary,
  listLearnerSummaries,
  upsertKnowledgeEntry,
  listKnowledgeEntries,
  upsertDigest,
  listDigests,
  upsertReleaseHealthCheck,
  listReleaseHealthChecks,
  upsertRollbackAction,
  applySwipeToPreferenceProfile,
} from "./helpers.js";

// ─── Validation helpers ────────────────────────────────────────────────────────
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isAutomationTier(v: unknown): v is AutomationTier {
  return v === "supervised" || v === "semiauto" || v === "fullauto";
}
function parseAutomationTier(v: unknown, fallback: AutomationTier = "supervised"): AutomationTier {
  return isAutomationTier(v) ? v : fallback;
}
function isSwipeDecision(v: unknown): v is SwipeDecision {
  return v === "pass" || v === "maybe" || v === "yes" || v === "now";
}
function isIdeaStatus(v: unknown): v is IdeaStatus {
  return ["active","maybe","approved","rejected","in_progress","completed","archived"].includes(String(v));
}
function isConvoyTaskStatus(v: unknown): v is ConvoyTaskStatus {
  return ["pending","blocked","running","passed","failed","skipped"].includes(String(v));
}
function parsePositiveInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function requireCompanyAndProject(
  args: Record<string, unknown>
): { companyId: string; projectId: string } | string {
  if (!isNonEmptyString(args.companyId)) return "companyId is required";
  if (!isNonEmptyString(args.projectId)) return "projectId is required";
  return { companyId: args.companyId as string, projectId: args.projectId as string };
}

// ─── Main plugin ────────────────────────────────────────────────────────────────
const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info(`${PLUGIN_ID} worker starting`);
    registerDataHandlers(ctx);
    registerActionHandlers(ctx);
    registerToolHandlers(ctx);
    registerJobHandlers(ctx);
    ctx.logger.info(`${PLUGIN_ID} handlers registered`);
  },

  async onHealth() {
    return { status: "ok", message: "Product Autopilot plugin running" };
  },

  async onShutdown() {
    // no-op cleanup
  },
});

export default plugin;
runWorker(plugin, import.meta.url);

// ─── DATA HANDLERS ──────────────────────────────────────────────────────────────
function registerDataHandlers(ctx: PluginContext) {

  ctx.data.register(DATA_KEYS.autopilotProject, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await getAutopilotProject(ctx, companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.autopilotProjects, async (args) => {
    const { companyId } = args as { companyId?: string };
    const entities = await listAutopilotProjectEntities(ctx, companyId);
    return entities.map((e) => e.data) as unknown as AutopilotProject[];
  });

  ctx.data.register("autopilot-overview", async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    const [project, ideas, maybeIdeas, runs, swipes, budget] = await Promise.all([
      getAutopilotProject(ctx, companyId, projectId),
      listIdeas(ctx, companyId, projectId),
      listMaybePoolIdeas(ctx, companyId, projectId),
      listDeliveryRuns(ctx, companyId, projectId),
      listSwipeEvents(ctx, companyId, projectId, 50),
      getCompanyBudget(ctx, companyId),
    ]);
    const today = new Date().toDateString();
    const todaySwipes = swipes.filter((s) => new Date(s.createdAt).toDateString() === today);
    const runningRuns = runs.filter((r) => r.status === "running");
    const completedRuns = runs.filter((r) => r.status === "completed");
    const failedRuns = runs.filter((r) => r.status === "failed");
    const usagePct = budget && budget.autopilotBudgetMinutes > 0
      ? Math.round((budget.autopilotUsedMinutes / budget.autopilotBudgetMinutes) * 100)
      : 0;

    const overview: AutopilotOverview = {
      projectCount: 1,
      enabledCount: project?.enabled ? 1 : 0,
      pausedCount: project?.paused ? 1 : 0,
      activeIdeasCount: ideas.filter((i) => i.status === "active").length,
      maybePoolCount: maybeIdeas.length,
      approvedIdeasCount: ideas.filter((i) => i.status === "approved").length,
      runningRunsCount: runningRuns.length,
      completedRunsCount: completedRuns.length,
      failedRunsCount: failedRuns.length,
      totalSwipesToday: todaySwipes.length,
      budgetUsagePercent: usagePct,
    };
    return overview;
  });

  ctx.data.register(DATA_KEYS.productProgramRevision, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await getLatestProductProgram(ctx, companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.productProgramRevisions, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listProductProgramRevisions(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.researchCycle, async (args) => {
    const { companyId, projectId, cycleId } = args as { companyId: string; projectId: string; cycleId: string };
    const cycles = await listResearchCycles(ctx, companyId, projectId);
    return cycles.find((c) => c.cycleId === cycleId) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.researchCycles, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId?: string };
    return await listResearchCycles(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.researchFindings, async (args) => {
    const { companyId, projectId, cycleId } = args as { companyId: string; projectId: string; cycleId?: string };
    return await listResearchFindings(ctx, companyId, projectId, cycleId);
  });

  ctx.data.register(DATA_KEYS.idea, async (args) => {
    const { companyId, projectId, ideaId } = args as { companyId: string; projectId: string; ideaId: string };
    return (await getIdea(ctx, companyId, projectId, ideaId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.ideas, async (args) => {
    const { companyId, projectId, status } = args as { companyId: string; projectId: string; status?: IdeaStatus };
    return await listIdeas(ctx, companyId, projectId, status);
  });

  ctx.data.register(DATA_KEYS.maybePoolIdeas, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listMaybePoolIdeas(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.swipeEvent, async (args) => {
    const { companyId, projectId, swipeId } = args as { companyId: string; projectId: string; swipeId: string };
    const events = await listSwipeEvents(ctx, companyId, projectId, 100);
    return events.find((e) => e.swipeId === swipeId) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.swipeEvents, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listSwipeEvents(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.preferenceProfile, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await getPreferenceProfile(ctx, companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.planningArtifact, async (args) => {
    const { companyId, projectId, artifactId } = args as { companyId: string; projectId: string; artifactId: string };
    return (await getPlanningArtifact(ctx, companyId, projectId, artifactId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.planningArtifacts, async (args) => {
    const { companyId, projectId, ideaId } = args as { companyId: string; projectId: string; ideaId?: string };
    return await listPlanningArtifacts(ctx, companyId, projectId, ideaId);
  });

  ctx.data.register(DATA_KEYS.deliveryRun, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId: string };
    return (await getDeliveryRun(ctx, companyId, projectId, runId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.deliveryRuns, async (args) => {
    const { companyId, projectId, status } = args as { companyId: string; projectId: string; status?: string };
    return await listDeliveryRuns(ctx, companyId, projectId, status);
  });

  ctx.data.register(DATA_KEYS.workspaceLease, async (args) => {
    const { projectId, runId } = args as { projectId: string; runId: string };
    return (await getActiveWorkspaceLease(ctx, projectId, runId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.companyBudget, async (args) => {
    const { companyId } = args as { companyId: string };
    return (await getCompanyBudget(ctx, companyId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.convoyTasks, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await listConvoyTasks(ctx, companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.checkpoints, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await listCheckpoints(ctx, companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.productLocks, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listProductLocks(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.operatorInterventions, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await listOperatorInterventions(ctx, companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.learnerSummaries, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listLearnerSummaries(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.knowledgeEntries, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listKnowledgeEntries(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.digests, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId?: string };
    return await listDigests(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.releaseHealthChecks, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await listReleaseHealthChecks(ctx, companyId, projectId, runId);
  });
}

// ─── ACTION HANDLERS ───────────────────────────────────────────────────────────
function registerActionHandlers(ctx: PluginContext) {

  ctx.actions.register(ACTION_KEYS.saveAutopilotProject, async (args) => {
    const a = args as Partial<AutopilotProject> & { companyId: string; projectId: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");

    const existing = await getAutopilotProject(ctx, a.companyId, a.projectId);
    const now = nowIso();
    const ap: AutopilotProject = {
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
    const record = await upsertAutopilotProject(ctx, ap);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Autopilot project ${existing ? "updated" : "created"} for project ${a.projectId.slice(0, 8)}`,
      entityType: "autopilot-project",
      entityId: ap.autopilotId,
    });
    return record.data;
  });

  ctx.actions.register(ACTION_KEYS.enableAutopilot, async (args) => {
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    const existing = await getAutopilotProject(ctx, r.companyId, r.projectId);
    if (!existing) throw new Error("Autopilot project not found");
    const updated = { ...existing, enabled: true, paused: false, updatedAt: nowIso() };
    await upsertAutopilotProject(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.disableAutopilot, async (args) => {
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    const existing = await getAutopilotProject(ctx, r.companyId, r.projectId);
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
    const rev: ProductProgramRevision = {
      revisionId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      content: a.content,
      version,
      createdAt: now,
      updatedAt: now,
    };
    const record = await upsertProductProgramRevision(ctx, rev);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Product Program v${version} created for project ${a.projectId.slice(0, 8)}`,
      entityType: "product-program-revision",
      entityId: rev.revisionId,
    });
    return record.data;
  });

  ctx.actions.register(ACTION_KEYS.getLatestProductProgram, async (args) => {
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    return (await getLatestProductProgram(ctx, r.companyId, r.projectId)) ?? undefined;
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
    const cycle = cycles.find((c) => c.cycleId === a.cycleId);
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
    const a = args as { companyId: string; projectId: string; cycleId: string; title: string; description: string; confidence?: number; sourceUrl?: string; sourceLabel?: string; category?: ResearchFinding["category"] };
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
    const a = args as { companyId: string; projectId: string; title: string; description?: string; rationale?: string; sourceReferences?: string[]; impactScore?: number; feasibilityScore?: number; category?: string; tags?: string[] };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");
    if (!isNonEmptyString(a.title)) throw new Error("title required");

    const dup = await findDuplicateIdea(ctx, a.companyId, a.projectId, a.title, a.description ?? "");
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
      duplicateOfIdeaId: dup?.idea.ideaId,
      duplicateAnnotated: !!dup,
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
    return { ...idea, duplicateSimilarity: dup?.similarity };
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

    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");

    const swipe: SwipeEvent = {
      swipeId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      decision: a.decision,
      note: a.note,
      createdAt: nowIso(),
    };
    await upsertSwipeEvent(ctx, swipe);

    let newStatus: IdeaStatus = idea.status;
    if (a.decision === "pass") newStatus = "rejected";
    else if (a.decision === "maybe") newStatus = "maybe";
    else if (a.decision === "yes" || a.decision === "now") newStatus = "approved";

    const updatedIdea: Idea = { ...idea, status: newStatus, updatedAt: nowIso() };
    await upsertIdea(ctx, updatedIdea);

    let profile = await getPreferenceProfile(ctx, a.companyId, a.projectId);
    if (!profile) {
      profile = {
        profileId: newId(),
        companyId: a.companyId,
        projectId: a.projectId,
        passCount: 0, maybeCount: 0, yesCount: 0, nowCount: 0,
        totalSwipes: 0,
        categoryPreferences: {},
        tagPreferences: {},
        avgApprovedScore: 0,
        avgRejectedScore: 0,
        lastUpdated: nowIso(),
      };
    }
    const updatedProfile = applySwipeToPreferenceProfile(profile, a.decision, idea);
    await upsertPreferenceProfile(ctx, updatedProfile);

    const autopilot = await getAutopilotProject(ctx, a.companyId, a.projectId);
    let planningArtifact: PlanningArtifact | undefined;
    let deliveryRun: DeliveryRun | undefined;

    if ((a.decision === "yes" || a.decision === "now") && autopilot?.enabled) {
      const artifactId = newId();
      planningArtifact = {
        artifactId,
        companyId: a.companyId,
        projectId: a.projectId,
        ideaId: a.ideaId,
        title: `Plan: ${idea.title.slice(0, 60)}`,
        goalAlignmentSummary: idea.rationale,
        implementationSpec: idea.technicalApproach ?? "",
        dependencies: [],
        rolloutPlan: "",
        testPlan: "",
        approvalChecklist: [],
        executionMode: "simple",
        approvalMode: autopilot.automationTier === "fullauto" ? "auto_approve" : "manual",
        automationTier: autopilot.automationTier,
        status: "draft",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await upsertPlanningArtifact(ctx, planningArtifact);

      if (autopilot.automationTier !== "supervised" || a.decision === "now") {
        const runId = newId();
        const branchName = generateBranchName(a.projectId, a.ideaId);
        deliveryRun = {
          runId,
          companyId: a.companyId,
          projectId: a.projectId,
          ideaId: a.ideaId,
          artifactId,
          title: `Delivery: ${idea.title.slice(0, 60)}`,
          status: "pending",
          automationTier: autopilot.automationTier,
          branchName,
          workspacePath: autopilot.workspaceId ?? "",
          leasedPort: null,
          commitSha: null,
          paused: false,
          completedAt: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await upsertDeliveryRun(ctx, deliveryRun);

        const lock: ProductLock = {
          lockId: newId(),
          companyId: a.companyId,
          projectId: a.projectId,
          runId,
          lockType: "product_lock",
          targetBranch: branchName,
          targetPath: "",
          acquiredAt: nowIso(),
          releasedAt: null,
          isActive: true,
        };
        await upsertProductLock(ctx, lock);
      }
    }

    await ctx.activity.log({
      companyId: a.companyId,
      message: `Swipe ${a.decision} on idea: ${idea.title.slice(0, 60)}`,
      entityType: "swipe-event",
      entityId: swipe.swipeId,
    });

    return { swipe, idea: updatedIdea, profile: updatedProfile, planningArtifact, deliveryRun };
  });

  ctx.actions.register(ACTION_KEYS.createPlanningArtifact, async (args) => {
    const a = args as { companyId: string; projectId: string; ideaId: string; title?: string; goalAlignmentSummary?: string; implementationSpec?: string; dependencies?: string[]; rolloutPlan?: string; testPlan?: string; approvalChecklist?: string[]; executionMode?: Idea["complexityEstimate"]; approvalMode?: "manual" | "auto_approve" };
    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");
    const autopilot = await getAutopilotProject(ctx, a.companyId, a.projectId);
    const artifact: PlanningArtifact = {
      artifactId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      title: a.title ?? `Plan: ${idea.title.slice(0, 60)}`,
      goalAlignmentSummary: a.goalAlignmentSummary ?? idea.rationale,
      implementationSpec: a.implementationSpec ?? idea.technicalApproach ?? "",
      dependencies: a.dependencies ?? [],
      rolloutPlan: a.rolloutPlan ?? "",
      testPlan: a.testPlan ?? "",
      approvalChecklist: a.approvalChecklist ?? [],
      executionMode: "simple",
      approvalMode: a.approvalMode ?? (autopilot?.automationTier === "fullauto" ? "auto_approve" : "manual"),
      automationTier: autopilot?.automationTier ?? "supervised",
      status: "draft",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await upsertPlanningArtifact(ctx, artifact);
    return artifact;
  });

  ctx.actions.register(ACTION_KEYS.createDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; ideaId: string; artifactId?: string; title?: string; automationTier?: AutomationTier };
    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");

    const autopilot = await getAutopilotProject(ctx, a.companyId, a.projectId);
    const runId = newId();
    const branchName = generateBranchName(a.projectId, a.ideaId);
    const port = allocatePort();

    const run: DeliveryRun = {
      runId,
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      artifactId: a.artifactId ?? "",
      title: a.title ?? `Delivery: ${idea.title.slice(0, 60)}`,
      status: "pending",
      automationTier: a.automationTier ?? autopilot?.automationTier ?? "supervised",
      branchName,
      workspacePath: autopilot?.workspaceId ?? "",
      leasedPort: port,
      commitSha: null,
      paused: false,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await upsertDeliveryRun(ctx, run);

    const lease: ReturnType<typeof upsertWorkspaceLease> extends Promise<infer T> ? T extends { data: infer D } ? D : never : never = {} as never;

    const leaseData = {
      leaseId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId,
      workspacePath: autopilot?.workspaceId ?? "",
      branchName,
      leasedPort: port,
      gitRepoRoot: autopilot?.repoUrl ?? null,
      isActive: true,
      createdAt: nowIso(),
      releasedAt: null,
    };
    await upsertWorkspaceLease(ctx, leaseData);

    const lock: ProductLock = {
      lockId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId,
      lockType: "product_lock",
      targetBranch: branchName,
      targetPath: "",
      acquiredAt: nowIso(),
      releasedAt: null,
      isActive: true,
    };
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
    const a = args as { companyId: string; projectId: string; runId: string; status: string; commitSha?: string; prUrl?: string; error?: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated: DeliveryRun = {
      ...run,
      status: a.status as RunStatus,
      commitSha: a.commitSha ?? run.commitSha,
      prUrl: a.prUrl,
      error: a.error,
      completedAt: ["completed","failed","cancelled"].includes(a.status) ? nowIso() : null,
      updatedAt: nowIso(),
    };
    await upsertDeliveryRun(ctx, updated);

    if (["completed","failed","cancelled"].includes(a.status)) {
      const lease = await getActiveWorkspaceLease(ctx, a.projectId, a.runId);
      if (lease) {
        await upsertWorkspaceLease(ctx, { ...lease, isActive: false, releasedAt: nowIso() });
      }
      const locks = await listProductLocks(ctx, a.companyId, a.projectId);
      const activeLock = locks.find((l) => l.runId === a.runId && l.isActive);
      if (activeLock) {
        await upsertProductLock(ctx, { ...activeLock, isActive: false, releasedAt: nowIso() });
      }
    }
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.pauseDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; reason?: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated: DeliveryRun = { ...run, status: "paused", paused: true, pauseReason: a.reason, updatedAt: nowIso() };
    await upsertDeliveryRun(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.resumeDeliveryRun, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    if (!run) throw new Error("Delivery run not found");
    const updated: DeliveryRun = { ...run, status: "running", paused: false, pauseReason: undefined, updatedAt: nowIso() };
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
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    const budget = await getCompanyBudget(ctx, r.companyId);
    const autopilot = await getAutopilotProject(ctx, r.companyId, r.projectId);
    if (!autopilot) return { paused: false, reason: undefined };

    if (budget && budget.autopilotUsedMinutes >= budget.autopilotBudgetMinutes) {
      const updated: AutopilotProject = { ...autopilot, paused: true, pauseReason: "Budget exhausted", updatedAt: nowIso() };
      await upsertAutopilotProject(ctx, updated);
      return { paused: true, reason: "Budget exhausted" };
    }
    return { paused: false, reason: undefined };
  });

  ctx.actions.register(ACTION_KEYS.decomposeIntoConvoyTasks, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; artifactId: string; taskTitles: string[]; dependencies?: string[][] };
    const tasks: ConvoyTask[] = a.taskTitles.map((title, i) => ({
      taskId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      artifactId: a.artifactId,
      title,
      description: "",
      status: i === 0 ? "pending" : "blocked",
      dependsOnTaskIds: (a.dependencies?.[i] ?? []),
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
    const task = tasks.find((t) => t.taskId === a.taskId);
    if (!task) throw new Error("Convoy task not found");

    const now = nowIso();
    const updated: ConvoyTask = {
      ...task,
      status: a.status,
      error: a.error,
      startedAt: a.status === "running" ? (task.startedAt ?? now) : task.startedAt,
      completedAt: ["passed","failed","skipped"].includes(a.status) ? now : task.completedAt,
      updatedAt: now,
    };
    await upsertConvoyTask(ctx, updated);

    if (a.status === "passed") {
      for (const t of tasks) {
        if (t.status === "blocked" && t.dependsOnTaskIds.includes(a.taskId)) {
          const allMet = t.dependsOnTaskIds.every((depId) => {
            const dep = tasks.find((x) => x.taskId === depId);
            return dep?.status === "passed" || dep?.status === "skipped";
          });
          if (allMet) {
            await upsertConvoyTask(ctx, { ...t, status: "pending", updatedAt: now });
          }
        }
      }
    }
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.createCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; label?: string; pauseReason?: string };
    const run = await getDeliveryRun(ctx, a.companyId, a.projectId, a.runId);
    const tasks = await listConvoyTasks(ctx, a.companyId, a.projectId, a.runId);
    const checkpoint: Checkpoint = {
      checkpointId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      label: a.label,
      snapshotState: { runStatus: run?.status },
      taskStates: Object.fromEntries(tasks.map((t) => [t.taskId, t.status])),
      workspaceSnapshot: {
        branchName: run?.branchName ?? "",
        commitSha: run?.commitSha ?? null,
        workspacePath: run?.workspacePath ?? "",
        leasedPort: run?.leasedPort ?? null,
      },
      pauseReason: a.pauseReason,
      createdAt: nowIso(),
    };
    await upsertCheckpoint(ctx, checkpoint);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Checkpoint created for run ${a.runId.slice(0, 8)}: ${a.label ?? ""}`,
      entityType: "checkpoint",
      entityId: checkpoint.checkpointId,
    });
    return checkpoint;
  });

  ctx.actions.register(ACTION_KEYS.resumeFromCheckpoint, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkpointId: string };
    const checkpoints = await listCheckpoints(ctx, a.companyId, a.projectId, a.runId);
    const checkpoint = checkpoints.find((c) => c.checkpointId === a.checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");

    for (const [taskId, status] of Object.entries(checkpoint.taskStates)) {
      const tasks = await listConvoyTasks(ctx, a.companyId, a.projectId, a.runId);
      const task = tasks.find((t) => t.taskId === taskId);
      if (task) {
        await upsertConvoyTask(ctx, { ...task, status: status as ConvoyTaskStatus, updatedAt: nowIso() });
      }
    }
    return checkpoint;
  });

  ctx.actions.register(ACTION_KEYS.acquireProductLock, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; lockType: string; targetBranch: string; targetPath?: string; blockReason?: string };
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
    const lock = locks.find((l) => l.runId === a.runId && l.isActive);
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
    const a = args as { companyId: string; projectId: string; runId: string; ideaId: string; title: string; summaryText: string; keyLearnings?: string[]; skillsReinjected?: string[]; metrics?: LearnerSummary["metrics"] };
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
    const a = args as { companyId: string; projectId: string; knowledgeType: KnowledgeType; title: string; content: string; reinjectionCommand?: string; tags?: string[]; sourceRunId?: string; sourceSummaryId?: string };
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
    const a = args as { companyId: string; projectId: string; digestType: string; title: string; summary: string; details?: string[]; priority?: "low" | "medium" | "high" | "critical"; relatedRunId?: string; relatedBudgetId?: string };
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
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    const stuckRuns = await listStuckRuns(ctx, r.companyId, r.projectId);
    if (stuckRuns.length === 0) return [];
    const digest: Digest = {
      digestId: newId(),
      companyId: r.companyId,
      projectId: r.projectId,
      digestType: "stuck_run",
      title: `${stuckRuns.length} delivery run(s) may be stuck`,
      summary: `Runs not updated in over 60 minutes: ${stuckRuns.map((run) => run.runId.slice(0, 8)).join(", ")}`,
      details: stuckRuns.map((run) => `${run.runId}: ${run.title} (status: ${run.status})`),
      priority: "high",
      status: "pending",
      deliveredAt: null,
      readAt: null,
      dismissedAt: null,
      relatedRunId: stuckRuns[0]?.runId,
      createdAt: nowIso(),
    };
    await upsertDigest(ctx, digest);
    return digest;
  });

  ctx.actions.register(ACTION_KEYS.generateBudgetAlertDigest, async (args) => {
    const a = args as { companyId: string; projectId: string };
    const budget = await getCompanyBudget(ctx, a.companyId);
    if (!budget) return undefined;
    const usagePct = Math.round((budget.autopilotUsedMinutes / budget.autopilotBudgetMinutes) * 100);
    if (usagePct < 80) return undefined;

    const digest: Digest = {
      digestId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      digestType: "budget_alert",
      title: `Autopilot budget at ${usagePct}%`,
      summary: `Autopilot has used ${budget.autopilotUsedMinutes}/${budget.autopilotBudgetMinutes} minutes`,
      details: [],
      priority: usagePct >= 95 ? "critical" : "high",
      status: "pending",
      deliveredAt: null,
      readAt: null,
      dismissedAt: null,
      relatedBudgetId: budget.budgetId,
      createdAt: nowIso(),
    };
    await upsertDigest(ctx, digest);
    return digest;
  });

  ctx.actions.register(ACTION_KEYS.createReleaseHealthCheck, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkType: string; name: string };
    const check: ReleaseHealthCheck = {
      checkId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      checkType: a.checkType as ReleaseHealthCheck["checkType"],
      name: a.name,
      status: "pending",
      createdAt: nowIso(),
    };
    await upsertReleaseHealthCheck(ctx, check);
    return check;
  });

  ctx.actions.register(ACTION_KEYS.updateReleaseHealthStatus, async (args) => {
    const a = args as { companyId: string; projectId: string; checkId: string; status: string; errorMessage?: string };
    const checks = await listReleaseHealthChecks(ctx, a.companyId, a.projectId);
    const check = checks.find((c) => c.checkId === a.checkId);
    if (!check) throw new Error("Health check not found");
    const updated: ReleaseHealthCheck = {
      ...check,
      status: a.status as ReleaseHealthCheck["status"],
      errorMessage: a.errorMessage,
      passedAt: a.status === "passed" ? nowIso() : check.passedAt,
      failedAt: a.status === "failed" ? nowIso() : check.failedAt,
    };
    await upsertReleaseHealthCheck(ctx, updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.triggerRollback, async (args) => {
    const a = args as { companyId: string; projectId: string; runId: string; checkId: string; rollbackType: string; targetCommitSha?: string; checkpointId?: string };
    const rollback: RollbackAction = {
      rollbackId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      runId: a.runId,
      checkId: a.checkId,
      rollbackType: a.rollbackType as RollbackAction["rollbackType"],
      status: "pending",
      targetCommitSha: a.targetCommitSha,
      checkpointId: a.checkpointId,
      createdAt: nowIso(),
    };
    await upsertRollbackAction(ctx, rollback);
    return rollback;
  });

  ctx.actions.register(ACTION_KEYS.checkStuckRuns, async (args) => {
    const r = requireCompanyAndProject(args);
    if (typeof r === "string") throw new Error(r);
    return await listStuckRuns(ctx, r.companyId, r.projectId);
  });
}

// ─── TOOL HANDLERS ─────────────────────────────────────────────────────────────
function registerToolHandlers(ctx: PluginContext) {

  ctx.tools.register(TOOL_KEYS.listAutopilotProjects, {
    displayName: "List Autopilot Projects",
    description: "List all projects with Product Autopilot enabled.",
    parametersSchema: {
      type: "object",
      properties: { companyId: { type: "string" } },
      required: ["companyId"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const { companyId } = params as { companyId: string };
    const entities = await listAutopilotProjectEntities(ctx, companyId);
    const projects = entities.map((e) => e.data) as unknown as AutopilotProject[];
    return { content: JSON.stringify(projects, null, 2) };
  });

  ctx.tools.register(TOOL_KEYS.createIdea, {
    displayName: "Create Product Idea",
    description: "Create a new product idea in the Autopilot idea pool.",
    parametersSchema: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        projectId: { type: "string" },
        title: { type: "string", description: "Brief idea title" },
        description: { type: "string" },
        rationale: { type: "string" },
        sourceReferences: { type: "array", items: { type: "string" } },
        impactScore: { type: "number" },
      },
      required: ["companyId", "projectId", "title"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const a = params as { companyId: string; projectId: string; title: string; description?: string; rationale?: string; sourceReferences?: string[]; impactScore?: number };

    const dup = await findDuplicateIdea(ctx, a.companyId, a.projectId, a.title, a.description ?? "");
    const idea: Idea = {
      ideaId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      title: a.title,
      description: a.description ?? "",
      rationale: a.rationale ?? "",
      sourceReferences: a.sourceReferences ?? [],
      impactScore: a.impactScore ?? 50,
      feasibilityScore: 50,
      complexityEstimate: "medium",
      status: "active",
      duplicateOfIdeaId: dup?.idea.ideaId,
      duplicateAnnotated: !!dup,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await upsertIdea(ctx, idea);
    return {
      content: `Idea created: ${idea.ideaId}\nTitle: ${idea.title}\nDuplicate annotated: ${idea.duplicateAnnotated}`,
    };
  });

  ctx.tools.register(TOOL_KEYS.getSwipeQueue, {
    displayName: "Get Swipe Queue",
    description: "Get the current queue of ideas pending swipe review.",
    parametersSchema: {
      type: "object",
      properties: { companyId: { type: "string" }, projectId: { type: "string" } },
      required: ["companyId", "projectId"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const { companyId, projectId } = params as { companyId: string; projectId: string };
    const ideas = await listIdeas(ctx, companyId, projectId, "active");
    return { content: JSON.stringify(ideas, null, 2) };
  });

  ctx.tools.register(TOOL_KEYS.recordSwipeDecision, {
    displayName: "Record Swipe Decision",
    description: "Record a swipe decision (pass/maybe/yes/now) for an idea.",
    parametersSchema: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        projectId: { type: "string" },
        ideaId: { type: "string" },
        decision: { type: "string", enum: ["pass", "maybe", "yes", "now"] },
        note: { type: "string" },
      },
      required: ["companyId", "projectId", "ideaId", "decision"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const a = params as { companyId: string; projectId: string; ideaId: string; decision: SwipeDecision; note?: string };
    if (!isSwipeDecision(a.decision)) return { content: `Error: invalid decision "${a.decision}"` };

    const idea = await getIdea(ctx, a.companyId, a.projectId, a.ideaId);
    if (!idea) return { content: `Error: idea ${a.ideaId} not found` };

    const swipe: SwipeEvent = {
      swipeId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      ideaId: a.ideaId,
      decision: a.decision,
      note: a.note,
      createdAt: nowIso(),
    };
    await upsertSwipeEvent(ctx, swipe);

    let newStatus: IdeaStatus = idea.status;
    if (a.decision === "pass") newStatus = "rejected";
    else if (a.decision === "maybe") newStatus = "maybe";
    else if (a.decision === "yes" || a.decision === "now") newStatus = "approved";

    await upsertIdea(ctx, { ...idea, status: newStatus, updatedAt: nowIso() });
    return { content: `Swipe recorded: ${a.decision}\nIdea status: ${newStatus}` };
  });

  ctx.tools.register(TOOL_KEYS.startResearchCycle, {
    displayName: "Start Research Cycle",
    description: "Trigger a new research cycle for a project.",
    parametersSchema: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        projectId: { type: "string" },
        query: { type: "string" },
      },
      required: ["companyId", "projectId"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const a = params as { companyId: string; projectId: string; query?: string };
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
    return { content: `Research cycle started: ${cycle.cycleId}\nQuery: ${cycle.query}` };
  });

  ctx.tools.register(TOOL_KEYS.generateIdeas, {
    displayName: "Generate Ideas",
    description: "Generate new product ideas using the Product Program and latest research.",
    parametersSchema: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        projectId: { type: "string" },
        count: { type: "number", description: "Number of ideas to generate (default 5)" },
      },
      required: ["companyId", "projectId"],
    },
  }, async (params, _runCtx): Promise<ToolResult> => {
    const a = params as { companyId: string; projectId: string; count?: number };
    const count = parsePositiveInt(a.count, 5);

    const [findings, ideas] = await Promise.all([
      listResearchFindings(ctx, a.companyId, a.projectId),
      listIdeas(ctx, a.companyId, a.projectId),
    ]);

    const created: Idea[] = [];
    for (let i = 0; i < count; i++) {
      const finding = findings[i % Math.max(findings.length, 1)];
      const idea: Idea = {
        ideaId: newId(),
        companyId: a.companyId,
        projectId: a.projectId,
        title: finding ? `Improve: ${finding.title}` : `Idea ${i + 1}`,
        description: finding?.description ?? "Generated from research insights",
        rationale: finding ? `Based on research: ${finding.title}` : "",
        sourceReferences: finding?.sourceUrl ? [finding.sourceUrl] : [],
        impactScore: Math.round(40 + Math.random() * 50),
        feasibilityScore: Math.round(40 + Math.random() * 50),
        complexityEstimate: "medium",
        category: finding?.category ?? "general",
        status: "active",
        duplicateAnnotated: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await upsertIdea(ctx, idea);
      created.push(idea);
    }
    return {
      content: `Generated ${created.length} ideas:\n${created.map((i) => ` - ${i.title} (impact: ${i.impactScore})`).join("\n")}`,
    };
  });
}

// ─── JOB HANDLERS ──────────────────────────────────────────────────────────────
function registerJobHandlers(ctx: PluginContext) {

  ctx.jobs.register(JOB_KEYS.autopilotSweep, async (_job: PluginJobContext) => {
    ctx.logger.info("Autopilot sweep job running");

    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((e) => e.data as unknown as AutopilotProject)
      .filter((ap) => ap.enabled && !ap.paused);

    for (const ap of enabledProjects) {
      try {
        await checkBudgetAndPauseIfNeeded(ctx, ap.companyId, ap.projectId);
        await generateBudgetAlertDigest(ctx, ap.companyId, ap.projectId);
        await generateStuckRunDigest(ctx, ap.companyId, ap.projectId);
      } catch (err) {
        ctx.logger.error(`Error in sweep for project ${ap.projectId}: ${err}`);
      }
    }
  });

  ctx.jobs.register(JOB_KEYS.maybePoolResurface, async (_job: PluginJobContext) => {
    ctx.logger.info("Maybe pool resurface job running");

    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((e) => e.data as unknown as AutopilotProject)
      .filter((ap) => ap.enabled);

    for (const ap of enabledProjects) {
      try {
        const resurfaceDays = parsePositiveInt(ap.maybePoolResurfaceDays ?? 14, 14);
        const threshold = daysAgo(resurfaceDays);

        const maybeIdeas = await listMaybePoolIdeas(ctx, ap.companyId, ap.projectId);
        for (const idea of maybeIdeas) {
          if (new Date(idea.updatedAt) <= new Date(threshold)) {
            await upsertIdea(ctx, { ...idea, status: "active", updatedAt: nowIso() });
            await ctx.activity.log({
              companyId: ap.companyId,
              message: `Idea resurfaced: ${idea.title.slice(0, 60)}`,
              entityType: "idea",
              entityId: idea.ideaId,
            });
          }
        }
      } catch (err) {
        ctx.logger.error(`Error in maybe pool resurface for project ${ap.projectId}: ${err}`);
      }
    }
  });

  ctx.jobs.register(JOB_KEYS.deliveryRunMonitor, async (_job: PluginJobContext) => {
    ctx.logger.info("Delivery run monitor job running");

    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((e) => e.data as unknown as AutopilotProject)
      .filter((ap) => ap.enabled && !ap.paused);

    for (const ap of enabledProjects) {
      try {
        const stuckRuns = await listStuckRuns(ctx, ap.companyId, ap.projectId);
        if (stuckRuns.length > 0) {
          await ctx.activity.log({
            companyId: ap.companyId,
            message: `${stuckRuns.length} stuck delivery run(s) detected`,
            entityType: "delivery-run",
          });
        }
      } catch (err) {
        ctx.logger.error(`Error in delivery monitor for project ${ap.projectId}: ${err}`);
      }
    }
  });
}

// ─── Inline helpers for job handlers ─────────────────────────────────────────
// (Avoid ctx.actions.call — call the logic directly)
async function checkBudgetAndPauseIfNeeded(ctx: PluginContext, companyId: string, projectId: string) {
  const budget = await getCompanyBudget(ctx, companyId);
  const autopilot = await getAutopilotProject(ctx, companyId, projectId);
  if (!autopilot) return;

  if (budget && budget.autopilotUsedMinutes >= budget.autopilotBudgetMinutes) {
    await upsertAutopilotProject(ctx, { ...autopilot, paused: true, pauseReason: "Budget exhausted", updatedAt: nowIso() });
  }
}

async function generateBudgetAlertDigest(ctx: PluginContext, companyId: string, projectId: string) {
  const budget = await getCompanyBudget(ctx, companyId);
  if (!budget) return;
  const usagePct = Math.round((budget.autopilotUsedMinutes / budget.autopilotBudgetMinutes) * 100);
  if (usagePct < 80) return;

  const digest: Digest = {
    digestId: newId(),
    companyId,
    projectId,
    digestType: "budget_alert",
    title: `Autopilot budget at ${usagePct}%`,
    summary: `Autopilot has used ${budget.autopilotUsedMinutes}/${budget.autopilotBudgetMinutes} minutes`,
    details: [],
    priority: usagePct >= 95 ? "critical" : "high",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    relatedBudgetId: budget.budgetId,
    createdAt: nowIso(),
  };
  await upsertDigest(ctx, digest);
}

async function generateStuckRunDigest(ctx: PluginContext, companyId: string, projectId: string) {
  const stuckRuns = await listStuckRuns(ctx, companyId, projectId);
  if (stuckRuns.length === 0) return;

  const digest: Digest = {
    digestId: newId(),
    companyId,
    projectId,
    digestType: "stuck_run",
    title: `${stuckRuns.length} delivery run(s) may be stuck`,
    summary: `Runs not updated in over 60 minutes: ${stuckRuns.map((r) => r.runId.slice(0, 8)).join(", ")}`,
    details: stuckRuns.map((r) => `${r.runId}: ${r.title} (status: ${r.status})`),
    priority: "high",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    relatedRunId: stuckRuns[0]?.runId,
    createdAt: nowIso(),
  };
  await upsertDigest(ctx, digest);
}
