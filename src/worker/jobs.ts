import type { PluginContext, PluginJobContext } from "@paperclipai/plugin-sdk";
import { JOB_KEYS } from "../constants.js";
import type { AutopilotProject } from "../types.js";
import {
  getAutopilotProject,
  listAutopilotProjectEntities,
  listMaybePoolIdeas,
  listStuckRuns,
  upsertAutopilotProject,
  upsertIdea,
} from "../helpers.js";
import { daysAgo, nowIso } from "../helpers.js";
import { createBudgetAlertDigest, createStuckRunDigest } from "../services/orchestration.js";
import { shouldPauseForBudget } from "../services/policy.js";
import { shouldResurfaceIdea } from "../services/resurface.js";
import { getAutomationTier } from "../services/delivery.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";

function parsePositiveInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function checkBudgetAndPauseIfNeeded(ctx: PluginContext, companyId: string, projectId: string) {
  const repo = createAutopilotRepository(ctx);
  const budget = await repo.getCompanyBudget(companyId);
  const autopilot = await getAutopilotProject(ctx, companyId, projectId);
  if (!autopilot) return;
  if (shouldPauseForBudget(autopilot, budget)) {
    await upsertAutopilotProject(ctx, { ...autopilot, paused: true, pauseReason: "Budget exhausted", updatedAt: nowIso() });
  }
}

export function registerJobHandlers(ctx: PluginContext) {
  ctx.jobs.register(JOB_KEYS.autopilotSweep, async (_job: PluginJobContext) => {
    ctx.logger.info("Autopilot sweep job running");
    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((entity) => entity.data as unknown as AutopilotProject)
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

  ctx.jobs.register(JOB_KEYS.maybePoolResurface, async (_job: PluginJobContext) => {
    ctx.logger.info("Maybe pool resurface job running");
    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((entity) => entity.data as unknown as AutopilotProject)
      .filter((project) => project.enabled);

    for (const project of enabledProjects) {
      try {
        const resurfaceDays = parsePositiveInt(project.maybePoolResurfaceDays ?? 14, 14);
        const threshold = daysAgo(resurfaceDays);
        const maybeIdeas = await listMaybePoolIdeas(ctx, project.companyId, project.projectId);
        for (const idea of maybeIdeas) {
          if (shouldResurfaceIdea(idea, threshold)) {
            await upsertIdea(ctx, { ...idea, status: "active", updatedAt: nowIso() });
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

  ctx.jobs.register(JOB_KEYS.deliveryRunMonitor, async (_job: PluginJobContext) => {
    ctx.logger.info("Delivery run monitor job running");
    const allEntities = await listAutopilotProjectEntities(ctx);
    const enabledProjects = allEntities
      .map((entity) => entity.data as unknown as AutopilotProject)
      .filter((project) => project.enabled && !project.paused);

    for (const project of enabledProjects) {
      try {
        const stuckRuns = await listStuckRuns(ctx, project.companyId, project.projectId);
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
