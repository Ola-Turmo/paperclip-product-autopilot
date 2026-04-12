import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";
import { TOOL_KEYS } from "../constants.js";
import type { ResearchCycle } from "../types.js";
import { newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";

export function registerResearchToolHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

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
    await repo.upsertResearchCycle(cycle);
    return { content: `Research cycle started: ${cycle.cycleId}\nQuery: ${cycle.query}` };
  });
}
