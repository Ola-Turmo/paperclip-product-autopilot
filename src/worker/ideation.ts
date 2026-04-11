// Idea engine — generates, scores, and deduplicates product ideas
import { ideaRegistry, productProgramRevisionRegistry, researchFindingRegistry, preferenceProfileRegistry } from './registry.js';
import type { Idea, ProductProgramRevision, ResearchFinding, PreferenceProfile } from '../types/entities.js';

export interface IdeaGenerationInput {
  companyId: string;
  projectId: string;
  programContent?: string;  // latest Product Program content
  maxIdeas?: number;         // cap on ideas to generate (default 10)
}

export interface ScoredIdea {
  idea: Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'>;
  score: number;
  reasoning: string;
}

// Main entry point
export async function generateIdeas(input: IdeaGenerationInput): Promise<ScoredIdea[]> {
  const { companyId, projectId, programContent, maxIdeas = 10 } = input;

  // 1. Gather inputs
  const findings = researchFindingRegistry.getByProject(companyId, projectId);
  const revisions = productProgramRevisionRegistry.getByProject(companyId, projectId);
  const latestProgram = revisions.sort((a, b) => b.version - a.version)[0];
  const profile = preferenceProfileRegistry.get(`${companyId}:${projectId}`);

  const program = programContent ?? latestProgram?.content ?? '';
  
  // 2. Get existing ideas for deduplication
  const existingIdeas = ideaRegistry.getByProject(companyId, projectId);

  // 3. Generate candidate ideas from findings
  const candidates = generateFromFindings(findings, profile);

  // 4. Generate candidate ideas from program gaps (themes, OKRs not yet addressed)
  const programIdeas = generateFromProgram(program, existingIdeas);
  
  // 5. Combine and deduplicate
  const allCandidates = [...candidates, ...programIdeas];
  const deduplicated = deduplicateIdeas(allCandidates, existingIdeas);

  // 6. Score each idea
  const scored = deduplicated.map(candidate => ({
    ...candidate,
    score: scoreIdea(candidate.idea, profile),
    reasoning: buildReasoning(candidate.idea, profile),
  }));

  // 7. Sort by score descending and cap
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxIdeas);
}

// Generate ideas from research findings
function generateFromFindings(
  findings: ResearchFinding[],
  profile: PreferenceProfile | undefined
): ScoredIdea[] {
  return findings.map(finding => {
    const { impactScore, feasibilityScore, complexity, approach, risks } = scoreFromFinding(finding);
    
    const idea: Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'> = {
      cycleId: finding.cycleId,
      title: `Address: ${finding.title}`,
      summary: finding.summary,
      category: mapFindingTypeToCategory(finding.findingType),
      impactScore,
      feasibilityScore,
      complexity,
      approach,
      risks,
      researchRefs: [finding.id],
      status: 'pending',
    };

    return { idea, score: 0, reasoning: `Derived from ${finding.findingType}: ${finding.title}` };
  });
}

// Generate ideas from Product Program gaps
function generateFromProgram(
  programContent: string,
  existingIdeas: Idea[]
): ScoredIdea[] {
  const ideas: ScoredIdea[] = [];
  
  if (!programContent) return ideas;

  // Extract themes from markdown headers (# ## etc.)
  const themeMatches = programContent.match(/^##?\s+(.+)$/gm) ?? [];
  const themes = themeMatches.map(m => m.replace(/^##?\s+/, '').trim());

  for (const theme of themes) {
    // Check if there's already an idea addressing this theme
    const addressed = existingIdeas.some(
      i => i.title.toLowerCase().includes(theme.toLowerCase()) ||
           i.summary.toLowerCase().includes(theme.toLowerCase())
    );
    if (!addressed && theme.length > 3) {
      ideas.push({
        idea: {
          title: `Expand: ${theme}`,
          summary: `Deep dive into ${theme} based on Product Program priorities`,
          category: 'feature',
          impactScore: 7,
          feasibilityScore: 6,
          complexity: 'medium',
          approach: `Conduct thorough analysis and implementation for ${theme}`,
          risks: ['May require coordination with other teams'],
          status: 'pending',
        },
        score: 0,
        reasoning: `Gap identified in Product Program: ${theme}`,
      });
    }
  }

  // Also look for roadmap items or OKRs that might indicate themes
  const roadmapMatches = programContent.match(/(?:roadmap|okr|objective|key result)[^\n]*:/gi) ?? [];
  for (const match of roadmapMatches) {
    const clean = match.replace(/[:\s]+$/, '').trim();
    if (clean.length > 4) {
      const addressed = existingIdeas.some(
        i => i.title.toLowerCase().includes(clean.toLowerCase()) ||
             i.summary.toLowerCase().includes(clean.toLowerCase())
      );
      if (!addressed) {
        ideas.push({
          idea: {
            title: `Address: ${clean}`,
            summary: `Implement roadmap item: ${clean}`,
            category: 'feature',
            impactScore: 7,
            feasibilityScore: 6,
            complexity: 'medium',
            approach: `Execute on ${clean} from Product Program roadmap`,
            risks: ['Dependencies may affect timeline'],
            status: 'pending',
          },
          score: 0,
          reasoning: `Roadmap gap detected: ${clean}`,
        });
      }
    }
  }

  return ideas;
}

// Score idea based on preference profile
export function scoreIdea(
  idea: Pick<Idea, 'category' | 'complexity' | 'impactScore' | 'feasibilityScore'>,
  profile: PreferenceProfile | undefined
): number {
  let score = idea.impactScore * 0.6 + idea.feasibilityScore * 0.4;

  if (profile) {
    // Apply category weight
    const catWeight = profile.weights.categoryWeights?.[idea.category] ?? 1.0;
    score *= catWeight;

    // Apply complexity tolerance
    const tol = profile.weights.complexityTolerance ?? 'medium';
    if (idea.complexity === 'low') score *= 1.15;
    else if (idea.complexity === 'high' && tol === 'low') score *= 0.7;
    else if (idea.complexity === 'high' && tol === 'high') score *= 1.1;
  }

  return Math.round(score * 10) / 10;
}

// Deduplicate ideas by title similarity (case-insensitive exact match)
function deduplicateIdeas(
  candidates: ScoredIdea[],
  existing: Idea[]
): ScoredIdea[] {
  const seen = new Set<string>();
  const existingTitles = new Set(existing.map(i => i.title.toLowerCase()));

  return candidates.filter(c => {
    const normalized = c.idea.title.toLowerCase();
    if (existingTitles.has(normalized)) return false;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function scoreFromFinding(finding: ResearchFinding) {
  let impactScore = 7;
  let feasibilityScore = 6;
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  let approach = `Investigate and address: ${finding.summary}`;
  let risks = ['Risk of scope creep'];

  switch (finding.findingType) {
    case 'opportunity':
      impactScore = 8;
      feasibilityScore = 7;
      break;
    case 'threat':
      impactScore = 9;
      feasibilityScore = 5;
      complexity = 'high';
      approach = `Mitigate threat: ${finding.summary}`;
      risks = ['Competitive response', 'Timeline pressure'];
      break;
    case 'user-need':
      impactScore = 8;
      feasibilityScore = 8;
      complexity = 'medium';
      approach = `Build feature to satisfy user need: ${finding.summary}`;
      risks = ['User requirement changes'];
      break;
    case 'competitor':
      impactScore = 7;
      feasibilityScore = 6;
      complexity = 'medium';
      approach = `Match competitor capability: ${finding.summary}`;
      risks = ['Feature parity trap', 'Differentiation loss'];
      break;
    case 'insight':
      impactScore = 6;
      feasibilityScore = 9;
      complexity = 'low';
      approach = `Quick win based on insight: ${finding.summary}`;
      risks = ['Insight may be wrong'];
      break;
  }

  return { impactScore, feasibilityScore, complexity, approach, risks };
}

function mapFindingTypeToCategory(type: string): string {
  const map: Record<string, string> = {
    'opportunity': 'feature',
    'threat': 'feature',
    'user-need': 'feature',
    'competitor': 'feature',
    'insight': 'tech-debt',
  };
  return map[type] ?? 'feature';
}

function buildReasoning(
  idea: Omit<Idea, 'id' | 'companyId' | 'projectId' | 'createdAt' | 'updatedAt'>,
  profile: PreferenceProfile | undefined
): string {
  let reason = `${idea.impactScore} impact, ${idea.feasibilityScore} feasibility, ${idea.complexity} complexity`;
  if (profile?.weights.categoryWeights?.[idea.category]) {
    reason += ` [${idea.category} weight: ${profile.weights.categoryWeights[idea.category]}]`;
  }
  return reason;
}
