import { beforeEach, describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import { createAutopilotRepository } from "../src/repositories/autopilot.js";
import type {
  AutopilotProject,
  CompanyBudget,
  DeliveryRun,
  Idea,
  ProductLock,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
  WorkspaceLease,
} from "../src/types.js";

function createProject(overrides: Partial<AutopilotProject> = {}): AutopilotProject {
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
    ...overrides,
  };
}

function createBudget(overrides: Partial<CompanyBudget> = {}): CompanyBudget {
  return {
    budgetId: "budget-1",
    companyId: "company-1",
    totalBudgetMinutes: 500,
    usedBudgetMinutes: 10,
    autopilotBudgetMinutes: 120,
    autopilotUsedMinutes: 20,
    paused: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding",
    description: "Reduce first-run friction",
    rationale: "Users drop before activation",
    sourceReferences: [],
    impactScore: 80,
    feasibilityScore: 70,
    status: "active",
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
    title: "Improve onboarding",
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
    ...overrides,
  };
}

function createLease(overrides: Partial<WorkspaceLease> = {}): WorkspaceLease {
  return {
    leaseId: "lease-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    workspacePath: "/tmp/project",
    branchName: "autopilot/project1/idea1",
    leasedPort: 3000,
    gitRepoRoot: "/tmp/project",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    releasedAt: null,
    ...overrides,
  };
}

function createLock(overrides: Partial<ProductLock> = {}): ProductLock {
  return {
    lockId: "lock-1",
    companyId: "company-1",
    projectId: "project-1",
    runId: "run-1",
    lockType: "product_lock",
    targetBranch: "main",
    targetPath: "",
    acquiredAt: "2026-01-01T00:00:00.000Z",
    releasedAt: null,
    isActive: true,
    ...overrides,
  };
}

function createProgramRevision(overrides: Partial<ProductProgramRevision> = {}): ProductProgramRevision {
  return {
    revisionId: "revision-1",
    companyId: "company-1",
    projectId: "project-1",
    content: "Program content",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createResearchCycle(overrides: Partial<ResearchCycle> = {}): ResearchCycle {
  return {
    cycleId: "cycle-1",
    companyId: "company-1",
    projectId: "project-1",
    status: "running",
    query: "Research product opportunities",
    findingsCount: 0,
    startedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "company-1",
    projectId: "project-1",
    cycleId: "cycle-1",
    title: "Improve onboarding completion",
    description: "Users drop before activation",
    confidence: 0.9,
    category: "user_feedback",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("autopilot repository", () => {
  let harness: ReturnType<typeof createTestHarness>;

  beforeEach(() => {
    harness = createTestHarness({ manifest });
  });

  it("round-trips autopilot project and budget records", async () => {
    const repo = createAutopilotRepository(harness.ctx);
    await repo.upsertAutopilotProject(createProject());
    await repo.upsertCompanyBudget(createBudget());

    const project = await repo.getAutopilotProject("company-1", "project-1");
    const budget = await repo.getCompanyBudget("company-1");
    const projects = await repo.listAutopilotProjects("company-1");

    expect(project?.autopilotId).toBe("ap-1");
    expect(budget?.budgetId).toBe("budget-1");
    expect(projects).toHaveLength(1);
  });

  it("returns active lease and lock lookups consistently", async () => {
    const repo = createAutopilotRepository(harness.ctx);
    await repo.upsertWorkspaceLease(createLease());
    await repo.upsertProductLock(createLock());

    const lease = await repo.getActiveWorkspaceLease("project-1", "run-1");
    const lock = await repo.getActiveProductLock("project-1", "main");
    const locks = await repo.listProductLocks("company-1", "project-1");

    expect(lease?.leaseId).toBe("lease-1");
    expect(lock?.lockId).toBe("lock-1");
    expect(locks).toHaveLength(1);
  });

  it("sorts latest program revisions and filters research findings by cycle", async () => {
    const repo = createAutopilotRepository(harness.ctx);
    await repo.upsertProductProgramRevision(createProgramRevision({ revisionId: "revision-1", version: 1 }));
    await repo.upsertProductProgramRevision(createProgramRevision({ revisionId: "revision-2", version: 2 }));
    await repo.upsertResearchCycle(createResearchCycle({ cycleId: "cycle-1", startedAt: "2026-01-01T00:00:00.000Z" }));
    await repo.upsertResearchCycle(createResearchCycle({
      cycleId: "cycle-2",
      status: "completed",
      startedAt: "2026-01-02T00:00:00.000Z",
    }));
    await repo.upsertResearchFinding(createFinding({ findingId: "finding-1", cycleId: "cycle-1" }));
    await repo.upsertResearchFinding(createFinding({ findingId: "finding-2", cycleId: "cycle-2" }));

    const latestProgram = await repo.getLatestProductProgram("company-1", "project-1");
    const cycles = await repo.listResearchCycles("company-1", "project-1");
    const findings = await repo.listResearchFindings("company-1", "project-1", "cycle-2");

    expect(latestProgram?.version).toBe(2);
    expect(cycles[0]?.cycleId).toBe("cycle-2");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.findingId).toBe("finding-2");
  });

  it("uses duplicate lookup consistently through the repository facade", async () => {
    const repo = createAutopilotRepository(harness.ctx);
    await repo.upsertIdea(createIdea({
      title: "Improve onboarding copy",
      description: "Reduce first-run friction",
      category: "user_feedback",
      tags: ["activation"],
    }));

    const duplicate = await repo.findDuplicateIdea(
      "company-1",
      "project-1",
      "Improve onboarding copy",
      "Reduce friction during first run",
      undefined,
      { category: "user_feedback", tags: ["activation"] },
    );

    expect(duplicate?.idea.ideaId).toBe("idea-1");
    expect(duplicate?.similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("lists delivery runs by requested status", async () => {
    const repo = createAutopilotRepository(harness.ctx);
    await repo.upsertDeliveryRun(createRun({ runId: "run-1", status: "running" }));
    await repo.upsertDeliveryRun(createRun({
      runId: "run-2",
      status: "completed",
      completedAt: "2026-01-01T01:00:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
    }));

    const running = await repo.listDeliveryRuns("company-1", "project-1", "running");
    const completed = await repo.listDeliveryRuns("company-1", "project-1", "completed");

    expect(running).toHaveLength(1);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.runId).toBe("run-2");
  });
});
