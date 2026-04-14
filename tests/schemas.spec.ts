import { describe, expect, it } from "vitest";
import {
  autopilotProjectSchema,
  checkpointSchema,
  companyBudgetSchema,
  convoyTaskSchema,
  deliveryRunSchema,
  digestSchema,
  ideaSchema,
  knowledgeEntrySchema,
  learnerSummarySchema,
  operatorInterventionSchema,
  planningArtifactSchema,
  productLockSchema,
  releaseHealthCheckSchema,
  researchFindingSchema,
  rollbackActionSchema,
  swipeEventSchema,
  workspaceLeaseSchema,
} from "../src/schemas.js";

describe("runtime schemas", () => {
  it("accepts a valid autopilot project", () => {
    const parsed = autopilotProjectSchema.parse({
      autopilotId: "ap-1",
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      automationTier: "supervised",
      budgetMinutes: 120,
      paused: false,
      autoCreateIssues: true,
      autoCreatePrs: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(parsed.projectId).toBe("project-1");
  });

  it("rejects an invalid automation tier", () => {
    expect(() =>
      autopilotProjectSchema.parse({
        autopilotId: "ap-1",
        companyId: "company-1",
        projectId: "project-1",
        enabled: true,
        automationTier: "chaos",
        budgetMinutes: 120,
        paused: false,
        autoCreateIssues: true,
        autoCreatePrs: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects negative budget usage", () => {
    expect(() =>
      companyBudgetSchema.parse({
        budgetId: "budget-1",
        companyId: "company-1",
        totalBudgetMinutes: 500,
        usedBudgetMinutes: -1,
        autopilotBudgetMinutes: 120,
        autopilotUsedMinutes: 10,
        paused: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("accepts a valid delivery run and idea payload", () => {
    const run = deliveryRunSchema.parse({
      runId: "run-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      title: "Improve onboarding copy",
      status: "running",
      automationTier: "supervised",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
      commitSha: null,
      paused: false,
      cancellationReason: undefined,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const idea = ideaSchema.parse({
      ideaId: "idea-1",
      companyId: "company-1",
      projectId: "project-1",
      title: "Improve onboarding copy",
      description: "Rewrite initial screen copy",
      rationale: "Users churn during first-run setup",
      sourceReferences: [],
      impactScore: 70,
      feasibilityScore: 85,
      status: "active",
      duplicateAnnotated: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(run.status).toBe("running");
    expect(idea.status).toBe("active");
  });

  it("accepts checkpoint, digest, release-health, and rollback payloads", () => {
    expect(
      checkpointSchema.parse({
        checkpointId: "checkpoint-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        snapshotState: {},
        taskStates: { "task-1": "running" },
        workspaceSnapshot: {
          branchName: "autopilot/project1/idea1",
          commitSha: null,
          workspacePath: "/tmp/project",
          leasedPort: 3000,
        },
        createdAt: "2026-01-01T00:00:00.000Z",
      }).runId,
    ).toBe("run-1");

    expect(
      digestSchema.parse({
        digestId: "digest-1",
        companyId: "company-1",
        projectId: "project-1",
        digestType: "stuck_run",
        dedupeKey: "stuck_run:run-1",
        escalationLevel: 1,
        urgency: "blocking",
        recommendedAction: "Review the stuck run and decide whether to nudge, checkpoint, or pause it.",
        title: "Stuck",
        summary: "Run stuck",
        details: [],
        priority: "high",
        status: "pending",
        deliveredAt: null,
        readAt: null,
        dismissedAt: null,
        reopenCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      }).digestType,
    ).toBe("stuck_run");

    expect(
      releaseHealthCheckSchema.parse({
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      }).checkType,
    ).toBe("smoke_test");

    expect(
      rollbackActionSchema.parse({
        rollbackId: "rollback-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        status: "pending",
        checkpointId: "checkpoint-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      }).rollbackType,
    ).toBe("restore_checkpoint");
  });

  it("accepts the remaining persisted entity payloads", () => {
    expect(
      researchFindingSchema.parse({
        findingId: "finding-1",
        companyId: "company-1",
        projectId: "project-1",
        cycleId: "cycle-1",
        title: "Improve onboarding completion",
        description: "Users drop before activation",
        category: "user_feedback",
        confidence: 0.92,
        signalFamily: "support",
        topic: "onboarding-completion",
        dedupeKey: "onboarding-completion|improve onboarding completion",
        sourceQualityScore: 72,
        freshnessScore: 88,
        duplicateAnnotated: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      }).findingId,
    ).toBe("finding-1");

    expect(
      swipeEventSchema.parse({
        swipeId: "swipe-1",
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-1",
        decision: "yes",
        createdAt: "2026-01-01T00:00:00.000Z",
      }).decision,
    ).toBe("yes");

    expect(
      planningArtifactSchema.parse({
        artifactId: "artifact-1",
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-1",
        title: "Plan onboarding",
        goalAlignmentSummary: "Reduce activation dropoff",
        implementationSpec: "Update copy and simplify first-run steps",
        dependencies: [],
        rolloutPlan: "Release behind a flag",
        testPlan: "Add flow coverage",
        approvalChecklist: ["Review UX copy"],
        executionMode: "simple",
        approvalMode: "manual",
        checkpointRequired: false,
        automationTier: "supervised",
        status: "draft",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }).artifactId,
    ).toBe("artifact-1");

    expect(
      workspaceLeaseSchema.parse({
        leaseId: "lease-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        workspacePath: "/tmp/project",
        branchName: "autopilot/project1/idea1",
        leasedPort: 3000,
        gitRepoRoot: "/tmp/project",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        releasedAt: null,
      }).leaseId,
    ).toBe("lease-1");

    expect(
      convoyTaskSchema.parse({
        taskId: "task-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        artifactId: "artifact-1",
        title: "Update copy",
        description: "",
        status: "pending",
        dependsOnTaskIds: [],
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }).taskId,
    ).toBe("task-1");

    expect(
      productLockSchema.parse({
        lockId: "lock-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        lockType: "product_lock",
        targetBranch: "main",
        targetPath: "",
        acquiredAt: "2026-01-01T00:00:00.000Z",
        releasedAt: null,
        isActive: true,
      }).lockId,
    ).toBe("lock-1");

    expect(
      operatorInterventionSchema.parse({
        interventionId: "intervention-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        interventionType: "note",
        note: "Check rollout metrics",
        createdAt: "2026-01-01T00:00:00.000Z",
      }).interventionId,
    ).toBe("intervention-1");

    expect(
      learnerSummarySchema.parse({
        summaryId: "summary-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        ideaId: "idea-1",
        title: "Onboarding improvements",
        summaryText: "Shipped successfully",
        keyLearnings: ["copy changes improved completion"],
        skillsReinjected: ["release-health checks"],
        metrics: { duration: 120, commits: 2, testsAdded: 1, testsPassed: 12, filesChanged: 3 },
        createdAt: "2026-01-01T00:00:00.000Z",
      }).summaryId,
    ).toBe("summary-1");

    expect(
      knowledgeEntrySchema.parse({
        entryId: "knowledge-1",
        companyId: "company-1",
        projectId: "project-1",
        knowledgeType: "lesson",
        title: "Use feature flags for onboarding changes",
        content: "Ship behind a flag and verify activation metrics first.",
        usageCount: 1,
        tags: ["release", "onboarding"],
        usedInRunId: "run-1",
        lastUsedAt: "2026-01-01T01:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T01:00:00.000Z",
      }).entryId,
    ).toBe("knowledge-1");
  });

  it("rejects contradictory runtime invariant payloads", () => {
    expect(() =>
      deliveryRunSchema.parse({
        runId: "run-1",
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-1",
        artifactId: "artifact-1",
        title: "Improve onboarding copy",
        status: "paused",
        automationTier: "supervised",
        branchName: "autopilot/project1/idea1",
        workspacePath: "/tmp/project",
        leasedPort: 3000,
        commitSha: null,
        paused: false,
        cancellationReason: "No longer needed",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      digestSchema.parse({
        digestId: "digest-1",
        companyId: "company-1",
        projectId: "project-1",
        digestType: "stuck_run",
        title: "Stuck",
        summary: "Run stuck",
        details: [],
        priority: "high",
        status: "dismissed",
        deliveredAt: null,
        readAt: null,
        dismissedAt: null,
        cooldownUntil: "2026-01-01T02:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      releaseHealthCheckSchema.parse({
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke",
        status: "failed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      rollbackActionSchema.parse({
        rollbackId: "rollback-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "revert_commit",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      researchFindingSchema.parse({
        findingId: "finding-1",
        companyId: "company-1",
        projectId: "project-1",
        cycleId: "cycle-1",
        title: "Improve onboarding completion",
        description: "Users drop before activation",
        category: "user_feedback",
        confidence: 0.92,
        sourceQualityScore: 72,
        freshnessScore: 88,
        duplicateAnnotated: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      workspaceLeaseSchema.parse({
        leaseId: "lease-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        workspacePath: "/tmp/project",
        branchName: "autopilot/project1/idea1",
        leasedPort: 3000,
        gitRepoRoot: "/tmp/project",
        isActive: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        releasedAt: null,
      }),
    ).toThrow();

    expect(() =>
      convoyTaskSchema.parse({
        taskId: "task-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        artifactId: "artifact-1",
        title: "Update copy",
        description: "",
        status: "running",
        dependsOnTaskIds: ["task-1"],
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      productLockSchema.parse({
        lockId: "lock-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        lockType: "product_lock",
        targetBranch: "main",
        targetPath: "",
        acquiredAt: "2026-01-01T00:00:00.000Z",
        releasedAt: null,
        isActive: false,
      }),
    ).toThrow();

    expect(() =>
      operatorInterventionSchema.parse({
        interventionId: "intervention-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        interventionType: "linked_issue_inspection",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      knowledgeEntrySchema.parse({
        entryId: "knowledge-1",
        companyId: "company-1",
        projectId: "project-1",
        knowledgeType: "lesson",
        title: "Use feature flags",
        content: "Ship behind a flag",
        usageCount: 1,
        tags: [],
        usedInRunId: "run-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T01:00:00.000Z",
      }),
    ).toThrow();
  });
});
