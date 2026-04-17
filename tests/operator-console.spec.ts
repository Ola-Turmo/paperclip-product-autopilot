import { describe, expect, it } from "vitest";
import type { CompanyBudget, Digest } from "../src/types.js";
import {
  rankDigestsForInbox,
  summarizeBudgetConsole,
  summarizeDigestInbox,
} from "../src/services/operator-console.js";

function createBudget(overrides: Partial<CompanyBudget> = {}): CompanyBudget {
  return {
    budgetId: "budget-1",
    companyId: "company-1",
    totalBudgetMinutes: 500,
    usedBudgetMinutes: 200,
    autopilotBudgetMinutes: 120,
    autopilotUsedMinutes: 75,
    paused: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createDigest(overrides: Partial<Digest> = {}): Digest {
  return {
    digestId: "digest-1",
    companyId: "company-1",
    projectId: "project-1",
    digestType: "stuck_run",
    title: "Run stuck",
    summary: "Run has not updated",
    details: [],
    priority: "high",
    urgency: "blocking",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("operator console service", () => {
  it("summarizes budget state for actionability", () => {
    const healthy = summarizeBudgetConsole(createBudget({ autopilotUsedMinutes: 40 }));
    const exhausted = summarizeBudgetConsole(createBudget({ autopilotUsedMinutes: 130, paused: true }));

    expect(healthy.status).toBe("healthy");
    expect(healthy.remainingMinutes).toBe(80);
    expect(exhausted.status).toBe("exhausted");
    expect(exhausted.overageMinutes).toBe(10);
  });

  it("ranks actionable digests above dismissed ones and by urgency", () => {
    const ranked = rankDigestsForInbox([
      createDigest({ digestId: "dismissed", status: "dismissed", urgency: "intervention_required", priority: "critical" }),
      createDigest({ digestId: "blocking", urgency: "blocking", priority: "high" }),
      createDigest({ digestId: "intervention", urgency: "intervention_required", priority: "medium" }),
    ]);

    expect(ranked[0]?.digestId).toBe("intervention");
    expect(ranked[1]?.digestId).toBe("blocking");
    expect(ranked[2]?.digestId).toBe("dismissed");
  });

  it("summarizes inbox counts and next action", () => {
    const summary = summarizeDigestInbox([
      createDigest({ digestId: "digest-1", urgency: "attention", status: "read", recommendedAction: "Review budget burn" }),
      createDigest({ digestId: "digest-2", urgency: "intervention_required", status: "pending", recommendedAction: "Roll back now" }),
      createDigest({ digestId: "digest-3", status: "dismissed", urgency: "blocking" }),
    ]);

    expect(summary.actionableCount).toBe(2);
    expect(summary.interventionRequiredCount).toBe(1);
    expect(summary.escalatedCount).toBe(1);
    expect(summary.dismissedCount).toBe(1);
    expect(summary.highestUrgency).toBe("intervention_required");
    expect(summary.nextRecommendedAction).toBe("Roll back now");
  });
});
