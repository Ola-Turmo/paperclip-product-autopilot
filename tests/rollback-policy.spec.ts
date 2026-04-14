import { describe, expect, it } from "vitest";
import type { Checkpoint, DeliveryRun, ReleaseHealthCheck } from "../src/types.js";
import { resolveRollbackRequest } from "../src/services/rollback-policy.js";

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

describe("rollback policy", () => {
  it("prefers restoring the latest checkpoint when one exists", () => {
    const resolved = resolveRollbackRequest({
      run: createRun(),
      check: createCheck(),
      checkpoints: [
        createCheckpoint({ checkpointId: "checkpoint-old", createdAt: "2026-01-01T00:10:00.000Z" }),
        createCheckpoint({ checkpointId: "checkpoint-new", createdAt: "2026-01-01T00:20:00.000Z" }),
      ],
    });

    expect(resolved.rollbackType).toBe("restore_checkpoint");
    expect(resolved.checkpointId).toBe("checkpoint-new");
  });

  it("falls back to revert_commit when no checkpoint exists but a commit sha does", () => {
    const resolved = resolveRollbackRequest({
      run: createRun(),
      check: createCheck(),
      checkpoints: [],
    });

    expect(resolved.rollbackType).toBe("revert_commit");
    expect(resolved.targetCommitSha).toBe("abc1234");
  });

  it("falls back to full_rollback when neither checkpoint nor commit sha exists", () => {
    const resolved = resolveRollbackRequest({
      run: createRun({ commitSha: null }),
      check: createCheck(),
      checkpoints: [],
    });

    expect(resolved.rollbackType).toBe("full_rollback");
  });
});
