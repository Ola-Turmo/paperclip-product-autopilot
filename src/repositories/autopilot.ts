import type { PluginContext } from "@paperclipai/plugin-sdk";
import {
  findDuplicateIdea,
  getActiveProductLock,
  getActiveWorkspaceLease,
  getAutopilotProject,
  getLatestProductProgram,
  getCompanyBudget,
  getDeliveryRun,
  getIdea,
  getPlanningArtifact,
  getPreferenceProfile,
  listDeliveryRuns,
  listAutopilotProjectEntities,
  listCheckpoints,
  listConvoyTasks,
  listDigests,
  listIdeas,
  listMaybePoolIdeas,
  listKnowledgeEntries,
  listLearnerSummaries,
  listOperatorInterventions,
  listPlanningArtifacts,
  listProductLocks,
  listProductProgramRevisions,
  listReleaseHealthChecks,
  listRollbackActions,
  listResearchCycles,
  listResearchFindings,
  listStuckRuns,
  listSwipeEvents,
  upsertAutopilotProject,
  upsertCompanyBudget,
  upsertCheckpoint,
  upsertConvoyTask,
  upsertDeliveryRun,
  upsertDigest,
  upsertKnowledgeEntry,
  upsertLearnerSummary,
  upsertOperatorIntervention,
  upsertPlanningArtifact,
  upsertPreferenceProfile,
  upsertProductProgramRevision,
  upsertProductLock,
  upsertReleaseHealthCheck,
  upsertResearchCycle,
  upsertResearchFinding,
  upsertRollbackAction,
  upsertSwipeEvent,
  upsertWorkspaceLease,
  upsertIdea,
} from "../helpers.js";
import { autopilotProjectSchema } from "../schemas.js";
import { findDuplicateResearchFinding } from "../services/research.js";
import type {
  AutopilotProject,
  Checkpoint,
  CompanyBudget,
  ConvoyTask,
  DeliveryRun,
  Digest,
  Idea,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
  PlanningArtifact,
  PreferenceProfile,
  ProductProgramRevision,
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
  getLatestProductProgram(companyId: string, projectId: string): Promise<ProductProgramRevision | null>;
  listProductProgramRevisions(companyId: string, projectId: string): Promise<ProductProgramRevision[]>;
  upsertProductProgramRevision(revision: ProductProgramRevision): Promise<void>;
  getDeliveryRun(companyId: string, projectId: string, runId: string): Promise<DeliveryRun | null>;
  listDeliveryRuns(companyId: string, projectId: string, status?: RunStatus): Promise<DeliveryRun[]>;
  getActiveWorkspaceLease(projectId: string, runId: string): Promise<WorkspaceLease | null>;
  getIdea(companyId: string, projectId: string, ideaId: string): Promise<Idea | null>;
  listIdeas(companyId: string, projectId: string, status?: IdeaStatus): Promise<Idea[]>;
  listMaybePoolIdeas(companyId: string, projectId: string): Promise<Idea[]>;
  findDuplicateIdea(
    companyId: string,
    projectId: string,
    title: string,
    description: string,
    excludeIdeaId?: string,
    options?: {
      category?: string;
      tags?: string[];
      sourceReferences?: string[];
    },
  ): Promise<{ idea: Idea; similarity: number; reasons: string[] } | null>;
  findDuplicateResearchFinding(
    companyId: string,
    projectId: string,
    finding: Pick<ResearchFinding, "findingId" | "title" | "description" | "sourceUrl" | "sourceLabel" | "category" | "topic" | "dedupeKey">,
  ): Promise<{ finding: ResearchFinding; similarity: number; reasons: string[] } | null>;
  upsertIdea(idea: Idea): Promise<void>;
  upsertSwipeEvent(swipe: SwipeEvent): Promise<void>;
  getPreferenceProfile(companyId: string, projectId: string): Promise<PreferenceProfile | null>;
  upsertPreferenceProfile(profile: PreferenceProfile): Promise<void>;
  listSwipeEvents(companyId: string, projectId: string, limit?: number): Promise<SwipeEvent[]>;
  listResearchCycles(companyId: string, projectId?: string): Promise<ResearchCycle[]>;
  upsertResearchCycle(cycle: ResearchCycle): Promise<void>;
  upsertResearchFinding(finding: ResearchFinding): Promise<void>;
  listResearchFindings(companyId: string, projectId: string, cycleId?: string): Promise<ResearchFinding[]>;
  getPlanningArtifact(companyId: string, projectId: string, artifactId: string): Promise<PlanningArtifact | null>;
  listPlanningArtifacts(companyId: string, projectId: string, ideaId?: string): Promise<PlanningArtifact[]>;
  upsertPlanningArtifact(artifact: PlanningArtifact): Promise<void>;
  upsertDeliveryRun(run: DeliveryRun): Promise<void>;
  upsertWorkspaceLease(lease: WorkspaceLease): Promise<void>;
  getActiveProductLock(projectId: string, targetBranch: string): Promise<ProductLock | null>;
  listProductLocks(companyId: string, projectId: string): Promise<ProductLock[]>;
  upsertProductLock(lock: ProductLock): Promise<void>;
  getCompanyBudget(companyId: string): Promise<CompanyBudget | null>;
  upsertCompanyBudget(budget: CompanyBudget): Promise<void>;
  listDigests(companyId: string, projectId: string): Promise<Digest[]>;
  upsertDigest(digest: Digest): Promise<void>;
  listLearnerSummaries(companyId: string, projectId: string): Promise<LearnerSummary[]>;
  upsertLearnerSummary(summary: LearnerSummary): Promise<void>;
  upsertKnowledgeEntry(entry: KnowledgeEntry): Promise<void>;
  upsertOperatorIntervention(intervention: OperatorIntervention): Promise<void>;
  listKnowledgeEntries(companyId: string, projectId: string): Promise<KnowledgeEntry[]>;
  listOperatorInterventions(companyId: string, projectId: string, runId?: string): Promise<OperatorIntervention[]>;
  listStuckRuns(companyId: string, projectId: string): Promise<DeliveryRun[]>;
  listCheckpoints(companyId: string, projectId: string, runId?: string): Promise<Checkpoint[]>;
  listConvoyTasks(companyId: string, projectId: string, runId?: string): Promise<ConvoyTask[]>;
  listReleaseHealthChecks(companyId: string, projectId: string, runId?: string): Promise<ReleaseHealthCheck[]>;
  listRollbackActions(companyId: string, projectId: string, runId?: string): Promise<RollbackAction[]>;
  upsertCheckpoint(checkpoint: Checkpoint): Promise<void>;
  upsertConvoyTask(task: ConvoyTask): Promise<void>;
  upsertReleaseHealthCheck(check: ReleaseHealthCheck): Promise<void>;
  upsertRollbackAction(action: RollbackAction): Promise<void>;
}

export function createAutopilotRepository(ctx: PluginContext): AutopilotRepository {
  return {
    listAutopilotProjects: async (companyId) => {
      const entities = await listAutopilotProjectEntities(ctx, companyId);
      return entities.map((entity) => autopilotProjectSchema.parse(entity.data));
    },
    getAutopilotProject: (companyId, projectId) => getAutopilotProject(ctx, companyId, projectId),
    upsertAutopilotProject: async (project) => {
      await upsertAutopilotProject(ctx, project);
    },
    getLatestProductProgram: (companyId, projectId) => getLatestProductProgram(ctx, companyId, projectId),
    listProductProgramRevisions: (companyId, projectId) => listProductProgramRevisions(ctx, companyId, projectId),
    upsertProductProgramRevision: async (revision) => {
      await upsertProductProgramRevision(ctx, revision);
    },
    getDeliveryRun: (companyId, projectId, runId) => getDeliveryRun(ctx, companyId, projectId, runId),
    listDeliveryRuns: (companyId, projectId, status) => listDeliveryRuns(ctx, companyId, projectId, status),
    getActiveWorkspaceLease: (projectId, runId) => getActiveWorkspaceLease(ctx, projectId, runId),
    getIdea: (companyId, projectId, ideaId) => getIdea(ctx, companyId, projectId, ideaId),
    listIdeas: (companyId, projectId, status) => listIdeas(ctx, companyId, projectId, status),
    listMaybePoolIdeas: (companyId, projectId) => listMaybePoolIdeas(ctx, companyId, projectId),
    findDuplicateIdea: (companyId, projectId, title, description, excludeIdeaId, options) =>
      findDuplicateIdea(ctx, companyId, projectId, title, description, excludeIdeaId, options),
    findDuplicateResearchFinding: async (companyId, projectId, finding) => {
      const findings = await listResearchFindings(ctx, companyId, projectId);
      return findDuplicateResearchFinding(findings, finding);
    },
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
    listSwipeEvents: (companyId, projectId, limit) => listSwipeEvents(ctx, companyId, projectId, limit),
    listResearchCycles: (companyId, projectId) => listResearchCycles(ctx, companyId, projectId),
    upsertResearchCycle: async (cycle) => {
      await upsertResearchCycle(ctx, cycle);
    },
    upsertResearchFinding: async (finding) => {
      await upsertResearchFinding(ctx, finding);
    },
    listResearchFindings: (companyId, projectId, cycleId) => listResearchFindings(ctx, companyId, projectId, cycleId),
    getPlanningArtifact: (companyId, projectId, artifactId) => getPlanningArtifact(ctx, companyId, projectId, artifactId),
    listPlanningArtifacts: (companyId, projectId, ideaId) => listPlanningArtifacts(ctx, companyId, projectId, ideaId),
    upsertPlanningArtifact: async (artifact) => {
      await upsertPlanningArtifact(ctx, artifact);
    },
    upsertDeliveryRun: async (run) => {
      await upsertDeliveryRun(ctx, run);
    },
    upsertWorkspaceLease: async (lease) => {
      await upsertWorkspaceLease(ctx, lease);
    },
    getActiveProductLock: (projectId, targetBranch) => getActiveProductLock(ctx, projectId, targetBranch),
    listProductLocks: (companyId, projectId) => listProductLocks(ctx, companyId, projectId),
    upsertProductLock: async (lock) => {
      await upsertProductLock(ctx, lock);
    },
    getCompanyBudget: (companyId) => getCompanyBudget(ctx, companyId),
    upsertCompanyBudget: async (budget) => {
      await upsertCompanyBudget(ctx, budget);
    },
    listDigests: (companyId, projectId) => listDigests(ctx, companyId, projectId),
    upsertDigest: async (digest) => {
      await upsertDigest(ctx, digest);
    },
    listLearnerSummaries: (companyId, projectId) => listLearnerSummaries(ctx, companyId, projectId),
    upsertLearnerSummary: async (summary) => {
      await upsertLearnerSummary(ctx, summary);
    },
    upsertKnowledgeEntry: async (entry) => {
      await upsertKnowledgeEntry(ctx, entry);
    },
    upsertOperatorIntervention: async (intervention) => {
      await upsertOperatorIntervention(ctx, intervention);
    },
    listKnowledgeEntries: (companyId, projectId) => listKnowledgeEntries(ctx, companyId, projectId),
    listOperatorInterventions: (companyId, projectId, runId) => listOperatorInterventions(ctx, companyId, projectId, runId),
    listStuckRuns: (companyId, projectId) => listStuckRuns(ctx, companyId, projectId),
    listCheckpoints: (companyId, projectId, runId) => listCheckpoints(ctx, companyId, projectId, runId),
    listConvoyTasks: (companyId, projectId, runId) => listConvoyTasks(ctx, companyId, projectId, runId),
    listReleaseHealthChecks: (companyId, projectId, runId) => listReleaseHealthChecks(ctx, companyId, projectId, runId),
    listRollbackActions: (companyId, projectId, runId) => listRollbackActions(ctx, companyId, projectId, runId),
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
