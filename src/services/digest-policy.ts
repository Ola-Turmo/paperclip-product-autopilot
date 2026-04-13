import type { Digest } from "../types.js";

export function hasPendingDigestForCandidate(existingDigests: Digest[], candidate: Digest): boolean {
  return existingDigests.some((existing) => {
    if (existing.status !== "pending" || existing.digestType !== candidate.digestType) {
      return false;
    }
    if (candidate.digestType === "budget_alert") {
      return existing.relatedBudgetId === candidate.relatedBudgetId;
    }
    if (candidate.digestType === "stuck_run") {
      return existing.relatedRunId === candidate.relatedRunId;
    }
    return existing.title === candidate.title && existing.summary === candidate.summary;
  });
}
