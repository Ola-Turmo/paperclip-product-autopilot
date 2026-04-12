import type { PreferenceProfile, ResearchFinding } from "../types.js";
import { rankFindingsForIdeation } from "./ideation.js";

export interface IdeationReplayCase {
  caseId: string;
  findings: ResearchFinding[];
  expectedTopFindingIds: string[];
  profile?: PreferenceProfile | null;
}

export interface IdeationReplayResult {
  caseId: string;
  top1Hit: boolean;
  top3Hit: boolean;
  reciprocalRank: number;
  rankedFindingIds: string[];
}

export interface IdeationReplaySummary {
  totalCases: number;
  top1Accuracy: number;
  top3Accuracy: number;
  meanReciprocalRank: number;
  results: IdeationReplayResult[];
}

function reciprocalRankOfMatch(rankedFindingIds: string[], expectedIds: string[]): number {
  for (let index = 0; index < rankedFindingIds.length; index += 1) {
    if (expectedIds.includes(rankedFindingIds[index]!)) {
      return 1 / (index + 1);
    }
  }
  return 0;
}

export function evaluateIdeationReplay(cases: IdeationReplayCase[]): IdeationReplaySummary {
  const results = cases.map<IdeationReplayResult>((replayCase) => {
    const rankedFindingIds = rankFindingsForIdeation(replayCase.findings, replayCase.profile)
      .map((finding) => finding.findingId);
    const top1Hit = replayCase.expectedTopFindingIds.includes(rankedFindingIds[0] ?? "");
    const top3Hit = rankedFindingIds.slice(0, 3).some((id) => replayCase.expectedTopFindingIds.includes(id));
    const reciprocalRank = reciprocalRankOfMatch(rankedFindingIds, replayCase.expectedTopFindingIds);

    return {
      caseId: replayCase.caseId,
      top1Hit,
      top3Hit,
      reciprocalRank,
      rankedFindingIds,
    };
  });

  const totalCases = results.length;
  const top1Accuracy = totalCases === 0 ? 0 : results.filter((result) => result.top1Hit).length / totalCases;
  const top3Accuracy = totalCases === 0 ? 0 : results.filter((result) => result.top3Hit).length / totalCases;
  const meanReciprocalRank = totalCases === 0
    ? 0
    : results.reduce((sum, result) => sum + result.reciprocalRank, 0) / totalCases;

  return {
    totalCases,
    top1Accuracy,
    top3Accuracy,
    meanReciprocalRank,
    results,
  };
}
