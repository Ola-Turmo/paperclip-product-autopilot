import { describe, expect, it } from "vitest";
import type { Digest } from "../src/types.js";
import { hasPendingDigestForCandidate } from "../src/services/digest-policy.js";
import { evaluateDigestPolicyReplay } from "../src/services/policy-evaluation.js";

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
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    relatedRunId: "run-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("digest policy", () => {
  it("detects pending digest duplicates", () => {
    expect(hasPendingDigestForCandidate(
      [createDigest({ digestId: "existing-1", relatedRunId: "run-1" })],
      createDigest({ digestId: "candidate-1", relatedRunId: "run-1" }),
    )).toBe(true);

    expect(hasPendingDigestForCandidate(
      [createDigest({ digestId: "existing-2", relatedRunId: "run-1" })],
      createDigest({ digestId: "candidate-2", relatedRunId: "run-2" }),
    )).toBe(false);
  });

  it("evaluates digest policy replay accuracy", () => {
    const summary = evaluateDigestPolicyReplay([
      {
        caseId: "duplicate",
        existingDigests: [createDigest({ relatedRunId: "run-1" })],
        candidateDigest: createDigest({ digestId: "candidate-1", relatedRunId: "run-1" }),
        expectedCreate: false,
      },
      {
        caseId: "new",
        existingDigests: [createDigest({ relatedRunId: "run-1" })],
        candidateDigest: createDigest({ digestId: "candidate-2", relatedRunId: "run-2" }),
        expectedCreate: true,
      },
    ]);

    expect(summary.totalCases).toBe(2);
    expect(summary.accuracy).toBe(1);
  });
});
