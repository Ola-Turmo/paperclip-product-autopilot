import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";
import { TOOL_KEYS } from "../constants.js";
import type { SwipeDecision } from "../constants.js";
import type { Idea } from "../types.js";
import { newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { buildIdeaDraftFromFinding, rankFindingsForIdeation } from "../services/ideation.js";
import { processSwipeDecision } from "../services/orchestration.js";
import { buildOutcomePreferenceSignals } from "../services/preference-learning.js";
import { parsePositiveInt } from "./action-utils.js";

function isSwipeDecision(value: unknown): value is SwipeDecision {
  return value === "pass" || value === "maybe" || value === "yes" || value === "now";
}

export function registerIdeaToolHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

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
    const duplicate = await repo.findDuplicateIdea(a.companyId, a.projectId, a.title, a.description ?? "", undefined, {
      sourceReferences: a.sourceReferences,
    });
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
      duplicateOfIdeaId: duplicate?.idea.ideaId,
      duplicateAnnotated: !!duplicate,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await repo.upsertIdea(idea);
    return {
      content: `Idea created: ${idea.ideaId}\nTitle: ${idea.title}\nDuplicate annotated: ${idea.duplicateAnnotated}${duplicate ? `\nDuplicate reasons: ${duplicate.reasons.join(", ")}` : ""}`,
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
    const ideas = await repo.listIdeas(companyId, projectId, "active");
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
    try {
      const result = await processSwipeDecision(ctx, a);
      const extras = [
        result.planningArtifact ? `Planning artifact: ${result.planningArtifact.artifactId}` : undefined,
        result.deliveryRun ? `Delivery run: ${result.deliveryRun.runId}` : undefined,
      ].filter(Boolean);
      return {
        content: [
          `Swipe recorded: ${a.decision}`,
          `Idea status: ${result.idea.status}`,
          ...extras,
        ].join("\n"),
      };
    } catch (error) {
      return { content: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
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
    const [findings, profile, historicalIdeas, runs, checks, rollbacks] = await Promise.all([
      repo.listResearchFindings(a.companyId, a.projectId),
      repo.getPreferenceProfile(a.companyId, a.projectId),
      repo.listIdeas(a.companyId, a.projectId),
      repo.listDeliveryRuns(a.companyId, a.projectId),
      repo.listReleaseHealthChecks(a.companyId, a.projectId),
      repo.listRollbackActions(a.companyId, a.projectId),
    ]);
    const outcomeSignals = buildOutcomePreferenceSignals({
      ideas: historicalIdeas,
      runs,
      healthChecks: checks,
      rollbacks,
    });
    const rankedFindings = rankFindingsForIdeation(findings, profile, outcomeSignals);
    const created: Idea[] = [];
    const seenDuplicateIds = new Set<string>();

    for (const finding of rankedFindings) {
      if (created.length >= count) break;
      const idea = buildIdeaDraftFromFinding({
        finding,
        companyId: a.companyId,
        projectId: a.projectId,
        ideaId: newId(),
        createdAt: nowIso(),
        profile,
        outcomeSignals,
      });
      const duplicate = await repo.findDuplicateIdea(a.companyId, a.projectId, idea.title, idea.description, undefined, {
        category: idea.category,
        tags: idea.tags,
        sourceReferences: idea.sourceReferences,
      });
      if (duplicate) {
        if (seenDuplicateIds.has(duplicate.idea.ideaId)) {
          continue;
        }
        seenDuplicateIds.add(duplicate.idea.ideaId);
        idea.duplicateOfIdeaId = duplicate.idea.ideaId;
        idea.duplicateAnnotated = true;
      }
      await repo.upsertIdea(idea);
      created.push(idea);
    }

    if (created.length === 0 && count > 0) {
      const fallback: Idea = {
        ideaId: newId(),
        companyId: a.companyId,
        projectId: a.projectId,
        title: "Improve product experience",
        description: "Generated without current research findings",
        rationale: "Fallback idea because no ranked research findings were available",
        sourceReferences: [],
        impactScore: 50,
        feasibilityScore: 50,
        complexityEstimate: "medium",
        category: "general",
        tags: [],
        status: "active",
        duplicateAnnotated: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await repo.upsertIdea(fallback);
      created.push(fallback);
    }

    return {
      content: `Generated ${created.length} ideas:\n${created.map((idea) => ` - ${idea.title} (impact: ${idea.impactScore}, feasibility: ${idea.feasibilityScore})`).join("\n")}`,
    };
  });
}
