import type { PluginContext } from "@paperclipai/plugin-sdk";
import { registerIdeaToolHandlers } from "./tools-ideas.js";
import { registerProjectToolHandlers } from "./tools-projects.js";
import { registerResearchToolHandlers } from "./tools-research.js";

export function registerToolHandlers(ctx: PluginContext) {
  registerProjectToolHandlers(ctx);
  registerIdeaToolHandlers(ctx);
  registerResearchToolHandlers(ctx);
}
