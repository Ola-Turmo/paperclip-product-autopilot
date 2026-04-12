import type { PluginContext, PluginJobContext } from "@paperclipai/plugin-sdk";
import { JOB_KEYS } from "../constants.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";

export function registerMonitorJobHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

  ctx.jobs.register(JOB_KEYS.deliveryRunMonitor, async (_job: PluginJobContext) => {
    ctx.logger.info("Delivery run monitor job running");
    const enabledProjects = (await repo.listAutopilotProjects())
      .filter((project) => project.enabled && !project.paused);

    for (const project of enabledProjects) {
      try {
        const stuckRuns = await repo.listStuckRuns(project.companyId, project.projectId);
        if (stuckRuns.length > 0) {
          await ctx.activity.log({
            companyId: project.companyId,
            message: `${stuckRuns.length} stuck delivery run(s) detected`,
            entityType: "delivery-run",
          });
        }
      } catch (error) {
        ctx.logger.error(`Error in delivery monitor for project ${project.projectId}: ${error}`);
      }
    }
  });
}
