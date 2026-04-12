import type {
  AutopilotOverview,
  AutopilotProject,
  CompanyBudget,
  DeliveryRun,
  Idea,
  SwipeEvent,
} from "../types.js";

export function computeBudgetUsagePercent(budget: CompanyBudget | null | undefined): number {
  if (!budget || budget.autopilotBudgetMinutes <= 0) return 0;
  return Math.round((budget.autopilotUsedMinutes / budget.autopilotBudgetMinutes) * 100);
}

export function buildAutopilotOverview(input: {
  project: AutopilotProject | null | undefined;
  ideas: Idea[];
  maybeIdeas: Idea[];
  runs: DeliveryRun[];
  swipes: SwipeEvent[];
  budget: CompanyBudget | null | undefined;
  today?: Date;
}): AutopilotOverview {
  const today = (input.today ?? new Date()).toDateString();
  const runningRuns = input.runs.filter((run) => run.status === "running");
  const completedRuns = input.runs.filter((run) => run.status === "completed");
  const failedRuns = input.runs.filter((run) => run.status === "failed");
  const todaySwipes = input.swipes.filter((swipe) => new Date(swipe.createdAt).toDateString() === today);

  return {
    projectCount: 1,
    enabledCount: input.project?.enabled ? 1 : 0,
    pausedCount: input.project?.paused ? 1 : 0,
    activeIdeasCount: input.ideas.filter((idea) => idea.status === "active").length,
    maybePoolCount: input.maybeIdeas.length,
    approvedIdeasCount: input.ideas.filter((idea) => idea.status === "approved").length,
    runningRunsCount: runningRuns.length,
    completedRunsCount: completedRuns.length,
    failedRunsCount: failedRuns.length,
    totalSwipesToday: todaySwipes.length,
    budgetUsagePercent: computeBudgetUsagePercent(input.budget),
  };
}
