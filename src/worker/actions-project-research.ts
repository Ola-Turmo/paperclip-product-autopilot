import type { PluginContext } from "@paperclipai/plugin-sdk";
import {
  ACTION_KEYS,
  type IdeaStatus,
  type SwipeDecision,
} from "../constants.js";
import type {
  AutopilotProject,
  Idea,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
} from "../types.js";
import {
  newId,
  nowIso,
} from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { recordAutopilotDurationMetric, recordAutopilotEvent } from "../services/observability.js";
import { buildResearchCycleSnapshot, createResearchFindingRecord } from "../services/research.js";
import { processSwipeDecision } from "../services/orchestration.js";
import {
  isNonEmptyString,
  isSwipeDecision,
  parseAutomationTier,
  parsePositiveInt,
  requireCompanyAndProject,
} from "./action-utils.js";
import { transitionIdeaStatus } from "../services/state-machines.js";

export function registerProjectResearchActionHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);
  ctx.actions.register(ACTION_KEYS.saveAutopilotProject, async (args) => {
    const a = args as Partial<AutopilotProject> & { companyId: string; projectId: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");

    const existing = await repo.getAutopilotProject(a.companyId, a.projectId);
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
    await repo.upsertAutopilotProject(autopilot);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Autopilot project ${existing ? "updated" : "created"} for project ${a.projectId.slice(0, 8)}`,
      entityType: "autopilot-project",
      entityId: autopilot.autopilotId,
    });
    return autopilot;
  });

  ctx.actions.register(ACTION_KEYS.enableAutopilot, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const existing = await repo.getAutopilotProject(resolved.companyId, resolved.projectId);
    if (!existing) throw new Error("Autopilot project not found");
    const updated = { ...existing, enabled: true, paused: false, updatedAt: nowIso() };
    await repo.upsertAutopilotProject(updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.disableAutopilot, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    const existing = await repo.getAutopilotProject(resolved.companyId, resolved.projectId);
    if (!existing) throw new Error("Autopilot project not found");
    const updated = { ...existing, enabled: false, updatedAt: nowIso() };
    await repo.upsertAutopilotProject(updated);
    return updated;
  });

  ctx.actions.register(ACTION_KEYS.createProductProgramRevision, async (args) => {
    const a = args as { companyId: string; projectId: string; content: string };
    if (!isNonEmptyString(a.companyId)) throw new Error("companyId required");
    if (!isNonEmptyString(a.projectId)) throw new Error("projectId required");
    if (!isNonEmptyString(a.content)) throw new Error("content required");

    const existing = await repo.getLatestProductProgram(a.companyId, a.projectId);
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
    await repo.upsertProductProgramRevision(revision);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Product Program v${version} created for project ${a.projectId.slice(0, 8)}`,
      entityType: "product-program-revision",
      entityId: revision.revisionId,
    });
    return revision;
  });

  ctx.actions.register(ACTION_KEYS.getLatestProductProgram, async (args) => {
    const resolved = requireCompanyAndProject(args);
    if (typeof resolved === "string") throw new Error(resolved);
    return (await repo.getLatestProductProgram(resolved.companyId, resolved.projectId)) ?? undefined;
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
    await repo.upsertResearchCycle(cycle);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Research cycle started: ${cycle.query.slice(0, 60)}`,
      entityType: "research-cycle",
      entityId: cycle.cycleId,
    });
    await recordAutopilotEvent(ctx, "researchCycleStarted", a.companyId, {
      projectId: a.projectId,
      cycleId: cycle.cycleId,
    });
    return cycle;
  });

  ctx.actions.register(ACTION_KEYS.completeResearchCycle, async (args) => {
    const a = args as { companyId: string; projectId: string; cycleId: string; reportContent?: string };
    const cycles = await repo.listResearchCycles(a.companyId, a.projectId);
    const cycle = cycles.find((candidate) => candidate.cycleId === a.cycleId);
    if (!cycle) throw new Error("Research cycle not found");

    const findings = await repo.listResearchFindings(a.companyId, a.projectId, a.cycleId);
    const completedAt = nowIso();
    const updated: ResearchCycle = {
      ...cycle,
      status: "completed",
      reportContent: a.reportContent,
      findingsCount: findings.length,
      snapshot: buildResearchCycleSnapshot(findings, completedAt),
      completedAt,
    };
    await repo.upsertResearchCycle(updated);
    await recordAutopilotEvent(ctx, "researchCycleCompleted", a.companyId, {
      projectId: a.projectId,
      cycleId: a.cycleId,
      findingCount: String(findings.length),
    });
    await recordAutopilotDurationMetric(
      ctx,
      "research_cycle.duration_ms",
      a.companyId,
      Math.max(0, new Date(completedAt).getTime() - new Date(cycle.startedAt).getTime()),
      {
        projectId: a.projectId,
        cycleId: a.cycleId,
      },
    );
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
      evidenceText?: string;
      category?: ResearchFinding["category"];
    };
    const finding = createResearchFindingRecord({
      findingId: newId(),
      companyId: a.companyId,
      projectId: a.projectId,
      cycleId: a.cycleId,
      title: a.title,
      description: a.description,
      confidence: a.confidence ?? 0.7,
      sourceUrl: a.sourceUrl,
      sourceLabel: a.sourceLabel,
      evidenceText: a.evidenceText,
      category: a.category,
      createdAt: nowIso(),
    });
    const duplicate = await repo.findDuplicateResearchFinding(a.companyId, a.projectId, {
      findingId: finding.findingId,
      title: finding.title,
      description: finding.description,
      sourceUrl: finding.sourceUrl,
      sourceLabel: finding.sourceLabel,
      category: finding.category,
      topic: finding.topic,
      dedupeKey: finding.dedupeKey,
    });
    const persistedFinding: ResearchFinding = duplicate
      ? {
          ...finding,
          duplicateOfFindingId: duplicate.finding.findingId,
          duplicateAnnotated: true,
        }
      : finding;
    await repo.upsertResearchFinding(persistedFinding);
    await recordAutopilotEvent(ctx, "researchFindingAdded", a.companyId, {
      projectId: a.projectId,
      cycleId: a.cycleId,
      signalFamily: persistedFinding.signalFamily ?? "unknown",
      duplicateAnnotated: String(persistedFinding.duplicateAnnotated),
    });
    return {
      ...persistedFinding,
      duplicateSimilarity: duplicate?.similarity,
      duplicateReasons: duplicate?.reasons,
    };
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

    const duplicate = await repo.findDuplicateIdea(a.companyId, a.projectId, a.title, a.description ?? "");
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
    await repo.upsertIdea(idea);
    await ctx.activity.log({
      companyId: a.companyId,
      message: `Idea created: ${a.title.slice(0, 60)}`,
      entityType: "idea",
      entityId: idea.ideaId,
    });
    await recordAutopilotEvent(ctx, "ideaCreated", a.companyId, {
      projectId: a.projectId,
      ideaId: idea.ideaId,
      duplicateAnnotated: String(idea.duplicateAnnotated),
    });
    return { ...idea, duplicateSimilarity: duplicate?.similarity };
  });

  ctx.actions.register(ACTION_KEYS.updateIdea, async (args) => {
    const a = args as { companyId: string; projectId: string; ideaId: string; status?: IdeaStatus };
    const idea = await repo.getIdea(a.companyId, a.projectId, a.ideaId);
    if (!idea) throw new Error("Idea not found");
    const updated: Idea = a.status
      ? transitionIdeaStatus(idea, a.status, nowIso())
      : { ...idea, updatedAt: nowIso() };
    await repo.upsertIdea(updated);
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
}
