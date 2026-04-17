import { describe, expect, it } from "vitest";
import { buildRollbackClosureSummaryDraft, buildRollbackKnowledgeEntryDraft } from "../src/services/recovery-learning.js";
import { buildCheckpoint, buildReleaseHealthCheck, buildRollbackAction, updateReleaseHealthCheck, updateRollbackAction } from "../src/services/lifecycle.js";
import type { DeliveryRun } from "../src/types.js";

function createRun(): DeliveryRun {
  return {
    runId: "run-1",
    companyId: "company-1",
    projectId: "project-1",
    ideaId: "idea-1",
    artifactId: "artifact-1",
    title: "Recover onboarding rollout",
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
  };
}

describe("recovery learning service", () => {
  it("builds rollback closure learner summaries and knowledge drafts", () => {
    const checkpoint = buildCheckpoint({
      checkpointId: "checkpoint-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      run: createRun(),
      tasks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      label: "Before risky deploy",
    });
    const check = updateReleaseHealthCheck(
      buildReleaseHealthCheck({
        checkId: "check-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Smoke",
        createdAt: "2026-01-01T00:05:00.000Z",
      }),
      "failed",
      "2026-01-01T00:07:00.000Z",
      "Homepage 500",
    );
    const rollback = updateRollbackAction(
      buildRollbackAction({
        rollbackId: "rollback-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        checkpointId: checkpoint.checkpointId,
        createdAt: "2026-01-01T00:08:00.000Z",
      }),
      "completed",
      "2026-01-01T00:12:00.000Z",
    );

    const summary = buildRollbackClosureSummaryDraft({
      companyId: "company-1",
      projectId: "project-1",
      run: createRun(),
      rollback,
      relatedCheck: check,
      checkpoint,
      relatedDigestId: "digest-1",
      createdAt: "2026-01-01T00:12:00.000Z",
    });
    const knowledge = buildRollbackKnowledgeEntryDraft({
      companyId: "company-1",
      projectId: "project-1",
      run: createRun(),
      rollback,
      relatedCheck: check,
      checkpoint,
      relatedDigestId: "digest-1",
      createdAt: "2026-01-01T00:12:00.000Z",
      sourceSummaryId: "summary-1",
    });

    expect(summary.title).toContain("Rollback recovery");
    expect(summary.summaryText).toContain("recovery time 5m");
    expect(summary.keyLearnings.some((entry) => entry.includes("Failed check"))).toBe(true);
    expect(summary.skillsReinjected).toContain("checkpoint restore");
    expect(summary.metrics.duration).toBe(300000);
    expect(summary.sourceRollbackId).toBe("rollback-1");
    expect(summary.sourceCheckId).toBe("check-1");
    expect(summary.sourceCheckpointId).toBe("checkpoint-1");
    expect(summary.sourceDigestId).toBe("digest-1");
    expect(knowledge.knowledgeType).toBe("procedure");
    expect(knowledge.content).toContain("Before risky deploy");
    expect(knowledge.sourceRollbackId).toBe("rollback-1");
    expect(knowledge.sourceCheckId).toBe("check-1");
    expect(knowledge.sourceCheckpointId).toBe("checkpoint-1");
    expect(knowledge.sourceDigestId).toBe("digest-1");
    expect(knowledge.tags).toEqual(expect.arrayContaining(["rollback", "restore_checkpoint", "completed"]));
  });
});
