// State helpers for preference model and maybe pool
import { ideaRegistry, swipeEventRegistry, researchCycleRegistry } from './registry.js';
import type { Idea, SwipeEvent, PreferenceProfile, ResearchCycle } from '../types/entities.js';

export class PreferenceModel {
  constructor(
    private companyId: string,
    private projectId: string,
    private profile: PreferenceProfile
  ) {}

  // Score an idea based on preference weights
  scoreIdea(idea: Pick<Idea, 'category' | 'complexity' | 'impactScore' | 'feasibilityScore'>): number {
    let score = 0;
    
    // Category weight
    const catWeight = this.profile.weights.categoryWeights?.[idea.category] ?? 1.0;
    
    // Start with impact weighted by category
    score = idea.impactScore * catWeight;
    
    // Complexity tolerance adjustment
    const complexityTol = this.profile.weights.complexityTolerance ?? 'medium';
    if (idea.complexity === 'low') {
      score *= 1.2;
    } else if (idea.complexity === 'high' && complexityTol === 'low') {
      score *= 0.5;
    } else if (idea.complexity === 'high' && complexityTol === 'high') {
      score *= 1.1;
    }
    
    // Impact vs feasibility preference
    const impactWeight = this.profile.weights.impactOverFeasibility ?? 0.5;
    const combinedScore = idea.impactScore * impactWeight + idea.feasibilityScore * (1 - impactWeight);
    
    // Normalize by category weight
    score = combinedScore * catWeight;
    
    return Math.round(score * 100) / 100;
  }

  // Get the underlying profile
  getProfile(): PreferenceProfile {
    return this.profile;
  }
}

export class MaybePool {
  constructor(
    private companyId: string,
    private projectId: string
  ) {}

  // Get ideas in the maybe pool
  getIdeas(): Idea[] {
    return ideaRegistry.getByProject(this.companyId, this.projectId)
      .filter(idea => idea.status === 'maybe');
  }

  // Check if an idea should be resurfaced based on rules
  shouldResurface(idea: Idea): boolean {
    const lastSwipe = this.getLastSwipeForIdea(idea.id);
    if (!lastSwipe) return true;
    
    const daysSinceSwipe = (Date.now() - new Date(lastSwipe.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    
    // Default: resurface after 7 days if new research has happened
    if (daysSinceSwipe < 7) return false;
    
    // Check if there's been new research since the last swipe
    const researchCycles = this.getResearchCyclesSince(lastSwipe.createdAt);
    return researchCycles.length > 0;
  }

  // Get all swipe events for an idea, most recent first
  getSwipesForIdea(ideaId: string): SwipeEvent[] {
    return swipeEventRegistry.getByProject(this.companyId, this.projectId)
      .filter(swipe => swipe.ideaId === ideaId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get the most recent swipe for an idea
  private getLastSwipeForIdea(ideaId: string): SwipeEvent | undefined {
    const swipes = this.getSwipesForIdea(ideaId);
    return swipes[0];
  }

  // Get research cycles since a given date
  private getResearchCyclesSince(sinceDate: string): ResearchCycle[] {
    const since = new Date(sinceDate).getTime();
    return researchCycleRegistry.getByProject(this.companyId, this.projectId)
      .filter((cycle: ResearchCycle) => 
        new Date(cycle.startedAt).getTime() > since
      );
  }

  // Resurface ideas that are due for reconsideration
  getResurfaceCandidates(): Idea[] {
    return this.getIdeas().filter(idea => this.shouldResurface(idea));
  }

  // Move an idea to the maybe pool
  moveToMaybe(ideaId: string): boolean {
    const idea = ideaRegistry.get(ideaId);
    if (!idea || idea.companyId !== this.companyId || idea.projectId !== this.projectId) {
      return false;
    }
    const updated = ideaRegistry.update(ideaId, { status: 'maybe' });
    return updated !== undefined;
  }

  // Move an idea out of the maybe pool
  removeFromMaybe(ideaId: string): boolean {
    const idea = ideaRegistry.get(ideaId);
    if (!idea || idea.companyId !== this.companyId || idea.projectId !== this.projectId) {
      return false;
    }
    const updated = ideaRegistry.update(ideaId, { status: 'pending' });
    return updated !== undefined;
  }
}
