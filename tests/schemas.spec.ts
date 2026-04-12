import { describe, expect, it } from "vitest";
import {
  autopilotProjectSchema,
  companyBudgetSchema,
  deliveryRunSchema,
  ideaSchema,
} from "../src/schemas.js";

describe("runtime schemas", () => {
  it("accepts a valid autopilot project", () => {
    const parsed = autopilotProjectSchema.parse({
      autopilotId: "ap-1",
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      automationTier: "supervised",
      budgetMinutes: 120,
      paused: false,
      autoCreateIssues: true,
      autoCreatePrs: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(parsed.projectId).toBe("project-1");
  });

  it("rejects an invalid automation tier", () => {
    expect(() =>
      autopilotProjectSchema.parse({
        autopilotId: "ap-1",
        companyId: "company-1",
        projectId: "project-1",
        enabled: true,
        automationTier: "chaos",
        budgetMinutes: 120,
        paused: false,
        autoCreateIssues: true,
        autoCreatePrs: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects negative budget usage", () => {
    expect(() =>
      companyBudgetSchema.parse({
        budgetId: "budget-1",
        companyId: "company-1",
        totalBudgetMinutes: 500,
        usedBudgetMinutes: -1,
        autopilotBudgetMinutes: 120,
        autopilotUsedMinutes: 10,
        paused: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("accepts a valid delivery run and idea payload", () => {
    const run = deliveryRunSchema.parse({
      runId: "run-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      title: "Improve onboarding copy",
      status: "running",
      automationTier: "supervised",
      branchName: "autopilot/project1/idea1",
      workspacePath: "/tmp/project",
      leasedPort: 3000,
      commitSha: null,
      paused: false,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const idea = ideaSchema.parse({
      ideaId: "idea-1",
      companyId: "company-1",
      projectId: "project-1",
      title: "Improve onboarding copy",
      description: "Rewrite initial screen copy",
      rationale: "Users churn during first-run setup",
      sourceReferences: [],
      impactScore: 70,
      feasibilityScore: 85,
      status: "active",
      duplicateAnnotated: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(run.status).toBe("running");
    expect(idea.status).toBe("active");
  });
});
