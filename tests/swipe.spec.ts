import { describe, expect, it } from "vitest";
import {
  applySwipeToIdea,
  buildSwipeEvent,
  createEmptyPreferenceProfile,
  deriveIdeaStatusFromSwipe,
} from "../src/services/swipe.js";
import { shouldResurfaceIdea } from "../src/services/resurface.js";
import type { Idea } from "../src/types.js";

function createIdea(status: Idea["status"] = "active"): Idea {
  return {
    ideaId: "idea-1",
    companyId: "company-1",
    projectId: "project-1",
    title: "Improve onboarding",
    description: "desc",
    rationale: "why",
    sourceReferences: [],
    impactScore: 70,
    feasibilityScore: 75,
    status,
    duplicateAnnotated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("swipe services", () => {
  it("derives idea status from swipe decisions", () => {
    expect(deriveIdeaStatusFromSwipe("active", "pass")).toBe("rejected");
    expect(deriveIdeaStatusFromSwipe("active", "maybe")).toBe("maybe");
    expect(deriveIdeaStatusFromSwipe("active", "yes")).toBe("approved");
    expect(deriveIdeaStatusFromSwipe("active", "now")).toBe("approved");
  });

  it("applies swipe updates to an idea", () => {
    const updated = applySwipeToIdea(createIdea(), "maybe", "2026-01-02T00:00:00.000Z");

    expect(updated.status).toBe("maybe");
    expect(updated.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("creates swipe events and empty preference profiles", () => {
    const swipe = buildSwipeEvent({
      swipeId: "swipe-1",
      companyId: "company-1",
      projectId: "project-1",
      ideaId: "idea-1",
      decision: "yes",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const profile = createEmptyPreferenceProfile({
      profileId: "profile-1",
      companyId: "company-1",
      projectId: "project-1",
      lastUpdated: "2026-01-02T00:00:00.000Z",
    });

    expect(swipe.ideaId).toBe("idea-1");
    expect(profile.totalSwipes).toBe(0);
    expect(profile.categoryPreferences).toEqual({});
    expect(profile.executionModePreferences).toEqual({});
  });
});

describe("resurface service", () => {
  it("detects when a maybe idea should be resurfaced", () => {
    expect(shouldResurfaceIdea(createIdea("maybe"), "2026-01-02T00:00:00.000Z")).toBe(true);
    expect(
      shouldResurfaceIdea(
        { ...createIdea("maybe"), updatedAt: "2026-02-01T00:00:00.000Z" },
        "2026-01-02T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});
