import { describe, expect, it } from "vitest";
import type { PreferenceProfile, ResearchFinding } from "../src/types.js";
import { evaluateIdeationReplay } from "../src/services/evaluation.js";

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "company-1",
    projectId: "project-1",
    cycleId: "cycle-1",
    title: "Improve onboarding completion",
    description: "Users drop before activation",
    category: "user_feedback",
    confidence: 0.9,
    signalFamily: "support",
    topic: "onboarding-completion",
    dedupeKey: "onboarding-completion|improve onboarding completion",
    sourceQualityScore: 72,
    freshnessScore: 88,
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createProfile(): PreferenceProfile {
  return {
    profileId: "profile-1",
    companyId: "company-1",
    projectId: "project-1",
    passCount: 1,
    maybeCount: 1,
    yesCount: 3,
    nowCount: 2,
    totalSwipes: 7,
    categoryPreferences: {
      user_feedback: { pass: 0, maybe: 1, yes: 3, now: 2 },
      technical: { pass: 2, maybe: 0, yes: 0, now: 0 },
    },
    tagPreferences: {},
    complexityPreferences: {
      low: { pass: 0, maybe: 0, yes: 1, now: 1 },
      medium: { pass: 0, maybe: 1, yes: 2, now: 1 },
      high: { pass: 1, maybe: 0, yes: 0, now: 0 },
    },
    avgApprovedScore: 74,
    avgRejectedScore: 40,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };
}

describe("evaluation service", () => {
  it("computes replay metrics for ideation ranking", () => {
    const summary = evaluateIdeationReplay([
      {
        caseId: "case-1",
        profile: createProfile(),
        findings: [
          createFinding({ findingId: "f-1", title: "Improve activation", category: "user_feedback", confidence: 0.92 }),
          createFinding({ findingId: "f-2", title: "Reduce flaky deploys", category: "technical", confidence: 0.91 }),
        ],
        expectedTopFindingIds: ["f-1"],
      },
      {
        caseId: "case-2",
        profile: createProfile(),
        findings: [
          createFinding({ findingId: "f-3", title: "Fix checkout errors", category: "opportunity", confidence: 0.88 }),
          createFinding({ findingId: "f-4", title: "Improve onboarding", category: "user_feedback", confidence: 0.83 }),
          createFinding({ findingId: "f-5", title: "Stabilize CI", category: "technical", confidence: 0.95 }),
        ],
        expectedTopFindingIds: ["f-3", "f-4"],
      },
    ]);

    expect(summary.totalCases).toBe(2);
    expect(summary.top1Accuracy).toBeGreaterThanOrEqual(0.5);
    expect(summary.top3Accuracy).toBe(1);
    expect(summary.meanReciprocalRank).toBeGreaterThan(0.6);
    expect(summary.results[0]?.rankedFindingIds[0]).toBe("f-1");
  });
});
