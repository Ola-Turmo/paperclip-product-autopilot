import { describe, expect, it } from "vitest";
import type { ResearchFinding } from "../src/types.js";
import {
  buildNormalizedSourceKey,
  computeFindingFreshnessScore,
  computeSourceQualityScore,
  createResearchFindingRecord,
  findDuplicateResearchFinding,
  inferSourceScope,
  normalizeSourceDomain,
  normalizeResearchSignalInput,
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
    sourceType: "support_ticket",
    ingestedAt: "2026-01-01T00:05:00.000Z",
    sourceDomain: "support.example.com",
    sourceScope: "customer",
    normalizedSourceKey: "support_ticket:support.example.com",
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
    expect(finding.sourceType).toBe("support_ticket");
    expect(finding.ingestedAt).toBeTruthy();
    expect(finding.sourceDomain).toBe("support.example.com");
    expect(finding.sourceScope).toBe("customer");
    expect(finding.normalizedSourceKey).toContain("support_ticket:");
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

  it("normalizes source ingestion metadata into a stable contract", () => {
    const normalized = normalizeResearchSignalInput({
      title: "Improve onboarding completion",
      description: "Users drop before activation",
      sourceUrl: "https://analytics.example.com/dashboard/1",
      category: "user_feedback",
    });

    expect(normalized.sourceType).toBe("analytics_report");
    expect(normalized.sourceLabel).toContain("analytics");
    expect(normalized.ingestedAt).toBeTruthy();
  });

  it("normalizes source domain, scope, and keys consistently", () => {
    expect(normalizeSourceDomain("https://www.github.com/example/repo/issues/1")).toBe("github.com");
    expect(
      inferSourceScope({
        sourceType: "support_ticket",
        sourceUrl: "https://support.example.com/ticket/1",
        sourceLabel: "support ticket",
      }),
    ).toBe("customer");
    expect(
      buildNormalizedSourceKey({
        sourceType: "analytics_report",
        sourceDomain: "analytics.example.com",
      }),
    ).toBe("analytics_report:analytics.example.com");
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
