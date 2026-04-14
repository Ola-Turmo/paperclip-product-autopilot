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

const PRIORITIES: Digest["priority"][] = ["low", "medium", "high", "critical"];

export function deriveDigestUrgency(input: {
  digestType: Digest["digestType"];
  priority: Digest["priority"];
  escalationLevel?: number;
}): NonNullable<Digest["urgency"]> {
  if (input.digestType === "stuck_run") {
    if ((input.escalationLevel ?? 0) >= 2 || input.priority === "critical") return "intervention_required";
    return "blocking";
  }
  if (input.digestType === "budget_alert") {
    if (input.priority === "critical") return "blocking";
    return "attention";
  }
  if (input.digestType === "health_check_failed") {
    return input.priority === "critical" ? "intervention_required" : "blocking";
  }
  if (input.priority === "critical") return "intervention_required";
  if (input.priority === "high") return "attention";
  return "informational";
}

export function deriveDigestRecommendedAction(input: {
  digestType: Digest["digestType"];
  urgency: NonNullable<Digest["urgency"]>;
}): string {
  if (input.digestType === "stuck_run") {
    return input.urgency === "intervention_required"
      ? "Inspect the run immediately, add an operator note, and checkpoint or cancel if progress is unsafe."
      : "Review the stuck run and decide whether to nudge, checkpoint, or pause it.";
  }
  if (input.digestType === "budget_alert") {
    return input.urgency === "blocking"
      ? "Adjust the budget or pause further autonomous execution before more work starts."
      : "Review budget burn and decide whether to expand or constrain autopilot time.";
  }
  if (input.digestType === "health_check_failed") {
    return "Inspect the failed health check and decide whether rollback or operator intervention is required.";
  }
  return "Review the digest and decide whether operator action is required.";
}

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

function escalateDigestPriority(priority: Digest["priority"], escalationLevel: number): Digest["priority"] {
  const currentIndex = PRIORITIES.indexOf(priority);
  const nextIndex = Math.min(PRIORITIES.length - 1, currentIndex + escalationLevel);
  return PRIORITIES[nextIndex] ?? priority;
}

function getEscalationLevel(reopenCount: number): number {
  if (reopenCount >= 3) return 2;
  if (reopenCount >= 1) return 1;
  return 0;
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
      candidate: (() => {
        const reopenCount = (dismissedDigest.reopenCount ?? 0) + 1;
        const escalationLevel = Math.max(
          dismissedDigest.escalationLevel ?? 0,
          getEscalationLevel(reopenCount),
        );
        return {
          ...candidate,
          dedupeKey,
          reopenCount,
          escalationLevel,
          priority: escalateDigestPriority(candidate.priority, escalationLevel),
          urgency: deriveDigestUrgency({
            digestType: candidate.digestType,
            priority: escalateDigestPriority(candidate.priority, escalationLevel),
            escalationLevel,
          }),
          recommendedAction: deriveDigestRecommendedAction({
            digestType: candidate.digestType,
            urgency: deriveDigestUrgency({
              digestType: candidate.digestType,
              priority: escalateDigestPriority(candidate.priority, escalationLevel),
              escalationLevel,
            }),
          }),
        };
      })(),
    };
  }

  const urgency = deriveDigestUrgency({
    digestType: candidate.digestType,
    priority: candidate.priority,
    escalationLevel: candidate.escalationLevel ?? 0,
  });
  return {
    shouldCreate: true,
    reason: "create",
    candidate: {
      ...candidate,
      dedupeKey,
      reopenCount: candidate.reopenCount ?? 0,
      escalationLevel: candidate.escalationLevel ?? 0,
      urgency,
      recommendedAction: candidate.recommendedAction ?? deriveDigestRecommendedAction({
        digestType: candidate.digestType,
        urgency,
      }),
    },
  };
}

export function hasPendingDigestForCandidate(existingDigests: Digest[], candidate: Digest): boolean {
  return !evaluateDigestCreationPolicy(existingDigests, candidate, candidate.createdAt).shouldCreate;
}
