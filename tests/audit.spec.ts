import { describe, expect, it } from "vitest";
import type {
  Checkpoint,
  DeliveryRun,
  Digest,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
  ReleaseHealthCheck,
  RollbackAction,
} from "../src/types.js";
import { buildRunAuditTimeline } from "../src/services/audit.js";

describe("audit timeline", () => {
  it("builds a reverse-chronological run audit timeline", () => {
    const run: DeliveryRun = {
      runId: "run-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      title: "Improve onboarding",
      status: "failed",
      automationTier: "semiauto",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
      commitSha: null,
      paused: false,
      completedAt: "2026-01-03T00:00:00.000Z",
      error: "vitest assertion failed",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    };
    const checks: ReleaseHealthCheck[] = [{
      checkId: "check-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkType: "smoke_test",
      name: "Smoke",
      status: "failed",
      errorMessage: "build failed during deploy",
      failedAt: "2026-01-03T00:05:00.000Z",
      createdAt: "2026-01-02T00:00:00.000Z",
    }];
    const interventions: OperatorIntervention[] = [{
      interventionId: "int-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      interventionType: "note",
      note: "Investigate failure",
      createdAt: "2026-01-03T00:10:00.000Z",
    }];
    const checkpoints: Checkpoint[] = [{
      checkpointId: "cp-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      label: "Before deploy",
      snapshotState: {},
      taskStates: {},
      workspaceSnapshot: {
        branchName: "autopilot/project1/idea1",
        commitSha: null,
        workspacePath: "/tmp/project",
        leasedPort: 3000,
      },
      createdAt: "2026-01-02T23:55:00.000Z",
    }];
    const rollbacks: RollbackAction[] = [{
      rollbackId: "rb-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      checkId: "check-1",
      rollbackType: "restore_checkpoint",
      status: "completed",
      checkpointId: "cp-1",
      completedAt: "2026-01-03T00:15:00.000Z",
      createdAt: "2026-01-03T00:12:00.000Z",
    }];
    const digests: Digest[] = [{
      digestId: "dg-1",
      companyId: "company-1",
      projectId: "project-1",
      digestType: "stuck_run",
      title: "Run stuck",
      summary: "Run was not updated",
      details: [],
      priority: "high",
      status: "dismissed",
      deliveredAt: null,
      readAt: null,
      dismissedAt: "2026-01-03T00:20:00.000Z",
      relatedRunId: "run-1",
      createdAt: "2026-01-03T00:18:00.000Z",
    }];
    const summaries: LearnerSummary[] = [{
      summaryId: "summary-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      ideaId: "idea-1",
      sourceRollbackId: "rb-1",
      sourceCheckId: "check-1",
      sourceCheckpointId: "cp-1",
      sourceDigestId: "dg-1",
      title: "Rollback recovery for Improve onboarding",
      summaryText: "Smoke failed | restore checkpoint completed | recovery time 10m",
      keyLearnings: ["Failed check: Smoke"],
      skillsReinjected: ["checkpoint restore"],
      metrics: { duration: 600000 },
      createdAt: "2026-01-03T00:16:00.000Z",
    }];
    const knowledgeEntries: KnowledgeEntry[] = [{
      entryId: "knowledge-1",
      companyId: "company-1",
      projectId: "project-1",
      knowledgeType: "procedure",
      title: "Recovery procedure: restore checkpoint",
      content: "Run: Improve onboarding",
      sourceRunId: "run-1",
      sourceSummaryId: "summary-1",
      sourceRollbackId: "rb-1",
      sourceCheckId: "check-1",
      sourceCheckpointId: "cp-1",
      sourceDigestId: "dg-1",
      usageCount: 0,
      tags: ["rollback"],
      createdAt: "2026-01-03T00:17:00.000Z",
      updatedAt: "2026-01-03T00:17:00.000Z",
    }];

    const events = buildRunAuditTimeline({
      run,
      checks,
      interventions,
      checkpoints,
      rollbacks,
      digests,
      summaries,
      knowledgeEntries,
    });

    expect(events[0]?.id).toBe("dg-1");
    expect(events[1]?.id).toBe("knowledge-1");
    expect(events[2]?.id).toBe("summary-1");
    expect(events[3]?.id).toBe("rb-1");
    expect(events.some((event) => event.detail.includes("build failure"))).toBe(true);
    expect(events.some((event) => event.detail.includes("digest dg-1"))).toBe(true);
    expect(events.at(-1)?.id).toBe("run-created-run-1");
  });
});
