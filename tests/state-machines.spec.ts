import { describe, expect, it } from "vitest";
import {
  transitionConvoyTask,
  transitionDigest,
  transitionHealthCheck,
  transitionIdeaStatus,
  transitionRollback,
  transitionRunStatus,
} from "../src/services/state-machines.js";
import type {
  ConvoyTask,
  Digest,
  Idea,
  ReleaseHealthCheck,
  RollbackAction,
} from "../src/types.js";
import type {
  ConvoyTaskStatus,
  DigestStatus,
  HealthCheckStatus,
  IdeaStatus,
  RollbackStatus,
  RunStatus,
} from "../src/constants.js";

function createIdea(status: IdeaStatus): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding",
    description: "desc",
    rationale: "why",
    sourceReferences: [],
    impactScore: 70,
    feasibilityScore: 65,
    status,
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createRun(status: RunStatus) {
  return {
    status,
    paused: status === "paused",
    completedAt: ["completed", "failed", "cancelled"].includes(status) ? "2026-01-02T00:00:00.000Z" : null,
    commitSha: null,
  };
}

function createCheck(status: HealthCheckStatus): ReleaseHealthCheck {
  return {
    checkId: "check-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    checkType: "smoke_test",
    name: "Smoke",
    status,
    errorMessage: status === "failed" ? "boom" : undefined,
    failedAt: status === "failed" ? "2026-01-02T00:00:00.000Z" : undefined,
    passedAt: status === "passed" ? "2026-01-02T00:00:00.000Z" : undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function createRollback(status: RollbackStatus): RollbackAction {
  return {
    rollbackId: "rollback-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    checkId: "check-1",
    rollbackType: "restore_checkpoint",
    checkpointId: "checkpoint-1",
    status,
    completedAt: status === "completed" ? "2026-01-02T00:00:00.000Z" : undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function createDigest(status: DigestStatus): Digest {
  return {
    digestId: "digest-1",
    companyId: "company-1",
    projectId: "project-1",
    digestType: "stuck_run",
    title: "Run stuck",
    summary: "Run has not updated",
    details: [],
    priority: "high",
    status,
    deliveredAt: status === "delivered" ? "2026-01-02T00:00:00.000Z" : null,
    readAt: status === "read" ? "2026-01-02T00:00:00.000Z" : null,
    dismissedAt: status === "dismissed" ? "2026-01-02T00:00:00.000Z" : null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function createTask(status: ConvoyTaskStatus): ConvoyTask {
  return {
    taskId: "task-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    artifactId: "artifact-1",
    title: "Task",
    description: "",
    status,
    dependsOnTaskIds: [],
    startedAt: status === "running" ? "2026-01-02T00:00:00.000Z" : null,
    completedAt: ["passed", "failed", "skipped"].includes(status) ? "2026-01-02T00:00:00.000Z" : null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("state machine transition matrices", () => {
  it("enforces idea transition matrix", () => {
    expect(transitionIdeaStatus(createIdea("active"), "approved", "2026-01-02T00:00:00.000Z").status).toBe("approved");
    expect(() => transitionIdeaStatus(createIdea("completed"), "active", "2026-01-02T00:00:00.000Z")).toThrow("Invalid idea transition");
  });

  it("enforces run transition matrix", () => {
    expect(transitionRunStatus(createRun("pending"), "running", "2026-01-02T00:00:00.000Z").status).toBe("running");
    expect(() => transitionRunStatus(createRun("completed"), "running", "2026-01-02T00:00:00.000Z")).toThrow("Invalid delivery run transition");
  });

  it("enforces health-check transition matrix", () => {
    expect(transitionHealthCheck(createCheck("pending"), "running", "2026-01-02T00:00:00.000Z").status).toBe("running");
    expect(() => transitionHealthCheck(createCheck("passed"), "failed", "2026-01-02T00:00:00.000Z", "boom")).toThrow("Invalid release health transition");
  });

  it("enforces rollback transition matrix", () => {
    expect(transitionRollback(createRollback("pending"), "in_progress", "2026-01-02T00:00:00.000Z").status).toBe("in_progress");
    expect(() => transitionRollback(createRollback("completed"), "failed", "2026-01-02T00:00:00.000Z", "boom")).toThrow("Invalid rollback transition");
  });

  it("enforces digest transition matrix", () => {
    expect(transitionDigest(createDigest("pending"), "delivered", "2026-01-02T00:00:00.000Z").status).toBe("delivered");
    expect(() => transitionDigest(createDigest("dismissed"), "read", "2026-01-02T00:00:00.000Z")).toThrow("Invalid digest transition");
  });

  it("enforces convoy task transition matrix", () => {
    expect(transitionConvoyTask(createTask("blocked"), "pending", "2026-01-02T00:00:00.000Z").status).toBe("pending");
    expect(() => transitionConvoyTask(createTask("passed"), "running", "2026-01-02T00:00:00.000Z")).toThrow("Invalid convoy task transition");
  });
});
