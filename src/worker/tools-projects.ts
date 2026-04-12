import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";
import { TOOL_KEYS } from "../constants.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";

export function registerProjectToolHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

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
    const projects = await repo.listAutopilotProjects(companyId);
    return { content: JSON.stringify(projects, null, 2) };
  });
}
