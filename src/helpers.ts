import { randomUUID } from "node:crypto";
import type { PluginContext, PluginEntityRecord } from "@paperclipai/plugin-sdk";
import { ENTITY_TYPES } from "./constants.js";
import type {
  AutopilotProject,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
  Idea,
  SwipeEvent,
  PreferenceProfile,
  PlanningArtifact,
  DeliveryRun,
  WorkspaceLease,
  CompanyBudget,
  ConvoyTask,
  Checkpoint,
  ProductLock,
  OperatorIntervention,
  LearnerSummary,
  KnowledgeEntry,
  Digest,
  ReleaseHealthCheck,
  RollbackAction,
} from "./types.js";
import type {
  IdeaStatus,
  SwipeDecision,
  ConvoyTaskStatus,
  InterventionType,
  HealthCheckStatus,
  RollbackStatus,
} from "./constants.js";
import {
  autopilotProjectSchema,
  checkpointSchema,
  companyBudgetSchema,
  deliveryRunSchema,
  digestSchema,
  ideaSchema,
  preferenceProfileSchema,
  releaseHealthCheckSchema,
  rollbackActionSchema,
  researchCycleSchema,
} from "./schemas.js";
import { scoreIdeaDuplicateCandidate } from "./services/duplicates.js";

// ─── Time helpers ─────────────────────────────────────────────────────────────
export function nowIso(): string {
  return new Date().toISOString();
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── Type casters ──────────────────────────────────────────────────────────────
export function asAutopilotProject(r: PluginEntityRecord): AutopilotProject {
  return r.data as unknown as AutopilotProject;
}
export function asProductProgramRevision(r: PluginEntityRecord): ProductProgramRevision {
  return r.data as unknown as ProductProgramRevision;
}
export function asResearchCycle(r: PluginEntityRecord): ResearchCycle {
  return r.data as unknown as ResearchCycle;
}
export function asResearchFinding(r: PluginEntityRecord): ResearchFinding {
  return r.data as unknown as ResearchFinding;
}
export function asIdea(r: PluginEntityRecord): Idea {
  return r.data as unknown as Idea;
}
export function asSwipeEvent(r: PluginEntityRecord): SwipeEvent {
  return r.data as unknown as SwipeEvent;
}
export function asPreferenceProfile(r: PluginEntityRecord): PreferenceProfile {
  return r.data as unknown as PreferenceProfile;
}
export function asPlanningArtifact(r: PluginEntityRecord): PlanningArtifact {
  return r.data as unknown as PlanningArtifact;
}
export function asDeliveryRun(r: PluginEntityRecord): DeliveryRun {
  return r.data as unknown as DeliveryRun;
}
export function asWorkspaceLease(r: PluginEntityRecord): WorkspaceLease {
  return r.data as unknown as WorkspaceLease;
}
export function asCompanyBudget(r: PluginEntityRecord): CompanyBudget {
  return r.data as unknown as CompanyBudget;
}
export function asConvoyTask(r: PluginEntityRecord): ConvoyTask {
  return r.data as unknown as ConvoyTask;
}
export function asCheckpoint(r: PluginEntityRecord): Checkpoint {
  return r.data as unknown as Checkpoint;
}
export function asProductLock(r: PluginEntityRecord): ProductLock {
  return r.data as unknown as ProductLock;
}
export function asOperatorIntervention(r: PluginEntityRecord): OperatorIntervention {
  return r.data as unknown as OperatorIntervention;
}
export function asLearnerSummary(r: PluginEntityRecord): LearnerSummary {
  return r.data as unknown as LearnerSummary;
}
export function asKnowledgeEntry(r: PluginEntityRecord): KnowledgeEntry {
  return r.data as unknown as KnowledgeEntry;
}
export function asDigest(r: PluginEntityRecord): Digest {
  return r.data as unknown as Digest;
}
export function asReleaseHealthCheck(r: PluginEntityRecord): ReleaseHealthCheck {
  return r.data as unknown as ReleaseHealthCheck;
}
export function asRollbackAction(r: PluginEntityRecord): RollbackAction {
  return r.data as unknown as RollbackAction;
}

function validateEntity<T>(schema: { parse: (value: unknown) => T }, value: T): T {
  return schema.parse(value);
}

// ─── AutopilotProject helpers ─────────────────────────────────────────────────
export async function upsertAutopilotProject(
  ctx: PluginContext,
  ap: AutopilotProject
): Promise<PluginEntityRecord> {
  const validated = validateEntity(autopilotProjectSchema, ap);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.autopilotProject,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.autopilotId,
    title: `Autopilot for project ${validated.projectId.slice(0, 8)}`,
    status: validated.enabled ? "active" : "inactive",
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function getAutopilotProject(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<AutopilotProject | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.autopilotProject,
    scopeKind: "project",
    scopeId: projectId,
    limit: 10,
  });
  const match = entities.find(
    (e) => asAutopilotProject(e).companyId === companyId
  );
  return match ? asAutopilotProject(match) : null;
}

export async function listAutopilotProjectEntities(
  ctx: PluginContext,
  companyId?: string
): Promise<PluginEntityRecord[]> {
  const all = await ctx.entities.list({
    entityType: ENTITY_TYPES.autopilotProject,
    limit: 500,
  });
  if (companyId) {
    return all.filter((e) => asAutopilotProject(e).companyId === companyId);
  }
  return all;
}

// ─── ProductProgram helpers ───────────────────────────────────────────────────
export async function upsertProductProgramRevision(
  ctx: PluginContext,
  rev: ProductProgramRevision
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.productProgramRevision,
    scopeKind: "project",
    scopeId: rev.projectId,
    externalId: rev.revisionId,
    title: `Program v${rev.version}`,
    status: "active",
    data: rev as unknown as Record<string, unknown>,
  });
}

export async function getProductProgramRevision(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  revisionId: string
): Promise<ProductProgramRevision | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.productProgramRevision,
    scopeKind: "project",
    scopeId: projectId,
    limit: 100,
  });
  const match = entities.find(
    (e) =>
      asProductProgramRevision(e).companyId === companyId &&
      asProductProgramRevision(e).revisionId === revisionId
  );
  return match ? asProductProgramRevision(match) : null;
}

export async function getLatestProductProgram(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<ProductProgramRevision | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.productProgramRevision,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  const filtered = entities
    .filter((e) => asProductProgramRevision(e).companyId === companyId)
    .map(asProductProgramRevision)
    .sort((a, b) => b.version - a.version);
  return filtered[0] ?? null;
}

export async function listProductProgramRevisions(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<ProductProgramRevision[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.productProgramRevision,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter((e) => asProductProgramRevision(e).companyId === companyId)
    .map(asProductProgramRevision)
    .sort((a, b) => b.version - a.version);
}

// ─── ResearchCycle helpers ─────────────────────────────────────────────────────
export async function upsertResearchCycle(
  ctx: PluginContext,
  cycle: ResearchCycle
): Promise<PluginEntityRecord> {
  const validated = validateEntity(researchCycleSchema, cycle);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.researchCycle,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.cycleId,
    title: `Research ${validated.cycleId.slice(0, 8)}`,
    status: validated.status === "completed" ? "active" : "inactive",
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function listResearchCycles(
  ctx: PluginContext,
  companyId: string,
  projectId?: string
): Promise<ResearchCycle[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.researchCycle,
    scopeKind: projectId ? "project" : undefined,
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter((e) => asResearchCycle(e).companyId === companyId)
    .map(asResearchCycle)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
}

// ─── ResearchFinding helpers ───────────────────────────────────────────────────
export async function upsertResearchFinding(
  ctx: PluginContext,
  finding: ResearchFinding
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.researchFinding,
    scopeKind: "project",
    scopeId: finding.projectId,
    externalId: finding.findingId,
    title: finding.title.slice(0, 80),
    status: "active",
    data: finding as unknown as Record<string, unknown>,
  });
}

export async function listResearchFindings(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  cycleId?: string
): Promise<ResearchFinding[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.researchFinding,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter(
      (e) =>
        asResearchFinding(e).companyId === companyId &&
        (!cycleId || asResearchFinding(e).cycleId === cycleId)
    )
    .map(asResearchFinding);
}

// ─── Idea helpers ─────────────────────────────────────────────────────────────
export async function upsertIdea(
  ctx: PluginContext,
  idea: Idea
): Promise<PluginEntityRecord> {
  const validated = validateEntity(ideaSchema, idea);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.idea,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.ideaId,
    title: validated.title.slice(0, 80),
    status: ideaStatusToEntityStatus(validated.status),
    data: validated as unknown as Record<string, unknown>,
  });
}

function ideaStatusToEntityStatus(s: IdeaStatus): string {
  if (s === "active" || s === "in_progress" || s === "completed") return "active";
  return "inactive";
}

export async function getIdea(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  ideaId: string
): Promise<Idea | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.idea,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  const match = entities.find(
    (e) =>
      asIdea(e).companyId === companyId && asIdea(e).ideaId === ideaId
  );
  return match ? asIdea(match) : null;
}

export async function listIdeas(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  status?: IdeaStatus
): Promise<Idea[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.idea,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter(
      (e) =>
        asIdea(e).companyId === companyId &&
        (!status || asIdea(e).status === status)
    )
    .map(asIdea)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function listMaybePoolIdeas(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<Idea[]> {
  return listIdeas(ctx, companyId, projectId, "maybe");
}

export async function findDuplicateIdea(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  title: string,
  description: string,
  excludeIdeaId?: string,
  options?: {
    category?: string;
    tags?: string[];
    sourceReferences?: string[];
  }
): Promise<{ idea: Idea; similarity: number; reasons: string[] } | null> {
  const ideas = await listIdeas(ctx, companyId, projectId);
  let best: { idea: Idea; similarity: number; reasons: string[] } | null = null;

  for (const idea of ideas) {
    if (excludeIdeaId && idea.ideaId === excludeIdeaId) continue;
    if (!["active", "maybe"].includes(idea.status)) continue;
    const scored = scoreIdeaDuplicateCandidate({
      title,
      description,
      category: options?.category,
      tags: options?.tags,
      sourceReferences: options?.sourceReferences,
    }, idea);
    if (scored.similarity >= 0.75 && (!best || scored.similarity > best.similarity)) {
      best = { idea, similarity: scored.similarity, reasons: scored.reasons };
    }
  }
  return best;
}

// ─── SwipeEvent helpers ───────────────────────────────────────────────────────
export async function upsertSwipeEvent(
  ctx: PluginContext,
  swipe: SwipeEvent
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.swipeEvent,
    scopeKind: "project",
    scopeId: swipe.projectId,
    externalId: swipe.swipeId,
    title: `Swipe ${swipe.decision} — ${swipe.ideaId.slice(0, 8)}`,
    status: "active",
    data: swipe as unknown as Record<string, unknown>,
  });
}

export async function listSwipeEvents(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  limit = 100
): Promise<SwipeEvent[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.swipeEvent,
    scopeKind: "project",
    scopeId: projectId,
    limit,
  });
  return entities
    .filter((e) => asSwipeEvent(e).companyId === companyId)
    .map(asSwipeEvent)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// ─── PreferenceProfile helpers ─────────────────────────────────────────────────
export async function upsertPreferenceProfile(
  ctx: PluginContext,
  profile: PreferenceProfile
): Promise<PluginEntityRecord> {
  const validated = validateEntity(preferenceProfileSchema, profile);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.preferenceProfile,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.profileId,
    title: `Preferences for ${validated.projectId.slice(0, 8)}`,
    status: "active",
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function getPreferenceProfile(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<PreferenceProfile | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.preferenceProfile,
    scopeKind: "project",
    scopeId: projectId,
    limit: 10,
  });
  const match = entities.find(
    (e) =>
      asPreferenceProfile(e).companyId === companyId &&
      asPreferenceProfile(e).projectId === projectId
  );
  return match ? asPreferenceProfile(match) : null;
}

// ─── PlanningArtifact helpers ─────────────────────────────────────────────────
export async function upsertPlanningArtifact(
  ctx: PluginContext,
  artifact: PlanningArtifact
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.planningArtifact,
    scopeKind: "project",
    scopeId: artifact.projectId,
    externalId: artifact.artifactId,
    title: artifact.title.slice(0, 80),
    status: "active",
    data: artifact as unknown as Record<string, unknown>,
  });
}

export async function getPlanningArtifact(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  artifactId: string
): Promise<PlanningArtifact | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.planningArtifact,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  const match = entities.find(
    (e) =>
      asPlanningArtifact(e).companyId === companyId &&
      asPlanningArtifact(e).artifactId === artifactId
  );
  return match ? asPlanningArtifact(match) : null;
}

export async function listPlanningArtifacts(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  ideaId?: string
): Promise<PlanningArtifact[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.planningArtifact,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter(
      (e) =>
        asPlanningArtifact(e).companyId === companyId &&
        (!ideaId || asPlanningArtifact(e).ideaId === ideaId)
    )
    .map(asPlanningArtifact);
}

// ─── DeliveryRun helpers ──────────────────────────────────────────────────────
export async function upsertDeliveryRun(
  ctx: PluginContext,
  run: DeliveryRun
): Promise<PluginEntityRecord> {
  const validated = validateEntity(deliveryRunSchema, run);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.deliveryRun,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.runId,
    title: validated.title.slice(0, 80),
    status: runStatusToEntityStatus(validated.status),
    data: validated as unknown as Record<string, unknown>,
  });
}

function runStatusToEntityStatus(s: string): string {
  if (["pending", "running", "paused"].includes(s)) return "active";
  return "inactive";
}

export async function getDeliveryRun(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId: string
): Promise<DeliveryRun | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.deliveryRun,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  const match = entities.find(
    (e) =>
      asDeliveryRun(e).companyId === companyId &&
      asDeliveryRun(e).runId === runId
  );
  return match ? asDeliveryRun(match) : null;
}

export async function listDeliveryRuns(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  status?: string
): Promise<DeliveryRun[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.deliveryRun,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter(
      (e) =>
        asDeliveryRun(e).companyId === companyId &&
        (!status || asDeliveryRun(e).status === status)
    )
    .map(asDeliveryRun)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function listStuckRuns(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  stuckThresholdMinutes = 60
): Promise<DeliveryRun[]> {
  const runs = await listDeliveryRuns(ctx, companyId, projectId, "running");
  const threshold = Date.now() - stuckThresholdMinutes * 60 * 1000;
  return runs.filter((r) => new Date(r.updatedAt).getTime() < threshold);
}

// ─── WorkspaceLease helpers ───────────────────────────────────────────────────
export async function upsertWorkspaceLease(
  ctx: PluginContext,
  lease: WorkspaceLease
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.workspaceLease,
    scopeKind: "project",
    scopeId: lease.projectId,
    externalId: lease.leaseId,
    title: `Lease ${lease.branchName}`,
    status: lease.isActive ? "active" : "inactive",
    data: lease as unknown as Record<string, unknown>,
  });
}

export async function getActiveWorkspaceLease(
  ctx: PluginContext,
  projectId: string,
  runId: string
): Promise<WorkspaceLease | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.workspaceLease,
    scopeKind: "project",
    scopeId: projectId,
    limit: 100,
  });
  const match = entities.find(
    (e) =>
      asWorkspaceLease(e).runId === runId && asWorkspaceLease(e).isActive
  );
  return match ? asWorkspaceLease(match) : null;
}

// ─── CompanyBudget helpers ─────────────────────────────────────────────────────
export async function upsertCompanyBudget(
  ctx: PluginContext,
  budget: CompanyBudget
): Promise<PluginEntityRecord> {
  const validated = validateEntity(companyBudgetSchema, budget);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.companyBudget,
    scopeKind: "company",
    scopeId: validated.companyId,
    externalId: validated.budgetId,
    title: `Budget for ${validated.companyId.slice(0, 8)}`,
    status: validated.paused ? "inactive" : "active",
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function getCompanyBudget(
  ctx: PluginContext,
  companyId: string
): Promise<CompanyBudget | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.companyBudget,
    scopeKind: "company",
    scopeId: companyId,
    limit: 10,
  });
  const match = entities.find(
    (e) => asCompanyBudget(e).companyId === companyId
  );
  return match ? asCompanyBudget(match) : null;
}

// ─── ConvoyTask helpers ───────────────────────────────────────────────────────
export async function upsertConvoyTask(
  ctx: PluginContext,
  task: ConvoyTask
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.convoyTask,
    scopeKind: "project",
    scopeId: task.projectId,
    externalId: task.taskId,
    title: task.title.slice(0, 80),
    status: convoyTaskStatusToEntityStatus(task.status),
    data: task as unknown as Record<string, unknown>,
  });
}

function convoyTaskStatusToEntityStatus(s: ConvoyTaskStatus): string {
  if (s === "running" || s === "blocked" || s === "pending") return "active";
  return "inactive";
}

export async function listConvoyTasks(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId?: string
): Promise<ConvoyTask[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.convoyTask,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter(
      (e) =>
        asConvoyTask(e).companyId === companyId &&
        (!runId || asConvoyTask(e).runId === runId)
    )
    .map(asConvoyTask);
}

// ─── Checkpoint helpers ───────────────────────────────────────────────────────
export async function upsertCheckpoint(
  ctx: PluginContext,
  checkpoint: Checkpoint
): Promise<PluginEntityRecord> {
  const validated = validateEntity(checkpointSchema, checkpoint);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.checkpoint,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.checkpointId,
    title: validated.label ?? `Checkpoint ${validated.checkpointId.slice(0, 8)}`,
    status: "active",
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function listCheckpoints(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId?: string
): Promise<Checkpoint[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.checkpoint,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter(
      (e) =>
        asCheckpoint(e).companyId === companyId &&
        (!runId || asCheckpoint(e).runId === runId)
    )
    .map(asCheckpoint)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// ─── ProductLock helpers ─────────────────────────────────────────────────────
export async function upsertProductLock(
  ctx: PluginContext,
  lock: ProductLock
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.productLock,
    scopeKind: "project",
    scopeId: lock.projectId,
    externalId: lock.lockId,
    title: `Lock ${lock.lockType} — ${lock.targetBranch}`,
    status: lock.isActive ? "active" : "inactive",
    data: lock as unknown as Record<string, unknown>,
  });
}

export async function getActiveProductLock(
  ctx: PluginContext,
  projectId: string,
  targetBranch: string
): Promise<ProductLock | null> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.productLock,
    scopeKind: "project",
    scopeId: projectId,
    limit: 100,
  });
  const match = entities.find(
    (e) =>
      asProductLock(e).isActive &&
      asProductLock(e).targetBranch === targetBranch
  );
  return match ? asProductLock(match) : null;
}

export async function listProductLocks(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<ProductLock[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.productLock,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter((e) => asProductLock(e).companyId === companyId)
    .map(asProductLock);
}

// ─── OperatorIntervention helpers ───────────────────────────────────────────────
export async function upsertOperatorIntervention(
  ctx: PluginContext,
  intervention: OperatorIntervention
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.operatorIntervention,
    scopeKind: "project",
    scopeId: intervention.projectId,
    externalId: intervention.interventionId,
    title: `${intervention.interventionType} on ${intervention.runId.slice(0, 8)}`,
    status: "active",
    data: intervention as unknown as Record<string, unknown>,
  });
}

export async function listOperatorInterventions(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId?: string
): Promise<OperatorIntervention[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.operatorIntervention,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter(
      (e) =>
        asOperatorIntervention(e).companyId === companyId &&
        (!runId || asOperatorIntervention(e).runId === runId)
    )
    .map(asOperatorIntervention);
}

// ─── LearnerSummary helpers ────────────────────────────────────────────────────
export async function upsertLearnerSummary(
  ctx: PluginContext,
  summary: LearnerSummary
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.learnerSummary,
    scopeKind: "project",
    scopeId: summary.projectId,
    externalId: summary.summaryId,
    title: summary.title.slice(0, 80),
    status: "active",
    data: summary as unknown as Record<string, unknown>,
  });
}

export async function listLearnerSummaries(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<LearnerSummary[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.learnerSummary,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter((e) => asLearnerSummary(e).companyId === companyId)
    .map(asLearnerSummary);
}

// ─── KnowledgeEntry helpers ────────────────────────────────────────────────────
export async function upsertKnowledgeEntry(
  ctx: PluginContext,
  entry: KnowledgeEntry
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.knowledgeEntry,
    scopeKind: "project",
    scopeId: entry.projectId,
    externalId: entry.entryId,
    title: entry.title.slice(0, 80),
    status: "active",
    data: entry as unknown as Record<string, unknown>,
  });
}

export async function listKnowledgeEntries(
  ctx: PluginContext,
  companyId: string,
  projectId: string
): Promise<KnowledgeEntry[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.knowledgeEntry,
    scopeKind: "project",
    scopeId: projectId,
    limit: 500,
  });
  return entities
    .filter((e) => asKnowledgeEntry(e).companyId === companyId)
    .map(asKnowledgeEntry);
}

// ─── Digest helpers ────────────────────────────────────────────────────────────
export async function upsertDigest(
  ctx: PluginContext,
  digest: Digest
): Promise<PluginEntityRecord> {
  const validated = validateEntity(digestSchema, digest);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.digest,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.digestId,
    title: validated.title.slice(0, 80),
    status: validated.status,
    data: validated as unknown as Record<string, unknown>,
  });
}

export async function listDigests(
  ctx: PluginContext,
  companyId: string,
  projectId?: string
): Promise<Digest[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.digest,
    scopeKind: projectId ? "project" : undefined,
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter((e) => asDigest(e).companyId === companyId)
    .map(asDigest)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// ─── ReleaseHealth helpers ─────────────────────────────────────────────────────
export async function upsertReleaseHealthCheck(
  ctx: PluginContext,
  check: ReleaseHealthCheck
): Promise<PluginEntityRecord> {
  const validated = validateEntity(releaseHealthCheckSchema, check);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.releaseHealth,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.checkId,
    title: validated.name,
    status: checkStatusToEntityStatus(validated.status),
    data: validated as unknown as Record<string, unknown>,
  });
}

function checkStatusToEntityStatus(s: HealthCheckStatus): string {
  if (s === "pending" || s === "running") return "active";
  return "inactive";
}

export async function listReleaseHealthChecks(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId?: string
): Promise<ReleaseHealthCheck[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.releaseHealth,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter(
      (e) =>
        asReleaseHealthCheck(e).companyId === companyId &&
        (!runId || asReleaseHealthCheck(e).runId === runId)
    )
    .map(asReleaseHealthCheck);
}

// ─── RollbackAction helpers ───────────────────────────────────────────────────
export async function upsertRollbackAction(
  ctx: PluginContext,
  action: RollbackAction
): Promise<PluginEntityRecord> {
  const validated = validateEntity(rollbackActionSchema, action);
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.rollbackAction,
    scopeKind: "project",
    scopeId: validated.projectId,
    externalId: validated.rollbackId,
    title: `Rollback ${validated.rollbackType}`,
    status: rollbackStatusToEntityStatus(validated.status),
    data: validated as unknown as Record<string, unknown>,
  });
}

function rollbackStatusToEntityStatus(s: RollbackStatus): string {
  if (s === "pending" || s === "in_progress") return "active";
  return "inactive";
}

export async function listRollbackActions(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  runId?: string
): Promise<RollbackAction[]> {
  const entities = await ctx.entities.list({
    entityType: ENTITY_TYPES.rollbackAction,
    scopeKind: "project",
    scopeId: projectId,
    limit: 200,
  });
  return entities
    .filter(
      (e) =>
        asRollbackAction(e).companyId === companyId &&
        (!runId || asRollbackAction(e).runId === runId)
    )
    .map(asRollbackAction);
}

// ─── UUID generator ─────────────────────────────────────────────────────────────
export function newId(): string {
  return randomUUID();
}

// ─── Preference profile update ─────────────────────────────────────────────────
// Merge a new swipe into the preference profile
export function applySwipeToPreferenceProfile(
  profile: PreferenceProfile,
  decision: SwipeDecision,
  idea: Idea
): PreferenceProfile {
  const updated = { ...profile };
  updated.totalSwipes += 1;
  switch (decision) {
    case "pass":
      updated.passCount += 1;
      break;
    case "maybe":
      updated.maybeCount += 1;
      break;
    case "yes":
      updated.yesCount += 1;
      updated.avgApprovedScore =
        (updated.avgApprovedScore * (updated.yesCount - 1) + idea.impactScore) /
        updated.yesCount;
      break;
    case "now":
      updated.nowCount += 1;
      updated.avgApprovedScore =
        (updated.avgApprovedScore * (updated.yesCount + updated.nowCount - 1) +
          idea.impactScore) /
        (updated.yesCount + updated.nowCount);
      break;
  }

  // Update category preferences
  if (idea.category) {
    if (!updated.categoryPreferences[idea.category]) {
      updated.categoryPreferences[idea.category] = { pass: 0, maybe: 0, yes: 0, now: 0 };
    }
    updated.categoryPreferences[idea.category][decision] += 1;
  }

  // Update tag preferences
  if (idea.tags) {
    for (const tag of idea.tags) {
      if (!updated.tagPreferences[tag]) {
        updated.tagPreferences[tag] = { pass: 0, maybe: 0, yes: 0, now: 0 };
      }
      updated.tagPreferences[tag][decision] += 1;
    }
  }

  updated.lastUpdated = nowIso();
  return updated;
}

// ─── Branch name generator ────────────────────────────────────────────────────
export function generateBranchName(projectId: string, ideaId: string): string {
  const pid = projectId.replace(/-/g, "").slice(0, 8);
  const iid = ideaId.replace(/-/g, "").slice(0, 8);
  return `autopilot/${pid}/${iid}`;
}

// ─── Port allocator ─────────────────────────────────────────────────────────────
let _nextPort = 30_000;
export function allocatePort(): number {
  return _nextPort++;
}
