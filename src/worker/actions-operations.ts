import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, type KnowledgeType } from "../constants.js";
import type { DigestStatus } from "../constants.js";
import type {
  Digest,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
} from "../types.js";
import { newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { recordAutopilotEvent } from "../services/observability.js";
import {
  createBudgetAlertDigest,
  createStuckRunDigest,
} from "../services/orchestration.js";
import { transitionDigest } from "../services/state-machines.js";
import { requireCompanyAndProject } from "./action-utils.js";

export function registerOperationsActionHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

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
    await repo.upsertOperatorIntervention(intervention);
    await recordAutopilotEvent(ctx, "operatorInterventionCreated", a.companyId, {
      projectId: a.projectId,
      runId: a.runId,
      interventionType: intervention.interventionType,
    });
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
    await repo.upsertOperatorIntervention(intervention);
    await recordAutopilotEvent(ctx, "operatorInterventionCreated", a.companyId, {
      projectId: a.projectId,
      runId: a.runId,
      interventionType: intervention.interventionType,
    });
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
    await repo.upsertOperatorIntervention(intervention);
    await recordAutopilotEvent(ctx, "operatorInterventionCreated", a.companyId, {
      projectId: a.projectId,
      runId: a.runId,
      interventionType: intervention.interventionType,
    });
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
    await repo.upsertLearnerSummary(summary);
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
    await repo.upsertKnowledgeEntry(entry);
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
    await repo.upsertDigest(digest);
    return digest;
  });

  ctx.actions.register(ACTION_KEYS.dismissDigest, async (args) => {
    const a = args as { companyId: string; projectId: string; digestId: string; status?: DigestStatus };
    const digests = await repo.listDigests(a.companyId, a.projectId);
    const digest = digests.find((candidate) => candidate.digestId === a.digestId);
    if (!digest) throw new Error("Digest not found");
    const nextStatus = a.status ?? "dismissed";
    const updated = transitionDigest(digest, nextStatus, nowIso());
    await repo.upsertDigest(updated);
    if (nextStatus === "dismissed") {
      await recordAutopilotEvent(ctx, "digestDismissed", a.companyId, {
        projectId: a.projectId,
        digestId: a.digestId,
        digestType: digest.digestType,
      });
    }
    return updated;
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
    return await repo.listStuckRuns(resolved.companyId, resolved.projectId);
  });
}
