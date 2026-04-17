import { describe, expect, it } from "vitest";
import { buildAutopilotOverview, computeBudgetUsagePercent } from "../src/services/overview.js";
import {
  createBudgetAlertDigest,
  createHealthCheckFailedDigest,
  createStuckRunDigest,
  shouldPauseForBudget,
} from "../src/services/policy.js";
import type {
  AutopilotProject,
  CompanyBudget,
  DeliveryRun,
  Idea,
  SwipeEvent,
} from "../src/types.js";

function createProject(): AutopilotProject {
  return {
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
  };
}

function createBudget(overrides: Partial<CompanyBudget> = {}): CompanyBudget {
  return {
    budgetId: "budget-1",
    companyId: "company-1",
    totalBudgetMinutes: 500,
    usedBudgetMinutes: 100,
    autopilotBudgetMinutes: 120,
    autopilotUsedMinutes: 96,
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
    title: "Improve onboarding",
    status: "running",
    automationTier: "supervised",
    branchName: "autopilot/project1/idea1",
    workspacePath: "/tmp/project",
    leasedPort: null,
    commitSha: null,
    paused: false,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createIdea(status: Idea["status"]): Idea {
  return {
    ideaId: `idea-${status}`,
    companyId: "company-1",
    projectId: "project-1",
    title: `Idea ${status}`,
    description: "desc",
    rationale: "why",
    sourceReferences: [],
    impactScore: 60,
    feasibilityScore: 60,
    status,
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("overview service", () => {
  it("computes budget usage percent safely", () => {
    expect(computeBudgetUsagePercent(createBudget())).toBe(80);
    expect(computeBudgetUsagePercent(createBudget({ autopilotBudgetMinutes: 0 }))).toBe(0);
    expect(computeBudgetUsagePercent(null)).toBe(0);
  });

  it("builds the autopilot overview from domain objects", () => {
    const swipes: SwipeEvent[] = [
      {
        swipeId: "swipe-1",
        companyId: "company-1",
        projectId: "project-1",
        ideaId: "idea-active",
        decision: "yes",
        createdAt: "2026-01-02T08:00:00.000Z",
      },
    ];

    const overview = buildAutopilotOverview({
      project: createProject(),
      ideas: [createIdea("active"), createIdea("approved")],
      maybeIdeas: [createIdea("maybe")],
      runs: [
        createRun(),
        createRun({ runId: "run-2", status: "completed" }),
        createRun({ runId: "run-3", status: "failed" }),
      ],
      swipes,
      budget: createBudget(),
      today: new Date("2026-01-02T12:00:00.000Z"),
    });

    expect(overview.enabledCount).toBe(1);
    expect(overview.activeIdeasCount).toBe(1);
    expect(overview.approvedIdeasCount).toBe(1);
    expect(overview.maybePoolCount).toBe(1);
    expect(overview.runningRunsCount).toBe(1);
    expect(overview.completedRunsCount).toBe(1);
    expect(overview.failedRunsCount).toBe(1);
    expect(overview.totalSwipesToday).toBe(1);
    expect(overview.budgetUsagePercent).toBe(80);
  });
});

describe("policy service", () => {
  it("flags projects for pause when budget is exhausted", () => {
    expect(shouldPauseForBudget(createProject(), createBudget({ autopilotUsedMinutes: 120 }))).toBe(true);
    expect(shouldPauseForBudget(createProject(), createBudget({ autopilotUsedMinutes: 119 }))).toBe(false);
  });

  it("creates a budget alert digest only at the threshold", () => {
    const digest = createBudgetAlertDigest({
      digestId: "digest-1",
      companyId: "company-1",
      projectId: "project-1",
      budget: createBudget(),
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(digest?.digestType).toBe("budget_alert");
    expect(digest?.priority).toBe("high");
    expect(
      createBudgetAlertDigest({
        digestId: "digest-2",
        companyId: "company-1",
        projectId: "project-1",
        budget: createBudget({ autopilotUsedMinutes: 70 }),
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("creates a stuck-run digest with summaries", () => {
    const digest = createStuckRunDigest({
      digestId: "digest-3",
      companyId: "company-1",
      projectId: "project-1",
      stuckRuns: [createRun()],
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(digest?.digestType).toBe("stuck_run");
    expect(digest?.relatedRunId).toBe("run-1");
    expect(digest?.details[0]).toContain("Improve onboarding");
  });

  it("creates a health-check failure digest with blocking guidance", () => {
    const digest = createHealthCheckFailedDigest({
      digestId: "digest-4",
      companyId: "company-1",
      projectId: "project-1",
      run: createRun(),
      check: {
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke",
        status: "failed",
        errorMessage: "Homepage 500",
        failedAt: "2026-01-01T00:30:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      createdAt: "2026-01-01T00:31:00.000Z",
    });

    expect(digest.digestType).toBe("health_check_failed");
    expect(digest.relatedRunId).toBe("run-1");
    expect(digest.urgency).toBe("blocking");
    expect(digest.recommendedAction).toContain("rollback");
  });
});
