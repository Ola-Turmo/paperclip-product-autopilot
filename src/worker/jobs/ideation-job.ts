// Ideation job handler — generates scored ideas from Product Program + research findings
import { ideaRegistry, productProgramRevisionRegistry, researchCycleRegistry, preferenceProfileRegistry } from '../registry.js';
import type { Idea, PreferenceProfile } from '../../types/entities.js';

export interface IdeationJobContext {
  companyId: string;
  projectId: string;
  cycleId?: string;  // optional — if provided, uses findings from this cycle
}

export async function runIdeationJob(ctx: IdeationJobContext): Promise<{ success: boolean; ideas: string[] }> {
  const { companyId, projectId, cycleId } = ctx;

  // Get latest Product Program revision
  const revisions = productProgramRevisionRegistry.getByProject(companyId, projectId);
  const latestProgram = revisions.sort((a, b) => b.version - a.version)[0];

  // Get research findings (from specific cycle or all-time)
  let findings: { id: string; findingType: string; title: string; summary: string }[] = [];
  if (cycleId) {
    const cycle = researchCycleRegistry.get(cycleId);
    // Get findings for this cycle — need to filter
    findings = (await import('../registry.js')).researchFindingRegistry
      .getByProject(companyId, projectId)
      .filter(f => f.cycleId === cycleId)
      .map(f => ({ id: f.id, findingType: f.findingType, title: f.title, summary: f.summary }));
  } else {
    findings = (await import('../registry.js')).researchFindingRegistry
      .getByProject(companyId, projectId)
      .map(f => ({ id: f.id, findingType: f.findingType, title: f.title, summary: f.summary }));
  }

  // Get preference profile
  const profile = preferenceProfileRegistry.get(`${companyId}:${projectId}`);
  const prefModel = profile ? createScoringWeights(profile) : null;

  // Generate ideas from findings
  const generatedIdeas = generateIdeasFromFindings(companyId, projectId, latestProgram?.content ?? '', findings, cycleId);

  // Deduplicate against existing ideas
  const existingIdeas = ideaRegistry.getByProject(companyId, projectId);
  const existingTitles = new Set(existingIdeas.map(i => i.title.toLowerCase()));
  const newIdeas = generatedIdeas.filter(idea => !existingTitles.has(idea.title.toLowerCase()));

  // Store ideas
  const ideaIds: string[] = [];
  for (const ideaData of newIdeas) {
    const created = ideaRegistry.create(companyId, projectId, {
      ...ideaData,
      status: 'pending',
    });
    ideaIds.push(created.id);
  }

  return { success: true, ideas: ideaIds };
}

interface ScoringWeights {
  categoryWeights: Record<string, number>;
  complexityTolerance: 'low' | 'medium' | 'high';
  impactOverFeasibility: number;
}

function createScoringWeights(profile: PreferenceProfile): ScoringWeights {
  return {
    categoryWeights: profile.weights.categoryWeights ?? {},
    complexityTolerance: profile.weights.complexityTolerance ?? 'medium',
    impactOverFeasibility: profile.weights.impactOverFeasibility ?? 0.5,
  };
}

function generateIdeasFromFindings(
  companyId: string,
  projectId: string,
  programContent: string,
  findings: { id: string; findingType: string; title: string; summary: string }[],
  cycleId?: string
): Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'>[] {
  const ideas: Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

  for (const finding of findings) {
    const idea = ideaFromFinding(finding, programContent, cycleId);
    if (idea) ideas.push(idea);
  }

  return ideas;
}

function ideaFromFinding(
  finding: { id: string; findingType: string; title: string; summary: string },
  _programContent: string,
  cycleId?: string
): Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'> | null {
  // Map finding types to idea categories
  const categoryMap: Record<string, string> = {
    'opportunity': 'feature',
    'threat': 'feature',
    'user-need': 'feature',
    'competitor': 'feature',
    'insight': 'tech-debt',
  };

  const category = categoryMap[finding.findingType] ?? 'feature';

  // Score based on finding type
  let impactScore = 7;
  let feasibilityScore = 6;
  let complexity: 'low' | 'medium' | 'high' = 'medium';

  if (finding.findingType === 'opportunity') {
    impactScore = 8;
    feasibilityScore = 7;
    complexity = 'medium';
  } else if (finding.findingType === 'threat') {
    impactScore = 9;
    feasibilityScore = 5;
    complexity = 'high';
  } else if (finding.findingType === 'user-need') {
    impactScore = 8;
    feasibilityScore = 8;
    complexity = 'medium';
  }

  return {
    cycleId,
    title: `Address: ${finding.title}`,
    summary: finding.summary,
    category,
    impactScore,
    feasibilityScore,
    complexity,
    approach: `Based on research finding: "${finding.summary}"`,
    risks: ['Scope may expand beyond initial finding'],
    researchRefs: [finding.id],
    status: 'pending',
  };
}
