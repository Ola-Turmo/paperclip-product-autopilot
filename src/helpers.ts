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

// ─── AutopilotProject helpers ─────────────────────────────────────────────────
export async function upsertAutopilotProject(
  ctx: PluginContext,
  ap: AutopilotProject
): Promise<PluginEntityRecord> {
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.autopilotProject,
    scopeKind: "project",
    scopeId: ap.projectId,
    externalId: ap.autopilotId,
    title: `Autopilot for project ${ap.projectId.slice(0, 8)}`,
    status: ap.enabled ? "active" : "inactive",
    data: ap as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.researchCycle,
    scopeKind: "project",
    scopeId: cycle.projectId,
    externalId: cycle.cycleId,
    title: `Research ${cycle.cycleId.slice(0, 8)}`,
    status: cycle.status === "completed" ? "active" : "inactive",
    data: cycle as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.idea,
    scopeKind: "project",
    scopeId: idea.projectId,
    externalId: idea.ideaId,
    title: idea.title.slice(0, 80),
    status: ideaStatusToEntityStatus(idea.status),
    data: idea as unknown as Record<string, unknown>,
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

// Normalize idea text for duplicate detection
function normalizeIdeaText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Compute similarity between two idea texts (0-1)
function computeTextSimilarity(a: string, b: string): number {
  const normA = normalizeIdeaText(a);
  const normB = normalizeIdeaText(b);
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  const wordsA = new Set(normA.split(" "));
  const wordsB = new Set(normB.split(" "));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

export async function findDuplicateIdea(
  ctx: PluginContext,
  companyId: string,
  projectId: string,
  title: string,
  description: string,
  excludeIdeaId?: string
): Promise<{ idea: Idea; similarity: number } | null> {
  const ideas = await listIdeas(ctx, companyId, projectId);
  const candidate = normalizeIdeaText(`${title} ${description}`);
  let best: { idea: Idea; similarity: number } | null = null;

  for (const idea of ideas) {
    if (excludeIdeaId && idea.ideaId === excludeIdeaId) continue;
    if (!["active", "maybe"].includes(idea.status)) continue;
    const existing = normalizeIdeaText(`${idea.title} ${idea.description}`);
    const sim = computeTextSimilarity(candidate, existing);
    if (sim >= 0.75 && (!best || sim > best.similarity)) {
      best = { idea, similarity: sim };
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.preferenceProfile,
    scopeKind: "project",
    scopeId: profile.projectId,
    externalId: profile.profileId,
    title: `Preferences for ${profile.projectId.slice(0, 8)}`,
    status: "active",
    data: profile as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.deliveryRun,
    scopeKind: "project",
    scopeId: run.projectId,
    externalId: run.runId,
    title: run.title.slice(0, 80),
    status: runStatusToEntityStatus(run.status),
    data: run as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.companyBudget,
    scopeKind: "company",
    scopeId: budget.companyId,
    externalId: budget.budgetId,
    title: `Budget for ${budget.companyId.slice(0, 8)}`,
    status: budget.paused ? "inactive" : "active",
    data: budget as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.checkpoint,
    scopeKind: "project",
    scopeId: checkpoint.projectId,
    externalId: checkpoint.checkpointId,
    title: checkpoint.label ?? `Checkpoint ${checkpoint.checkpointId.slice(0, 8)}`,
    status: "active",
    data: checkpoint as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.digest,
    scopeKind: "project",
    scopeId: digest.projectId,
    externalId: digest.digestId,
    title: digest.title.slice(0, 80),
    status: digest.status,
    data: digest as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.releaseHealth,
    scopeKind: "project",
    scopeId: check.projectId,
    externalId: check.checkId,
    title: check.name,
    status: checkStatusToEntityStatus(check.status),
    data: check as unknown as Record<string, unknown>,
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
  return ctx.entities.upsert({
    entityType: ENTITY_TYPES.rollbackAction,
    scopeKind: "project",
    scopeId: action.projectId,
    externalId: action.rollbackId,
    title: `Rollback ${action.rollbackType}`,
    status: rollbackStatusToEntityStatus(action.status),
    data: action as unknown as Record<string, unknown>,
  });
}

function rollbackStatusToEntityStatus(s: RollbackStatus): string {
  if (s === "pending" || s === "in_progress") return "active";
  return "inactive";
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
