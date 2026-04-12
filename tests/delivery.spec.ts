import { describe, expect, it } from "vitest";
import {
  buildPendingDeliveryRun,
  buildPlanningArtifact,
  buildProductLock,
  buildWorkspaceLease,
  getAutomationTier,
  pauseDeliveryRun,
  releaseProductLock,
  releaseWorkspaceLease,
  resumeDeliveryRun,
  shouldCreateDeliveryRun,
  shouldReleaseRunResources,
  updateDeliveryRunStatus,
} from "../src/services/delivery.js";
import type { AutopilotProject, Idea } from "../src/types.js";

function createIdea(): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding",
    description: "desc",
    rationale: "why",
    sourceReferences: [],
    impactScore: 70,
    feasibilityScore: 80,
    technicalApproach: "Ship better UX copy",
    status: "active",
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createProject(): AutopilotProject {
  return {
    autopilotId: "ap-1",
    companyId: "company-1",
    projectId: "project-1",
    enabled: true,
    automationTier: "semiauto",
    budgetMinutes: 120,
    paused: false,
    autoCreateIssues: true,
    autoCreatePrs: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("delivery services", () => {
  it("builds planning artifacts from an idea and automation tier", () => {
    const artifact = buildPlanningArtifact({
      artifactId: "artifact-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      idea: createIdea(),
      automationTier: "semiauto",
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    expect(artifact.title).toContain("Plan:");
    expect(artifact.approvalMode).toBe("manual");
    expect(artifact.implementationSpec).toBe("Ship better UX copy");
  });

  it("decides correctly when delivery should start from a swipe", () => {
    expect(shouldCreateDeliveryRun({ decision: "now", autopilotEnabled: true, automationTier: "supervised" })).toBe(true);
    expect(shouldCreateDeliveryRun({ decision: "yes", autopilotEnabled: true, automationTier: "semiauto" })).toBe(true);
    expect(shouldCreateDeliveryRun({ decision: "yes", autopilotEnabled: true, automationTier: "supervised" })).toBe(false);
    expect(shouldCreateDeliveryRun({ decision: "yes", autopilotEnabled: false, automationTier: "fullauto" })).toBe(false);
  });

  it("builds pending runs, workspace leases, and product locks", () => {
    const idea = createIdea();
    const run = buildPendingDeliveryRun({
      runId: "run-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      idea,
      automationTier: "fullauto",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3001,
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const lease = buildWorkspaceLease({
      leaseId: "lease-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      workspacePath: "/tmp/project",
      branchName: "autopilot/project1/idea1",
      leasedPort: 3001,
      gitRepoRoot: "https://github.com/example/repo",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const lock = buildProductLock({
      lockId: "lock-1",
      companyId: "company-1",
      projectId: "project-1",
      runId: "run-1",
      branchName: "autopilot/project1/idea1",
      acquiredAt: "2026-01-02T00:00:00.000Z",
    });

    expect(run.status).toBe("pending");
    expect(run.leasedPort).toBe(3001);
    expect(lease.isActive).toBe(true);
    expect(lock.lockType).toBe("product_lock");
  });

  it("derives the automation tier from the project when present", () => {
    expect(getAutomationTier(createProject())).toBe("semiauto");
    expect(getAutomationTier(null)).toBe("supervised");
  });

  it("updates run lifecycle state and releases resources when terminal", () => {
    const run = buildPendingDeliveryRun({
      runId: "run-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      idea: createIdea(),
      automationTier: "semiauto",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3001,
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const updated = updateDeliveryRunStatus({
      run,
      status: "completed",
      commitSha: "abc123",
      prUrl: "https://github.com/example/repo/pull/1",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
    const paused = pauseDeliveryRun(run, "2026-01-03T01:00:00.000Z", "Manual review");
    const resumed = resumeDeliveryRun(paused, "2026-01-03T02:00:00.000Z");
    const lease = releaseWorkspaceLease(
      buildWorkspaceLease({
        leaseId: "lease-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        workspacePath: "/tmp/project",
        branchName: "autopilot/project1/idea1",
        leasedPort: 3001,
        gitRepoRoot: "https://github.com/example/repo",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
      "2026-01-03T03:00:00.000Z",
    );
    const lock = releaseProductLock(
      buildProductLock({
        lockId: "lock-1",
        companyId: "company-1",
        projectId: "project-1",
        runId: "run-1",
        branchName: "autopilot/project1/idea1",
        acquiredAt: "2026-01-02T00:00:00.000Z",
      }),
      "2026-01-03T03:00:00.000Z",
    );

    expect(updated.status).toBe("completed");
    expect(updated.commitSha).toBe("abc123");
    expect(updated.completedAt).toBe("2026-01-03T00:00:00.000Z");
    expect(paused.paused).toBe(true);
    expect(resumed.status).toBe("running");
    expect(resumed.pauseReason).toBeUndefined();
    expect(lease.isActive).toBe(false);
    expect(lock.isActive).toBe(false);
    expect(shouldReleaseRunResources("completed")).toBe(true);
    expect(shouldReleaseRunResources("running")).toBe(false);
  });
});
