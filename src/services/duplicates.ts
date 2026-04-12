import type { Idea } from "../types.js";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "with", "by",
  "from", "into", "at", "is", "are", "be", "this", "that",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function overlapSimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.92;
  return jaccardSimilarity(tokenize(normalizedA), tokenize(normalizedB));
}

export function scoreIdeaDuplicateCandidate(input: {
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  sourceReferences?: string[];
}, existing: Idea): {
  similarity: number;
  reasons: string[];
} {
  const titleSimilarity = overlapSimilarity(input.title, existing.title);
  const descriptionSimilarity = overlapSimilarity(input.description, existing.description);
  const categoryBoost = input.category && existing.category && input.category === existing.category ? 0.08 : 0;
  const tagOverlap = (input.tags ?? []).filter((tag) => existing.tags?.includes(tag)).length;
  const tagBoost = Math.min(tagOverlap * 0.03, 0.09);
  const sourceOverlap = (input.sourceReferences ?? []).some((ref) => existing.sourceReferences.includes(ref)) ? 0.05 : 0;

  const similarity = Math.max(0, Math.min(
    1,
    titleSimilarity * 0.6 +
    descriptionSimilarity * 0.25 +
    categoryBoost +
    tagBoost +
    sourceOverlap,
  ));

  const reasons: string[] = [];
  if (titleSimilarity >= 0.9) reasons.push("near-identical title");
  else if (titleSimilarity >= 0.55) reasons.push("overlapping title terms");
  if (descriptionSimilarity >= 0.5) reasons.push("similar description");
  if (categoryBoost > 0) reasons.push("same category");
  if (tagBoost > 0) reasons.push("overlapping tags");
  if (sourceOverlap > 0) reasons.push("shared source reference");

  return { similarity, reasons };
}
