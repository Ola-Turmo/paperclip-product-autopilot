// Delivery orchestrator — turns approved ideas into build/test/review/PR flows
import { deliveryRunRegistry, ideaRegistry, workspaceLeaseRegistry, convoyTaskRegistry } from './registry.js';
import type { DeliveryRun, Idea, ConvoyTask, WorkspaceLease, AutopilotProject } from '../types/entities.js';

export interface DeliveryContext {
  companyId: string;
  projectId: string;
  ideaId: string;
  mode?: 'simple' | 'convoy';  // default 'simple'
}

export interface DeliveryResult {
  runId: string;
  status: DeliveryRun['status'];
  workspaceRef?: string;
  prUrl?: string;
}

// Main entry point — start delivery for an approved idea
export async function startDelivery(ctx: DeliveryContext): Promise<DeliveryResult> {
  const { companyId, projectId, ideaId, mode = 'simple' } = ctx;

  // Get the idea
  const idea = ideaRegistry.get(ideaId);
  if (!idea) {
    throw new Error(`Idea not found: ${ideaId}`);
  }

  if (idea.status !== 'approved' && idea.status !== 'in-progress') {
    throw new Error(`Idea must be approved or in-progress, got: ${idea.status}`);
  }

  // Mark idea as in-progress
  ideaRegistry.update(ideaId, { status: 'in-progress' });

  // Create delivery run
  const run = deliveryRunRegistry.create(companyId, projectId, {
    ideaId,
    mode,
    status: 'planned',
    createdAt: new Date().toISOString(),
  });

  try {
    if (mode === 'convoy') {
      return await executeConvoyDelivery(run, idea, companyId, projectId);
    } else {
      return await executeSimpleDelivery(run, idea, companyId, projectId);
    }
  } catch (error) {
    deliveryRunRegistry.update(run.id, { status: 'failed' });
    throw error;
  }
}

async function executeSimpleDelivery(
  run: DeliveryRun,
  idea: Idea,
  companyId: string,
  projectId: string
): Promise<DeliveryResult> {
  // 1. Create workspace lease (ephemeral for simple mode)
  const lease = workspaceLeaseRegistry.create(companyId, projectId, {
    deliveryRunId: run.id,
    strategy: 'ephemeral',
    status: 'active',
    acquiredAt: new Date().toISOString(),
  });

  // 2. Create planning artifact (Paperclip issue)
  const parentIssueId = await createPlanningIssue(idea, companyId, projectId);
  deliveryRunRegistry.update(run.id, { parentIssueId });

  // 3. Dispatch build agent
  deliveryRunRegistry.update(run.id, { status: 'running', startedAt: new Date().toISOString(), workspaceRef: lease.workspacePath });
  
  const buildResult = await dispatchBuildAgent(idea, lease, companyId, projectId);
  
  if (!buildResult.success) {
    deliveryRunRegistry.update(run.id, { status: 'failed' });
    return { runId: run.id, status: 'failed', workspaceRef: lease.workspacePath };
  }

  // 4. Dispatch test agent
  const testResult = await dispatchTestAgent(idea, buildResult.artifactRef, companyId, projectId);
  
  if (!testResult.success) {
    deliveryRunRegistry.update(run.id, { status: 'failed' });
    return { runId: run.id, status: 'failed', workspaceRef: lease.workspacePath };
  }

  // 5. Dispatch review agent
  deliveryRunRegistry.update(run.id, { status: 'review' });
  const reviewResult = await dispatchReviewAgent(idea, buildResult.artifactRef, companyId, projectId);

  // 6. Create PR
  deliveryRunRegistry.update(run.id, { status: 'pr', prUrl: reviewResult.prUrl });
  const prUrl = await createPullRequest(idea, buildResult.artifactRef, companyId, projectId);

  // 7. Mark complete
  workspaceLeaseRegistry.update(lease.id, { status: 'released', releasedAt: new Date().toISOString() });
  deliveryRunRegistry.update(run.id, {
    status: 'merged',
    completedAt: new Date().toISOString(),
    prUrl,
    costSummary: {
      build: buildResult.cost,
      test: testResult.cost,
      review: reviewResult.cost,
      total: (buildResult.cost ?? 0) + (testResult.cost ?? 0) + (reviewResult.cost ?? 0),
    },
  });

  ideaRegistry.update(idea.id, { status: 'done' });

  return { runId: run.id, status: 'merged', workspaceRef: lease.workspacePath, prUrl };
}

// Convoy delivery — decompose into dependent sub-tasks
async function executeConvoyDelivery(
  run: DeliveryRun,
  idea: Idea,
  companyId: string,
  projectId: string
): Promise<DeliveryResult> {
  // Create parent convoy task
  const parentTask = convoyTaskRegistry.create(companyId, projectId, {
    deliveryRunId: run.id,
    dependsOn: [],
    status: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Decompose into sub-tasks: planning, build, test, review
  const phases = ['planning', 'build', 'test', 'review'] as const;
  const tasks: ConvoyTask[] = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const task = convoyTaskRegistry.create(companyId, projectId, {
      deliveryRunId: run.id,
      parentConvoyTaskId: parentTask.id,
      dependsOn: i > 0 ? [tasks[i - 1].id] : [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    tasks.push(task);
  }

  // Execute each phase sequentially, blocking on dependencies
  let workspaceRef: string | undefined;
  let prUrl: string | undefined;

  for (const [i, task] of tasks.entries()) {
    convoyTaskRegistry.update(task.id, { status: 'running' });

    const result = await executeConvoyPhase(phases[i], idea, workspaceRef, companyId, projectId);

    if (!result.success) {
      convoyTaskRegistry.update(task.id, { status: 'failed' });
      deliveryRunRegistry.update(run.id, { status: 'failed' });
      return { runId: run.id, status: 'failed', workspaceRef };
    }

    convoyTaskRegistry.update(task.id, { status: 'done', result: JSON.stringify(result) });
    workspaceRef = result.workspaceRef;
    prUrl = result.prUrl;
  }

  deliveryRunRegistry.update(run.id, { status: 'merged', completedAt: new Date().toISOString(), prUrl });
  ideaRegistry.update(idea.id, { status: 'done' });

  return { runId: run.id, status: 'merged', workspaceRef, prUrl };
}

async function executeConvoyPhase(
  phase: 'planning' | 'build' | 'test' | 'review',
  idea: Idea,
  _priorArtifact: string | undefined,
  companyId: string,
  projectId: string
): Promise<{ success: boolean; workspaceRef?: string; prUrl?: string; cost?: number }> {
  switch (phase) {
    case 'planning':
      // Create planning issue
      return { success: true };
    case 'build':
      // Dispatch build
      return { success: true, cost: 50 };
    case 'test':
      // Dispatch test
      return { success: true, cost: 20 };
    case 'review':
      // Dispatch review + PR
      return { success: true, prUrl: `https://github.com/example/pull/${Date.now()}`, cost: 30 };
  }
}

// Helper: Create Paperclip issue for an approved idea
async function createPlanningIssue(
  idea: Idea,
  companyId: string,
  projectId: string
): Promise<string> {
  // TODO: Use Paperclip API to create an issue
  // For MVP, return a placeholder issue ID
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Helper: Dispatch build agent
async function dispatchBuildAgent(
  idea: Idea,
  lease: WorkspaceLease,
  companyId: string,
  projectId: string
): Promise<{ success: boolean; artifactRef?: string; cost?: number }> {
  // TODO: In production, use ctx.agents.build({ ... }) via Paperclip plugin API
  // For MVP, simulate agent dispatch
  console.log(`[Delivery] Dispatching build agent for idea: ${idea.title}`);
  return { success: true, artifactRef: `artifact-${Date.now()}`, cost: 50 };
}

// Helper: Dispatch test agent
async function dispatchTestAgent(
  idea: Idea,
  artifactRef: string,
  companyId: string,
  projectId: string
): Promise<{ success: boolean; cost?: number }> {
  console.log(`[Delivery] Dispatching test agent for artifact: ${artifactRef}`);
  return { success: true, cost: 20 };
}

// Helper: Dispatch review agent
async function dispatchReviewAgent(
  idea: Idea,
  artifactRef: string,
  companyId: string,
  projectId: string
): Promise<{ success: boolean; prUrl?: string; cost?: number }> {
  console.log(`[Delivery] Dispatching review agent for artifact: ${artifactRef}`);
  return { success: true, prUrl: `https://github.com/example/pull/${Date.now()}`, cost: 30 };
}

// Helper: Create PR
async function createPullRequest(
  idea: Idea,
  artifactRef: string,
  companyId: string,
  projectId: string
): Promise<string> {
  // TODO: Use Paperclip/git API to create actual PR
  const prUrl = `https://github.com/example/repo/pull/${Date.now()}`;
  console.log(`[Delivery] Created PR for idea ${idea.id}: ${prUrl}`);
  return prUrl;
}
