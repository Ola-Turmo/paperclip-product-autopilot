import type { PluginContext, PluginJobContext } from "@paperclipai/plugin-sdk";
import { JOB_KEYS } from "../constants.js";
import { nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { shouldResurfaceIdea } from "../services/resurface.js";
import { parsePositiveInt } from "./action-utils.js";

export function registerResurfaceJobHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

  ctx.jobs.register(JOB_KEYS.maybePoolResurface, async (_job: PluginJobContext) => {
    ctx.logger.info("Maybe pool resurface job running");
    const enabledProjects = (await repo.listAutopilotProjects())
      .filter((project) => project.enabled);

    for (const project of enabledProjects) {
      try {
        const resurfaceDays = parsePositiveInt(project.maybePoolResurfaceDays ?? 14, 14);
        const threshold = new Date(Date.now() - resurfaceDays * 24 * 60 * 60 * 1000).toISOString();
        const maybeIdeas = await repo.listMaybePoolIdeas(project.companyId, project.projectId);
        for (const idea of maybeIdeas) {
          if (shouldResurfaceIdea(idea, threshold)) {
            await repo.upsertIdea({ ...idea, status: "active", updatedAt: nowIso() });
            await ctx.activity.log({
              companyId: project.companyId,
              message: `Idea resurfaced: ${idea.title.slice(0, 60)}`,
              entityType: "idea",
              entityId: idea.ideaId,
            });
          }
        }
      } catch (error) {
        ctx.logger.error(`Error in maybe pool resurface for project ${project.projectId}: ${error}`);
      }
    }
  });
}
