import type { PluginContext, PluginJobContext } from "@paperclipai/plugin-sdk";
import { JOB_KEYS } from "../constants.js";
import { nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { createBudgetAlertDigest, createStuckRunDigest } from "../services/orchestration.js";
import { shouldPauseForBudget } from "../services/policy.js";

async function checkBudgetAndPauseIfNeeded(ctx: PluginContext, companyId: string, projectId: string) {
  const repo = createAutopilotRepository(ctx);
  const budget = await repo.getCompanyBudget(companyId);
  const autopilot = await repo.getAutopilotProject(companyId, projectId);
  if (!autopilot) return;
  if (shouldPauseForBudget(autopilot, budget)) {
    await repo.upsertAutopilotProject({
      ...autopilot,
      paused: true,
      pauseReason: "Budget exhausted",
      updatedAt: nowIso(),
    });
  }
}

export function registerSweepJobHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

  ctx.jobs.register(JOB_KEYS.autopilotSweep, async (_job: PluginJobContext) => {
    ctx.logger.info("Autopilot sweep job running");
    const enabledProjects = (await repo.listAutopilotProjects())
      .filter((project) => project.enabled && !project.paused);

    for (const project of enabledProjects) {
      try {
        await checkBudgetAndPauseIfNeeded(ctx, project.companyId, project.projectId);
        await createBudgetAlertDigest(ctx, project.companyId, project.projectId);
        await createStuckRunDigest(ctx, project.companyId, project.projectId);
      } catch (error) {
        ctx.logger.error(`Error in sweep for project ${project.projectId}: ${error}`);
      }
    }
  });
}
