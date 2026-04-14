import { describe, expect, it } from "vitest";
import type { ResearchFinding } from "../src/types.js";
import { buildResearchCycleSnapshot } from "../src/services/research.js";

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "company-1",
    projectId: "project-1",
    cycleId: "cycle-1",
    title: "Improve onboarding completion",
    description: "Users drop before activation",
    sourceUrl: "https://support.example.com/tickets/123",
    sourceLabel: "support-ticket",
    category: "user_feedback",
    confidence: 0.92,
    signalFamily: "support",
    topic: "onboarding-completion",
    dedupeKey: "onboarding-completion|improve onboarding completion",
    sourceQualityScore: 78,
    freshnessScore: 92,
    duplicateAnnotated: false,
    createdAt: "2026-04-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("research cycle snapshot", () => {
  it("summarizes finding ids, topics, signal families, and quality scores", () => {
    const snapshot = buildResearchCycleSnapshot([
      createFinding(),
      createFinding({
        findingId: "finding-2",
        topic: "signup-friction",
        signalFamily: "analytics",
        sourceQualityScore: 70,
        freshnessScore: 80,
        duplicateAnnotated: true,
        duplicateOfFindingId: "finding-1",
      }),
    ], "2026-04-14T12:00:00.000Z");

    expect(snapshot.findingIds).toEqual(["finding-1", "finding-2"]);
    expect(snapshot.topicCounts["onboarding-completion"]).toBe(1);
    expect(snapshot.signalFamilyCounts.support).toBe(1);
    expect(snapshot.signalFamilyCounts.analytics).toBe(1);
    expect(snapshot.duplicateCount).toBe(1);
    expect(snapshot.averageFreshnessScore).toBeGreaterThan(80);
  });
});
