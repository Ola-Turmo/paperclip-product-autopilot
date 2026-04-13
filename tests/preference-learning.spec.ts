import { describe, expect, it } from "vitest";
import type {
  DeliveryRun,
  Idea,
  ReleaseHealthCheck,
  RollbackAction,
} from "../src/types.js";
import {
  buildOutcomePreferenceSignals,
  computeOutcomeBoost,
  scoreDeliveryOutcome,
} from "../src/services/preference-learning.js";

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
    feasibilityScore: 72,
    complexityEstimate: "medium",
    category: "user_feedback",
    tags: ["user_feedback", "activation"],
    status: "completed",
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
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
    title: "Delivery run",
    status: "completed",
    automationTier: "semiauto",
    branchName: "autopilot/project1/idea1",
    workspacePath: "/tmp/project",
    leasedPort: 3000,
    commitSha: "abc1234",
    paused: false,
    completedAt: "2026-01-01T03:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T03:00:00.000Z",
    ...overrides,
  };
}

function createCheck(overrides: Partial<ReleaseHealthCheck> = {}): ReleaseHealthCheck {
  return {
    checkId: "check-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    checkType: "smoke_test",
    name: "Smoke",
    status: "passed",
    passedAt: "2026-01-01T03:00:00.000Z",
    createdAt: "2026-01-01T00:30:00.000Z",
    ...overrides,
  };
}

function createRollback(overrides: Partial<RollbackAction> = {}): RollbackAction {
  return {
    rollbackId: "rollback-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    checkId: "check-1",
    rollbackType: "restore_checkpoint",
    checkpointId: "checkpoint-1",
    status: "completed",
    completedAt: "2026-01-01T04:00:00.000Z",
    createdAt: "2026-01-01T03:30:00.000Z",
    ...overrides,
  };
}

describe("preference learning", () => {
  it("scores successful runs above failed runs with rollbacks", () => {
    const successful = scoreDeliveryOutcome({
      run: createRun(),
      healthChecks: [createCheck()],
      rollbacks: [],
    });
    const failed = scoreDeliveryOutcome({
      run: createRun({
        runId: "run-2",
        status: "failed",
        completedAt: "2026-01-04T00:00:00.000Z",
        updatedAt: "2026-01-04T00:00:00.000Z",
      }),
      healthChecks: [createCheck({ runId: "run-2", status: "failed", failedAt: "2026-01-04T00:00:00.000Z", passedAt: undefined, errorMessage: "boom" })],
      rollbacks: [createRollback({ runId: "run-2" })],
    });

    expect(successful).toBeGreaterThan(0);
    expect(failed).toBeLessThan(0);
    expect(successful).toBeGreaterThan(failed);
  });

  it("builds category and tag outcome signals from historical runs", () => {
    const signals = buildOutcomePreferenceSignals({
      ideas: [
        createIdea(),
        createIdea({
          ideaId: "idea-2",
          category: "technical",
          tags: ["technical"],
          complexityEstimate: "high",
        }),
      ],
      runs: [
        createRun(),
        createRun({
          runId: "run-2",
          ideaId: "idea-2",
          status: "failed",
          completedAt: "2026-01-05T00:00:00.000Z",
          updatedAt: "2026-01-05T00:00:00.000Z",
        }),
      ],
      healthChecks: [
        createCheck(),
        createCheck({
          checkId: "check-2",
          runId: "run-2",
          status: "failed",
          failedAt: "2026-01-05T00:00:00.000Z",
          passedAt: undefined,
          errorMessage: "boom",
        }),
      ],
      rollbacks: [createRollback({ runId: "run-2" })],
    });

    expect(signals.categorySignals.user_feedback.averageScore).toBeGreaterThan(0);
    expect(signals.categorySignals.technical.averageScore).toBeLessThan(0);
    expect(signals.tagSignals.activation.sampleCount).toBe(1);
    expect(signals.totalSamples).toBe(2);
  });

  it("computes a positive boost for categories with successful outcomes", () => {
    const signals = buildOutcomePreferenceSignals({
      ideas: [createIdea()],
      runs: [createRun()],
      healthChecks: [createCheck()],
      rollbacks: [],
    });

    const boost = computeOutcomeBoost({
      signals,
      category: "user_feedback",
      tags: ["activation"],
      complexityEstimate: "medium",
    });

    expect(boost.boost).toBeGreaterThan(0);
    expect(boost.evidenceCount).toBeGreaterThan(0);
  });
});
