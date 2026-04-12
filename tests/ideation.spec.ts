import { describe, expect, it } from "vitest";
import type { PreferenceProfile, ResearchFinding } from "../src/types.js";
import {
  buildIdeaDraftFromFinding,
  rankFindingsForIdeation,
  scoreFindingForIdea,
} from "../src/services/ideation.js";

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "company-1",
    projectId: "project-1",
    cycleId: "cycle-1",
    title: "Improve onboarding completion",
    description: "Users drop off before activation",
    sourceUrl: "https://example.com/source",
    sourceLabel: "support-summary",
    category: "user_feedback",
    confidence: 0.9,
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
    },
    tagPreferences: {},
    avgApprovedScore: 74,
    avgRejectedScore: 40,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };
}

describe("ideation service", () => {
  it("scores findings deterministically using confidence and preferences", () => {
    const withoutProfile = scoreFindingForIdea(createFinding(), null);
    const withProfile = scoreFindingForIdea(createFinding(), createProfile());

    expect(withProfile.impactScore).toBeGreaterThan(withoutProfile.impactScore);
    expect(withProfile.rankingScore).toBeGreaterThan(withoutProfile.rankingScore);
  });

  it("ranks findings stably by score, confidence, then title", () => {
    const ranked = rankFindingsForIdeation([
      createFinding({ findingId: "f-1", title: "Improve churn", confidence: 0.8, category: "user_feedback" }),
      createFinding({ findingId: "f-2", title: "Improve crash-free sessions", confidence: 0.95, category: "technical" }),
      createFinding({ findingId: "f-3", title: "Improve churn", confidence: 0.8, category: "opportunity" }),
    ], createProfile());

    expect(ranked[0]?.findingId).toBe("f-1");
    expect(ranked[1]?.findingId).toBe("f-3");
    expect(ranked[2]?.findingId).toBe("f-2");
  });

  it("builds evidence-backed idea drafts from findings", () => {
    const idea = buildIdeaDraftFromFinding({
      finding: createFinding(),
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      createdAt: "2026-01-02T00:00:00.000Z",
      profile: createProfile(),
    });

    expect(idea.title).toContain("Improve onboarding completion");
    expect(idea.rationale).toContain("confidence 0.90");
    expect(idea.sourceReferences).toEqual(["https://example.com/source"]);
    expect(idea.impactScore).toBeGreaterThan(70);
  });
});
