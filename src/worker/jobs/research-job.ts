// Research job handler — triggers and manages research cycles
import { researchCycleRegistry, researchFindingRegistry, ideaRegistry } from '../registry.js';
import type { ResearchCycle, ResearchFinding, AutopilotProject } from '../../types/entities.js';

export interface ResearchJobContext {
  companyId: string;
  projectId: string;
  cycleId: string;
}

export async function runResearchJob(ctx: ResearchJobContext): Promise<{ success: boolean; cycleId: string; findings: string[] }> {
  const { companyId, projectId, cycleId } = ctx;

  // Update cycle status to running
  const cycle = researchCycleRegistry.update(cycleId, { status: 'running', startedAt: new Date().toISOString() });
  if (!cycle) {
    return { success: false, cycleId, findings: [] };
  }

  try {
    // Simulate research agent work — in production this would invoke actual research agents
    const findings = await performResearch(companyId, projectId, cycleId);
    
    // Store findings
    const findingIds: string[] = [];
    for (const finding of findings) {
      const created = researchFindingRegistry.create(companyId, projectId, finding);
      findingIds.push(created.id);
    }

    // Update cycle as completed
    researchCycleRegistry.update(cycleId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      reportSummary: `Completed ${findings.length} findings across ${new Set(findings.map(f => f.findingType)).size} categories`,
    });

    return { success: true, cycleId, findings: findingIds };
  } catch (error) {
    researchCycleRegistry.update(cycleId, { status: 'failed' });
    return { success: false, cycleId, findings: [] };
  }
}

async function performResearch(
  companyId: string,
  projectId: string,
  cycleId: string
): Promise<Omit<ResearchFinding, 'id' | 'cycleId' | 'companyId' | 'projectId' | 'createdAt'>[]> {
  // TODO: In production, this would call research agents via ctx.agents
  // For MVP, generate placeholder findings based on the Product Program
  
  const findings: Omit<ResearchFinding, 'id' | 'cycleId' | 'companyId' | 'projectId' | 'createdAt'>[] = [
    {
      findingType: 'opportunity',
      title: 'User onboarding friction detected',
      summary: 'Analytics shows 40% drop-off during initial setup flow. Streamlining could increase activation.',
      evidence: 'Product analytics, session recordings',
    },
    {
      findingType: 'opportunity',
      title: 'Mobile usage growing 3x year-over-year',
      summary: 'Mobile traffic now accounts for 60% of visits but conversion is 50% lower than desktop.',
      evidence: 'Google Analytics, app store data',
    },
    {
      findingType: 'threat',
      title: 'Competitor X launched similar feature',
      summary: 'Direct competitor released AI-powered similar functionality in Q1.',
      evidence: 'Competitor website, product analysis',
    },
    {
      findingType: 'user-need',
      title: 'Users want bulk operations',
      summary: 'Top requested feature in recent user interviews — batch import/export capabilities.',
      evidence: 'User interviews, support tickets',
    },
    {
      findingType: 'insight',
      title: 'API latency impacting integration partners',
      summary: 'Integration partners report p95 latency above 2s for key endpoints.',
      evidence: 'API monitoring, partner feedback',
    },
  ];

  return findings;
}
