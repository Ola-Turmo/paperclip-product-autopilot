// Maybe Pool Resurfacer — checks maybed ideas and re-queues them based on resurfacing rules
import { ideaRegistry } from '../registry.js';
import type { Idea } from '../../types/entities.js';

export interface MaybePoolResurfacerContext {
  companyId: string;
  projectId: string;
  resurfaceAfterDays?: number;  // default 7
  requireNewResearch?: boolean;  // default false
}

export async function runMaybePoolResurfacer(
  ctx: MaybePoolResurfacerContext
): Promise<{ resurfaced: number; ideas: string[] }> {
  const { companyId, projectId, resurfaceAfterDays = 7, requireNewResearch = false } = ctx;

  // Get all ideas in 'maybe' status
  const maybedIdeas = ideaRegistry.getByProject(companyId, projectId)
    .filter(idea => idea.status === 'maybe');

  const resurfaced: string[] = [];

  for (const idea of maybedIdeas) {
    if (shouldResurface(idea, resurfaceAfterDays, requireNewResearch, companyId, projectId)) {
      // Move from maybe back to pending for re-review
      ideaRegistry.update(idea.id, { status: 'pending', updatedAt: new Date().toISOString() });
      resurfaced.push(idea.id);
    }
  }

  return { resurfaced: resurfaced.length, ideas: resurfaced };
}

function shouldResurface(
  idea: Idea,
  resurfaceAfterDays: number,
  requireNewResearch: boolean,
  companyId: string,
  projectId: string
): boolean {
  const lastUpdate = new Date(idea.updatedAt);
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate < resurfaceAfterDays) {
    return false;
  }

  // If requireNewResearch is true, only resurface if there's new research since the idea was maybed
  if (requireNewResearch) {
    const latestCycle = (idea.cycleId) 
      ? undefined  // TODO: compare cycle timestamps
      : true;
    if (!latestCycle) return false;
  }

  return true;
}
