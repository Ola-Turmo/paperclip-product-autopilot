import { describe, expect, it } from "vitest";
import type {
  Checkpoint,
  DeliveryRun,
  PlanningArtifact,
  ProductLock,
  ReleaseHealthCheck,
  RollbackAction,
} from "../src/types.js";
import {
  validateConvoyDependencies,
  validateDeliveryRunCancellation,
  validateDeliveryRunCreation,
  validatePlanningArtifactInvariant,
  validateRollbackRequest,
} from "../src/services/invariants.js";

function createPlanningArtifact(overrides: Partial<PlanningArtifact> = {}): PlanningArtifact {
  return {
    artifactId: "artifact-1",
    companyId: "company-1",
    projectId: "project-1",
    ideaId: "idea-1",
    title: "Plan onboarding improvements",
    goalAlignmentSummary: "Improve activation",
    implementationSpec: "Update onboarding copy and validation flow.",
    dependencies: [],
    rolloutPlan: "Ship behind a feature flag.",
    testPlan: "Run smoke tests and onboarding regression coverage.",
    approvalChecklist: ["Confirm scope", "Confirm rollback"],
    executionMode: "simple",
    approvalMode: "manual",
    automationTier: "semiauto",
    riskLevel: "medium",
    riskFactors: ["delivery_dependencies"],
    rolloutGuardrails: ["Run smoke tests before marking the run complete"],
    cancellationPolicy: "operator_cancel",
    status: "draft",
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
    status: "failed",
    errorMessage: "boom",
    failedAt: "2026-01-01T00:30:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    checkpointId: "checkpoint-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    snapshotState: {},
    taskStates: {},
    workspaceSnapshot: {
      branchName: "autopilot/project1/idea1",
      commitSha: "abc1234",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
    },
    createdAt: "2026-01-01T00:20:00.000Z",
    ...overrides,
  };
}

describe("invariant services", () => {
  it("accepts well-formed planning artifacts and delivery runs", () => {
    expect(() => validatePlanningArtifactInvariant(createPlanningArtifact())).not.toThrow();
    expect(() =>
      validateDeliveryRunCreation({
        run: createRun(),
        ideaStatus: "approved",
        activeLock: null,
      }),
    ).not.toThrow();
  });

  it("rejects malformed planning artifacts and active branch conflicts", () => {
    expect(() =>
      validatePlanningArtifactInvariant(
        createPlanningArtifact({
          approvalMode: "auto_approve",
          approvalChecklist: ["Only one item"],
        }),
      ),
    ).toThrow("at least two checklist items");

    expect(() =>
      validatePlanningArtifactInvariant(
        createPlanningArtifact({
          checkpointRequired: true,
          checkpointReason: undefined,
        }),
      ),
    ).toThrow("checkpointReason");

    expect(() =>
      validatePlanningArtifactInvariant(
        createPlanningArtifact({
          riskLevel: "high",
          checkpointRequired: false,
        }),
      ),
    ).toThrow("High-risk plans");

    const activeLock: ProductLock = {
      lockId: "lock-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "other-run",
      lockType: "product_lock",
      targetBranch: "autopilot/project1/idea1",
      targetPath: "",
      acquiredAt: "2026-01-01T00:00:00.000Z",
      releasedAt: null,
      isActive: true,
    };

    expect(() =>
      validateDeliveryRunCreation({
        run: createRun(),
        ideaStatus: "approved",
        activeLock,
      }),
    ).toThrow("already locked");
  });

  it("rejects duplicate rollback requests and invalid checkpoint linkage", () => {
    const existingRollback: RollbackAction = {
      rollbackId: "rollback-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkId: "check-1",
      rollbackType: "restore_checkpoint",
      status: "pending",
      checkpointId: "checkpoint-1",
      createdAt: "2026-01-01T00:40:00.000Z",
    };

    expect(() =>
      validateRollbackRequest({
        run: createRun(),
        check: createCheck(),
        existingRollbacks: [existingRollback],
        rollbackType: "restore_checkpoint",
        checkpoint: createCheckpoint(),
      }),
    ).toThrow("already pending");

    expect(() =>
      validateRollbackRequest({
        run: createRun(),
        check: createCheck(),
        existingRollbacks: [],
        rollbackType: "restore_checkpoint",
        checkpoint: createCheckpoint({
          runId: "other-run",
        }),
      }),
    ).toThrow("does not belong");
  });

  it("rejects cyclic convoy task dependency graphs", () => {
    expect(() =>
      validateConvoyDependencies({
        taskTitles: ["A", "B"],
        dependencies: [["1"], ["0"]],
      }),
    ).toThrow("cannot contain cycles");
  });

  it("enforces explicit cancellation semantics for checkpointed runs", () => {
    expect(() =>
      validateDeliveryRunCancellation({
        run: createRun(),
        artifact: { cancellationPolicy: "checkpoint_or_acknowledged_force" },
        checkpoints: [],
        reason: "Stop the run",
      }),
    ).toThrow("checkpoint before cancellation");

    expect(() =>
      validateDeliveryRunCancellation({
        run: createRun(),
        artifact: { cancellationPolicy: "checkpoint_or_acknowledged_force" },
        checkpoints: [],
        reason: "Emergency stop",
        force: true,
      }),
    ).not.toThrow();
  });
});
