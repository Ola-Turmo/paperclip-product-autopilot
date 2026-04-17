import type { AutomationTier, ExecutionMode } from "../constants.js";
import type { Idea } from "../types.js";

export type GovernanceAction =
  | "auto_approve_plan"
  | "full_rollback"
  | "revert_commit_rollback"
  | "merge_lock"
  | "release_merge_lock"
  | "force_cancel_run";

export function requireGovernancePolicy(input: {
  action: GovernanceAction;
  automationTier?: AutomationTier;
  executionMode?: ExecutionMode;
  complexityEstimate?: Idea["complexityEstimate"];
  governanceNote?: string;
  operatorAcknowledged?: boolean;
}): void {
  switch (input.action) {
    case "auto_approve_plan":
      if (input.automationTier !== "fullauto") {
        throw new Error("Auto-approved plans are only allowed in fullauto mode");
      }
      if (input.executionMode === "convoy") {
        throw new Error("Convoy plans must remain manually approved");
      }
      if (input.complexityEstimate === "high") {
        throw new Error("High-complexity plans must remain manually approved");
      }
      return;
    case "full_rollback":
      if (!input.operatorAcknowledged) {
        throw new Error("Full rollback requires explicit operator acknowledgment");
      }
      if (!input.governanceNote?.trim()) {
        throw new Error("Full rollback requires a governance note");
      }
      return;
    case "revert_commit_rollback":
      if (!input.operatorAcknowledged) {
        throw new Error("Revert-commit rollback requires explicit operator acknowledgment");
      }
      if (!input.governanceNote?.trim()) {
        throw new Error("Revert-commit rollback requires a governance note");
      }
      return;
    case "merge_lock":
      if (!input.governanceNote?.trim()) {
        throw new Error("Merge locks require a governance note");
      }
      return;
    case "release_merge_lock":
      if (!input.operatorAcknowledged) {
        throw new Error("Releasing a merge lock requires explicit operator acknowledgment");
      }
      if (!input.governanceNote?.trim()) {
        throw new Error("Releasing a merge lock requires a governance note");
      }
      return;
    case "force_cancel_run":
      if (!input.operatorAcknowledged) {
        throw new Error("Force-cancel requires explicit operator acknowledgment");
      }
      if (!input.governanceNote?.trim()) {
        throw new Error("Force-cancel requires a governance note");
      }
      return;
    default: {
      const exhaustive: never = input.action;
      throw new Error(`Unhandled governance action: ${exhaustive}`);
    }
  }
}
