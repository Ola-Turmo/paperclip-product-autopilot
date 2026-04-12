import { beforeEach, describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { ACTION_KEYS, ENTITY_TYPES, JOB_KEYS, TOOL_KEYS } from "../src/constants.js";
import { upsertAutopilotProject, upsertCompanyBudget, upsertDeliveryRun, upsertIdea } from "../src/helpers.js";
import type { AutopilotProject, CompanyBudget, DeliveryRun, Idea } from "../src/types.js";

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
});
