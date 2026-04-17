import type { CompanyBudget, Digest } from "../types.js";

export interface BudgetConsoleSummary {
  usagePercent: number;
  remainingMinutes: number;
  overageMinutes: number;
  status: "healthy" | "attention" | "blocking" | "exhausted";
  recommendedAction: string;
}

export interface DigestInboxSummary {
  actionableCount: number;
  blockingCount: number;
  interventionRequiredCount: number;
  escalatedCount: number;
  unreadCount: number;
  dismissedCount: number;
  highestUrgency: NonNullable<Digest["urgency"]> | "none";
  nextRecommendedAction?: string;
}

const URGENCY_WEIGHT: Record<NonNullable<Digest["urgency"]>, number> = {
  informational: 1,
  attention: 2,
  blocking: 3,
  intervention_required: 4,
};

const PRIORITY_WEIGHT: Record<Digest["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function getDigestUrgency(digest: Digest): NonNullable<Digest["urgency"]> {
  return digest.urgency ?? "informational";
}

export function summarizeBudgetConsole(
  budget: CompanyBudget | null | undefined,
): BudgetConsoleSummary {
  if (!budget || budget.autopilotBudgetMinutes <= 0) {
    return {
      usagePercent: 0,
      remainingMinutes: 0,
      overageMinutes: 0,
      status: "healthy",
      recommendedAction: "Set an autopilot budget before enabling unattended execution.",
    };
  }

  const usagePercent = Math.round(
    (budget.autopilotUsedMinutes / budget.autopilotBudgetMinutes) * 100,
  );
  const remainingMinutes = Math.max(
    0,
    budget.autopilotBudgetMinutes - budget.autopilotUsedMinutes,
  );
  const overageMinutes = Math.max(
    0,
    budget.autopilotUsedMinutes - budget.autopilotBudgetMinutes,
  );

  if (budget.autopilotUsedMinutes >= budget.autopilotBudgetMinutes) {
    return {
      usagePercent,
      remainingMinutes,
      overageMinutes,
      status: budget.paused ? "exhausted" : "blocking",
      recommendedAction: budget.paused
        ? "Autopilot is paused on budget. Review usage, reset the budget, or explicitly keep it paused."
        : "Budget is exhausted. Pause new automation or increase the budget before more work starts.",
    };
  }

  if (usagePercent >= 90) {
    return {
      usagePercent,
      remainingMinutes,
      overageMinutes,
      status: "blocking",
      recommendedAction: "Budget is close to exhausted. Decide now whether to expand capacity or constrain automation.",
    };
  }

  if (usagePercent >= 75) {
    return {
      usagePercent,
      remainingMinutes,
      overageMinutes,
      status: "attention",
      recommendedAction: "Budget burn is elevated. Review active runs and expected remaining work.",
    };
  }

  return {
    usagePercent,
    remainingMinutes,
    overageMinutes,
    status: "healthy",
    recommendedAction: "Budget capacity is healthy. Keep monitoring burn against active delivery work.",
  };
}

export function rankDigestsForInbox(digests: Digest[]): Digest[] {
  return [...digests].sort((left, right) => {
    const actionableLeft = left.status === "dismissed" ? 0 : 1;
    const actionableRight = right.status === "dismissed" ? 0 : 1;
    return (
      actionableRight - actionableLeft ||
      URGENCY_WEIGHT[getDigestUrgency(right)] - URGENCY_WEIGHT[getDigestUrgency(left)] ||
      PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority] ||
      Number(right.escalationLevel ?? 0) - Number(left.escalationLevel ?? 0) ||
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

export function summarizeDigestInbox(digests: Digest[]): DigestInboxSummary {
  const actionable = digests.filter((digest) => digest.status !== "dismissed");
  const ranked = rankDigestsForInbox(actionable);
  const blockingCount = actionable.filter((digest) => getDigestUrgency(digest) === "blocking").length;
  const interventionRequiredCount = actionable.filter((digest) => getDigestUrgency(digest) === "intervention_required").length;
  const unreadCount = actionable.filter((digest) => digest.status === "pending" || digest.status === "delivered").length;

  return {
    actionableCount: actionable.length,
    blockingCount,
    interventionRequiredCount,
    escalatedCount: actionable.filter((digest) => Number(digest.escalationLevel ?? 0) > 0 || getDigestUrgency(digest) === "intervention_required").length,
    unreadCount,
    dismissedCount: digests.filter((digest) => digest.status === "dismissed").length,
    highestUrgency: ranked[0] ? getDigestUrgency(ranked[0]) : "none",
    nextRecommendedAction: ranked[0]?.recommendedAction,
  };
}
