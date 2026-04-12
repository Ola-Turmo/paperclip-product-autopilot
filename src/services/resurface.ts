import type { Idea } from "../types.js";

export function shouldResurfaceIdea(idea: Idea, thresholdIso: string): boolean {
  return new Date(idea.updatedAt) <= new Date(thresholdIso);
}
