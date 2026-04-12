import type {
  AutomationTier,
  ConvoyTaskStatus,
  SwipeDecision,
} from "../constants.js";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isAutomationTier(value: unknown): value is AutomationTier {
  return value === "supervised" || value === "semiauto" || value === "fullauto";
}

export function parseAutomationTier(
  value: unknown,
  fallback: AutomationTier = "supervised",
): AutomationTier {
  return isAutomationTier(value) ? value : fallback;
}

export function isSwipeDecision(value: unknown): value is SwipeDecision {
  return value === "pass" || value === "maybe" || value === "yes" || value === "now";
}

export function isConvoyTaskStatus(value: unknown): value is ConvoyTaskStatus {
  return ["pending", "blocked", "running", "passed", "failed", "skipped"].includes(String(value));
}

export function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function requireCompanyAndProject(
  args: Record<string, unknown>,
): { companyId: string; projectId: string } | string {
  if (!isNonEmptyString(args.companyId)) return "companyId is required";
  if (!isNonEmptyString(args.projectId)) return "projectId is required";
  return { companyId: args.companyId, projectId: args.projectId };
}
