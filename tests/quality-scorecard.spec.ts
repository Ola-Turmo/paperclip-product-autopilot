import { describe, expect, it } from "vitest";
import { getDigestPolicyBenchmarkSummary, getIdeationBenchmarkSummary, getQualityScorecardSummary } from "../src/services/evaluation-fixtures.js";

describe("quality scorecard", () => {
  it("combines ideation and digest policy quality into one scorecard", () => {
    const ideation = getIdeationBenchmarkSummary();
    const digestPolicy = getDigestPolicyBenchmarkSummary();
    const scorecard = getQualityScorecardSummary();

    expect(scorecard.ideationTop1Accuracy).toBe(ideation.top1Accuracy);
    expect(scorecard.digestPolicyAccuracy).toBe(digestPolicy.accuracy);
    expect(scorecard.overallScore).toBeGreaterThan(0.5);
    expect(scorecard.overallScore).toBeLessThanOrEqual(1);
  });
});
