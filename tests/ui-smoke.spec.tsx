import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DATA_KEYS } from "../src/constants.js";
import uiModule from "../src/ui/index.js";

type PluginDataResult = { data: unknown; refresh: () => void };

const dataState = new Map<string, unknown>();

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function makeKey(key: string, args?: unknown) {
  return JSON.stringify([key, stableValue(args ?? null)]);
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
    dataState.set(makeKey(DATA_KEYS.researchFindings, { companyId: "company-1", projectId: "project-1" }), [
      {
        findingId: "finding-1",
        companyId: "company-1",
        projectId: "project-1",
        cycleId: "cycle-1",
        title: "Improve onboarding completion",
        description: "Users drop before activation",
        sourceUrl: "https://support.example.com/tickets/123",
        sourceLabel: "support-ticket",
        sourceType: "support_ticket",
        ingestedAt: "2026-01-01T00:05:00.000Z",
        sourceDomain: "support.example.com",
        sourceScope: "customer",
        normalizedSourceKey: "support_ticket:support.example.com",
        category: "user_feedback",
        confidence: 0.92,
        signalFamily: "support",
        topic: "onboarding-completion",
        dedupeKey: "onboarding-completion|improve onboarding completion",
        sourceQualityScore: 78,
        freshnessScore: 92,
        evidenceText: "Several users report confusion during account setup.",
        duplicateAnnotated: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
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
      executionModePreferences: {
        simple: { pass: 0, maybe: 1, yes: 2, now: 1 },
        convoy: { pass: 1, maybe: 0, yes: 0, now: 0 },
      },
      avgApprovedScore: 78,
      avgRejectedScore: 30,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.ideas, { companyId: "company-1", projectId: "project-1" }), [
      {
        ideaId: "idea-1",
        companyId: "company-1",
        projectId: "project-1",
        title: "Improve onboarding completion",
        description: "Reduce first-run friction",
        rationale: "Evidence-backed from support-ticket; confidence=0.92",
        sourceReferences: ["https://support.example.com/tickets/123"],
        impactScore: 82,
        feasibilityScore: 70,
        complexityEstimate: "medium",
        technicalApproach: "Several users report confusion during account setup.",
        status: "active",
        duplicateAnnotated: false,
        rankingExplanation: {
          rankingScore: 81,
          impactScore: 82,
          feasibilityScore: 70,
          confidence: 0.92,
          freshnessScore: 92,
          sourceQualityScore: 78,
          complexityEstimate: "medium",
          provisionalExecutionMode: "simple",
          preferenceBoost: 3,
          complexityPreferenceBoost: 1,
          executionModePreferenceBoost: 1,
          researchQualityBoost: 4,
          outcomeBoost: 2,
          outcomeEvidenceCount: 3,
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
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
    expect(html).toContain("Top Execution Mode Preference");
    expect(html).toContain("Budget Guidance");
    expect(html).toContain("Evidence:");
    expect(html).toContain("Source URL:");
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
      riskLevel: "high",
      riskFactors: ["multi_step_execution", "delivery_dependencies"],
      rolloutGuardrails: ["Run release-health checks before marking the run complete"],
      cancellationPolicy: "checkpoint_or_acknowledged_force",
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
    expect(html).toContain("Cancellation policy");
    expect(html).toContain("Guardrails");
    expect(html).toContain("Remediation Guidance");
    expect(html).toContain("Checkpoint still required");
    expect(html).toContain("Release Health");
    expect(html).toContain("Operator Interventions");
    expect(html).toContain("Revisjonsspor");
  });

  it("renders remediation controls for failed health checks", () => {
    const runContext = { companyId: "company-1", projectId: "project-1", entityId: "run-remediate" };
    const runLookup = { companyId: "company-1", projectId: "project-1", runId: "run-remediate" };
    dataState.set(makeKey(DATA_KEYS.deliveryRun, runLookup), {
      runId: "run-remediate",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-remediate",
      title: "Recover failing rollout",
      status: "running",
      automationTier: "semiauto",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
      commitSha: "abc1234",
      paused: false,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.planningArtifact, { companyId: "company-1", projectId: "project-1", artifactId: "artifact-remediate" }), {
      artifactId: "artifact-remediate",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      title: "Plan remediation",
      goalAlignmentSummary: "Stabilize rollout",
      implementationSpec: "Use checkpoint rollback when checks fail",
      dependencies: [],
      rolloutPlan: "Monitor health checks",
      testPlan: "Run smoke tests",
      approvalChecklist: ["Review plan"],
      executionMode: "convoy",
      approvalMode: "manual",
      checkpointRequired: true,
      checkpointReason: "Convoy execution requires a checkpoint before risky multi-step delivery.",
      riskLevel: "high",
      riskFactors: ["multi_step_execution"],
      rolloutGuardrails: ["Run release-health checks before marking the run complete"],
      cancellationPolicy: "checkpoint_or_acknowledged_force",
      automationTier: "semiauto",
      status: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.checkpoints, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.releaseHealthChecks, runLookup), [
      {
        checkId: "check-failed",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-remediate",
        checkType: "smoke_test",
        name: "Smoke",
        status: "failed",
        errorMessage: "Homepage 500",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    dataState.set(makeKey(DATA_KEYS.rollbackActions, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.operatorInterventions, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), []);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1", runId: "run-recovered" }), [{
      summaryId: "summary-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      ideaId: "idea-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      title: "Rollback recovery for Recover rollout",
      summaryText: "Smoke failed | restore checkpoint completed | checkpoint Before risky deploy | recovery time 5m",
      keyLearnings: ["Failed check: Smoke", "Recovery path completed via restore checkpoint."],
      skillsReinjected: ["release-health verification", "checkpoint restore"],
      metrics: { duration: 300000 },
      createdAt: "2026-01-01T00:12:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1" }), [{
      summaryId: "summary-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      ideaId: "idea-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      title: "Rollback recovery for Recover rollout",
      summaryText: "Smoke failed | restore checkpoint completed | checkpoint Before risky deploy | recovery time 5m",
      keyLearnings: ["Failed check: Smoke", "Recovery path completed via restore checkpoint."],
      skillsReinjected: ["release-health verification", "checkpoint restore"],
      metrics: { duration: 300000 },
      createdAt: "2026-01-01T00:12:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1", sourceRunId: "run-recovered" }), [{
      entryId: "knowledge-1",
      companyId: "company-1",
      projectId: "project-1",
      knowledgeType: "procedure",
      title: "Recovery procedure: restore checkpoint",
      content: "Run: Recover rollout\nRollback path: restore checkpoint (completed)",
      sourceRunId: "run-recovered",
      sourceSummaryId: "summary-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      usageCount: 0,
      tags: ["rollback", "restore_checkpoint", "completed"],
      createdAt: "2026-01-01T00:12:00.000Z",
      updatedAt: "2026-01-01T00:12:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1" }), [{
      entryId: "knowledge-1",
      companyId: "company-1",
      projectId: "project-1",
      knowledgeType: "procedure",
      title: "Recovery procedure: restore checkpoint",
      content: "Run: Recover rollout\nRollback path: restore checkpoint (completed)",
      sourceRunId: "run-recovered",
      sourceSummaryId: "summary-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      usageCount: 0,
      tags: ["rollback", "restore_checkpoint", "completed"],
      createdAt: "2026-01-01T00:12:00.000Z",
      updatedAt: "2026-01-01T00:12:00.000Z",
    }]);

    const html = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotRunDetailTab, {
        context: runContext,
      }),
    );

    expect(html).toContain("Recommended remediation");
    expect(html).toContain("Create Checkpoint");
    expect(html).toContain("Revert Commit");
  });

  it("renders rollback recovery guidance after completed remediation", () => {
    const runContext = { companyId: "company-1", projectId: "project-1", entityId: "run-recovered" };
    const runLookup = { companyId: "company-1", projectId: "project-1", runId: "run-recovered" };
    dataState.set(makeKey(DATA_KEYS.deliveryRun, runLookup), {
      runId: "run-recovered",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-recovered",
      title: "Recover rollout",
      status: "paused",
      automationTier: "semiauto",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
      commitSha: "abc1234",
      paused: true,
      pauseReason: "Rollback completed: restore_checkpoint",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:12:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.planningArtifact, { companyId: "company-1", projectId: "project-1", artifactId: "artifact-recovered" }), {
      artifactId: "artifact-recovered",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      title: "Plan recovery",
      goalAlignmentSummary: "Stabilize rollout",
      implementationSpec: "Restore checkpoint after failed smoke test",
      dependencies: [],
      rolloutPlan: "Pause and verify after rollback",
      testPlan: "Rerun smoke tests",
      approvalChecklist: ["Review plan"],
      executionMode: "convoy",
      approvalMode: "manual",
      checkpointRequired: true,
      checkpointReason: "Convoy execution requires a checkpoint before risky multi-step delivery.",
      riskLevel: "high",
      riskFactors: ["multi_step_execution"],
      rolloutGuardrails: ["Run release-health checks before marking the run complete"],
      cancellationPolicy: "checkpoint_or_acknowledged_force",
      automationTier: "semiauto",
      status: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dataState.set(makeKey(DATA_KEYS.checkpoints, runLookup), [{
      checkpointId: "checkpoint-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      label: "Before risky deploy",
      snapshotState: {},
      taskStates: {},
      workspaceSnapshot: {
        branchName: "autopilot/project1/idea1",
        commitSha: "abc1234",
        workspacePath: "/tmp/project",
        leasedPort: 3000,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.releaseHealthChecks, runLookup), [{
      checkId: "check-failed",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      checkType: "smoke_test",
      name: "Smoke",
      status: "failed",
      errorMessage: "Homepage 500",
      createdAt: "2026-01-01T00:05:00.000Z",
      failedAt: "2026-01-01T00:07:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.rollbackActions, runLookup), [{
      rollbackId: "rollback-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      checkId: "check-failed",
      rollbackType: "restore_checkpoint",
      status: "completed",
      checkpointId: "checkpoint-1",
      completedAt: "2026-01-01T00:12:00.000Z",
      createdAt: "2026-01-01T00:08:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.operatorInterventions, runLookup), []);
    dataState.set(makeKey(DATA_KEYS.digests, { companyId: "company-1", projectId: "project-1" }), [{
      digestId: "digest-health-1",
      companyId: "company-1",
      projectId: "project-1",
      digestType: "health_check_failed",
      title: "Health check failed",
      summary: "Smoke blocked release progression",
      details: [],
      priority: "high",
      status: "read",
      deliveredAt: "2026-01-01T00:08:00.000Z",
      readAt: "2026-01-01T00:09:00.000Z",
      dismissedAt: null,
      relatedRunId: "run-recovered",
      createdAt: "2026-01-01T00:08:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-1", projectId: "project-1", runId: "run-recovered" }), [{
      summaryId: "summary-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-recovered",
      ideaId: "idea-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      title: "Rollback recovery for Recover rollout",
      summaryText: "Smoke failed | restore checkpoint completed | checkpoint Before risky deploy | recovery time 5m",
      keyLearnings: ["Failed check: Smoke", "Recovery path completed via restore checkpoint."],
      skillsReinjected: ["release-health verification", "checkpoint restore"],
      metrics: { duration: 300000 },
      createdAt: "2026-01-01T00:12:00.000Z",
    }]);
    dataState.set(makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-1", projectId: "project-1", sourceRunId: "run-recovered" }), [{
      entryId: "knowledge-1",
      companyId: "company-1",
      projectId: "project-1",
      knowledgeType: "procedure",
      title: "Recovery procedure: restore checkpoint",
      content: "Run: Recover rollout\nRollback path: restore checkpoint (completed)",
      sourceRunId: "run-recovered",
      sourceSummaryId: "summary-1",
      sourceRollbackId: "rollback-1",
      sourceCheckId: "check-failed",
      sourceCheckpointId: "checkpoint-1",
      sourceDigestId: "digest-health-1",
      usageCount: 0,
      tags: ["rollback", "restore_checkpoint", "completed"],
      createdAt: "2026-01-01T00:12:00.000Z",
      updatedAt: "2026-01-01T00:12:00.000Z",
    }]);

    const html = renderToStaticMarkup(
      React.createElement(uiModule.AutopilotRunDetailTab, {
        context: runContext,
      }),
    );

    expect(html).toContain("Rollback completed: restore_checkpoint");
    expect(html).toContain("Recovery time: 5m");
    expect(html).toContain("Checkpoint age at recovery: 12m");
    expect(html).toContain("Latest checkpoint: Before risky deploy");
    expect(html).toContain("Learnings:");
    expect(html).toContain("Skills reinjected:");
    expect(html).toContain("Recovery metric: 300000 ms");
    expect(html).toContain("Recovery procedure: restore checkpoint");
    expect(html).toContain("Links: Rollback: rollback-1 | Check: check-failed | Checkpoint: checkpoint-1 | Digest: digest-health-1");
    expect(html).toContain("Summary: summary-1");
    expect(html).toContain("Summary: Rollback recovery for Recover rollout");
    expect(html).toContain("Knowledge: Recovery procedure: restore checkpoint");
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
      executionModePreferences: {
        simple: { pass: 0, maybe: 1, yes: 2, now: 1 },
        convoy: { pass: 1, maybe: 0, yes: 0, now: 0 },
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
    expect(html).toContain("Inbox Summary");
    expect(html).toContain("Escalated");
    expect(html).toContain("Mark Read");
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
