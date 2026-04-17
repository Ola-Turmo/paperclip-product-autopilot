import { beforeEach, describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { ACTION_KEYS, ENTITY_TYPES, JOB_KEYS, TOOL_KEYS } from "../src/constants.js";
import { upsertAutopilotProject, upsertCompanyBudget, upsertDeliveryRun, upsertDigest, upsertIdea, upsertPreferenceProfile, upsertResearchCycle, upsertResearchFinding } from "../src/helpers.js";
import type { AutopilotProject, CompanyBudget, DeliveryRun, Idea, PreferenceProfile, ResearchCycle, ResearchFinding } from "../src/types.js";

function createProject(overrides: Partial<AutopilotProject> = {}): AutopilotProject {
  return {
    autopilotId: "ap-1",
    companyId: "company-1",
    projectId: "project-1",
    enabled: true,
    automationTier: "semiauto",
    budgetMinutes: 120,
    workspaceId: "/tmp/project",
    repoUrl: "https://github.com/example/repo",
    paused: false,
    autoCreateIssues: true,
    autoCreatePrs: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding copy",
    description: "Rewrite the first-run experience",
    rationale: "Users drop after first launch",
    sourceReferences: [],
    impactScore: 80,
    feasibilityScore: 75,
    technicalApproach: "Refine onboarding UX",
    status: "active",
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createBudget(overrides: Partial<CompanyBudget> = {}): CompanyBudget {
  return {
    budgetId: "budget-1",
    companyId: "company-1",
    totalBudgetMinutes: 500,
    usedBudgetMinutes: 200,
    autopilotBudgetMinutes: 100,
    autopilotUsedMinutes: 100,
    paused: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createPreferenceProfile(overrides: Partial<PreferenceProfile> = {}): PreferenceProfile {
  return {
    profileId: "profile-1",
    companyId: "company-1",
    projectId: "project-1",
    passCount: 0,
    maybeCount: 1,
    yesCount: 2,
    nowCount: 2,
    totalSwipes: 5,
    categoryPreferences: {
      user_feedback: { pass: 0, maybe: 1, yes: 2, now: 2 },
    },
    tagPreferences: {},
    complexityPreferences: {
      low: { pass: 0, maybe: 0, yes: 1, now: 1 },
      medium: { pass: 0, maybe: 1, yes: 1, now: 1 },
    },
    executionModePreferences: {
      simple: { pass: 0, maybe: 1, yes: 2, now: 2 },
      convoy: { pass: 0, maybe: 0, yes: 0, now: 0 },
    },
    avgApprovedScore: 78,
    avgRejectedScore: 32,
    lastUpdated: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createResearchCycle(overrides: Partial<ResearchCycle> = {}): ResearchCycle {
  return {
    cycleId: "cycle-1",
    companyId: "company-1",
    projectId: "project-1",
    status: "running",
    query: "Research product opportunities",
    findingsCount: 0,
    startedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "company-1",
    projectId: "project-1",
    cycleId: "cycle-1",
    title: "Improve onboarding completion",
    description: "Users drop before activation",
    sourceUrl: "https://example.com/support",
    sourceLabel: "support-summary",
    sourceType: "support_ticket",
    ingestedAt: "2026-01-01T00:05:00.000Z",
    sourceDomain: "example.com",
    sourceScope: "customer",
    normalizedSourceKey: "support_ticket:example.com",
    category: "user_feedback",
    confidence: 0.9,
    signalFamily: "support",
    topic: "onboarding-completion",
    dedupeKey: "onboarding-completion|improve onboarding completion",
    sourceQualityScore: 76,
    freshnessScore: 90,
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRun(overrides: Partial<DeliveryRun> = {}): DeliveryRun {
  return {
    runId: "run-1",
    companyId: "company-1",
    projectId: "project-1",
    ideaId: "idea-1",
    artifactId: "artifact-1",
    title: "Improve onboarding copy",
    status: "running",
    automationTier: "semiauto",
    branchName: "autopilot/project1/idea1",
    workspacePath: "/tmp/project",
    leasedPort: 3000,
    commitSha: null,
    paused: false,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2025-12-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("worker integration", () => {
  let harness: ReturnType<typeof createTestHarness>;

  beforeEach(async () => {
    harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);
  });

  it("preserves existing project configuration on partial settings saves", async () => {
    const first = await harness.performAction<AutopilotProject>(ACTION_KEYS.saveAutopilotProject, {
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      automationTier: "semiauto",
      budgetMinutes: 180,
      repoUrl: "https://github.com/example/repo",
      workspaceId: "/tmp/project",
      liveUrl: "https://app.example.com",
      productType: "saas",
      agentId: "agent-123",
      paused: true,
      pauseReason: "Waiting for review",
      researchScheduleCron: "0 8 * * *",
      ideationScheduleCron: "0 9 * * *",
      maybePoolResurfaceDays: 21,
      maxIdeasPerCycle: 7,
      autoCreateIssues: true,
      autoCreatePrs: false,
    });

    const second = await harness.performAction<AutopilotProject>(ACTION_KEYS.saveAutopilotProject, {
      companyId: "company-1",
      projectId: "project-1",
      budgetMinutes: 240,
    });

    expect(first.autopilotId).toBe(second.autopilotId);
    expect(second.repoUrl).toBe("https://github.com/example/repo");
    expect(second.workspaceId).toBe("/tmp/project");
    expect(second.liveUrl).toBe("https://app.example.com");
    expect(second.productType).toBe("saas");
    expect(second.agentId).toBe("agent-123");
    expect(second.pauseReason).toBe("Waiting for review");
    expect(second.researchScheduleCron).toBe("0 8 * * *");
    expect(second.ideationScheduleCron).toBe("0 9 * * *");
    expect(second.maybePoolResurfaceDays).toBe(21);
    expect(second.maxIdeasPerCycle).toBe(7);
    expect(second.budgetMinutes).toBe(240);
  });

  it("records a swipe and creates planning plus delivery artifacts when autopilot is active", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea());

    const result = await harness.performAction<{
      planningArtifact?: { artifactId: string };
      deliveryRun?: { runId: string };
      idea: { status: string };
    }>(ACTION_KEYS.recordSwipe, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      decision: "now",
    });

    expect(result.idea.status).toBe("approved");
    expect(result.planningArtifact?.artifactId).toBeTruthy();
    expect(result.deliveryRun?.runId).toBeTruthy();

    const planningArtifacts = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.planningArtifact,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const deliveryRuns = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.deliveryRun,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const leases = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.workspaceLease,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(planningArtifacts).toHaveLength(1);
    expect(deliveryRuns).toHaveLength(1);
    expect(leases).toHaveLength(1);
    expect(harness.activity.at(-1)?.message).toContain("Swipe now");
  });

  it("creates and completes a delivery run while releasing workspace resources", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ status: "approved" }));

    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
    });

    const activeLeases = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.workspaceLease,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const activeLocks = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.productLock,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(activeLeases).toHaveLength(1);
    expect(activeLocks).toHaveLength(1);

    const completed = await harness.performAction<{ status: string }>(ACTION_KEYS.completeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      status: "completed",
      commitSha: "abc1234",
    });

    expect(completed.status).toBe("completed");

    const releasedLeases = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.workspaceLease,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const releasedLocks = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.productLock,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(releasedLeases[0]?.data.isActive).toBe(false);
    expect(releasedLocks[0]?.data.isActive).toBe(false);
  });

  it("cancels a delivery run and releases workspace resources", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-cancel", status: "approved" }));

    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-cancel",
      artifactId: "artifact-cancel",
    });

    const cancelled = await harness.performAction<{ status: string; cancellationReason: string }>(ACTION_KEYS.cancelDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      reason: "Operator stopped this run",
    });

    const leases = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.workspaceLease,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const locks = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.productLock,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Operator stopped this run");
    expect(leases.find((lease) => lease.data.runId === run.runId)?.data.isActive).toBe(false);
    expect(locks.find((lock) => lock.data.runId === run.runId)?.data.isActive).toBe(false);
  });

  it("requires a checkpoint or governed force-cancel for risky runs", async () => {
    await upsertAutopilotProject(harness.ctx, createProject({ automationTier: "fullauto" }));
    await upsertIdea(
      harness.ctx,
      createIdea({
        ideaId: "idea-risky-cancel",
        status: "approved",
        complexityEstimate: "high",
      }),
    );

    const artifact = await harness.performAction<{
      artifactId: string;
      cancellationPolicy: string;
      checkpointRequired: boolean;
    }>(ACTION_KEYS.createPlanningArtifact, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-risky-cancel",
      executionMode: "convoy",
    });
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-risky-cancel",
      artifactId: artifact.artifactId,
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });

    expect(artifact.cancellationPolicy).toBe("checkpoint_or_acknowledged_force");
    expect(artifact.checkpointRequired).toBe(true);

    await expect(
      harness.performAction(ACTION_KEYS.cancelDeliveryRun, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        reason: "Stopping the run without a checkpoint",
      }),
    ).rejects.toThrow("checkpoint before cancellation");

    await expect(
      harness.performAction(ACTION_KEYS.cancelDeliveryRun, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        reason: "Emergency stop",
        force: true,
      }),
    ).rejects.toThrow("operator acknowledgment");

    const cancelled = await harness.performAction<{ status: string }>(ACTION_KEYS.cancelDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      reason: "Emergency stop after operator review",
      force: true,
      operatorAcknowledged: true,
    });

    expect(cancelled.status).toBe("cancelled");
  });

  it("resurfaces old maybe-pool ideas when the scheduled job runs", async () => {
    await upsertAutopilotProject(
      harness.ctx,
      createProject({ maybePoolResurfaceDays: 14 }),
    );
    await upsertIdea(
      harness.ctx,
      createIdea({
        ideaId: "idea-maybe",
        status: "maybe",
        updatedAt: "2025-12-01T00:00:00.000Z",
      }),
    );

    await harness.runJob(JOB_KEYS.maybePoolResurface);

    const ideas = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.idea,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(ideas[0]?.data.status).toBe("active");
    expect(harness.activity.at(-1)?.message).toContain("Idea resurfaced");
  });

  it("keeps tool-side swipe behavior in parity with the action path", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-tool" }));

    const toolResult = await harness.executeTool(TOOL_KEYS.recordSwipeDecision, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-tool",
      decision: "now",
    });

    const profiles = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.preferenceProfile,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const planningArtifacts = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.planningArtifact,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const runs = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.deliveryRun,
      scopeKind: "project",
      scopeId: "project-1",
    });

    expect(toolResult.content).toContain("Swipe recorded: now");
    expect(profiles).toHaveLength(1);
    expect(planningArtifacts).toHaveLength(1);
    expect(runs).toHaveLength(1);
  });

  it("deduplicates pending sweep digests across repeated job runs", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertCompanyBudget(harness.ctx, createBudget());
    await upsertDeliveryRun(harness.ctx, createRun());

    await harness.runJob(JOB_KEYS.autopilotSweep);
    await harness.runJob(JOB_KEYS.autopilotSweep);

    const digests = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const projects = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.autopilotProject,
      scopeKind: "project",
      scopeId: "project-1",
    });

    const digestTypes = digests.map((digest) => digest.data.digestType);
    expect(digestTypes.filter((type) => type === "budget_alert")).toHaveLength(1);
    expect(digestTypes.filter((type) => type === "stuck_run")).toHaveLength(1);
    expect(projects[0]?.data.paused).toBe(true);
  });

  it("suppresses dismissed digests during cooldown and reopens after cooldown", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertCompanyBudget(harness.ctx, createBudget());
    await upsertDeliveryRun(harness.ctx, createRun({ runId: "run-cooldown" }));

    await harness.runJob(JOB_KEYS.autopilotSweep);
    const digestsAfterFirstSweep = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const stuckDigest = digestsAfterFirstSweep.find((digest) => digest.data.digestType === "stuck_run");
    expect(stuckDigest).toBeTruthy();

    await harness.performAction(ACTION_KEYS.dismissDigest, {
      companyId: "company-1",
      projectId: "project-1",
      digestId: stuckDigest?.data.digestId,
    });
    await harness.runJob(JOB_KEYS.autopilotSweep);

    const digestsDuringCooldown = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    expect(digestsDuringCooldown.filter((digest) => digest.data.digestType === "stuck_run")).toHaveLength(1);

    await upsertDigest(harness.ctx, {
      ...stuckDigest?.data,
      status: "dismissed",
      dismissedAt: "2026-01-01T01:00:00.000Z",
      cooldownUntil: "2026-01-01T02:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    await harness.performAction(ACTION_KEYS.generateStuckRunDigest, {
      companyId: "company-1",
      projectId: "project-1",
    });

    const digestsAfterReopen = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const reopenedDigests = digestsAfterReopen.filter((digest) => digest.data.digestType === "stuck_run");
    expect(reopenedDigests).toHaveLength(2);
    expect(reopenedDigests.some((digest) => Number(digest.data.reopenCount ?? 0) > 0)).toBe(true);
    expect(reopenedDigests.some((digest) => Number(digest.data.escalationLevel ?? 0) > 0)).toBe(true);
  });

  it("emits metrics and telemetry for checkpoint, health-check, and rollback actions", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });

    const checkpoint = await harness.performAction<{ checkpointId: string }>(ACTION_KEYS.createCheckpoint, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      label: "Checkpoint A",
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });
    const rollback = await harness.performAction<{ rollbackId: string }>(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "restore_checkpoint",
      checkpointId: checkpoint.checkpointId,
    });
    await harness.performAction(ACTION_KEYS.updateRollbackStatus, {
      companyId: "company-1",
      projectId: "project-1",
      rollbackId: rollback.rollbackId,
      status: "completed",
    });

    expect(harness.metrics.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "checkpoint.created",
        "release_health.created",
        "release_health.updated",
        "rollback.triggered",
        "rollback.completed",
        "rollback.duration_ms",
        "rollback.recovery_time_ms",
        "rollback.checkpoint_age_ms",
      ]),
    );
    expect(harness.telemetry.map((entry) => entry.eventName)).toEqual(
      expect.arrayContaining([
        "checkpoint_created",
        "release_health_created",
        "release_health_updated",
        "rollback_triggered",
        "rollback.duration_ms.recorded",
        "rollback.recovery_time_ms.recorded",
        "rollback.checkpoint_age_ms.recorded",
      ]),
    );
  });

  it("rejects invalid delivery and rollback transitions", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ status: "active" }));

    await expect(
      harness.performAction(ACTION_KEYS.createDeliveryRun, {
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-1",
        artifactId: "artifact-1",
      }),
    ).rejects.toThrow("approved idea");

    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-2", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-2",
      artifactId: "artifact-2",
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });

    await expect(
      harness.performAction(ACTION_KEYS.triggerRollback, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        checkId: check.checkId,
        rollbackType: "restore_checkpoint",
        checkpointId: "checkpoint-missing",
      }),
    ).rejects.toThrow("failed health check");
  });

  it("rejects duplicate rollback requests for the same failed check", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-rollback", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-rollback",
      artifactId: "artifact-rollback",
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const checkpoint = await harness.performAction<{ checkpointId: string }>(ACTION_KEYS.createCheckpoint, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });

    await harness.performAction(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "restore_checkpoint",
      checkpointId: checkpoint.checkpointId,
    });

    await expect(
      harness.performAction(ACTION_KEYS.triggerRollback, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        checkId: check.checkId,
        rollbackType: "restore_checkpoint",
        checkpointId: checkpoint.checkpointId,
      }),
    ).rejects.toThrow("already pending");
  });

  it("rejects cyclic convoy decompositions", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());

    await expect(
      harness.performAction(ACTION_KEYS.decomposeIntoConvoyTasks, {
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-cycle",
        artifactId: "artifact-cycle",
        taskTitles: ["A", "B"],
        dependencies: [["1"], ["0"]],
      }),
    ).rejects.toThrow("cannot contain cycles");
  });

  it("enforces governance gates on risky planning and lock actions", async () => {
    await upsertAutopilotProject(harness.ctx, createProject({ automationTier: "semiauto" }));
    await upsertIdea(
      harness.ctx,
      createIdea({
        ideaId: "idea-governance",
        status: "approved",
        complexityEstimate: "high",
      }),
    );

    await expect(
      harness.performAction(ACTION_KEYS.createPlanningArtifact, {
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-governance",
        approvalMode: "auto_approve",
        executionMode: "simple",
      }),
    ).rejects.toThrow("fullauto mode");

    await expect(
      harness.performAction(ACTION_KEYS.acquireProductLock, {
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-merge-lock",
        lockType: "merge_lock",
        targetBranch: "main",
      }),
    ).rejects.toThrow("governance note");
  });

  it("requires explicit acknowledgment for full rollback", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-full-rollback", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-full-rollback",
      artifactId: "artifact-full-rollback",
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });

    await expect(
      harness.performAction(ACTION_KEYS.triggerRollback, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        checkId: check.checkId,
        rollbackType: "full_rollback",
      }),
    ).rejects.toThrow("operator acknowledgment");

    const rollback = await harness.performAction<{ rollbackType: string }>(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "full_rollback",
      governanceNote: "Customer-visible failure requires immediate rollback",
      operatorAcknowledged: true,
    });

    expect(rollback.rollbackType).toBe("full_rollback");
  });

  it("requires explicit acknowledgment for revert-commit rollback", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-revert-rollback", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-revert-rollback",
      artifactId: "artifact-revert-rollback",
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });

    await expect(
      harness.performAction(ACTION_KEYS.triggerRollback, {
        companyId: "company-1",
        projectId: "project-1",
        runId: run.runId,
        checkId: check.checkId,
        rollbackType: "revert_commit",
        targetCommitSha: "abc1234",
      }),
    ).rejects.toThrow("operator acknowledgment");

    const rollback = await harness.performAction<{ rollbackType: string; targetCommitSha?: string }>(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "revert_commit",
      targetCommitSha: "abc1234",
      governanceNote: "Reverting the latest commit to restore service",
      operatorAcknowledged: true,
    });

    expect(rollback.rollbackType).toBe("revert_commit");
    expect(rollback.targetCommitSha).toBe("abc1234");
  });

  it("auto-resolves rollback requests from failed checks to the latest checkpoint", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-auto-rollback", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-auto-rollback",
      artifactId: "artifact-auto-rollback",
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const checkpoint = await harness.performAction<{ checkpointId: string }>(ACTION_KEYS.createCheckpoint, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });

    const rollback = await harness.performAction<{ rollbackType: string; checkpointId?: string }>(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
    });

    expect(rollback.rollbackType).toBe("restore_checkpoint");
    expect(rollback.checkpointId).toBe(checkpoint.checkpointId);
  });

  it("closes rollback actions and pauses the run after a completed restore", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-rollback-close", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-rollback-close",
      artifactId: "artifact-rollback-close",
    });
    await harness.performAction(ACTION_KEYS.resumeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const checkpoint = await harness.performAction<{ checkpointId: string }>(ACTION_KEYS.createCheckpoint, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });
    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "boom",
    });
    const rollback = await harness.performAction<{ rollbackId: string }>(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "restore_checkpoint",
      checkpointId: checkpoint.checkpointId,
    });

    const completed = await harness.performAction<{ status: string; completedAt?: string }>(ACTION_KEYS.updateRollbackStatus, {
      companyId: "company-1",
      projectId: "project-1",
      rollbackId: rollback.rollbackId,
      status: "completed",
    });

    const runs = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.deliveryRun,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const summaries = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.learnerSummary,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const knowledgeEntries = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.knowledgeEntry,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const updatedRun = runs.find((entity) => entity.data.runId === run.runId)?.data as { status: string; pauseReason?: string };
    const summary = summaries.find((entity) => entity.data.runId === run.runId)?.data as {
      summaryText: string;
      keyLearnings: string[];
      sourceRollbackId?: string;
      sourceCheckId?: string;
      sourceCheckpointId?: string;
      sourceDigestId?: string;
    };
    const knowledge = knowledgeEntries.find((entity) => entity.data.sourceRunId === run.runId)?.data as {
      title: string;
      knowledgeType: string;
      sourceSummaryId?: string;
      sourceRollbackId?: string;
      sourceCheckId?: string;
      sourceCheckpointId?: string;
      sourceDigestId?: string;
    };

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
    expect(updatedRun.status).toBe("paused");
    expect(updatedRun.pauseReason).toContain("Rollback completed");
    expect(summary.summaryText).toContain("recovery time");
    expect(summary.keyLearnings.some((entry) => String(entry).includes("Failed check"))).toBe(true);
    expect(summary.sourceRollbackId).toBe(rollback.rollbackId);
    expect(summary.sourceCheckId).toBe(check.checkId);
    expect(summary.sourceCheckpointId).toBe(checkpoint.checkpointId);
    expect(summary.sourceDigestId).toBeTruthy();
    expect(knowledge.title).toContain("Recovery procedure");
    expect(knowledge.knowledgeType).toBe("procedure");
    expect(knowledge.sourceSummaryId).toBeTruthy();
    expect(knowledge.sourceRollbackId).toBe(rollback.rollbackId);
    expect(knowledge.sourceCheckId).toBe(check.checkId);
    expect(knowledge.sourceCheckpointId).toBe(checkpoint.checkpointId);
    expect(knowledge.sourceDigestId).toBe(summary.sourceDigestId);
  });

  it("creates a digest automatically when a release health check fails", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ ideaId: "idea-health-digest", status: "approved" }));
    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-health-digest",
      artifactId: "artifact-health-digest",
    });
    const check = await harness.performAction<{ checkId: string }>(ACTION_KEYS.createReleaseHealthCheck, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkType: "smoke_test",
      name: "Smoke",
    });

    await harness.performAction(ACTION_KEYS.updateReleaseHealthStatus, {
      companyId: "company-1",
      projectId: "project-1",
      checkId: check.checkId,
      status: "failed",
      errorMessage: "Homepage 500",
    });

    const digests = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const healthDigest = digests.find((digest) => digest.data.digestType === "health_check_failed");

    expect(healthDigest?.data.relatedRunId).toBe(run.runId);
    expect(healthDigest?.data.urgency).toBe("blocking");
  });

  it("requires governance to release a merge lock", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    const lock = await harness.performAction<{ lockId: string }>(ACTION_KEYS.acquireProductLock, {
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-merge-release",
      lockType: "merge_lock",
      targetBranch: "main",
      blockReason: "Holding the gate pending operator review",
    });

    expect(lock.lockId).toBeTruthy();

    await expect(
      harness.performAction(ACTION_KEYS.releaseProductLock, {
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-merge-release",
      }),
    ).rejects.toThrow("operator acknowledgment");

    const released = await harness.performAction<{ isActive: boolean; releasedAt: string }>(ACTION_KEYS.releaseProductLock, {
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-merge-release",
      governanceNote: "Deployment window cleared; releasing the gate",
      operatorAcknowledged: true,
    });

    expect(released.isActive).toBe(false);
    expect(released.releasedAt).toBeTruthy();
  });

  it("dismisses digests through the digest state machine", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertCompanyBudget(harness.ctx, createBudget());
    await upsertDeliveryRun(harness.ctx, createRun());

    await harness.runJob(JOB_KEYS.autopilotSweep);

    const digests = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const digestId = digests[0]?.data.digestId as string;

    const dismissed = await harness.performAction<{ status: string; dismissedAt: string }>(ACTION_KEYS.dismissDigest, {
      companyId: "company-1",
      projectId: "project-1",
      digestId,
    });

    expect(dismissed.status).toBe("dismissed");
    expect(dismissed.dismissedAt).toBeTruthy();
  });

  it("emits research, delivery, intervention, and digest taxonomy events", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertIdea(harness.ctx, createIdea({ status: "approved" }));

    const cycle = await harness.performAction<ResearchCycle>(ACTION_KEYS.startResearchCycle, {
      companyId: "company-1",
      projectId: "project-1",
      query: "Research onboarding issues",
    });
    await harness.performAction(ACTION_KEYS.addResearchFinding, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: cycle.cycleId,
      title: "Improve onboarding completion",
      description: "Users drop before activation",
      sourceUrl: "https://example.com/support",
      sourceLabel: "support-summary",
      sourceType: "support_ticket",
      sourceId: "ticket-123",
      sourceTimestamp: "2026-01-01T00:00:00.000Z",
      category: "user_feedback",
      confidence: 0.91,
      evidenceText: "Support tickets highlight onboarding confusion.",
    });
    await harness.performAction(ACTION_KEYS.completeResearchCycle, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: cycle.cycleId,
    });

    const run = await harness.performAction<{ runId: string }>(ACTION_KEYS.createDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
    });
    await harness.performAction(ACTION_KEYS.addOperatorNote, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      note: "Check rollout metrics",
    });
    await harness.performAction(ACTION_KEYS.completeDeliveryRun, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      status: "completed",
      commitSha: "abc1234",
    });

    await upsertCompanyBudget(harness.ctx, createBudget());
    await upsertDeliveryRun(harness.ctx, createRun({ runId: "run-stuck" }));
    await harness.runJob(JOB_KEYS.autopilotSweep);
    const digests = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.digest,
      scopeKind: "project",
      scopeId: "project-1",
    });
    await harness.performAction(ACTION_KEYS.dismissDigest, {
      companyId: "company-1",
      projectId: "project-1",
      digestId: digests[0]?.data.digestId,
    });

    expect(harness.metrics.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "research_cycle.started",
        "research_finding.added",
        "research_cycle.completed",
        "research_cycle.duration_ms",
        "delivery_run.created",
        "delivery_run.completed",
        "delivery_run.duration_ms",
        "operator_intervention.created",
        "digest.dismissed",
      ]),
    );
    expect(harness.telemetry.map((entry) => entry.eventName)).toEqual(
      expect.arrayContaining([
        "research_cycle_started",
        "research_finding_added",
        "research_cycle_completed",
        "delivery_run_created",
        "delivery_run_completed",
        "operator_intervention_created",
        "digest_dismissed",
      ]),
    );
  });

  it("generates ideas deterministically from ranked research findings", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertPreferenceProfile(harness.ctx, createPreferenceProfile());
    await upsertIdea(harness.ctx, createIdea({
      ideaId: "idea-history",
      category: "technical",
      tags: ["technical"],
      complexityEstimate: "low",
      status: "completed",
    }));
    await upsertDeliveryRun(harness.ctx, createRun({
      runId: "run-history",
      ideaId: "idea-history",
      status: "completed",
      completedAt: "2026-01-02T01:00:00.000Z",
      updatedAt: "2026-01-02T01:00:00.000Z",
    }));
    await upsertResearchCycle(harness.ctx, createResearchCycle());
    await upsertResearchFinding(harness.ctx, createFinding({ findingId: "finding-1", title: "Improve onboarding completion", category: "user_feedback", confidence: 0.92 }));
    await upsertResearchFinding(harness.ctx, createFinding({ findingId: "finding-2", title: "Investigate merge queue friction", category: "technical", confidence: 0.75 }));

    const toolResult = await harness.executeTool(TOOL_KEYS.generateIdeas, {
      companyId: "company-1",
      projectId: "project-1",
      count: 2,
    });

    const ideas = await harness.ctx.entities.list({
      entityType: ENTITY_TYPES.idea,
      scopeKind: "project",
      scopeId: "project-1",
    });
    const generatedIdea = ideas.find((entity) =>
      String(entity.data.title).includes("Improve onboarding completion"),
    );

    expect(toolResult.content).toContain("Generated 2 ideas");
    expect(generatedIdea?.data.title).toContain("Improve onboarding completion");
    expect(generatedIdea?.data.sourceReferences).toEqual(["https://example.com/support"]);
    expect(generatedIdea?.data.rationale).toContain("outcomeBoost=");
    expect(generatedIdea?.data.rankingExplanation?.provisionalExecutionMode).toBe("simple");
  });

  it("annotates duplicate research findings through the action path", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertResearchCycle(harness.ctx, createResearchCycle());

    const first = await harness.performAction<{ findingId: string; duplicateAnnotated: boolean }>(ACTION_KEYS.addResearchFinding, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: "cycle-1",
      title: "Improve onboarding completion",
      description: "Users drop before activation",
      sourceUrl: "https://example.com/support/1",
      sourceLabel: "support-summary",
      category: "user_feedback",
      confidence: 0.91,
      evidenceText: "Multiple users reported confusion in the signup flow.",
    });

    const second = await harness.performAction<{ duplicateAnnotated: boolean; duplicateOfFindingId?: string }>(ACTION_KEYS.addResearchFinding, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: "cycle-1",
      title: "Improve onboarding completion",
      description: "Activation drops during signup flow",
      sourceUrl: "https://example.com/support/2",
      sourceLabel: "support-summary",
      category: "user_feedback",
      confidence: 0.89,
      evidenceText: "Another ticket reports similar onboarding confusion.",
    });

    expect(first.duplicateAnnotated).toBe(false);
    expect(second.duplicateAnnotated).toBe(true);
    expect(second.duplicateOfFindingId).toBe(first.findingId);
  });

  it("stores normalized research provenance metadata through the action path", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertResearchCycle(harness.ctx, createResearchCycle());

    const finding = await harness.performAction<{
      sourceType: string;
      sourceId?: string;
      sourceTimestamp?: string;
      ingestedAt?: string;
    }>(ACTION_KEYS.addResearchFinding, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: "cycle-1",
      title: "Investigate activation funnel drop",
      description: "Analytics report shows a steep signup drop-off",
      sourceUrl: "https://analytics.example.com/dashboard/activation",
      sourceType: "analytics_report",
      sourceId: "analytics-report-1",
      sourceTimestamp: "2026-01-01T00:00:00.000Z",
      category: "user_feedback",
      confidence: 0.88,
    });

    expect(finding.sourceType).toBe("analytics_report");
    expect(finding.sourceId).toBe("analytics-report-1");
    expect(finding.sourceTimestamp).toBe("2026-01-01T00:00:00.000Z");
    expect(finding.ingestedAt).toBeTruthy();
  });

  it("captures a reproducible snapshot when a research cycle completes", async () => {
    await upsertAutopilotProject(harness.ctx, createProject());
    await upsertResearchCycle(harness.ctx, createResearchCycle({ cycleId: "cycle-snapshot" }));
    await upsertResearchFinding(harness.ctx, createFinding({
      findingId: "finding-snapshot-1",
      cycleId: "cycle-snapshot",
      topic: "onboarding-completion",
      signalFamily: "support",
    }));

    const completed = await harness.performAction<ResearchCycle>(ACTION_KEYS.completeResearchCycle, {
      companyId: "company-1",
      projectId: "project-1",
      cycleId: "cycle-snapshot",
      reportContent: "Snapshot complete",
    });

    expect(completed.status).toBe("completed");
    expect(completed.snapshot?.findingIds).toContain("finding-snapshot-1");
    expect(completed.snapshot?.signalFamilyCounts.support).toBe(1);
  });
});
