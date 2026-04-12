import type { PluginContext } from "@paperclipai/plugin-sdk";
import {
  getAutopilotProject,
  getCompanyBudget,
  getDeliveryRun,
  getIdea,
  getPreferenceProfile,
  listAutopilotProjectEntities,
  listCheckpoints,
  listConvoyTasks,
  listDigests,
  listIdeas,
  listMaybePoolIdeas,
  listReleaseHealthChecks,
  listResearchFindings,
  listStuckRuns,
  upsertAutopilotProject,
  upsertCheckpoint,
  upsertConvoyTask,
  upsertDeliveryRun,
  upsertDigest,
  upsertPlanningArtifact,
  upsertPreferenceProfile,
  upsertProductLock,
  upsertReleaseHealthCheck,
  upsertResearchCycle,
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
  ResearchCycle,
  ResearchFinding,
  RollbackAction,
  SwipeEvent,
  WorkspaceLease,
} from "../types.js";
import type { IdeaStatus, RunStatus } from "../constants.js";

export interface AutopilotRepository {
  listAutopilotProjects(companyId?: string): Promise<AutopilotProject[]>;
  getAutopilotProject(companyId: string, projectId: string): Promise<AutopilotProject | null>;
  upsertAutopilotProject(project: AutopilotProject): Promise<void>;
  getDeliveryRun(companyId: string, projectId: string, runId: string): Promise<DeliveryRun | null>;
  getIdea(companyId: string, projectId: string, ideaId: string): Promise<Idea | null>;
  listIdeas(companyId: string, projectId: string, status?: IdeaStatus): Promise<Idea[]>;
  listMaybePoolIdeas(companyId: string, projectId: string): Promise<Idea[]>;
  upsertIdea(idea: Idea): Promise<void>;
  upsertSwipeEvent(swipe: SwipeEvent): Promise<void>;
  getPreferenceProfile(companyId: string, projectId: string): Promise<PreferenceProfile | null>;
  upsertPreferenceProfile(profile: PreferenceProfile): Promise<void>;
  upsertResearchCycle(cycle: ResearchCycle): Promise<void>;
  listResearchFindings(companyId: string, projectId: string, cycleId?: string): Promise<ResearchFinding[]>;
  upsertPlanningArtifact(artifact: PlanningArtifact): Promise<void>;
  upsertDeliveryRun(run: DeliveryRun): Promise<void>;
  upsertWorkspaceLease(lease: WorkspaceLease): Promise<void>;
  upsertProductLock(lock: ProductLock): Promise<void>;
  getCompanyBudget(companyId: string): Promise<CompanyBudget | null>;
  listDigests(companyId: string, projectId: string): Promise<Digest[]>;
  upsertDigest(digest: Digest): Promise<void>;
  listStuckRuns(companyId: string, projectId: string): Promise<DeliveryRun[]>;
  listCheckpoints(companyId: string, projectId: string, runId?: string): Promise<Checkpoint[]>;
  listConvoyTasks(companyId: string, projectId: string, runId?: string): Promise<ConvoyTask[]>;
  listReleaseHealthChecks(companyId: string, projectId: string, runId?: string): Promise<ReleaseHealthCheck[]>;
  upsertCheckpoint(checkpoint: Checkpoint): Promise<void>;
  upsertConvoyTask(task: ConvoyTask): Promise<void>;
  upsertReleaseHealthCheck(check: ReleaseHealthCheck): Promise<void>;
  upsertRollbackAction(action: RollbackAction): Promise<void>;
}

export function createAutopilotRepository(ctx: PluginContext): AutopilotRepository {
  return {
    listAutopilotProjects: async (companyId) => {
      const entities = await listAutopilotProjectEntities(ctx, companyId);
      return entities.map((entity) => entity.data as unknown as AutopilotProject);
    },
    getAutopilotProject: (companyId, projectId) => getAutopilotProject(ctx, companyId, projectId),
    upsertAutopilotProject: async (project) => {
      await upsertAutopilotProject(ctx, project);
    },
    getDeliveryRun: (companyId, projectId, runId) => getDeliveryRun(ctx, companyId, projectId, runId),
    getIdea: (companyId, projectId, ideaId) => getIdea(ctx, companyId, projectId, ideaId),
    listIdeas: (companyId, projectId, status) => listIdeas(ctx, companyId, projectId, status),
    listMaybePoolIdeas: (companyId, projectId) => listMaybePoolIdeas(ctx, companyId, projectId),
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
    upsertResearchCycle: async (cycle) => {
      await upsertResearchCycle(ctx, cycle);
    },
    listResearchFindings: (companyId, projectId, cycleId) => listResearchFindings(ctx, companyId, projectId, cycleId),
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
    listCheckpoints: (companyId, projectId, runId) => listCheckpoints(ctx, companyId, projectId, runId),
    listConvoyTasks: (companyId, projectId, runId) => listConvoyTasks(ctx, companyId, projectId, runId),
    listReleaseHealthChecks: (companyId, projectId, runId) => listReleaseHealthChecks(ctx, companyId, projectId, runId),
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
