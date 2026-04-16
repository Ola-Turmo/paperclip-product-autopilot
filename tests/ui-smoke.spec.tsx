import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DATA_KEYS } from "../src/constants.js";
import uiModule from "../src/ui/index.js";

type PluginDataResult = { data: unknown; refresh: () => void };

const dataState = new Map<string, unknown>();

function makeKey(key: string, args?: unknown) {
  return JSON.stringify([key, args ?? null]);
}

vi.mock("@paperclipai/plugin-sdk/ui", () => ({
  usePluginAction: () => async () => undefined,
  usePluginToast: () => () => undefined,
  usePluginData: (key: string, args?: unknown): PluginDataResult => ({
    data: dataState.get(makeKey(key, args)),
    refresh: () => undefined,
  }),
}));

describe("ui smoke", () => {
  beforeEach(() => {
    dataState.clear();
  });

  it("renders the project tab operator console", () => {
    dataState.set(makeKey(DATA_KEYS.autopilotProject, { companyId: "company-1", projectId: "project-1" }), {
      autopilotId: "ap-1",
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      automationTier: "fullauto",
      budgetMinutes: 120,
      paused: false,
      autoCreateIssues: true,
      autoCreatePrs: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey("autopilot-overview", { companyId: "company-1", projectId: "project-1" }), {
      projectCount: 1,
      enabledCount: 1,
      pausedCount: 0,
      activeIdeasCount: 2,
      maybePoolCount: 1,
      approvedIdeasCount: 1,
      runningRunsCount: 1,
      completedRunsCount: 3,
      failedRunsCount: 0,
      totalSwipesToday: 5,
      budgetUsagePercent: 62,
    });
    dataState.set(makeKey(DATA_KEYS.researchCycles, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.companyBudget, { companyId: "company-1" }), {
      budgetId: "budget-1",
      companyId: "company-1",
      totalBudgetMinutes: 500,
      usedBudgetMinutes: 200,
      autopilotBudgetMinutes: 120,
      autopilotUsedMinutes: 75,
      paused: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.preferenceProfile, { companyId: "company-1", projectId: "project-1" }), {
      profileId: "profile-1",
      companyId: "company-1",
      projectId: "project-1",
      passCount: 1,
      maybeCount: 1,
      yesCount: 2,
      nowCount: 1,
      totalSwipes: 5,
      categoryPreferences: {
        user_feedback: { pass: 0, maybe: 1, yes: 2, now: 1 },
      },
      tagPreferences: {
        activation: { pass: 0, maybe: 0, yes: 2, now: 1 },
      },
      complexityPreferences: {
        low: { pass: 0, maybe: 0, yes: 1, now: 1 },
        medium: { pass: 1, maybe: 1, yes: 1, now: 0 },
      },
      avgApprovedScore: 78,
      avgRejectedScore: 30,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.ideas, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.deliveryRuns, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1" }), []);

    const html = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotProjectTab, {
        context: { companyId: "company-1", entityId: "project-1" },
      }),
    );

    expect(html).toContain("Prosjektoppsett");
    expect(html).toContain("Budsjett og kapasitet");
    expect(html).toContain("Innsikt og ideer");
    expect(html).toContain("Operatørinnboks");
    expect(html).toContain("Evalueringsscore");
    expect(html).toContain("Preference Signals");
  });

  it("renders the run detail tab health and audit views", () => {
    const runContext = { companyId: "company-1", projectId: "project-1", entityId: "run-1" };
    const runLookup = { companyId: "company-1", projectId: "project-1", runId: "run-1" };
    dataState.set(makeKey(DATA_KEYS.deliveryRun, runLookup), {
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
      cancellationReason: undefined,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.planningArtifact, { companyId: "company-1", projectId: "project-1", artifactId: "artifact-1" }), {
      artifactId: "artifact-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      title: "Plan onboarding improvements",
      goalAlignmentSummary: "Improve activation",
      implementationSpec: "Update onboarding flow",
      dependencies: [],
      rolloutPlan: "Ship behind a flag",
      testPlan: "Run smoke tests",
      approvalChecklist: ["Review plan"],
      executionMode: "convoy",
      approvalMode: "manual",
      checkpointRequired: true,
      checkpointReason: "Convoy execution requires a checkpoint before risky multi-step delivery.",
      automationTier: "semiauto",
      status: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.checkpoints, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.releaseHealthChecks, runLookup), [
      {
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    dataState.set(makeKey(DATA_KEYS.rollbackActions, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.operatorInterventions, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1" }), []);

    const html = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotRunDetailTab, {
        context: runContext,
      }),
    );

    expect(html).toContain("Løpsstatus");
    expect(html).toContain("Cancel");
    expect(html).toContain("Checkpoint policy");
    expect(html).toContain("Release Health");
    expect(html).toContain("Operator Interventions");
    expect(html).toContain("Revisjonsspor");
  });

  it("renders digest urgency and recommended action", () => {
    dataState.set(makeKey(DATA_KEYS.autopilotProject, { companyId: "company-1", projectId: "project-1" }), {
      autopilotId: "ap-1",
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      automationTier: "fullauto",
      budgetMinutes: 120,
      paused: false,
      autoCreateIssues: true,
      autoCreatePrs: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey("autopilot-overview", { companyId: "company-1", projectId: "project-1" }), {
      projectCount: 1,
      enabledCount: 1,
      pausedCount: 0,
      activeIdeasCount: 2,
      maybePoolCount: 1,
      approvedIdeasCount: 1,
      runningRunsCount: 1,
      completedRunsCount: 3,
      failedRunsCount: 0,
      totalSwipesToday: 5,
      budgetUsagePercent: 62,
    });
    dataState.set(makeKey(DATA_KEYS.companyBudget, { companyId: "company-1" }), {
      budgetId: "budget-1",
      companyId: "company-1",
      totalBudgetMinutes: 500,
      usedBudgetMinutes: 200,
      autopilotBudgetMinutes: 120,
      autopilotUsedMinutes: 75,
      paused: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.preferenceProfile, { companyId: "company-1", projectId: "project-1" }), {
      profileId: "profile-1",
      companyId: "company-1",
      projectId: "project-1",
      passCount: 1,
      maybeCount: 1,
      yesCount: 2,
      nowCount: 1,
      totalSwipes: 5,
      categoryPreferences: { user_feedback: { pass: 0, maybe: 1, yes: 2, now: 1 } },
      tagPreferences: { activation: { pass: 0, maybe: 0, yes: 2, now: 1 } },
      complexityPreferences: {
        low: { pass: 0, maybe: 0, yes: 1, now: 1 },
        medium: { pass: 1, maybe: 1, yes: 1, now: 0 },
      },
      avgApprovedScore: 78,
      avgRejectedScore: 30,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.researchCycles, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.ideas, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.deliveryRuns, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), [
      {
        digestId: "digest-1",
        companyId: "company-1",
        projectId: "project-1",
        digestType: "stuck_run",
        title: "Run stuck",
        summary: "Run has not updated",
        details: [],
        priority: "critical",
        urgency: "intervention_required",
        recommendedAction: "Inspect the run immediately, add an operator note, and checkpoint or cancel if progress is unsafe.",
        status: "pending",
        deliveredAt: null,
        readAt: null,
        dismissedAt: null,
        relatedRunId: "run-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const html = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotProjectTab, {
        context: { companyId: "company-1", entityId: "project-1" },
      }),
    );

    expect(html).toContain("Urgency: intervention required");
    expect(html).toContain("Recommended action");
  });

  it("renders explicit loading and empty-state copy", () => {
    const loadingHtml = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotRunDetailTab, {
        context: { companyId: "company-1", projectId: "project-1", entityId: "missing-run" },
      }),
    );
    const emptyDashboardHtml = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotDashboardWidget, {
        context: { companyId: "company-1" },
      }),
    );

    expect(loadingHtml).toContain("Loading run details");
    expect(emptyDashboardHtml).toContain("No autopilot-enabled projects yet");
  });
});
