import { describe, expect, it } from "vitest";
import type { Digest } from "../src/types.js";
import {
  applyDigestDismissalCooldown,
  evaluateDigestCreationPolicy,
  hasPendingDigestForCandidate,
} from "../src/services/digest-policy.js";
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

  it("suppresses dismissed digests during cooldown and reopens after cooldown", () => {
    const dismissed = applyDigestDismissalCooldown(
      {
        ...createDigest({
          digestId: "dismissed-1",
          status: "dismissed",
          dismissedAt: "2026-01-01T01:00:00.000Z",
        }),
      },
      "2026-01-01T01:00:00.000Z",
    );

    const suppressed = evaluateDigestCreationPolicy(
      [dismissed],
      createDigest({
        digestId: "candidate-suppressed",
        createdAt: "2026-01-01T03:00:00.000Z",
      }),
      "2026-01-01T03:00:00.000Z",
    );
    expect(suppressed.shouldCreate).toBe(false);
    expect(suppressed.reason).toBe("cooldown_active");

    const reopened = evaluateDigestCreationPolicy(
      [dismissed],
      createDigest({
        digestId: "candidate-reopened",
        createdAt: "2026-01-01T08:00:00.000Z",
      }),
      "2026-01-01T08:00:00.000Z",
    );
    expect(reopened.shouldCreate).toBe(true);
    expect(reopened.reason).toBe("reopened_after_cooldown");
    expect(reopened.candidate.reopenCount).toBe(1);
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
      {
        caseId: "cooldown-suppressed",
        existingDigests: [
          applyDigestDismissalCooldown(
            createDigest({
              digestId: "dismissed-1",
              status: "dismissed",
              dismissedAt: "2026-01-01T01:00:00.000Z",
            }),
            "2026-01-01T01:00:00.000Z",
          ),
        ],
        candidateDigest: createDigest({ digestId: "candidate-3", createdAt: "2026-01-01T02:00:00.000Z" }),
        expectedCreate: false,
      },
      {
        caseId: "reopened-after-cooldown",
        existingDigests: [
          applyDigestDismissalCooldown(
            createDigest({
              digestId: "dismissed-2",
              status: "dismissed",
              dismissedAt: "2026-01-01T01:00:00.000Z",
            }),
            "2026-01-01T01:00:00.000Z",
          ),
        ],
        candidateDigest: createDigest({ digestId: "candidate-4", createdAt: "2026-01-01T09:00:00.000Z" }),
        expectedCreate: true,
      },
    ]);

    expect(summary.totalCases).toBe(4);
    expect(summary.accuracy).toBe(1);
  });
});
