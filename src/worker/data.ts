import type { PluginContext } from "@paperclipai/plugin-sdk";
import { DATA_KEYS } from "../constants.js";
import type { IdeaStatus } from "../constants.js";
import type { AutopilotProject } from "../types.js";
import {
  getActiveWorkspaceLease,
  getLatestProductProgram,
  getPlanningArtifact,
  listDeliveryRuns,
  listPlanningArtifacts,
  listProductLocks,
  listProductProgramRevisions,
  listResearchCycles,
  listSwipeEvents,
} from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import { buildAutopilotOverview } from "../services/overview.js";

export function registerDataHandlers(ctx: PluginContext) {
  const repo = createAutopilotRepository(ctx);

  ctx.data.register(DATA_KEYS.autopilotProject, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await repo.getAutopilotProject(companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.autopilotProjects, async (args) => {
    const { companyId } = args as { companyId?: string };
    return await repo.listAutopilotProjects(companyId) as unknown as AutopilotProject[];
  });

  ctx.data.register("autopilot-overview", async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    const [project, ideas, maybeIdeas, runs, swipes, budget] = await Promise.all([
      repo.getAutopilotProject(companyId, projectId),
      repo.listIdeas(companyId, projectId),
      repo.listMaybePoolIdeas(companyId, projectId),
      listDeliveryRuns(ctx, companyId, projectId),
      listSwipeEvents(ctx, companyId, projectId, 50),
      repo.getCompanyBudget(companyId),
    ]);
    return buildAutopilotOverview({ project, ideas, maybeIdeas, runs, swipes, budget });
  });

  ctx.data.register(DATA_KEYS.productProgramRevision, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await getLatestProductProgram(ctx, companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.productProgramRevisions, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listProductProgramRevisions(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.researchCycle, async (args) => {
    const { companyId, projectId, cycleId } = args as { companyId: string; projectId: string; cycleId: string };
    const cycles = await listResearchCycles(ctx, companyId, projectId);
    return cycles.find((cycle) => cycle.cycleId === cycleId) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.researchCycles, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId?: string };
    return await listResearchCycles(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.researchFindings, async (args) => {
    const { companyId, projectId, cycleId } = args as { companyId: string; projectId: string; cycleId?: string };
    return await repo.listResearchFindings(companyId, projectId, cycleId);
  });

  ctx.data.register(DATA_KEYS.idea, async (args) => {
    const { companyId, projectId, ideaId } = args as { companyId: string; projectId: string; ideaId: string };
    return (await repo.getIdea(companyId, projectId, ideaId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.ideas, async (args) => {
    const { companyId, projectId, status } = args as { companyId: string; projectId: string; status?: IdeaStatus };
    return await repo.listIdeas(companyId, projectId, status);
  });

  ctx.data.register(DATA_KEYS.maybePoolIdeas, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await repo.listMaybePoolIdeas(companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.swipeEvent, async (args) => {
    const { companyId, projectId, swipeId } = args as { companyId: string; projectId: string; swipeId: string };
    const events = await listSwipeEvents(ctx, companyId, projectId, 100);
    return events.find((event) => event.swipeId === swipeId) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.swipeEvents, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listSwipeEvents(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.preferenceProfile, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return (await repo.getPreferenceProfile(companyId, projectId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.planningArtifact, async (args) => {
    const { companyId, projectId, artifactId } = args as { companyId: string; projectId: string; artifactId: string };
    return (await getPlanningArtifact(ctx, companyId, projectId, artifactId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.planningArtifacts, async (args) => {
    const { companyId, projectId, ideaId } = args as { companyId: string; projectId: string; ideaId?: string };
    return await listPlanningArtifacts(ctx, companyId, projectId, ideaId);
  });

  ctx.data.register(DATA_KEYS.deliveryRun, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId: string };
    return (await repo.getDeliveryRun(companyId, projectId, runId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.deliveryRuns, async (args) => {
    const { companyId, projectId, status } = args as { companyId: string; projectId: string; status?: string };
    return await listDeliveryRuns(ctx, companyId, projectId, status);
  });

  ctx.data.register(DATA_KEYS.workspaceLease, async (args) => {
    const { projectId, runId } = args as { projectId: string; runId: string };
    return (await getActiveWorkspaceLease(ctx, projectId, runId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.companyBudget, async (args) => {
    const { companyId } = args as { companyId: string };
    return (await repo.getCompanyBudget(companyId)) ?? undefined;
  });

  ctx.data.register(DATA_KEYS.convoyTasks, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await repo.listConvoyTasks(companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.checkpoints, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await repo.listCheckpoints(companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.productLocks, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await listProductLocks(ctx, companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.operatorInterventions, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await repo.listOperatorInterventions(companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.learnerSummaries, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await repo.listLearnerSummaries(companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.knowledgeEntries, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId: string };
    return await repo.listKnowledgeEntries(companyId, projectId);
  });

  ctx.data.register(DATA_KEYS.digests, async (args) => {
    const { companyId, projectId } = args as { companyId: string; projectId?: string };
    return projectId ? await repo.listDigests(companyId, projectId) : [];
  });

  ctx.data.register(DATA_KEYS.releaseHealthChecks, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await repo.listReleaseHealthChecks(companyId, projectId, runId);
  });

  ctx.data.register(DATA_KEYS.rollbackActions, async (args) => {
    const { companyId, projectId, runId } = args as { companyId: string; projectId: string; runId?: string };
    return await repo.listRollbackActions(companyId, projectId, runId);
  });
}
