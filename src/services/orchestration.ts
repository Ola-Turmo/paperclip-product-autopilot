import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { SwipeDecision } from "../constants.js";
import type { ReleaseHealthCheck } from "../types.js";
import { allocatePort, applySwipeToPreferenceProfile, generateBranchName, newId, nowIso } from "../helpers.js";
import { createAutopilotRepository } from "../repositories/autopilot.js";
import {
  buildPendingDeliveryRun,
  buildPlanningArtifact,
  buildProductLock,
  buildWorkspaceLease,
  shouldCreateDeliveryRun,
} from "./delivery.js";
import { evaluateDigestCreationPolicy } from "./digest-policy.js";
import {
  createBudgetAlertDigest as buildBudgetAlertDigest,
  createHealthCheckFailedDigest as buildHealthCheckFailedDigest,
  createStuckRunDigest as buildStuckRunDigest,
} from "./policy.js";
import {
  applySwipeToIdea,
  buildSwipeEvent,
  createEmptyPreferenceProfile,
} from "./swipe.js";

export async function processSwipeDecision(ctx: PluginContext, input: {
  companyId: string;
  projectId: string;
  ideaId: string;
  decision: SwipeDecision;
  note?: string;
}) {
  const repo = createAutopilotRepository(ctx);
  const idea = await repo.getIdea(input.companyId, input.projectId, input.ideaId);
  if (!idea) throw new Error("Idea not found");

  const timestamp = nowIso();
  const swipe = buildSwipeEvent({
    swipeId: newId(),
    companyId: input.companyId,
    projectId: input.projectId,
    ideaId: input.ideaId,
    decision: input.decision,
    note: input.note,
    createdAt: timestamp,
  });
  await repo.upsertSwipeEvent(swipe);

  const updatedIdea = applySwipeToIdea(idea, input.decision, timestamp);
  await repo.upsertIdea(updatedIdea);

  let profile = await repo.getPreferenceProfile(input.companyId, input.projectId);
  if (!profile) {
    profile = createEmptyPreferenceProfile({
      profileId: newId(),
      companyId: input.companyId,
      projectId: input.projectId,
      lastUpdated: timestamp,
    });
  }
  const updatedProfile = applySwipeToPreferenceProfile(profile, input.decision, idea);
  await repo.upsertPreferenceProfile(updatedProfile);

  const autopilot = await repo.getAutopilotProject(input.companyId, input.projectId);
  let planningArtifact;
  let deliveryRun;
  let workspaceLease;
  let productLock;

  if ((input.decision === "yes" || input.decision === "now") && autopilot?.enabled) {
    const artifactId = newId();
    planningArtifact = buildPlanningArtifact({
      artifactId,
      companyId: input.companyId,
      projectId: input.projectId,
      ideaId: input.ideaId,
      idea,
      automationTier: autopilot.automationTier,
      createdAt: timestamp,
    });
    await repo.upsertPlanningArtifact(planningArtifact);

    if (shouldCreateDeliveryRun({
      decision: input.decision,
      autopilotEnabled: autopilot.enabled,
      automationTier: autopilot.automationTier,
      approvalMode: planningArtifact.approvalMode,
    })) {
      const runId = newId();
      const branchName = generateBranchName(input.projectId, input.ideaId);
      const leasedPort = allocatePort();
      deliveryRun = buildPendingDeliveryRun({
        runId,
        companyId: input.companyId,
        projectId: input.projectId,
        ideaId: input.ideaId,
        artifactId,
        idea,
        automationTier: autopilot.automationTier,
        branchName,
        workspacePath: autopilot.workspaceId ?? "",
        leasedPort,
        createdAt: timestamp,
      });
      await repo.upsertDeliveryRun(deliveryRun);

      workspaceLease = buildWorkspaceLease({
        leaseId: newId(),
        companyId: input.companyId,
        projectId: input.projectId,
        runId,
        workspacePath: autopilot.workspaceId ?? "",
        branchName,
        leasedPort,
        gitRepoRoot: autopilot.repoUrl ?? null,
        createdAt: timestamp,
      });
      await repo.upsertWorkspaceLease(workspaceLease);

      productLock = buildProductLock({
        lockId: newId(),
        companyId: input.companyId,
        projectId: input.projectId,
        runId,
        branchName,
        acquiredAt: timestamp,
      });
      await repo.upsertProductLock(productLock);
    }
  }

  await ctx.activity.log({
    companyId: input.companyId,
    message: `Swipe ${input.decision} on idea: ${idea.title.slice(0, 60)}`,
    entityType: "swipe-event",
    entityId: swipe.swipeId,
  });

  return {
    swipe,
    idea: updatedIdea,
    profile: updatedProfile,
    planningArtifact,
    deliveryRun,
    workspaceLease,
    productLock,
  };
}

export async function createHealthCheckFailedDigest(
  ctx: PluginContext,
  input: {
    companyId: string;
    projectId: string;
    runId: string;
    check: Pick<ReleaseHealthCheck, "checkId" | "checkType" | "name" | "errorMessage" | "companyId" | "projectId" | "runId" | "createdAt">;
  },
) {
  const repo = createAutopilotRepository(ctx);
  const run = await repo.getDeliveryRun(input.companyId, input.projectId, input.runId);
  if (!run) return undefined;

  const digest = buildHealthCheckFailedDigest({
    digestId: newId(),
    companyId: input.companyId,
    projectId: input.projectId,
    run,
    check: input.check,
    createdAt: nowIso(),
  });
  const existingDigests = await repo.listDigests(input.companyId, input.projectId);
  const decision = evaluateDigestCreationPolicy(existingDigests, digest, digest.createdAt);
  if (!decision.shouldCreate) return undefined;

  await repo.upsertDigest(decision.candidate);
  return decision.candidate;
}

export async function createBudgetAlertDigest(ctx: PluginContext, companyId: string, projectId: string) {
  const repo = createAutopilotRepository(ctx);
  const budget = await repo.getCompanyBudget(companyId);
  if (!budget) return undefined;
  const digest = buildBudgetAlertDigest({
    digestId: newId(),
    companyId,
    projectId,
    budget,
    createdAt: nowIso(),
  });
  if (!digest) return undefined;

  const existingDigests = await repo.listDigests(companyId, projectId);
  const decision = evaluateDigestCreationPolicy(existingDigests, digest, digest.createdAt);
  if (!decision.shouldCreate) return undefined;

  await repo.upsertDigest(decision.candidate);
  return decision.candidate;
}

export async function createStuckRunDigest(ctx: PluginContext, companyId: string, projectId: string) {
  const repo = createAutopilotRepository(ctx);
  const stuckRuns = await repo.listStuckRuns(companyId, projectId);
  const digest = buildStuckRunDigest({
    digestId: newId(),
    companyId,
    projectId,
    stuckRuns,
    createdAt: nowIso(),
  });
  if (!digest) return undefined;

  const existingDigests = await repo.listDigests(companyId, projectId);
  const decision = evaluateDigestCreationPolicy(existingDigests, digest, digest.createdAt);
  if (!decision.shouldCreate) return undefined;

  await repo.upsertDigest(decision.candidate);
  return decision.candidate;
}
