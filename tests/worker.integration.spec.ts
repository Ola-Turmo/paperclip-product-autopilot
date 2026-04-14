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
    await harness.performAction(ACTION_KEYS.triggerRollback, {
      companyId: "company-1",
      projectId: "project-1",
      runId: run.runId,
      checkId: check.checkId,
      rollbackType: "restore_checkpoint",
      checkpointId: checkpoint.checkpointId,
    });

    expect(harness.metrics.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "checkpoint.created",
        "release_health.created",
        "release_health.updated",
        "rollback.triggered",
      ]),
    );
    expect(harness.telemetry.map((entry) => entry.eventName)).toEqual(
      expect.arrayContaining([
        "checkpoint_created",
        "release_health_created",
        "release_health_updated",
        "rollback_triggered",
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
