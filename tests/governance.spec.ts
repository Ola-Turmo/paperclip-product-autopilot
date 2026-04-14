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

  it("requires a governance note for merge locks", () => {
    expect(() =>
      requireGovernancePolicy({
        action: "merge_lock",
        governanceNote: "",
      }),
    ).toThrow("governance note");
  });
});
