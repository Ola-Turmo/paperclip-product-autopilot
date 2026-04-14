import type { Digest } from "../types.js";

const DIGEST_COOLDOWN_HOURS: Partial<Record<Digest["digestType"], number>> = {
  budget_alert: 12,
  stuck_run: 6,
  health_check_failed: 2,
  opportunity: 24,
  idea_resurface: 72,
  weekly_summary: 24,
};

const PRIORITY_WEIGHT: Record<Digest["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function buildDigestDedupeKey(input: {
  digestType: Digest["digestType"];
  relatedRunId?: string;
  relatedBudgetId?: string;
  title?: string;
  summary?: string;
}): string {
  if (input.digestType === "budget_alert") {
    return `budget_alert:${input.relatedBudgetId ?? "unknown-budget"}`;
  }
  if (input.digestType === "stuck_run") {
    return `stuck_run:${input.relatedRunId ?? "unknown-run"}`;
  }
  return `${input.digestType}:${input.relatedRunId ?? ""}:${input.relatedBudgetId ?? ""}:${input.title ?? ""}:${input.summary ?? ""}`;
}

export function getDigestCooldownUntil(digest: Digest, dismissedAt: string): string {
  const cooldownHours = DIGEST_COOLDOWN_HOURS[digest.digestType] ?? 24;
  return new Date(new Date(dismissedAt).getTime() + cooldownHours * 60 * 60 * 1000).toISOString();
}

function getEffectiveDedupeKey(digest: Digest): string {
  return (
    digest.dedupeKey ??
    buildDigestDedupeKey({
      digestType: digest.digestType,
      relatedRunId: digest.relatedRunId,
      relatedBudgetId: digest.relatedBudgetId,
      title: digest.title,
      summary: digest.summary,
    })
  );
}

export function applyDigestDismissalCooldown(digest: Digest, dismissedAt: string): Digest {
  return {
    ...digest,
    cooldownUntil: getDigestCooldownUntil(digest, dismissedAt),
  };
}

export function evaluateDigestCreationPolicy(
  existingDigests: Digest[],
  candidate: Digest,
  now: string,
): {
  shouldCreate: boolean;
  reason: "create" | "pending_duplicate" | "active_duplicate" | "cooldown_active" | "reopened_after_cooldown";
  candidate: Digest;
} {
  const dedupeKey = getEffectiveDedupeKey(candidate);
  const sameKeyDigests = existingDigests
    .filter((existing) => getEffectiveDedupeKey(existing) === dedupeKey)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const activeDuplicate = sameKeyDigests.find((existing) => {
    if (existing.status === "dismissed") return false;
    return PRIORITY_WEIGHT[existing.priority] >= PRIORITY_WEIGHT[candidate.priority];
  });
  if (activeDuplicate) {
    return {
      shouldCreate: false,
      reason: activeDuplicate.status === "pending" ? "pending_duplicate" : "active_duplicate",
      candidate: { ...candidate, dedupeKey },
    };
  }

  const dismissedDigest = sameKeyDigests.find((existing) => existing.status === "dismissed" && existing.dismissedAt);
  if (dismissedDigest) {
    const cooldownUntil = dismissedDigest.cooldownUntil ?? getDigestCooldownUntil(dismissedDigest, dismissedDigest.dismissedAt!);
    if (new Date(now).getTime() < new Date(cooldownUntil).getTime()) {
      return {
        shouldCreate: false,
        reason: "cooldown_active",
        candidate: { ...candidate, dedupeKey, cooldownUntil },
      };
    }

    return {
      shouldCreate: true,
      reason: "reopened_after_cooldown",
      candidate: {
        ...candidate,
        dedupeKey,
        reopenCount: (dismissedDigest.reopenCount ?? 0) + 1,
      },
    };
  }

  return {
    shouldCreate: true,
    reason: "create",
    candidate: { ...candidate, dedupeKey, reopenCount: candidate.reopenCount ?? 0 },
  };
}

export function hasPendingDigestForCandidate(existingDigests: Digest[], candidate: Digest): boolean {
  return !evaluateDigestCreationPolicy(existingDigests, candidate, candidate.createdAt).shouldCreate;
}
