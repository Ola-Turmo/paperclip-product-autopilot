import type { PreferenceProfile, ResearchFinding } from "../types.js";
import type { IdeationReplayCase } from "./evaluation.js";
import { evaluateIdeationReplay } from "./evaluation.js";

function createFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    findingId: "finding-1",
    companyId: "benchmark-company",
    projectId: "benchmark-project",
    cycleId: "benchmark-cycle",
    title: "Improve onboarding completion",
    description: "Users drop before activation",
    category: "user_feedback",
    confidence: 0.9,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createProfile(): PreferenceProfile {
  return {
    profileId: "benchmark-profile",
    companyId: "benchmark-company",
    projectId: "benchmark-project",
    passCount: 2,
    maybeCount: 1,
    yesCount: 4,
    nowCount: 2,
    totalSwipes: 9,
    categoryPreferences: {
      user_feedback: { pass: 0, maybe: 1, yes: 3, now: 2 },
      opportunity: { pass: 0, maybe: 0, yes: 1, now: 0 },
      technical: { pass: 2, maybe: 0, yes: 0, now: 0 },
    },
    tagPreferences: {},
    avgApprovedScore: 76,
    avgRejectedScore: 41,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };
}

export const ideationBenchmarkCases: IdeationReplayCase[] = [
  {
    caseId: "activation-friction",
    profile: createProfile(),
    findings: [
      createFinding({ findingId: "f-activation", title: "Improve onboarding activation", category: "user_feedback", confidence: 0.94 }),
      createFinding({ findingId: "f-ci", title: "Reduce flaky CI jobs", category: "technical", confidence: 0.91 }),
      createFinding({ findingId: "f-competitor", title: "Add competitor parity onboarding checklist", category: "competitive", confidence: 0.7 }),
    ],
    expectedTopFindingIds: ["f-activation"],
  },
  {
    caseId: "checkout-errors",
    profile: createProfile(),
    findings: [
      createFinding({ findingId: "f-checkout", title: "Fix checkout validation errors", category: "opportunity", confidence: 0.88 }),
      createFinding({ findingId: "f-ci-2", title: "Speed up deploy pipeline", category: "technical", confidence: 0.92 }),
      createFinding({ findingId: "f-feedback", title: "Improve purchase confirmation clarity", category: "user_feedback", confidence: 0.8 }),
    ],
    expectedTopFindingIds: ["f-checkout", "f-feedback"],
  },
  {
    caseId: "retention-risk",
    profile: createProfile(),
    findings: [
      createFinding({ findingId: "f-retention", title: "Address week-one retention drop", category: "user_feedback", confidence: 0.91 }),
      createFinding({ findingId: "f-risk", title: "Mitigate billing support backlog", category: "risk", confidence: 0.84 }),
      createFinding({ findingId: "f-merge", title: "Investigate merge queue contention", category: "technical", confidence: 0.89 }),
    ],
    expectedTopFindingIds: ["f-retention"],
  },
];

export function getIdeationBenchmarkSummary() {
  return evaluateIdeationReplay(ideationBenchmarkCases);
}
