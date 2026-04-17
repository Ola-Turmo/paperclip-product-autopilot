import { describe, expect, it } from "vitest";
import type { PreferenceProfile, ResearchFinding } from "../src/types.js";
import {
  buildIdeaDraftFromFinding,
  rankFindingsForIdeation,
  scoreFindingForIdea,
} from "../src/services/ideation.js";
import { buildOutcomePreferenceSignals } from "../src/services/preference-learning.js";

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
    sourceType: "support_ticket",
    ingestedAt: "2026-01-01T00:05:00.000Z",
    sourceDomain: "example.com",
    sourceScope: "customer",
    normalizedSourceKey: "support_ticket:example.com",
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
    },
    tagPreferences: {},
    complexityPreferences: {
      low: { pass: 0, maybe: 0, yes: 1, now: 1 },
      medium: { pass: 0, maybe: 1, yes: 2, now: 1 },
      high: { pass: 1, maybe: 0, yes: 0, now: 0 },
    },
    executionModePreferences: {
      simple: { pass: 0, maybe: 1, yes: 3, now: 2 },
      convoy: { pass: 1, maybe: 0, yes: 0, now: 0 },
    },
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
    expect(withProfile.explanation).toContain("preferenceBoost=");
    expect(withProfile.rankingExplanation.executionModePreferenceBoost).toBeGreaterThanOrEqual(0);
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
    expect(idea.rationale).toContain("confidence=0.90");
    expect(idea.rankingExplanation?.provisionalExecutionMode).toBe("simple");
    expect(idea.sourceReferences).toEqual(["https://example.com/source"]);
    expect(idea.impactScore).toBeGreaterThan(70);
  });

  it("uses historical delivery outcomes to boost favored categories", () => {
    const outcomeSignals = buildOutcomePreferenceSignals({
      ideas: [
        {
          ideaId: "idea-1",
          companyId: "company-1",
          projectId: "project-1",
          title: "Improve onboarding",
          description: "Better activation",
          rationale: "Activation issue",
          sourceReferences: [],
          impactScore: 80,
          feasibilityScore: 72,
          complexityEstimate: "medium",
          category: "user_feedback",
          tags: ["user_feedback"],
          status: "completed",
          duplicateAnnotated: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      runs: [
        {
          runId: "run-1",
          companyId: "company-1",
          projectId: "project-1",
          ideaId: "idea-1",
          artifactId: "artifact-1",
          title: "Delivery",
          status: "completed",
          automationTier: "semiauto",
          branchName: "autopilot/project/idea",
          workspacePath: "/tmp/project",
          leasedPort: 3000,
          commitSha: "abc1234",
          paused: false,
          completedAt: "2026-01-01T02:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T02:00:00.000Z",
        },
      ],
      healthChecks: [
        {
          checkId: "check-1",
          companyId: "company-1",
          projectId: "project-1",
          runId: "run-1",
          checkType: "smoke_test",
          name: "Smoke",
          status: "passed",
          passedAt: "2026-01-01T02:00:00.000Z",
          createdAt: "2026-01-01T00:30:00.000Z",
        },
      ],
      rollbacks: [],
    });

    const withoutOutcome = scoreFindingForIdea(createFinding({ category: "user_feedback" }), createProfile(), null);
    const withOutcome = scoreFindingForIdea(createFinding({ category: "user_feedback" }), createProfile(), outcomeSignals);

    expect(withOutcome.rankingScore).toBeGreaterThan(withoutOutcome.rankingScore);
    expect(withOutcome.explanation).toContain("outcomeBoost=");
  });
});
