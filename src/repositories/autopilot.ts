import type { PluginContext } from "@paperclipai/plugin-sdk";
import {
  getAutopilotProject,
  getCompanyBudget,
  getIdea,
  getPreferenceProfile,
  listConvoyTasks,
  listDigests,
  listStuckRuns,
  upsertCheckpoint,
  upsertConvoyTask,
  upsertDeliveryRun,
  upsertDigest,
  upsertPlanningArtifact,
  upsertPreferenceProfile,
  upsertProductLock,
  upsertReleaseHealthCheck,
  upsertRollbackAction,
  upsertSwipeEvent,
  upsertWorkspaceLease,
  upsertIdea,
} from "../helpers.js";
import type {
  AutopilotProject,
  Checkpoint,
  CompanyBudget,
  ConvoyTask,
  DeliveryRun,
  Digest,
  Idea,
  PlanningArtifact,
  PreferenceProfile,
  ProductLock,
  ReleaseHealthCheck,
  RollbackAction,
  SwipeEvent,
  WorkspaceLease,
} from "../types.js";

export interface AutopilotRepository {
  getAutopilotProject(companyId: string, projectId: string): Promise<AutopilotProject | null>;
  getIdea(companyId: string, projectId: string, ideaId: string): Promise<Idea | null>;
  upsertIdea(idea: Idea): Promise<void>;
  upsertSwipeEvent(swipe: SwipeEvent): Promise<void>;
  getPreferenceProfile(companyId: string, projectId: string): Promise<PreferenceProfile | null>;
  upsertPreferenceProfile(profile: PreferenceProfile): Promise<void>;
  upsertPlanningArtifact(artifact: PlanningArtifact): Promise<void>;
  upsertDeliveryRun(run: DeliveryRun): Promise<void>;
  upsertWorkspaceLease(lease: WorkspaceLease): Promise<void>;
  upsertProductLock(lock: ProductLock): Promise<void>;
  getCompanyBudget(companyId: string): Promise<CompanyBudget | null>;
  listDigests(companyId: string, projectId: string): Promise<Digest[]>;
  upsertDigest(digest: Digest): Promise<void>;
  listStuckRuns(companyId: string, projectId: string): Promise<DeliveryRun[]>;
  listConvoyTasks(companyId: string, projectId: string, runId?: string): Promise<ConvoyTask[]>;
  upsertCheckpoint(checkpoint: Checkpoint): Promise<void>;
  upsertConvoyTask(task: ConvoyTask): Promise<void>;
  upsertReleaseHealthCheck(check: ReleaseHealthCheck): Promise<void>;
  upsertRollbackAction(action: RollbackAction): Promise<void>;
}

export function createAutopilotRepository(ctx: PluginContext): AutopilotRepository {
  return {
    getAutopilotProject: (companyId, projectId) => getAutopilotProject(ctx, companyId, projectId),
    getIdea: (companyId, projectId, ideaId) => getIdea(ctx, companyId, projectId, ideaId),
    upsertIdea: async (idea) => {
      await upsertIdea(ctx, idea);
    },
    upsertSwipeEvent: async (swipe) => {
      await upsertSwipeEvent(ctx, swipe);
    },
    getPreferenceProfile: (companyId, projectId) => getPreferenceProfile(ctx, companyId, projectId),
    upsertPreferenceProfile: async (profile) => {
      await upsertPreferenceProfile(ctx, profile);
    },
    upsertPlanningArtifact: async (artifact) => {
      await upsertPlanningArtifact(ctx, artifact);
    },
    upsertDeliveryRun: async (run) => {
      await upsertDeliveryRun(ctx, run);
    },
    upsertWorkspaceLease: async (lease) => {
      await upsertWorkspaceLease(ctx, lease);
    },
    upsertProductLock: async (lock) => {
      await upsertProductLock(ctx, lock);
    },
    getCompanyBudget: (companyId) => getCompanyBudget(ctx, companyId),
    listDigests: (companyId, projectId) => listDigests(ctx, companyId, projectId),
    upsertDigest: async (digest) => {
      await upsertDigest(ctx, digest);
    },
    listStuckRuns: (companyId, projectId) => listStuckRuns(ctx, companyId, projectId),
    listConvoyTasks: (companyId, projectId, runId) => listConvoyTasks(ctx, companyId, projectId, runId),
    upsertCheckpoint: async (checkpoint) => {
      await upsertCheckpoint(ctx, checkpoint);
    },
    upsertConvoyTask: async (task) => {
      await upsertConvoyTask(ctx, task);
    },
    upsertReleaseHealthCheck: async (check) => {
      await upsertReleaseHealthCheck(ctx, check);
    },
    upsertRollbackAction: async (action) => {
      await upsertRollbackAction(ctx, action);
    },
  };
}
