import { describe, expect, it } from "vitest";
import type { Idea } from "../src/types.js";
import { scoreIdeaDuplicateCandidate } from "../src/services/duplicates.js";

function createIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding completion",
    description: "Users drop before activation during onboarding",
    rationale: "why",
    sourceReferences: ["https://example.com/source"],
    impactScore: 70,
    feasibilityScore: 65,
    category: "user_feedback",
    tags: ["user_feedback", "onboarding"],
    status: "active",
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("duplicate scoring", () => {
  it("scores highly similar ideas above the duplicate threshold", () => {
    const result = scoreIdeaDuplicateCandidate({
      title: "Improve onboarding completion",
      description: "Users drop before activation in onboarding flow",
      category: "user_feedback",
      tags: ["onboarding"],
      sourceReferences: ["https://example.com/source"],
    }, createIdea());

    expect(result.similarity).toBeGreaterThan(0.75);
    expect(result.reasons).toContain("near-identical title");
  });

  it("keeps unrelated ideas below the duplicate threshold", () => {
    const result = scoreIdeaDuplicateCandidate({
      title: "Reduce build pipeline latency",
      description: "CI jobs are too slow for backend services",
      category: "technical",
      tags: ["infra"],
      sourceReferences: ["https://example.com/ci"],
    }, createIdea());

    expect(result.similarity).toBeLessThan(0.5);
  });
});
