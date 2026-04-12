import type { AutopilotProject, CompanyBudget, DeliveryRun, Digest } from "../types.js";

export function shouldPauseForBudget(
  project: AutopilotProject | null | undefined,
  budget: CompanyBudget | null | undefined,
): boolean {
  if (!project || !budget) return false;
  return budget.autopilotUsedMinutes >= budget.autopilotBudgetMinutes;
}

export function createBudgetAlertDigest(input: {
  digestId: string;
  companyId: string;
  projectId: string;
  budget: CompanyBudget;
  createdAt: string;
}): Digest | null {
  if (input.budget.autopilotBudgetMinutes <= 0) return null;

  const usagePct = Math.round(
    (input.budget.autopilotUsedMinutes / input.budget.autopilotBudgetMinutes) * 100,
  );
  if (usagePct < 80) return null;

  return {
    digestId: input.digestId,
    companyId: input.companyId,
    projectId: input.projectId,
    digestType: "budget_alert",
    title: `Autopilot budget at ${usagePct}%`,
    summary: `Autopilot has used ${input.budget.autopilotUsedMinutes}/${input.budget.autopilotBudgetMinutes} minutes`,
    details: [],
    priority: usagePct >= 95 ? "critical" : "high",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    relatedBudgetId: input.budget.budgetId,
    createdAt: input.createdAt,
  };
}

export function createStuckRunDigest(input: {
  digestId: string;
  companyId: string;
  projectId: string;
  stuckRuns: DeliveryRun[];
  createdAt: string;
}): Digest | null {
  if (input.stuckRuns.length === 0) return null;

  return {
    digestId: input.digestId,
    companyId: input.companyId,
    projectId: input.projectId,
    digestType: "stuck_run",
    title: `${input.stuckRuns.length} delivery run(s) may be stuck`,
    summary: `Runs not updated in over 60 minutes: ${input.stuckRuns.map((run) => run.runId.slice(0, 8)).join(", ")}`,
    details: input.stuckRuns.map((run) => `${run.runId}: ${run.title} (status: ${run.status})`),
    priority: "high",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    dismissedAt: null,
    relatedRunId: input.stuckRuns[0]?.runId,
    createdAt: input.createdAt,
  };
}
