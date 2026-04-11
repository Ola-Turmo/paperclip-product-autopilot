// PluginEntities registry — provides typed CRUD for all plugin entity types
import type {
  AutopilotProject,
  ProductProgramRevision,
  ResearchCycle,
  ResearchFinding,
  Idea,
  SwipeEvent,
  PreferenceProfile,
  DeliveryRun,
  ConvoyTask,
  KnowledgeEntry,
  WorkspaceLease,
} from '../types/entities.js';

// Entity registry type
export interface EntityRegistry<T extends { companyId: string; projectId?: string }> {
  // Create
  create(companyId: string, projectId: string, data: Omit<T, 'id' | 'companyId' | 'projectId'>): T;
  // Read
  get(id: string): T | undefined;
  getByCompany(companyId: string): T[];
  getByProject(companyId: string, projectId: string): T[];
  // Update
  update(id: string, data: Partial<Omit<T, 'id' | 'companyId' | 'projectId'>>): T | undefined;
  // Delete
  delete(id: string): boolean;
  // List all
  list(): T[];
}

// Base class for in-memory entity storage with plugin-scoped isolation
// Note: In production this would use Paperclip's entity storage API
// For MVP, we use module-level Maps keyed by `${companyId}:${projectId}:${entityType}:${id}`

class InMemoryStore {
  private store: Record<string, unknown> = {};

  private key(companyId: string, projectId: string, entityType: string, id: string): string {
    return `${companyId}:${projectId}:${entityType}:${id}`;
  }

  set(companyId: string, projectId: string, entityType: string, id: string, value: unknown): void {
    this.store[this.key(companyId, projectId, entityType, id)] = value;
  }

  get(companyId: string, projectId: string, entityType: string, id: string): unknown | undefined {
    return this.store[this.key(companyId, projectId, entityType, id)];
  }

  delete(companyId: string, projectId: string, entityType: string, id: string): boolean {
    const k = this.key(companyId, projectId, entityType, id);
    if (k in this.store) {
      delete this.store[k];
      return true;
    }
    return false;
  }

  filter(companyId: string, projectId: string, entityType: string): unknown[] {
    const prefix = `${companyId}:${projectId}:${entityType}:`;
    const results: unknown[] = [];
    const keys = Object.keys(this.store);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.indexOf(prefix) === 0) {
        results.push(this.store[key]);
      }
    }
    return results;
  }

  filterByCompany(companyId: string, entityType: string): unknown[] {
    const prefix = `${companyId}:`;
    const marker = `:${entityType}:`;
    const results: unknown[] = [];
    const keys = Object.keys(this.store);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.indexOf(prefix) === 0 && key.indexOf(marker) !== -1) {
        results.push(this.store[key]);
      }
    }
    return results;
  }

  getByIdPrefix(id: string, entityType: string): unknown | undefined {
    const marker = `:${entityType}:`;
    const keys = Object.keys(this.store);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.indexOf(marker) !== -1) {
        const value = this.store[key] as { id: string };
        if (value && value.id === id) {
          return value;
        }
      }
    }
    return undefined;
  }

  listByType(entityType: string): unknown[] {
    const marker = `:${entityType}:`;
    const results: unknown[] = [];
    const keys = Object.keys(this.store);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.indexOf(marker) !== -1) {
        results.push(this.store[key]);
      }
    }
    return results;
  }
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Singleton store instance
const store = new InMemoryStore();

// ============================================================
// AutopilotProject Registry
// ============================================================
export const autopilotProjectRegistry: EntityRegistry<AutopilotProject> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: AutopilotProject = {
      id,
      companyId,
      projectId,
      status: data.status ?? 'active',
      automationTier: data.automationTier ?? 'supervised',
      defaultAgentAssignments: data.defaultAgentAssignments ?? {},
      budgetPolicy: data.budgetPolicy!,
      schedulePolicy: data.schedulePolicy!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'autopilot_project', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'autopilot_project') as AutopilotProject | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'autopilot_project') as AutopilotProject[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'autopilot_project') as AutopilotProject[];
  },
  update(id, data) {
    const entity = autopilotProjectRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, updatedAt: new Date().toISOString() };
    store.set(entity.companyId, entity.projectId, 'autopilot_project', id, updated);
    return updated;
  },
  delete(id) {
    const entity = autopilotProjectRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'autopilot_project', id);
  },
  list() {
    return store.listByType('autopilot_project') as AutopilotProject[];
  },
};

// ============================================================
// ProductProgramRevision Registry
// ============================================================
export const productProgramRevisionRegistry: EntityRegistry<ProductProgramRevision> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: ProductProgramRevision = {
      id,
      companyId,
      projectId,
      version: data.version!,
      content: data.content!,
      createdBy: data.createdBy!,
      createdAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'product_program_revision', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'product_program_revision') as ProductProgramRevision | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'product_program_revision') as ProductProgramRevision[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'product_program_revision') as ProductProgramRevision[];
  },
  update(id, data) {
    const entity = productProgramRevisionRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'product_program_revision', id, updated);
    return updated;
  },
  delete(id) {
    const entity = productProgramRevisionRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'product_program_revision', id);
  },
  list() {
    return store.listByType('product_program_revision') as ProductProgramRevision[];
  },
};

// ============================================================
// ResearchCycle Registry
// ============================================================
export const researchCycleRegistry: EntityRegistry<ResearchCycle> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: ResearchCycle = {
      id,
      companyId,
      projectId,
      status: data.status ?? 'pending',
      triggerType: data.triggerType ?? 'manual',
      startedAt: data.startedAt ?? new Date().toISOString(),
      completedAt: data.completedAt,
      reportSummary: data.reportSummary,
      sources: data.sources,
      cost: data.cost,
    };
    store.set(companyId, projectId, 'research_cycle', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'research_cycle') as ResearchCycle | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'research_cycle') as ResearchCycle[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'research_cycle') as ResearchCycle[];
  },
  update(id, data) {
    const entity = researchCycleRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'research_cycle', id, updated);
    return updated;
  },
  delete(id) {
    const entity = researchCycleRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'research_cycle', id);
  },
  list() {
    return store.listByType('research_cycle') as ResearchCycle[];
  },
};

// ============================================================
// ResearchFinding Registry
// ============================================================
export const researchFindingRegistry: EntityRegistry<ResearchFinding> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: ResearchFinding = {
      id,
      cycleId: data.cycleId!,
      companyId,
      projectId,
      findingType: data.findingType!,
      title: data.title!,
      summary: data.summary!,
      evidence: data.evidence,
      sourceUrl: data.sourceUrl,
      createdAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'research_finding', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'research_finding') as ResearchFinding | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'research_finding') as ResearchFinding[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'research_finding') as ResearchFinding[];
  },
  update(id, data) {
    const entity = researchFindingRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'research_finding', id, updated);
    return updated;
  },
  delete(id) {
    const entity = researchFindingRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'research_finding', id);
  },
  list() {
    return store.listByType('research_finding') as ResearchFinding[];
  },
};

// ============================================================
// Idea Registry
// ============================================================
export const ideaRegistry: EntityRegistry<Idea> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: Idea = {
      id,
      companyId,
      projectId,
      cycleId: data.cycleId,
      status: data.status ?? 'pending',
      title: data.title!,
      summary: data.summary!,
      category: data.category!,
      impactScore: data.impactScore!,
      feasibilityScore: data.feasibilityScore!,
      complexity: data.complexity ?? 'medium',
      approach: data.approach,
      risks: data.risks,
      researchRefs: data.researchRefs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'idea', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'idea') as Idea | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'idea') as Idea[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'idea') as Idea[];
  },
  update(id, data) {
    const entity = ideaRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, updatedAt: new Date().toISOString() };
    store.set(entity.companyId, entity.projectId, 'idea', id, updated);
    return updated;
  },
  delete(id) {
    const entity = ideaRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'idea', id);
  },
  list() {
    return store.listByType('idea') as Idea[];
  },
};

// ============================================================
// SwipeEvent Registry
// ============================================================
export const swipeEventRegistry: EntityRegistry<SwipeEvent> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: SwipeEvent = {
      id,
      ideaId: data.ideaId!,
      companyId,
      projectId,
      decision: data.decision!,
      actor: data.actor!,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'swipe_event', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'swipe_event') as SwipeEvent | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'swipe_event') as SwipeEvent[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'swipe_event') as SwipeEvent[];
  },
  update(id, data) {
    const entity = swipeEventRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'swipe_event', id, updated);
    return updated;
  },
  delete(id) {
    const entity = swipeEventRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'swipe_event', id);
  },
  list() {
    return store.listByType('swipe_event') as SwipeEvent[];
  },
};

// ============================================================
// PreferenceProfile Registry
// ============================================================
export const preferenceProfileRegistry = {
  create(companyId, projectId, data) {
    const entity: PreferenceProfile = {
      companyId,
      projectId,
      weights: data.weights!,
      lastUpdatedAt: new Date().toISOString(),
    };
    // Use companyId:projectId as key since PreferenceProfile is unique per project
    store.set(companyId, projectId, 'preference_profile', `${companyId}:${projectId}`, entity);
    return entity;
  },
  get(companyIdAndProjectId: string) {
    // PreferenceProfile uses companyId:projectId as its id
    const parts = companyIdAndProjectId.split(':');
    if (parts.length >= 2) {
      const cId = parts[0];
      const pId = parts.slice(1).join(':');
      return store.get(cId, pId, 'preference_profile', companyIdAndProjectId) as PreferenceProfile | undefined;
    }
    // Fallback: scan by id
    return store.getByIdPrefix(companyIdAndProjectId, 'preference_profile') as PreferenceProfile | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'preference_profile') as PreferenceProfile[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'preference_profile') as PreferenceProfile[];
  },
  update(companyIdAndProjectId: string, data) {
    const entity = preferenceProfileRegistry.get(companyIdAndProjectId);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, lastUpdatedAt: new Date().toISOString() };
    store.set(entity.companyId, entity.projectId, 'preference_profile', `${entity.companyId}:${entity.projectId}`, updated);
    return updated;
  },
  delete(companyIdAndProjectId: string) {
    const entity = preferenceProfileRegistry.get(companyIdAndProjectId);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'preference_profile', `${entity.companyId}:${entity.projectId}`);
  },
  list() {
    return store.listByType('preference_profile') as PreferenceProfile[];
  },
};

// ============================================================
// DeliveryRun Registry
// ============================================================
export const deliveryRunRegistry: EntityRegistry<DeliveryRun> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: DeliveryRun = {
      id,
      companyId,
      projectId,
      ideaId: data.ideaId!,
      parentIssueId: data.parentIssueId,
      mode: data.mode ?? 'simple',
      status: data.status ?? 'pending',
      workspaceRef: data.workspaceRef,
      prUrl: data.prUrl,
      costSummary: data.costSummary,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      createdAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'delivery_run', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'delivery_run') as DeliveryRun | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'delivery_run') as DeliveryRun[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'delivery_run') as DeliveryRun[];
  },
  update(id, data) {
    const entity = deliveryRunRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'delivery_run', id, updated);
    return updated;
  },
  delete(id) {
    const entity = deliveryRunRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'delivery_run', id);
  },
  list() {
    return store.listByType('delivery_run') as DeliveryRun[];
  },
};

// ============================================================
// ConvoyTask Registry
// ============================================================
export const convoyTaskRegistry: EntityRegistry<ConvoyTask> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: ConvoyTask = {
      id,
      deliveryRunId: data.deliveryRunId!,
      companyId,
      projectId,
      parentConvoyTaskId: data.parentConvoyTaskId,
      dependsOn: data.dependsOn ?? [],
      issueId: data.issueId,
      status: data.status ?? 'pending',
      result: data.result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'convoy_task', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'convoy_task') as ConvoyTask | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'convoy_task') as ConvoyTask[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'convoy_task') as ConvoyTask[];
  },
  update(id, data) {
    const entity = convoyTaskRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, updatedAt: new Date().toISOString() };
    store.set(entity.companyId, entity.projectId, 'convoy_task', id, updated);
    return updated;
  },
  delete(id) {
    const entity = convoyTaskRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'convoy_task', id);
  },
  list() {
    return store.listByType('convoy_task') as ConvoyTask[];
  },
};

// ============================================================
// KnowledgeEntry Registry
// ============================================================
export const knowledgeEntryRegistry: EntityRegistry<KnowledgeEntry> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: KnowledgeEntry = {
      id,
      companyId,
      projectId,
      sourceRunId: data.sourceRunId,
      type: data.type!,
      title: data.title!,
      content: data.content!,
      confidence: data.confidence ?? 0.5,
      tags: data.tags,
      createdAt: new Date().toISOString(),
    };
    store.set(companyId, projectId, 'knowledge_entry', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'knowledge_entry') as KnowledgeEntry | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'knowledge_entry') as KnowledgeEntry[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'knowledge_entry') as KnowledgeEntry[];
  },
  update(id, data) {
    const entity = knowledgeEntryRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'knowledge_entry', id, updated);
    return updated;
  },
  delete(id) {
    const entity = knowledgeEntryRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'knowledge_entry', id);
  },
  list() {
    return store.listByType('knowledge_entry') as KnowledgeEntry[];
  },
};

// ============================================================
// WorkspaceLease Registry
// ============================================================
export const workspaceLeaseRegistry: EntityRegistry<WorkspaceLease> = {
  create(companyId, projectId, data) {
    const id = generateId();
    const entity: WorkspaceLease = {
      id,
      companyId,
      projectId,
      deliveryRunId: data.deliveryRunId,
      strategy: data.strategy ?? 'ephemeral',
      workspacePath: data.workspacePath,
      branch: data.branch,
      port: data.port,
      status: data.status ?? 'active',
      acquiredAt: new Date().toISOString(),
      releasedAt: data.releasedAt,
    };
    store.set(companyId, projectId, 'workspace_lease', id, entity);
    return entity;
  },
  get(id) {
    return store.getByIdPrefix(id, 'workspace_lease') as WorkspaceLease | undefined;
  },
  getByCompany(companyId) {
    return store.filterByCompany(companyId, 'workspace_lease') as WorkspaceLease[];
  },
  getByProject(companyId, projectId) {
    return store.filter(companyId, projectId, 'workspace_lease') as WorkspaceLease[];
  },
  update(id, data) {
    const entity = workspaceLeaseRegistry.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data };
    store.set(entity.companyId, entity.projectId, 'workspace_lease', id, updated);
    return updated;
  },
  delete(id) {
    const entity = workspaceLeaseRegistry.get(id);
    if (!entity) return false;
    return store.delete(entity.companyId, entity.projectId, 'workspace_lease', id);
  },
  list() {
    return store.listByType('workspace_lease') as WorkspaceLease[];
  },
};

// ============================================================
// Main PluginEntities Export
// ============================================================

export const PluginEntities = {
  autopilotProject: autopilotProjectRegistry,
  productProgramRevision: productProgramRevisionRegistry,
  researchCycle: researchCycleRegistry,
  researchFinding: researchFindingRegistry,
  idea: ideaRegistry,
  swipeEvent: swipeEventRegistry,
  preferenceProfile: preferenceProfileRegistry,
  deliveryRun: deliveryRunRegistry,
  convoyTask: convoyTaskRegistry,
  knowledgeEntry: knowledgeEntryRegistry,
  workspaceLease: workspaceLeaseRegistry,
};

export type PluginEntities = typeof PluginEntities;
