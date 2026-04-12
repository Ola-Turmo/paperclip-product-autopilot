import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type KnowledgeType } from "../constants.js";
import type {
  Digest,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
} from "../types.js";
import {
  listStuckRuns,
  newId,
  nowIso,
  upsertDigest,
  upsertKnowledgeEntry,
  upsertLearnerSummary,
  upsertOperatorIntervention,
} from "../helpers.js";
import {
  createBudgetAlertDigest,
  createStuckRunDigest,
} from "../services/orchestration.js";
import { requireCompanyAndProject } from "./action-utils.js";

export function registerOperationsActionHandlers(ctx: PluginContext) {
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
