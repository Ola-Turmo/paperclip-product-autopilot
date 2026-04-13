import type { DigestPolicyReplaySummary } from "./policy-evaluation.js";
import type { IdeationReplaySummary } from "./evaluation.js";

export interface QualityScorecard {
  ideationTop1Accuracy: number;
  ideationTop3Accuracy: number;
  ideationMeanReciprocalRank: number;
  digestPolicyAccuracy: number;
  overallScore: number;
}

export function buildQualityScorecard(input: {
  ideation: IdeationReplaySummary;
  digestPolicy: DigestPolicyReplaySummary;
}): QualityScorecard {
  const overallScore =
    input.ideation.top1Accuracy * 0.35 +
    input.ideation.top3Accuracy * 0.2 +
    input.ideation.meanReciprocalRank * 0.25 +
    input.digestPolicy.accuracy * 0.2;

  return {
    ideationTop1Accuracy: input.ideation.top1Accuracy,
    ideationTop3Accuracy: input.ideation.top3Accuracy,
    ideationMeanReciprocalRank: input.ideation.meanReciprocalRank,
    digestPolicyAccuracy: input.digestPolicy.accuracy,
    overallScore,
  };
}
