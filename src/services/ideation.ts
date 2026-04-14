import type { Idea, PreferenceProfile, ResearchFinding } from "../types.js";
import {
  computeOutcomeBoost,
  type OutcomePreferenceSignals,
} from "./preference-learning.js";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function categoryBaseImpact(category?: ResearchFinding["category"]): number {
  switch (category) {
    case "opportunity":
      return 76;
    case "user_feedback":
      return 72;
    case "competitive":
      return 68;
    case "technical":
      return 61;
    case "risk":
      return 58;
    case "threat":
      return 55;
    default:
      return 60;
  }
}

function categoryBaseFeasibility(category?: ResearchFinding["category"]): number {
  switch (category) {
    case "technical":
      return 74;
    case "risk":
      return 66;
    case "opportunity":
      return 64;
    case "user_feedback":
      return 62;
    case "competitive":
      return 58;
    case "threat":
      return 52;
    default:
      return 60;
  }
}

function computePreferenceBoost(
  profile: PreferenceProfile | null | undefined,
  category?: string,
): number {
  if (!profile || !category) return 0;
  const stats = profile.categoryPreferences[category];
  if (!stats) return 0;
  const positive = stats.yes + stats.now;
  const negative = stats.pass;
  const total = positive + negative + stats.maybe;
  if (total === 0) return 0;
  return ((positive - negative) / total) * 10;
}

function computeComplexityPreferenceBoost(
  profile: PreferenceProfile | null | undefined,
  complexityEstimate?: Idea["complexityEstimate"],
): number {
  if (!profile || !complexityEstimate) return 0;
  const stats = profile.complexityPreferences?.[complexityEstimate];
  if (!stats) return 0;
  const positive = stats.yes + stats.now;
  const negative = stats.pass;
  const total = positive + negative + stats.maybe;
  if (total === 0) return 0;
  return ((positive - negative) / total) * 6;
}

function computeResearchQualityBoost(finding: ResearchFinding): number {
  const freshnessBoost = ((finding.freshnessScore ?? 50) - 50) / 8;
  const sourceQualityBoost = ((finding.sourceQualityScore ?? 50) - 50) / 10;
  return freshnessBoost + sourceQualityBoost;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/^(improve|fix|investigate|research|address):?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreFindingForIdea(
  finding: ResearchFinding,
  profile?: PreferenceProfile | null,
  outcomeSignals?: OutcomePreferenceSignals | null,
): {
  impactScore: number;
  feasibilityScore: number;
  rankingScore: number;
  explanation: string;
} {
  const confidenceBoost = (finding.confidence - 0.5) * 24;
  const preferenceBoost = computePreferenceBoost(profile, finding.category);
  const researchQualityBoost = computeResearchQualityBoost(finding);
  const provisionalComplexity =
    categoryBaseFeasibility(finding.category) + confidenceBoost / 2 >= 68 ? "low" :
    categoryBaseFeasibility(finding.category) + confidenceBoost / 2 >= 56 ? "medium" : "high";
  const executionMode = provisionalComplexity === "high" ? "convoy" : "simple";
  const complexityPreferenceBoost = computeComplexityPreferenceBoost(profile, provisionalComplexity);
  const outcomeBoost = computeOutcomeBoost({
    signals: outcomeSignals,
    category: finding.category,
    tags: finding.category ? [finding.category] : [],
    complexityEstimate: provisionalComplexity,
    executionMode,
  });

  const impactScore = clampScore(
    categoryBaseImpact(finding.category) +
      confidenceBoost +
      preferenceBoost +
      complexityPreferenceBoost +
      researchQualityBoost +
      outcomeBoost.boost,
  );
  const feasibilityScore = clampScore(
    categoryBaseFeasibility(finding.category) +
      confidenceBoost / 2 +
      preferenceBoost / 2 +
      complexityPreferenceBoost / 2 +
      researchQualityBoost / 2 +
      outcomeBoost.boost / 2,
  );
  const rankingScore = clampScore(impactScore * 0.65 + feasibilityScore * 0.35);
  const explanation = [
    `category=${finding.category ?? "general"}`,
    `confidence=${finding.confidence.toFixed(2)}`,
    `freshness=${finding.freshnessScore}`,
    `sourceQuality=${finding.sourceQualityScore}`,
    `preferenceBoost=${preferenceBoost.toFixed(1)}`,
    `complexity=${provisionalComplexity}`,
    `complexityPreferenceBoost=${complexityPreferenceBoost.toFixed(1)}`,
    `executionMode=${executionMode}`,
    `researchQualityBoost=${researchQualityBoost.toFixed(1)}`,
    `outcomeBoost=${outcomeBoost.boost.toFixed(1)}`,
    `outcomeEvidence=${outcomeBoost.evidenceCount}`,
    `impact=${impactScore}`,
    `feasibility=${feasibilityScore}`,
  ].join(", ");

  return { impactScore, feasibilityScore, rankingScore, explanation };
}

export function rankFindingsForIdeation(
  findings: ResearchFinding[],
  profile?: PreferenceProfile | null,
  outcomeSignals?: OutcomePreferenceSignals | null,
): Array<ResearchFinding & { rankingScore: number; impactScore: number; feasibilityScore: number; explanation: string }> {
  return findings
    .filter((finding) => !finding.duplicateAnnotated)
    .map((finding) => ({
      ...finding,
      ...scoreFindingForIdea(finding, profile, outcomeSignals),
    }))
    .sort((a, b) =>
      b.rankingScore - a.rankingScore ||
      b.confidence - a.confidence ||
      a.title.localeCompare(b.title),
    );
}

export function buildIdeaDraftFromFinding(input: {
  finding: ResearchFinding;
  companyId: string;
  projectId: string;
  ideaId: string;
  createdAt: string;
  profile?: PreferenceProfile | null;
  outcomeSignals?: OutcomePreferenceSignals | null;
}): Idea {
  const scored = scoreFindingForIdea(input.finding, input.profile, input.outcomeSignals);
  const normalizedTitle = normalizeTitle(input.finding.title);
  const sourceLabel = input.finding.sourceLabel ?? input.finding.sourceUrl ?? "research";

  return {
    ideaId: input.ideaId,
    companyId: input.companyId,
    projectId: input.projectId,
    cycleId: input.finding.cycleId,
    title: normalizedTitle ? `Improve ${normalizedTitle}` : "Improve product experience",
    description: input.finding.description || "Generated from research insights",
    rationale: `Evidence-backed from ${sourceLabel}; ${scored.explanation}`,
    sourceReferences: input.finding.sourceUrl ? [input.finding.sourceUrl] : [],
    impactScore: scored.impactScore,
    feasibilityScore: scored.feasibilityScore,
    complexityEstimate:
      scored.feasibilityScore >= 72 ? "low" :
      scored.feasibilityScore >= 58 ? "medium" : "high",
    technicalApproach: input.finding.evidenceText,
    category: input.finding.category ?? "general",
    tags: input.finding.category ? [input.finding.category] : [],
    status: "active",
    duplicateAnnotated: false,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}
