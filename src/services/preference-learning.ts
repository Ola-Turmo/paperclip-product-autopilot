import type {
  DeliveryRun,
  Idea,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";

export interface OutcomePreferenceBucket {
  averageScore: number;
  sampleCount: number;
  positiveCount: number;
  negativeCount: number;
}

export interface OutcomePreferenceSignals {
  overallAverageScore: number;
  totalSamples: number;
  categorySignals: Record<string, OutcomePreferenceBucket>;
  tagSignals: Record<string, OutcomePreferenceBucket>;
  complexitySignals: Record<string, OutcomePreferenceBucket>;
}

function createBucket(): OutcomePreferenceBucket {
  return {
    averageScore: 0,
    sampleCount: 0,
    positiveCount: 0,
    negativeCount: 0,
  };
}

function appendBucketSample(
  buckets: Record<string, OutcomePreferenceBucket>,
  key: string | undefined,
  score: number,
): void {
  if (!key) return;
  const bucket = buckets[key] ?? createBucket();
  const nextCount = bucket.sampleCount + 1;
  bucket.averageScore = ((bucket.averageScore * bucket.sampleCount) + score) / nextCount;
  bucket.sampleCount = nextCount;
  if (score > 0) bucket.positiveCount += 1;
  if (score < 0) bucket.negativeCount += 1;
  buckets[key] = bucket;
}

function clampOutcomeScore(score: number): number {
  return Math.max(-3, Math.min(3, score));
}

function scoreRollbackPenalty(rollbacks: RollbackAction[]): number {
  return rollbacks.reduce((penalty, rollback) => {
    if (rollback.status === "skipped") return penalty;
    if (rollback.status === "completed") return penalty + 1.4;
    if (rollback.status === "failed") return penalty + 1.0;
    return penalty + 0.8;
  }, 0);
}

function scoreHealthChecks(checks: ReleaseHealthCheck[]): number {
  return checks.reduce((score, check) => {
    if (check.status === "passed") return score + 0.25;
    if (check.status === "failed") return score - 0.9;
    return score;
  }, 0);
}

function scoreRunDuration(run: DeliveryRun): number {
  const finishedAt = run.completedAt ?? run.updatedAt;
  const elapsedMs = new Date(finishedAt).getTime() - new Date(run.createdAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  if (elapsedHours <= 6) return 0.35;
  if (elapsedHours >= 72) return -0.35;
  return 0;
}

export function scoreDeliveryOutcome(input: {
  run: DeliveryRun;
  healthChecks: ReleaseHealthCheck[];
  rollbacks: RollbackAction[];
}): number {
  const { run, healthChecks, rollbacks } = input;
  let score = 0;

  switch (run.status) {
    case "completed":
      score += 1.6;
      break;
    case "failed":
      score -= 1.4;
      break;
    case "cancelled":
      score -= 0.8;
      break;
    default:
      return 0;
  }

  score += scoreHealthChecks(healthChecks);
  score -= scoreRollbackPenalty(rollbacks);
  score += scoreRunDuration(run);

  return clampOutcomeScore(score);
}

export function buildOutcomePreferenceSignals(input: {
  ideas: Idea[];
  runs: DeliveryRun[];
  healthChecks: ReleaseHealthCheck[];
  rollbacks: RollbackAction[];
}): OutcomePreferenceSignals {
  const ideaById = new Map(input.ideas.map((idea) => [idea.ideaId, idea]));
  const categorySignals: Record<string, OutcomePreferenceBucket> = {};
  const tagSignals: Record<string, OutcomePreferenceBucket> = {};
  const complexitySignals: Record<string, OutcomePreferenceBucket> = {};

  let totalScore = 0;
  let totalSamples = 0;

  for (const run of input.runs) {
    if (!["completed", "failed", "cancelled"].includes(run.status)) continue;
    const idea = ideaById.get(run.ideaId);
    if (!idea) continue;

    const healthChecks = input.healthChecks.filter((check) => check.runId === run.runId);
    const rollbacks = input.rollbacks.filter((rollback) => rollback.runId === run.runId);
    const score = scoreDeliveryOutcome({ run, healthChecks, rollbacks });

    totalScore += score;
    totalSamples += 1;

    appendBucketSample(categorySignals, idea.category, score);
    appendBucketSample(complexitySignals, idea.complexityEstimate, score);
    for (const tag of idea.tags ?? []) {
      appendBucketSample(tagSignals, tag, score);
    }
  }

  return {
    overallAverageScore: totalSamples > 0 ? totalScore / totalSamples : 0,
    totalSamples,
    categorySignals,
    tagSignals,
    complexitySignals,
  };
}

export function computeOutcomeBoost(input: {
  signals?: OutcomePreferenceSignals | null;
  category?: string;
  tags?: string[];
  complexityEstimate?: Idea["complexityEstimate"];
}): { boost: number; evidenceCount: number } {
  const signals = input.signals;
  if (!signals || signals.totalSamples === 0) {
    return { boost: 0, evidenceCount: 0 };
  }

  const contributors: Array<{ averageScore: number; sampleCount: number }> = [];
  if (input.category && signals.categorySignals[input.category]) {
    contributors.push(signals.categorySignals[input.category]);
  }
  if (input.complexityEstimate && signals.complexitySignals[input.complexityEstimate]) {
    contributors.push(signals.complexitySignals[input.complexityEstimate]);
  }
  for (const tag of input.tags ?? []) {
    const bucket = signals.tagSignals[tag];
    if (bucket) contributors.push(bucket);
  }

  const uniqueContributorCount = contributors.length;
  if (contributors.length === 0) {
    return {
      boost: Number(((signals.overallAverageScore / 3) * 4).toFixed(1)),
      evidenceCount: signals.totalSamples,
    };
  }

  const weighted = contributors.reduce(
    (acc, bucket) => {
      acc.score += bucket.averageScore * bucket.sampleCount;
      acc.samples += bucket.sampleCount;
      return acc;
    },
    { score: 0, samples: 0 },
  );

  const average = weighted.samples > 0 ? weighted.score / weighted.samples : 0;
  return {
    boost: Number(((average / 3) * 8).toFixed(1)),
    evidenceCount: contributors.reduce((sum, bucket) => sum + bucket.sampleCount, 0) || uniqueContributorCount,
  };
}
