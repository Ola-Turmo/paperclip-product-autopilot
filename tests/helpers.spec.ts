import { describe, expect, it } from "vitest";
import {
  allocatePort,
  applySwipeToPreferenceProfile,
  generateBranchName,
} from "../src/helpers.js";
import type { Idea, PreferenceProfile } from "../src/types.js";

function createProfile(): PreferenceProfile {
  return {
    profileId: "profile-1",
    companyId: "company-1",
    projectId: "project-1",
    passCount: 0,
    maybeCount: 0,
    yesCount: 0,
    nowCount: 0,
    totalSwipes: 0,
    categoryPreferences: {},
    tagPreferences: {},
    avgApprovedScore: 0,
    avgRejectedScore: 0,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };
}

function createIdea(): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding",
    description: "Reduce friction in the first run experience",
    rationale: "Users drop off in the first minute",
    sourceReferences: [],
    impactScore: 82,
    feasibilityScore: 67,
    complexityEstimate: "medium",
    category: "onboarding",
    tags: ["activation", "ux"],
    status: "active",
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("generateBranchName", () => {
  it("creates an autopilot branch prefix with shortened ids", () => {
    expect(generateBranchName("project-1234-abcd", "idea-9876-zyxw")).toBe(
      "autopilot/project1/idea9876",
    );
  });
});

describe("allocatePort", () => {
  it("increments ports monotonically", () => {
    const first = allocatePort();
    const second = allocatePort();

    expect(second).toBe(first + 1);
  });
});

describe("applySwipeToPreferenceProfile", () => {
  it("updates counts, averages, categories, and tags for approval swipes", () => {
    const updated = applySwipeToPreferenceProfile(createProfile(), "yes", createIdea());

    expect(updated.totalSwipes).toBe(1);
    expect(updated.yesCount).toBe(1);
    expect(updated.avgApprovedScore).toBe(82);
    expect(updated.categoryPreferences.onboarding?.yes).toBe(1);
    expect(updated.tagPreferences.activation?.yes).toBe(1);
    expect(updated.tagPreferences.ux?.yes).toBe(1);
  });

  it("tracks immediate-priority swipes separately", () => {
    const updated = applySwipeToPreferenceProfile(createProfile(), "now", createIdea());

    expect(updated.nowCount).toBe(1);
    expect(updated.totalSwipes).toBe(1);
    expect(updated.avgApprovedScore).toBe(82);
  });
});
