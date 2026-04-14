import { describe, expect, it } from "vitest";
import type { ResearchFinding } from "../src/types.js";
import {
  computeFindingFreshnessScore,
  computeSourceQualityScore,
  createResearchFindingRecord,
  findDuplicateResearchFinding,
} from "../src/services/research.js";

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
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("research service", () => {
  it("builds enriched research findings with provenance scores", () => {
    const finding = createResearchFindingRecord({
      findingId: "finding-1",
      companyId: "company-1",
      projectId: "project-1",
      cycleId: "cycle-1",
      title: "Improve onboarding completion",
      description: "Users drop before activation",
      sourceUrl: "https://support.example.com/tickets/123",
      sourceLabel: "support-ticket",
      evidenceText: "Several users report confusion during account setup.",
      category: "user_feedback",
      confidence: 0.92,
      createdAt: "2026-04-14T00:00:00.000Z",
    });

    expect(finding.signalFamily).toBe("support");
    expect(finding.topic).toContain("onboarding");
    expect(finding.sourceQualityScore).toBeGreaterThan(50);
    expect(finding.freshnessScore).toBeGreaterThan(50);
    expect(finding.duplicateAnnotated).toBe(false);
  });

  it("scores freshness and source quality in the expected direction", () => {
    const fresh = computeFindingFreshnessScore("2026-01-14T00:00:00.000Z", new Date("2026-01-14T12:00:00.000Z"));
    const stale = computeFindingFreshnessScore("2025-10-01T00:00:00.000Z", new Date("2026-01-14T12:00:00.000Z"));
    const strongSource = computeSourceQualityScore({
      sourceUrl: "https://github.com/example/repo/issues/1",
      sourceLabel: "incident-analytics",
      evidenceText: "Long and detailed evidence text that clearly captures the issue context and the reproduction pattern.",
    });
    const weakSource = computeSourceQualityScore({});

    expect(fresh).toBeGreaterThan(stale);
    expect(strongSource).toBeGreaterThan(weakSource);
  });

  it("detects duplicate findings from normalized topic/title similarity", () => {
    const duplicate = findDuplicateResearchFinding(
      [
        createFinding(),
        createFinding({
          findingId: "finding-2",
          title: "Fix flaky CI",
          description: "Builds fail intermittently",
          category: "technical",
          topic: "flaky-ci",
          dedupeKey: "flaky-ci|fix flaky ci",
        }),
      ],
      {
        findingId: "candidate-1",
        title: "Improve onboarding completion",
        description: "Activation drops during signup flow",
        sourceUrl: "https://support.example.com/tickets/999",
        sourceLabel: "support-ticket",
        category: "user_feedback",
        topic: "onboarding-completion",
        dedupeKey: "onboarding-completion|improve onboarding completion",
      },
    );

    expect(duplicate?.finding.findingId).toBe("finding-1");
    expect(duplicate?.similarity).toBeGreaterThanOrEqual(0.78);
    expect(duplicate?.reasons.join(" ")).toContain("topic");
  });
});
