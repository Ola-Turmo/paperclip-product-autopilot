import type { ResearchFinding } from "../types.js";

export interface ResearchSignalInput {
  title: string;
  description: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?:
    | "support_ticket"
    | "analytics_report"
    | "competitor_note"
    | "incident_postmortem"
    | "survey_response"
    | "code_signal"
    | "custom";
  sourceId?: string;
  sourceTimestamp?: string;
  ingestedAt?: string;
  evidenceText?: string;
  category?: ResearchFinding["category"];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string | undefined): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function jaccardSimilarity(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

export function computeFindingFreshnessScore(createdAt: string, now = new Date()): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 60;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 1) return 100;
  if (ageDays <= 3) return 92;
  if (ageDays <= 7) return 84;
  if (ageDays <= 14) return 72;
  if (ageDays <= 30) return 58;
  if (ageDays <= 90) return 44;
  return 30;
}

export function computeSourceQualityScore(input: {
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: ResearchFinding["sourceType"];
  evidenceText?: string;
}): number {
  let score = 35;
  const url = input.sourceUrl?.toLowerCase();
  const label = input.sourceLabel?.toLowerCase() ?? "";
  const evidenceLength = input.evidenceText?.trim().length ?? 0;

  if (url) score += 18;
  if (label) score += 8;
  if (evidenceLength >= 80) score += 12;
  if (evidenceLength >= 180) score += 6;

  if (url?.includes("github.com")) score += 10;
  if (url?.includes("docs.")) score += 9;
  if (url?.includes("support")) score += 8;
  if (url?.includes("status")) score += 7;

  if (label.includes("incident")) score += 10;
  if (label.includes("analytics")) score += 9;
  if (label.includes("support")) score += 8;
  if (label.includes("user")) score += 6;

  if (input.sourceType === "support_ticket") score += 8;
  if (input.sourceType === "analytics_report") score += 10;
  if (input.sourceType === "incident_postmortem") score += 11;
  if (input.sourceType === "survey_response") score += 7;
  if (input.sourceType === "competitor_note") score += 6;
  if (input.sourceType === "code_signal") score += 9;

  return clampScore(score);
}

export function inferSignalFamily(input: {
  category?: ResearchFinding["category"];
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: ResearchFinding["sourceType"];
}): ResearchFinding["signalFamily"] {
  const url = input.sourceUrl?.toLowerCase() ?? "";
  const label = input.sourceLabel?.toLowerCase() ?? "";

  if (input.sourceType === "incident_postmortem") return "incident";
  if (input.sourceType === "analytics_report") return "analytics";
  if (input.sourceType === "support_ticket") return "support";
  if (input.sourceType === "competitor_note") return "market";
  if (input.sourceType === "code_signal") return "technical";
  if (input.sourceType === "survey_response") return "qualitative";
  if (url.includes("status") || label.includes("incident")) return "incident";
  if (url.includes("analytics") || label.includes("analytics")) return "analytics";
  if (url.includes("support") || label.includes("support")) return "support";
  if (input.category === "competitive" || url.includes("competitor")) return "market";
  if (input.category === "technical" || url.includes("github")) return "technical";
  if (label.includes("interview") || label.includes("survey") || label.includes("feedback")) return "qualitative";
  return "qualitative";
}

export function inferTopic(input: {
  title: string;
  description: string;
  category?: ResearchFinding["category"];
}): string {
  const tokens = [...tokenize(input.title), ...tokenize(input.description)];
  const stopwords = new Set(["improve", "users", "user", "before", "after", "issue", "issues", "drop", "drops", "using", "with"]);
  const topicTokens = tokens.filter((token) => !stopwords.has(token)).slice(0, 3);
  if (topicTokens.length > 0) return topicTokens.join("-");
  return input.category ?? "general";
}

export function normalizeResearchSignalInput(input: ResearchSignalInput): Required<Pick<ResearchFinding, "sourceType" | "sourceLabel" | "ingestedAt">> & Pick<ResearchFinding, "sourceUrl" | "sourceId" | "sourceTimestamp"> {
  const sourceType = input.sourceType ?? inferSourceType(input);
  const sourceLabel = normalizeSourceLabel(input.sourceLabel ?? sourceType.replace(/_/g, " "));
  return {
    sourceType,
    sourceLabel,
    sourceUrl: input.sourceUrl,
    sourceId: input.sourceId,
    sourceTimestamp: input.sourceTimestamp,
    ingestedAt: input.ingestedAt ?? new Date().toISOString(),
  };
}

function normalizeSourceLabel(sourceLabel: string): string {
  return sourceLabel.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeSourceDomain(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function inferSourceScope(input: {
  sourceType?: ResearchFinding["sourceType"];
  sourceUrl?: string;
  sourceLabel?: string;
}): NonNullable<ResearchFinding["sourceScope"]> {
  const label = input.sourceLabel?.toLowerCase() ?? "";
  const domain = normalizeSourceDomain(input.sourceUrl) ?? "";

  if (input.sourceType === "support_ticket" || input.sourceType === "survey_response") return "customer";
  if (input.sourceType === "analytics_report" || input.sourceType === "incident_postmortem" || input.sourceType === "code_signal") return "internal";
  if (input.sourceType === "competitor_note") return "external";
  if (label.includes("support") || label.includes("survey") || label.includes("feedback")) return "customer";
  if (label.includes("incident") || label.includes("analytics") || domain.includes("github.com") || domain.includes("localhost")) return "internal";
  return "external";
}

export function buildNormalizedSourceKey(input: {
  sourceType?: ResearchFinding["sourceType"];
  sourceId?: string;
  sourceDomain?: string;
  sourceLabel?: string;
}): string | undefined {
  if (!input.sourceType) return undefined;
  const identifier =
    input.sourceId?.trim() ||
    input.sourceDomain?.trim() ||
    normalizeText(input.sourceLabel).slice(0, 40) ||
    "unknown-source";
  return `${input.sourceType}:${identifier}`;
}

function inferSourceType(input: Pick<ResearchSignalInput, "sourceUrl" | "sourceLabel" | "category">): NonNullable<ResearchFinding["sourceType"]> {
  const url = input.sourceUrl?.toLowerCase() ?? "";
  const label = input.sourceLabel?.toLowerCase() ?? "";

  if (url.includes("analytics") || label.includes("analytics")) return "analytics_report";
  if (url.includes("support") || label.includes("support")) return "support_ticket";
  if (url.includes("status") || label.includes("incident")) return "incident_postmortem";
  if (url.includes("github") || label.includes("repo") || input.category === "technical") return "code_signal";
  if (label.includes("survey") || label.includes("interview") || label.includes("feedback")) return "survey_response";
  if (input.category === "competitive" || url.includes("competitor")) return "competitor_note";
  return "custom";
}

export function createResearchFindingRecord(input: {
  findingId: string;
  companyId: string;
  projectId: string;
  cycleId: string;
  title: string;
  description: string;
  confidence: number;
  createdAt: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: ResearchFinding["sourceType"];
  sourceId?: string;
  sourceTimestamp?: string;
  ingestedAt?: string;
  evidenceText?: string;
  category?: ResearchFinding["category"];
}): ResearchFinding {
  const normalizedSignal = normalizeResearchSignalInput(input);
  const sourceDomain = normalizeSourceDomain(normalizedSignal.sourceUrl);
  const sourceScope = inferSourceScope({
    sourceType: normalizedSignal.sourceType,
    sourceUrl: normalizedSignal.sourceUrl,
    sourceLabel: normalizedSignal.sourceLabel,
  });
  const topic = inferTopic(input);
  const signalFamily = inferSignalFamily({
    ...input,
    sourceType: normalizedSignal.sourceType,
    sourceLabel: normalizedSignal.sourceLabel,
  });
  const normalizedSourceKey = buildNormalizedSourceKey({
    sourceType: normalizedSignal.sourceType,
    sourceId: normalizedSignal.sourceId,
    sourceDomain,
    sourceLabel: normalizedSignal.sourceLabel,
  });
  const dedupeKey = `${topic}|${normalizeText(input.title).slice(0, 80)}`;

  return {
    findingId: input.findingId,
    companyId: input.companyId,
    projectId: input.projectId,
    cycleId: input.cycleId,
    title: input.title,
    description: input.description,
    sourceUrl: normalizedSignal.sourceUrl,
    sourceLabel: normalizedSignal.sourceLabel,
    sourceType: normalizedSignal.sourceType,
    sourceId: normalizedSignal.sourceId,
    sourceTimestamp: normalizedSignal.sourceTimestamp,
    ingestedAt: normalizedSignal.ingestedAt,
    sourceDomain,
    sourceScope,
    normalizedSourceKey,
    evidenceText: input.evidenceText,
    signalFamily,
    topic,
    dedupeKey,
    category: input.category,
    confidence: input.confidence,
    sourceQualityScore: computeSourceQualityScore({
      ...input,
      sourceType: normalizedSignal.sourceType,
      sourceLabel: normalizedSignal.sourceLabel,
    }),
    freshnessScore: computeFindingFreshnessScore(input.createdAt),
    duplicateAnnotated: false,
    createdAt: input.createdAt,
  };
}

export function scoreResearchFindingDuplicate(
  candidate: Pick<ResearchFinding, "title" | "description" | "sourceUrl" | "sourceLabel" | "category" | "topic" | "dedupeKey">,
  existing: ResearchFinding,
): { similarity: number; reasons: string[] } {
  const titleSimilarity = jaccardSimilarity(tokenize(candidate.title), tokenize(existing.title));
  const descriptionSimilarity = jaccardSimilarity(tokenize(candidate.description), tokenize(existing.description));
  const sameSource = !!candidate.sourceUrl && candidate.sourceUrl === existing.sourceUrl;
  const sameTopic = !!candidate.topic && candidate.topic === existing.topic;
  const sameDedupeKey = !!candidate.dedupeKey && candidate.dedupeKey === existing.dedupeKey;
  const sameCategory = !!candidate.category && candidate.category === existing.category;

  let similarity = titleSimilarity * 0.45 + descriptionSimilarity * 0.3;
  if (sameSource) similarity += 0.18;
  if (sameTopic) similarity += 0.12;
  if (sameCategory) similarity += 0.08;
  if (sameDedupeKey) similarity += 0.2;

  const reasons: string[] = [];
  if (sameDedupeKey) reasons.push("matching normalized topic/title signature");
  if (sameSource) reasons.push("same source");
  if (sameTopic) reasons.push(`same topic (${existing.topic})`);
  if (sameCategory) reasons.push(`same category (${existing.category})`);
  if (titleSimilarity >= 0.6) reasons.push(`high title overlap (${titleSimilarity.toFixed(2)})`);
  if (descriptionSimilarity >= 0.55) reasons.push(`high description overlap (${descriptionSimilarity.toFixed(2)})`);

  return {
    similarity: Number(Math.min(similarity, 1).toFixed(3)),
    reasons,
  };
}

export function findDuplicateResearchFinding(
  findings: ResearchFinding[],
  candidate: Pick<ResearchFinding, "findingId" | "title" | "description" | "sourceUrl" | "sourceLabel" | "category" | "topic" | "dedupeKey">,
): { finding: ResearchFinding; similarity: number; reasons: string[] } | null {
  let best: { finding: ResearchFinding; similarity: number; reasons: string[] } | null = null;

  for (const finding of findings) {
    if (finding.findingId === candidate.findingId) continue;
    const scored = scoreResearchFindingDuplicate(candidate, finding);
    if (scored.similarity >= 0.78 && (!best || scored.similarity > best.similarity)) {
      best = { finding, similarity: scored.similarity, reasons: scored.reasons };
    }
  }

  return best;
}

export function buildResearchCycleSnapshot(findings: ResearchFinding[], generatedAt: string) {
  const topicCounts: Record<string, number> = {};
  const signalFamilyCounts: Record<string, number> = {};
  const sourceTypeCounts: Record<string, number> = {};
  const sourceScopeCounts: Record<string, number> = {};
  const sourceDomainCounts: Record<string, number> = {};

  let freshnessTotal = 0;
  let sourceQualityTotal = 0;
  let duplicateCount = 0;

  for (const finding of findings) {
    if (finding.topic) {
      topicCounts[finding.topic] = (topicCounts[finding.topic] ?? 0) + 1;
    }
    if (finding.signalFamily) {
      signalFamilyCounts[finding.signalFamily] = (signalFamilyCounts[finding.signalFamily] ?? 0) + 1;
    }
    if (finding.sourceType) {
      sourceTypeCounts[finding.sourceType] = (sourceTypeCounts[finding.sourceType] ?? 0) + 1;
    }
    if (finding.sourceScope) {
      sourceScopeCounts[finding.sourceScope] = (sourceScopeCounts[finding.sourceScope] ?? 0) + 1;
    }
    if (finding.sourceDomain) {
      sourceDomainCounts[finding.sourceDomain] = (sourceDomainCounts[finding.sourceDomain] ?? 0) + 1;
    }
    freshnessTotal += finding.freshnessScore;
    sourceQualityTotal += finding.sourceQualityScore;
    if (finding.duplicateAnnotated) duplicateCount += 1;
  }

  const sampleCount = findings.length || 1;
  return {
    findingIds: findings.map((finding) => finding.findingId),
    topicCounts,
    signalFamilyCounts,
    sourceTypeCounts,
    sourceScopeCounts,
    sourceDomainCounts,
    averageFreshnessScore: clampScore(freshnessTotal / sampleCount),
    averageSourceQualityScore: clampScore(sourceQualityTotal / sampleCount),
    duplicateCount,
    generatedAt,
  };
}
