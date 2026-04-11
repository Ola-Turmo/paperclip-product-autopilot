// Learner engine — extracts reusable knowledge from completed delivery runs
import { knowledgeEntryRegistry, deliveryRunRegistry, ideaRegistry } from './registry.js';
import type { KnowledgeEntry, DeliveryRun, Idea } from '../types/entities.js';

export interface LearnerContext {
  companyId: string;
  projectId: string;
  runId: string;
}

export interface LearnerResult {
  entries: string[];  // IDs of knowledge entries created
  summary: string;
}

// Main entry — analyze completed run and extract knowledge
export async function learnFromRun(ctx: LearnerContext): Promise<LearnerResult> {
  const { companyId, projectId, runId } = ctx;

  const run = deliveryRunRegistry.get(runId);
  if (!run) {
    throw new Error(`Delivery run not found: ${runId}`);
  }

  if (run.status !== 'merged' && run.status !== 'failed') {
    throw new Error(`Run must be completed (merged/failed), got: ${run.status}`);
  }

  const idea = run.ideaId ? ideaRegistry.get(run.ideaId) : undefined;
  const entries: string[] = [];

  // 1. Extract pattern knowledge (what worked well)
  if (run.status === 'merged') {
    const patterns = extractPatterns(companyId, projectId, run, idea);
    for (const pattern of patterns) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = knowledgeEntryRegistry.create(companyId, projectId, pattern as any);
      entries.push(entry.id);
    }
  }

  // 2. Extract pitfall knowledge (what went wrong)
  if (run.status === 'failed') {
    const pitfalls = extractPitfalls(companyId, projectId, run, idea);
    for (const pitfall of pitfalls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = knowledgeEntryRegistry.create(companyId, projectId, pitfall as any);
      entries.push(entry.id);
    }
  }

  // 3. Extract commands/scripts used
  const commands = extractCommands(companyId, projectId, run, idea);
  for (const cmd of commands) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = knowledgeEntryRegistry.create(companyId, projectId, cmd as any);
    entries.push(entry.id);
  }

  // 4. Extract lessons learned
  const lessons = extractLessons(companyId, projectId, run, idea);
  for (const lesson of lessons) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = knowledgeEntryRegistry.create(companyId, projectId, lesson as any);
    entries.push(entry.id);
  }

  return {
    entries,
    summary: `Extracted ${entries.length} knowledge entries from ${run.status} run ${runId}`,
  };
}

// Type for knowledge entry data passed to registry.create
type KnowledgeEntryData = Omit<KnowledgeEntry, 'id' | 'companyId' | 'projectId' | 'createdAt'>;

// Extract reusable patterns from successful runs
function extractPatterns(
  companyId: string,
  projectId: string,
  run: DeliveryRun,
  idea: Idea | undefined
): KnowledgeEntryData[] {
  const patterns: KnowledgeEntryData[] = [];

  if (run.costSummary) {
    const total = run.costSummary.total ?? 0;
    if (total > 0) {
      patterns.push({
        sourceRunId: run.id,
        type: 'pattern',
        title: `Build approach for: ${idea?.title ?? 'unknown idea'}`,
        content: JSON.stringify({
          mode: run.mode,
          cost: run.costSummary,
          idea: idea ? { title: idea.title, category: idea.category, complexity: idea.complexity } : null,
        }),
        confidence: 0.8,
        tags: [run.mode, idea?.category ?? 'general'],
      });
    }
  }

  // Pattern: successful feature delivery approach
  if (idea && run.status === 'merged') {
    patterns.push({
      sourceRunId: run.id,
      type: 'procedure',
      title: `Successfully delivered: ${idea.title}`,
      content: `Impact: ${idea.impactScore}/10, Feasibility: ${idea.feasibilityScore}/10, Complexity: ${idea.complexity}. Approach: ${idea.approach ?? 'standard'}`,
      confidence: 0.7,
      tags: [idea.category, idea.complexity],
    });
  }

  return patterns;
}

// Extract pitfalls from failed runs
function extractPitfalls(
  companyId: string,
  projectId: string,
  run: DeliveryRun,
  idea: Idea | undefined
): KnowledgeEntryData[] {
  if (run.status !== 'failed') return [];

  return [{
    sourceRunId: run.id,
    type: 'pitfall',
    title: `Failed delivery: ${idea?.title ?? run.id}`,
    content: `Run ${run.id} failed in ${run.mode} mode. Cost: ${JSON.stringify(run.costSummary)}. ` +
      `Idea: ${idea ? `${idea.title} (${idea.category}, ${idea.complexity})` : 'unknown'}. ` +
      `Recommendation: Review complexity estimate and ensure dependencies are met before starting.`,
    confidence: 0.9,
    tags: [run.mode, idea?.category ?? 'general', idea?.complexity ?? 'unknown'],
  }];
}

// Extract useful commands/scripts from run
function extractCommands(
  companyId: string,
  projectId: string,
  run: DeliveryRun,
  _idea: Idea | undefined
): KnowledgeEntryData[] {
  // Generic commands that are typically useful
  const commands: KnowledgeEntryData[] = [];

  if (run.workspaceRef) {
    commands.push({
      sourceRunId: run.id,
      type: 'command',
      title: 'Workspace checkout command',
      content: `git worktree add ${run.workspaceRef} main`,
      confidence: 0.6,
      tags: ['git', 'workspace'],
    });
  }

  return commands;
}

// Extract general lessons
function extractLessons(
  companyId: string,
  projectId: string,
  run: DeliveryRun,
  idea: Idea | undefined
): KnowledgeEntryData[] {
  const lessons: KnowledgeEntryData[] = [];

  if (run.mode === 'convoy' && run.status === 'merged') {
    lessons.push({
      sourceRunId: run.id,
      type: 'lesson',
      title: 'Convoy mode worked well for multi-phase delivery',
      content: `Run ${run.id} successfully used convoy mode for idea "${idea?.title ?? 'unknown'}". ` +
        `Convoy decomposition helped track dependencies across build/test/review phases.`,
      confidence: 0.7,
      tags: ['convoy', 'delivery'],
    });
  }

  if (idea && idea.complexity === 'high' && run.status === 'merged') {
    lessons.push({
      sourceRunId: run.id,
      type: 'lesson',
      title: 'High complexity ideas can succeed with proper planning',
      content: `Idea "${idea.title}" was marked high complexity but succeeded. ` +
        `Consider revisiting complexity estimation for similar future ideas.`,
      confidence: 0.5,
      tags: ['complexity', 'estimation'],
    });
  }

  return lessons;
}

// Search knowledge base for relevant entries
export function searchKnowledge(
  companyId: string,
  projectId: string,
  query: string
): KnowledgeEntry[] {
  const allEntries = knowledgeEntryRegistry.getByProject(companyId, projectId);
  
  if (!query.trim()) return allEntries;

  const queryLower = query.toLowerCase();
  return allEntries.filter(entry =>
    entry.title.toLowerCase().indexOf(queryLower) !== -1 ||
    entry.content.toLowerCase().indexOf(queryLower) !== -1 ||
    (entry.tags && entry.tags.some(tag => tag.toLowerCase().indexOf(queryLower) !== -1))
  );
}

// Get relevant knowledge for a new idea (inject into planning)
export function getRelevantKnowledge(
  companyId: string,
  projectId: string,
  category?: string,
  complexity?: string
): KnowledgeEntry[] {
  let entries = knowledgeEntryRegistry.getByProject(companyId, projectId);
  
  if (category) {
    entries = entries.filter(e => e.tags && e.tags.indexOf(category) !== -1);
  }
  if (complexity) {
    entries = entries.filter(e => e.tags && e.tags.indexOf(complexity) !== -1);
  }

  // Sort by confidence descending
  return entries.sort((a, b) => b.confidence - a.confidence);
}
