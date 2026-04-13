export type FailureCategory =
  | "test_failure"
  | "build_failure"
  | "deploy_failure"
  | "merge_conflict"
  | "timeout"
  | "budget_exhausted"
  | "validation_error"
  | "network_error"
  | "unknown";

const MATCHERS: Array<{ category: FailureCategory; pattern: RegExp }> = [
  { category: "test_failure", pattern: /\b(test|assert|vitest|jest|playwright)\b/i },
  { category: "build_failure", pattern: /\b(build|compile|typescript|tsc|esbuild|rollup|syntax error)\b/i },
  { category: "deploy_failure", pattern: /\b(deploy|release|production|rollout|publish)\b/i },
  { category: "merge_conflict", pattern: /\b(conflict|merge conflict|rebase|cannot merge)\b/i },
  { category: "timeout", pattern: /\b(timeout|timed out|deadline exceeded)\b/i },
  { category: "budget_exhausted", pattern: /\b(budget exhausted|quota exceeded|out of budget)\b/i },
  { category: "validation_error", pattern: /\b(validation|invalid|schema|required field|not found)\b/i },
  { category: "network_error", pattern: /\b(network|fetch failed|econn\w*|dns|connection reset|socket)\b/i },
];

export function classifyFailureMessage(message?: string | null): FailureCategory | null {
  if (!message) return null;
  for (const matcher of MATCHERS) {
    if (matcher.pattern.test(message)) {
      return matcher.category;
    }
  }
  return "unknown";
}

export function formatFailureCategory(category: FailureCategory | null): string | null {
  if (!category) return null;
  return category.replace(/_/g, " ");
}
