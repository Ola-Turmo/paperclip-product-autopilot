// Product Autopilot Plugin — Worker Entrypoint
// Registers all plugin capabilities with the Paperclip plugin host

import { manifest } from '../manifest.js';
import { PluginEntities } from './registry.js';
import { startDelivery } from './delivery.js';
import { learnFromRun } from './learner.js';
import { generateIdeas } from './ideation.js';
import { runResearchJob, runIdeationJob, runMaybePoolResurfacer } from './jobs/index.js';
import type { Idea, SwipeEvent } from '../types/entities.js';

// Plugin version metadata
export const plugin = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
};

// ─── Plugin Registration ────────────────────────────────────────────────────

export function register(config: PluginConfig): PluginInstance {
  const validated = validateConfig(config);
  const { companyId, projectId } = validated;

  return {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,

    // ─── Entity Handlers ──────────────────────────────────────────────────
    // All entity operations are capability-gated with companyId/projectId scoping
    entities: {
      autopilotProject: {
        create: (data: Record<string, unknown>) => PluginEntities.autopilotProject.create(companyId, projectId, data as Parameters<typeof PluginEntities.autopilotProject.create>[2]),
        get: (id: string) => PluginEntities.autopilotProject.get(id),
        list: () => PluginEntities.autopilotProject.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.autopilotProject.update(id, data as Parameters<typeof PluginEntities.autopilotProject.update>[1]),
        delete: (id: string) => PluginEntities.autopilotProject.delete(id),
      },

      productProgramRevision: {
        create: (data: Record<string, unknown>) => PluginEntities.productProgramRevision.create(companyId, projectId, data as Parameters<typeof PluginEntities.productProgramRevision.create>[2]),
        get: (id: string) => PluginEntities.productProgramRevision.get(id),
        list: () => PluginEntities.productProgramRevision.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.productProgramRevision.update(id, data as Parameters<typeof PluginEntities.productProgramRevision.update>[1]),
        delete: (id: string) => PluginEntities.productProgramRevision.delete(id),
      },

      researchCycle: {
        create: (data: Record<string, unknown>) => PluginEntities.researchCycle.create(companyId, projectId, data as Parameters<typeof PluginEntities.researchCycle.create>[2]),
        get: (id: string) => PluginEntities.researchCycle.get(id),
        list: () => PluginEntities.researchCycle.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.researchCycle.update(id, data as Parameters<typeof PluginEntities.researchCycle.update>[1]),
        delete: (id: string) => PluginEntities.researchCycle.delete(id),
      },

      researchFinding: {
        create: (data: Record<string, unknown>) => PluginEntities.researchFinding.create(companyId, projectId, data as Parameters<typeof PluginEntities.researchFinding.create>[2]),
        get: (id: string) => PluginEntities.researchFinding.get(id),
        list: () => PluginEntities.researchFinding.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.researchFinding.update(id, data as Parameters<typeof PluginEntities.researchFinding.update>[1]),
        delete: (id: string) => PluginEntities.researchFinding.delete(id),
      },

      idea: {
        create: (data: Record<string, unknown>) => PluginEntities.idea.create(companyId, projectId, data as Parameters<typeof PluginEntities.idea.create>[2]),
        get: (id: string) => PluginEntities.idea.get(id),
        list: () => PluginEntities.idea.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.idea.update(id, data as Parameters<typeof PluginEntities.idea.update>[1]),
        delete: (id: string) => PluginEntities.idea.delete(id),
      },

      swipeEvent: {
        create: (data: Record<string, unknown>) => PluginEntities.swipeEvent.create(companyId, projectId, data as Parameters<typeof PluginEntities.swipeEvent.create>[2]),
        get: (id: string) => PluginEntities.swipeEvent.get(id),
        list: () => PluginEntities.swipeEvent.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.swipeEvent.update(id, data as Parameters<typeof PluginEntities.swipeEvent.update>[1]),
        delete: (id: string) => PluginEntities.swipeEvent.delete(id),
      },

      preferenceProfile: {
        create: (data: Record<string, unknown>) => PluginEntities.preferenceProfile.create(companyId, projectId, data as Parameters<typeof PluginEntities.preferenceProfile.create>[2]),
        get: (id: string) => PluginEntities.preferenceProfile.get(id),
        list: () => PluginEntities.preferenceProfile.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.preferenceProfile.update(id, data as Parameters<typeof PluginEntities.preferenceProfile.update>[1]),
        delete: (id: string) => PluginEntities.preferenceProfile.delete(id),
      },

      deliveryRun: {
        create: (data: Record<string, unknown>) => PluginEntities.deliveryRun.create(companyId, projectId, data as Parameters<typeof PluginEntities.deliveryRun.create>[2]),
        get: (id: string) => PluginEntities.deliveryRun.get(id),
        list: () => PluginEntities.deliveryRun.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.deliveryRun.update(id, data as Parameters<typeof PluginEntities.deliveryRun.update>[1]),
        delete: (id: string) => PluginEntities.deliveryRun.delete(id),
      },

      convoyTask: {
        create: (data: Record<string, unknown>) => PluginEntities.convoyTask.create(companyId, projectId, data as Parameters<typeof PluginEntities.convoyTask.create>[2]),
        get: (id: string) => PluginEntities.convoyTask.get(id),
        list: () => PluginEntities.convoyTask.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.convoyTask.update(id, data as Parameters<typeof PluginEntities.convoyTask.update>[1]),
        delete: (id: string) => PluginEntities.convoyTask.delete(id),
      },

      knowledgeEntry: {
        create: (data: Record<string, unknown>) => PluginEntities.knowledgeEntry.create(companyId, projectId, data as Parameters<typeof PluginEntities.knowledgeEntry.create>[2]),
        get: (id: string) => PluginEntities.knowledgeEntry.get(id),
        list: () => PluginEntities.knowledgeEntry.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.knowledgeEntry.update(id, data as Parameters<typeof PluginEntities.knowledgeEntry.update>[1]),
        delete: (id: string) => PluginEntities.knowledgeEntry.delete(id),
      },

      workspaceLease: {
        create: (data: Record<string, unknown>) => PluginEntities.workspaceLease.create(companyId, projectId, data as Parameters<typeof PluginEntities.workspaceLease.create>[2]),
        get: (id: string) => PluginEntities.workspaceLease.get(id),
        list: () => PluginEntities.workspaceLease.getByProject(companyId, projectId),
        update: (id: string, data: Record<string, unknown>) => PluginEntities.workspaceLease.update(id, data as Parameters<typeof PluginEntities.workspaceLease.update>[1]),
        delete: (id: string) => PluginEntities.workspaceLease.delete(id),
      },
    },

    // ─── Jobs ────────────────────────────────────────────────────────────
    jobs: {
      'research-scheduler': {
        description: 'Runs scheduled research cycles based on project schedule policy',
        async run(payload: unknown) {
          const job = payload as { companyId: string; projectId: string };
          const cycle = PluginEntities.researchCycle.create(job.companyId, job.projectId, {
            status: 'pending',
            triggerType: 'scheduled',
            startedAt: new Date().toISOString(),
          });
          return runResearchJob({ companyId: job.companyId, projectId: job.projectId, cycleId: cycle.id });
        },
      },

      'idea-scheduler': {
        description: 'Generates ideas after research completes or on schedule',
        async run(payload: unknown) {
          const job = payload as { companyId: string; projectId: string };
          return runIdeationJob({ companyId: job.companyId, projectId: job.projectId });
        },
      },

      'maybe-pool-resurfacer': {
        description: 'Checks maybed ideas and re-queues them based on resurfacing rules',
        async run(payload: unknown) {
          const job = payload as { companyId: string; projectId: string };
          return runMaybePoolResurfacer({ companyId: job.companyId, projectId: job.projectId });
        },
      },
    },

    // ─── Tools (Callable by agents/operators) ─────────────────────────────
    tools: {
      startResearch: {
        description: 'Start a research cycle for a project',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string' },
            projectId: { type: 'string' },
          },
          required: ['companyId', 'projectId'],
        },
        async handle(input: unknown) {
          const args = input as { companyId: string; projectId: string };
          const cycle = PluginEntities.researchCycle.create(args.companyId, args.projectId, {
            status: 'pending',
            triggerType: 'manual',
            startedAt: new Date().toISOString(),
          });
          return runResearchJob({ companyId: args.companyId, projectId: args.projectId, cycleId: cycle.id });
        },
      },

      generateIdeas: {
        description: 'Generate scored ideas from product program and research',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string' },
            projectId: { type: 'string' },
            cycleId: { type: 'string' },
            maxIdeas: { type: 'number', default: 10 },
          },
          required: ['companyId', 'projectId'],
        },
        async handle(input: unknown) {
          const args = input as { companyId: string; projectId: string; cycleId?: string; maxIdeas?: number };
          return generateIdeas({ ...args });
        },
      },

      swipeIdea: {
        description: 'Record a swipe decision on an idea',
        inputSchema: {
          type: 'object',
          properties: {
            ideaId: { type: 'string' },
            decision: { type: 'string', enum: ['pass', 'maybe', 'yes', 'now'] },
            actor: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['ideaId', 'decision', 'actor'],
        },
        async handle(input: unknown) {
          const args = input as { ideaId: string; decision: SwipeEvent['decision']; actor: string; notes?: string };
          const idea = PluginEntities.idea.get(args.ideaId);
          if (!idea) throw new Error(`Idea not found: ${args.ideaId}`);

          const swipe = PluginEntities.swipeEvent.create(idea.companyId, idea.projectId, {
            ideaId: args.ideaId,
            decision: args.decision,
            actor: args.actor,
            notes: args.notes,
            createdAt: new Date().toISOString(),
          });

          const newStatus: Idea['status'] =
            args.decision === 'pass' ? 'rejected'
            : args.decision === 'maybe' ? 'maybe'
            : args.decision === 'yes' || args.decision === 'now' ? 'approved'
            : idea.status;

          if (newStatus !== idea.status) {
            PluginEntities.idea.update(args.ideaId, { status: newStatus });
          }

          return { swipeId: swipe.id, ideaStatus: newStatus };
        },
      },

      getSwipeQueue: {
        description: 'Get ideas pending swipe review',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string' },
            projectId: { type: 'string' },
            limit: { type: 'number', default: 20 },
          },
          required: ['companyId', 'projectId'],
        },
        async handle(input: unknown) {
          const args = input as { companyId: string; projectId: string; limit?: number };
          const pending = PluginEntities.idea
            .getByProject(args.companyId, args.projectId)
            .filter((i: Idea) => i.status === 'pending')
            .slice(0, args.limit ?? 20);
          return { ideas: pending };
        },
      },

      startDelivery: {
        description: 'Start delivery run for an approved idea',
        inputSchema: {
          type: 'object',
          properties: {
            ideaId: { type: 'string' },
            mode: { type: 'string', enum: ['simple', 'convoy'], default: 'simple' },
          },
          required: ['ideaId'],
        },
        async handle(input: unknown) {
          const args = input as { ideaId: string; mode?: 'simple' | 'convoy' };
          const idea = PluginEntities.idea.get(args.ideaId);
          if (!idea) throw new Error(`Idea not found: ${args.ideaId}`);
          return startDelivery({
            companyId: idea.companyId,
            projectId: idea.projectId,
            ideaId: args.ideaId,
            mode: args.mode ?? 'simple',
          });
        },
      },

      getDeliveryStatus: {
        description: 'Get status of a delivery run',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
          },
          required: ['runId'],
        },
        async handle(input: unknown) {
          const args = input as { runId: string };
          const run = PluginEntities.deliveryRun.get(args.runId);
          if (!run) throw new Error(`Delivery run not found: ${args.runId}`);
          return run;
        },
      },

      learnFromRun: {
        description: 'Extract knowledge from a completed delivery run',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
          },
          required: ['runId'],
        },
        async handle(input: unknown) {
          const args = input as { runId: string };
          const run = PluginEntities.deliveryRun.get(args.runId);
          if (!run) throw new Error(`Delivery run not found: ${args.runId}`);
          return learnFromRun({ companyId: run.companyId, projectId: run.projectId, runId: args.runId });
        },
      },

      getKnowledgeBase: {
        description: 'Search the knowledge base for relevant entries',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string' },
            projectId: { type: 'string' },
            query: { type: 'string' },
            category: { type: 'string' },
            complexity: { type: 'string' },
          },
          required: ['companyId', 'projectId'],
        },
        async handle(input: unknown) {
          const args = input as { companyId: string; projectId: string; query?: string; category?: string; complexity?: string };
          let entries = PluginEntities.knowledgeEntry.getByProject(args.companyId, args.projectId);

          if (args.query) {
            const q = args.query.toLowerCase();
            entries = entries.filter(
              (e: { title: string; content: string; tags?: string[] }) =>
                e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                (e.tags && e.tags.some((t: string) => t.toLowerCase().includes(q)))
            );
          }

          if (args.category) {
            entries = entries.filter((e: { tags?: string[] }) => e.tags && e.tags.includes(args.category));
          }

          if (args.complexity) {
            entries = entries.filter((e: { tags?: string[] }) => e.tags && e.tags.includes(args.complexity));
          }

          return { entries };
        },
      },
    },

    // ─── Event Handlers ───────────────────────────────────────────────────
    events: {
      'run.completed': {
        description: 'Triggered when a delivery run completes',
        async handle(event: unknown) {
          const { runId } = event as { runId: string };
          const run = PluginEntities.deliveryRun.get(runId);
          if (run) {
            await learnFromRun({ companyId: run.companyId, projectId: run.projectId, runId });
          }
        },
      },

      'idea.approved': {
        description: 'Triggered when an idea is approved',
        async handle(event: unknown) {
          const { ideaId } = event as { ideaId: string };
          const idea = PluginEntities.idea.get(ideaId);
          if (!idea) return;

          const projects = PluginEntities.autopilotProject.getByProject(idea.companyId, idea.projectId);
          const project = projects[0];

          if (project?.automationTier === 'full-auto') {
            await startDelivery({
              companyId: idea.companyId,
              projectId: idea.projectId,
              ideaId,
              mode: 'simple',
            });
          }
        },
      },
    },
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PluginConfig {
  companyId: string;
  projectId: string;
}

interface PluginInstance {
  id: string;
  name: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entities: Record<string, Record<string, (...args: any[]) => unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jobs: Record<string, { description?: string; run: (payload: any) => Promise<unknown> }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, { description: string; inputSchema: object; handle: (...args: any[]) => Promise<unknown> }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: Record<string, { description?: string; handle: (event: any) => Promise<void> }>;
}

function validateConfig(config: PluginConfig): PluginConfig {
  if (!config.companyId || !config.projectId) {
    throw new Error('companyId and projectId are required');
  }
  return config;
}

// Export for plugin host
export default { plugin, register };
