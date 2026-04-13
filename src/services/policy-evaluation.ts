import type { Digest } from "../types.js";
import { hasPendingDigestForCandidate } from "./digest-policy.js";

export interface DigestPolicyReplayCase {
  caseId: string;
  existingDigests: Digest[];
  candidateDigest: Digest;
  expectedCreate: boolean;
}

export interface DigestPolicyReplayResult {
  caseId: string;
  expectedCreate: boolean;
  actualCreate: boolean;
  passed: boolean;
}

export interface DigestPolicyReplaySummary {
  totalCases: number;
  accuracy: number;
  results: DigestPolicyReplayResult[];
}

export function evaluateDigestPolicyReplay(cases: DigestPolicyReplayCase[]): DigestPolicyReplaySummary {
  const results = cases.map<DigestPolicyReplayResult>((replayCase) => {
    const actualCreate = !hasPendingDigestForCandidate(replayCase.existingDigests, replayCase.candidateDigest);
    return {
      caseId: replayCase.caseId,
      expectedCreate: replayCase.expectedCreate,
      actualCreate,
      passed: actualCreate === replayCase.expectedCreate,
    };
  });

  const totalCases = results.length;
  const accuracy = totalCases === 0 ? 0 : results.filter((result) => result.passed).length / totalCases;

  return {
    totalCases,
    accuracy,
    results,
  };
}
