import { describe, expect, it } from "vitest";
import { getIdeationBenchmarkSummary, ideationBenchmarkCases } from "../src/services/evaluation-fixtures.js";

describe("evaluation fixtures", () => {
  it("provides a stable benchmark scorecard", () => {
    const summary = getIdeationBenchmarkSummary();

    expect(ideationBenchmarkCases).toHaveLength(3);
    expect(summary.totalCases).toBe(3);
    expect(summary.top3Accuracy).toBe(1);
    expect(summary.meanReciprocalRank).toBeGreaterThan(0.6);
  });
});
