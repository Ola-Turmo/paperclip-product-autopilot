import { describe, expect, it } from "vitest";
import { requireGovernancePolicy } from "../src/services/governance.js";

describe("governance policy", () => {
  it("rejects auto-approve outside safe fullauto boundaries", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "auto_approve_plan",
        automationTier: "semiauto",
        executionMode: "simple",
        complexityEstimate: "low",
      }),
    ).toThrow("fullauto mode");

    expect(() =>
      requireGovernancePolicy({
        action: "auto_approve_plan",
        automationTier: "fullauto",
        executionMode: "convoy",
        complexityEstimate: "medium",
      }),
    ).toThrow("Convoy plans");

    expect(() =>
      requireGovernancePolicy({
        action: "auto_approve_plan",
        automationTier: "fullauto",
        executionMode: "simple",
        complexityEstimate: "high",
      }),
    ).toThrow("High-complexity");
  });

  it("requires operator acknowledgment and note for full rollback", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "full_rollback",
        governanceNote: "",
        operatorAcknowledged: false,
      }),
    ).toThrow("operator acknowledgment");

    expect(() =>
      requireGovernancePolicy({
        action: "full_rollback",
        governanceNote: "Customer-visible failure requires immediate rollback",
        operatorAcknowledged: true,
      }),
    ).not.toThrow();
  });

  it("requires operator acknowledgment and note for revert-commit rollback", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "revert_commit_rollback",
        governanceNote: "",
        operatorAcknowledged: false,
      }),
    ).toThrow("operator acknowledgment");

    expect(() =>
      requireGovernancePolicy({
        action: "revert_commit_rollback",
        governanceNote: "Reverting the latest commit to restore service",
        operatorAcknowledged: true,
      }),
    ).not.toThrow();
  });

  it("requires a governance note for merge locks", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "merge_lock",
        governanceNote: "",
      }),
    ).toThrow("governance note");
  });

  it("requires acknowledgment and a note for releasing merge locks", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "release_merge_lock",
        governanceNote: "",
        operatorAcknowledged: false,
      }),
    ).toThrow("operator acknowledgment");

    expect(() =>
      requireGovernancePolicy({
        action: "release_merge_lock",
        governanceNote: "Conditions satisfied, removing the gate",
        operatorAcknowledged: true,
      }),
    ).not.toThrow();
  });

  it("requires acknowledgment and a note for force-cancel", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "force_cancel_run",
        governanceNote: "",
        operatorAcknowledged: false,
      }),
    ).toThrow("operator acknowledgment");

    expect(() =>
      requireGovernancePolicy({
        action: "force_cancel_run",
        governanceNote: "Checkpoint unavailable and operator is halting the run",
        operatorAcknowledged: true,
      }),
    ).not.toThrow();
  });
});
