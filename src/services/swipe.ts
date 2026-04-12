import type { Idea, PreferenceProfile, SwipeEvent } from "../types.js";
import type { IdeaStatus, SwipeDecision } from "../constants.js";

export function deriveIdeaStatusFromSwipe(currentStatus: IdeaStatus, decision: SwipeDecision): IdeaStatus {
  if (decision === "pass") return "rejected";
  if (decision === "maybe") return "maybe";
  if (decision === "yes" || decision === "now") return "approved";
  return currentStatus;
}

export function buildSwipeEvent(input: {
  swipeId: string;
  companyId: string;
  projectId: string;
  ideaId: string;
  decision: SwipeDecision;
  note?: string;
  createdAt: string;
}): SwipeEvent {
  return {
    swipeId: input.swipeId,
    companyId: input.companyId,
    projectId: input.projectId,
    ideaId: input.ideaId,
    decision: input.decision,
    note: input.note,
    createdAt: input.createdAt,
  };
}

export function createEmptyPreferenceProfile(input: {
  profileId: string;
  companyId: string;
  projectId: string;
  lastUpdated: string;
}): PreferenceProfile {
  return {
    profileId: input.profileId,
    companyId: input.companyId,
    projectId: input.projectId,
    passCount: 0,
    maybeCount: 0,
    yesCount: 0,
    nowCount: 0,
    totalSwipes: 0,
    categoryPreferences: {},
    tagPreferences: {},
    avgApprovedScore: 0,
    avgRejectedScore: 0,
    lastUpdated: input.lastUpdated,
  };
}

export function applySwipeToIdea(idea: Idea, decision: SwipeDecision, updatedAt: string): Idea {
  return {
    ...idea,
    status: deriveIdeaStatusFromSwipe(idea.status, decision),
    updatedAt,
  };
}
