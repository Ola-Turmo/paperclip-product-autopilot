import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";
import { TOOL_KEYS } from "../constants.js";
import type { SwipeDecision } from "../constants.js";
import type { Idea, ResearchCycle } from "../types.js";
import {
  findDuplicateIdea,
  listAutopilotProjectEntities,
  listIdeas,
  listResearchFindings,
  upsertIdea,
  upsertResearchCycle,
} from "../helpers.js";
import { newId, nowIso } from "../helpers.js";
import { processSwipeDecision } from "../services/orchestration.js";

function isSwipeDecision(v: unknown): v is SwipeDecision {
  return v === "pass" || v === "maybe" || v === "yes" || v === "now";
}

function parsePositiveInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function registerToolHandlers(ctx: PluginContext) {
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
    const projects = entities.map((entity) => entity.data);
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
    const [findings] = await Promise.all([
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
      content: `Generated ${created.length} ideas:\n${created.map((idea) => ` - ${idea.title} (impact: ${idea.impactScore})`).join("\n")}`,
    };
  });
}
