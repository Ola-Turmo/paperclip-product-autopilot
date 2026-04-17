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
  it("holds duplicate scoring stable across regression fixtures", () => {
    const cases = [
      {
        caseId: "near-identical",
        candidate: {
          title: "Improve onboarding completion",
          description: "Users drop before activation in onboarding flow",
          category: "user_feedback",
          tags: ["onboarding"],
          sourceReferences: ["https://example.com/source"],
        },
        expectedMinSimilarity: 0.75,
        expectedReasons: ["near-identical title", "shared source reference"],
      },
      {
        caseId: "tag-and-category-overlapping",
        candidate: {
          title: "Improve onboarding flow completion",
          description: "Activation drops during first-run onboarding",
          category: "user_feedback",
          tags: ["user_feedback", "onboarding"],
          sourceReferences: [],
        },
        expectedMinSimilarity: 0.65,
        expectedReasons: ["same category", "overlapping tags"],
      },
      {
        caseId: "same-title-different-category",
        candidate: {
          title: "Improve onboarding completion",
          description: "Marketing handoff is missing before demo signup",
          category: "opportunity",
          tags: ["sales"],
          sourceReferences: [],
        },
        expectedMinSimilarity: 0.55,
        expectedReasons: ["near-identical title"],
      },
      {
        caseId: "unrelated",
        candidate: {
          title: "Reduce build pipeline latency",
          description: "CI jobs are too slow for backend services",
          category: "technical",
          tags: ["infra"],
          sourceReferences: ["https://example.com/ci"],
        },
        expectedMaxSimilarity: 0.5,
        expectedReasons: [],
      },
    ] as const;

    for (const testCase of cases) {
      const result = scoreIdeaDuplicateCandidate(testCase.candidate, createIdea());
      if ("expectedMinSimilarity" in testCase) {
        expect(result.similarity, testCase.caseId).toBeGreaterThanOrEqual(testCase.expectedMinSimilarity);
      }
      if ("expectedMaxSimilarity" in testCase) {
        expect(result.similarity, testCase.caseId).toBeLessThan(testCase.expectedMaxSimilarity);
      }
      for (const reason of testCase.expectedReasons) {
        expect(result.reasons, testCase.caseId).toContain(reason);
      }
    }
  });
});
