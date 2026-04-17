import { describe, expect, it } from "vitest";
import {
  applyRollbackOutcomeToRun,
  buildCheckpoint,
  buildReleaseHealthCheck,
  buildRestoredConvoyTask,
  buildRollbackAction,
  canTriggerRollback,
  checkpointSummary,
  describeCheckpointPolicy,
  summarizeRunRemediationState,
  summarizeReleaseHealthChecks,
  updateRollbackAction,
  validateCheckpointRestore,
  updateReleaseHealthCheck,
} from "../src/services/lifecycle.js";
import { requiresCheckpointForRunGate } from "../src/services/delivery.js";
import type { ConvoyTask, DeliveryRun } from "../src/types.js";

function createRun(): DeliveryRun {
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
    commitSha: null,
    paused: false,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createTask(): ConvoyTask {
  return {
    taskId: "task-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    artifactId: "artifact-1",
    title: "Implement onboarding fix",
    description: "desc",
    status: "running",
    dependsOnTaskIds: [],
    startedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("lifecycle services", () => {
  it("builds checkpoints and restores convoy tasks", () => {
    const checkpoint = buildCheckpoint({
      checkpointId: "checkpoint-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      run: createRun(),
      tasks: [createTask()],
      createdAt: "2026-01-02T00:00:00.000Z",
      label: "Before risky change",
    });
    const restoredTask = buildRestoredConvoyTask(createTask(), "blocked", "2026-01-03T00:00:00.000Z");

    expect(checkpoint.taskStates["task-1"]).toBe("running");
    expect(checkpointSummary(checkpoint)).toBe("Before risky change");
    expect(restoredTask.status).toBe("blocked");
  });

  it("validates checkpoint restores and rejects inconsistent state", () => {
    const checkpoint = buildCheckpoint({
      checkpointId: "checkpoint-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      run: createRun(),
      tasks: [createTask()],
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    expect(() =>
      validateCheckpointRestore({
        run: { ...createRun(), status: "completed", completedAt: "2026-01-02T00:00:00.000Z" },
        checkpoint,
        tasks: [createTask()],
      }),
    ).toThrow("terminal run status");

    expect(() =>
      validateCheckpointRestore({
        run: { ...createRun(), branchName: "other-branch" },
        checkpoint,
        tasks: [createTask()],
      }),
    ).toThrow("branch");
  });

  it("builds and updates release health checks", () => {
    const check = buildReleaseHealthCheck({
      checkId: "check-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkType: "smoke_test",
      name: "Smoke test",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const updated = updateReleaseHealthCheck(check, "failed", "2026-01-03T00:00:00.000Z", "boom");

    expect(check.status).toBe("pending");
    expect(updated.status).toBe("failed");
    expect(updated.errorMessage).toBe("boom");
    expect(updated.failedAt).toBe("2026-01-03T00:00:00.000Z");
  });

  it("aggregates release health into an overall status", () => {
    const summary = summarizeReleaseHealthChecks([
      updateReleaseHealthCheck(
        buildReleaseHealthCheck({
          checkId: "check-1",
          companyId: "company-1",
          projectId: "project-1",
          runId: "run-1",
          checkType: "smoke_test",
          name: "Smoke test",
          createdAt: "2026-01-02T00:00:00.000Z",
        }),
        "failed",
        "2026-01-03T00:00:00.000Z",
        "boom",
      ),
      buildReleaseHealthCheck({
        checkId: "check-2",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "integration_test",
        name: "Integration test",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ]);

    expect(summary.failed).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.overallStatus).toBe("blocked");
  });

  it("builds rollback actions", () => {
    const rollback = buildRollbackAction({
      rollbackId: "rollback-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkId: "check-1",
      rollbackType: "restore_checkpoint",
      checkpointId: "checkpoint-1",
      createdAt: "2026-01-03T00:00:00.000Z",
    });

    expect(rollback.status).toBe("pending");
    expect(rollback.rollbackType).toBe("restore_checkpoint");
    expect(rollback.checkpointId).toBe("checkpoint-1");
    expect(canTriggerRollback(updateReleaseHealthCheck(
      buildReleaseHealthCheck({
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke test",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
      "failed",
      "2026-01-03T00:00:00.000Z",
    ))).toBe(true);
  });

  it("updates rollback actions and applies rollback outcomes to the run", () => {
    const rollback = updateRollbackAction(
      buildRollbackAction({
        rollbackId: "rollback-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        checkpointId: "checkpoint-1",
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
      "completed",
      "2026-01-03T00:10:00.000Z",
    );
    const pausedRun = applyRollbackOutcomeToRun({
      run: createRun(),
      rollback,
      updatedAt: "2026-01-03T00:10:00.000Z",
    });
    const failedRun = applyRollbackOutcomeToRun({
      run: createRun(),
      rollback: { ...rollback, status: "failed", rollbackType: "revert_commit" },
      updatedAt: "2026-01-03T00:20:00.000Z",
      errorMessage: "Revert failed",
    });

    expect(rollback.status).toBe("completed");
    expect(rollback.completedAt).toBe("2026-01-03T00:10:00.000Z");
    expect(pausedRun.status).toBe("paused");
    expect(pausedRun.pauseReason).toContain("Rollback completed");
    expect(failedRun.status).toBe("failed");
    expect(failedRun.error).toBe("Revert failed");
  });

  it("summarizes remediation state for failed and recovered runs", () => {
    const checkpoint = buildCheckpoint({
      checkpointId: "checkpoint-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      run: createRun(),
      tasks: [createTask()],
      createdAt: "2026-01-03T00:00:00.000Z",
      label: "Before risky deploy",
    });
    const failedCheck = updateReleaseHealthCheck(
      buildReleaseHealthCheck({
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke test",
        createdAt: "2026-01-03T00:05:00.000Z",
      }),
      "failed",
      "2026-01-03T00:07:00.000Z",
      "Homepage 500",
    );
    const completedRollback = updateRollbackAction(
      buildRollbackAction({
        rollbackId: "rollback-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        checkpointId: "checkpoint-1",
        createdAt: "2026-01-03T00:08:00.000Z",
      }),
      "completed",
      "2026-01-03T00:12:00.000Z",
    );

    const recoveredSummary = summarizeRunRemediationState({
      run: { ...createRun(), status: "paused", pauseReason: "Rollback completed: restore_checkpoint" },
      checks: [failedCheck],
      rollbacks: [completedRollback],
      checkpoints: [checkpoint],
    });
    const blockedSummary = summarizeRunRemediationState({
      run: createRun(),
      checks: [failedCheck],
      rollbacks: [],
      checkpoints: [],
    });

    expect(recoveredSummary.status).toBe("recovered");
    expect(recoveredSummary.headline).toContain("Rollback completed");
    expect(recoveredSummary.recoveryTimeLabel).toBe("5m");
    expect(recoveredSummary.checkpointAgeLabel).toBe("12m");
    expect(blockedSummary.status).toBe("blocked");
    expect(blockedSummary.headline).toContain("Health check failed");
    expect(blockedSummary.nextSteps[0]).toContain("Create a checkpoint");
  });

  it("rejects invalid release health and rollback inputs", () => {
    const check = buildReleaseHealthCheck({
      checkId: "check-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkType: "smoke_test",
      name: "Smoke test",
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    const passed = updateReleaseHealthCheck(check, "passed", "2026-01-03T00:00:00.000Z");

    expect(() =>
      updateReleaseHealthCheck(passed, "failed", "2026-01-04T00:00:00.000Z", "boom"),
    ).toThrow("Invalid release health transition");

    expect(() =>
      buildRollbackAction({
        rollbackId: "rollback-2",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
    ).toThrow("checkpointId is required");
  });

  it("describes whether checkpoint policy is required and satisfied", () => {
    const artifact = {
      artifactId: "artifact-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      title: "Plan",
      goalAlignmentSummary: "Goal",
      implementationSpec: "Spec",
      dependencies: [],
      rolloutPlan: "Rollout",
      testPlan: "Tests",
      approvalChecklist: ["Review"],
      executionMode: "convoy" as const,
      approvalMode: "manual" as const,
      checkpointRequired: true,
      checkpointReason: "Convoy execution requires a checkpoint before risky multi-step delivery.",
      automationTier: "semiauto" as const,
      status: "approved" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const gateWithoutCheckpoint = requiresCheckpointForRunGate({ artifact, checkpoints: [] });
    const gateWithCheckpoint = requiresCheckpointForRunGate({ artifact, checkpoints: [{ checkpointId: "checkpoint-1" }] });

    expect(gateWithoutCheckpoint.required).toBe(true);
    expect(gateWithoutCheckpoint.satisfied).toBe(false);
    expect(gateWithCheckpoint.satisfied).toBe(true);
    expect(describeCheckpointPolicy(artifact)).toContain("checkpoint");
  });
});
