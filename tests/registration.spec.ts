import { describe, expect, it } from "vitest";
import { ACTION_KEYS, DATA_KEYS, JOB_KEYS, TOOL_KEYS } from "../src/constants.js";
import { registerActionHandlers } from "../src/worker/actions.js";
import { registerDataHandlers } from "../src/worker/data.js";
import { registerJobHandlers } from "../src/worker/jobs.js";
import { registerToolHandlers } from "../src/worker/tools.js";

function createMockPluginContext() {
  const actions = new Map<string, unknown>();
  const data = new Map<string, unknown>();
  const tools = new Map<string, unknown>();
  const jobs = new Map<string, unknown>();

  const ctx = {
    actions: {
      register(name: string, handler: unknown) {
        actions.set(name, handler);
      },
    },
    data: {
      register(name: string, handler: unknown) {
        data.set(name, handler);
      },
    },
    tools: {
      register(name: string, definition: unknown, handler: unknown) {
        tools.set(name, { definition, handler });
      },
    },
    jobs: {
      register(name: string, handler: unknown) {
        jobs.set(name, handler);
      },
    },
    logger: {
      info() {},
      error() {},
      warn() {},
      debug() {},
    },
    metrics: {
      async write() {},
    },
    telemetry: {
      async track() {},
    },
    entities: {},
  };

  return { ctx: ctx as any, actions, data, tools, jobs };
}

const REGISTERED_ACTION_KEYS = [
  ACTION_KEYS.saveAutopilotProject,
  ACTION_KEYS.enableAutopilot,
  ACTION_KEYS.disableAutopilot,
  ACTION_KEYS.createProductProgramRevision,
  ACTION_KEYS.getLatestProductProgram,
  ACTION_KEYS.startResearchCycle,
  ACTION_KEYS.completeResearchCycle,
  ACTION_KEYS.addResearchFinding,
  ACTION_KEYS.createIdea,
  ACTION_KEYS.updateIdea,
  ACTION_KEYS.recordSwipe,
  ACTION_KEYS.createPlanningArtifact,
  ACTION_KEYS.createDeliveryRun,
  ACTION_KEYS.completeDeliveryRun,
  ACTION_KEYS.pauseDeliveryRun,
  ACTION_KEYS.cancelDeliveryRun,
  ACTION_KEYS.resumeDeliveryRun,
  ACTION_KEYS.updateCompanyBudget,
  ACTION_KEYS.checkBudgetAndPauseIfNeeded,
  ACTION_KEYS.decomposeIntoConvoyTasks,
  ACTION_KEYS.updateConvoyTaskStatus,
  ACTION_KEYS.acquireProductLock,
  ACTION_KEYS.releaseProductLock,
  ACTION_KEYS.createCheckpoint,
  ACTION_KEYS.resumeFromCheckpoint,
  ACTION_KEYS.createReleaseHealthCheck,
  ACTION_KEYS.updateReleaseHealthStatus,
  ACTION_KEYS.triggerRollback,
  ACTION_KEYS.addOperatorNote,
  ACTION_KEYS.requestCheckpoint,
  ACTION_KEYS.nudgeRun,
  ACTION_KEYS.createLearnerSummary,
  ACTION_KEYS.createKnowledgeEntry,
  ACTION_KEYS.createDigest,
  ACTION_KEYS.dismissDigest,
  ACTION_KEYS.generateStuckRunDigest,
  ACTION_KEYS.generateBudgetAlertDigest,
  ACTION_KEYS.checkStuckRuns,
];

const REGISTERED_DATA_KEYS = [
  DATA_KEYS.autopilotProject,
  DATA_KEYS.autopilotProjects,
  "autopilot-overview",
  DATA_KEYS.productProgramRevision,
  DATA_KEYS.productProgramRevisions,
  DATA_KEYS.researchCycle,
  DATA_KEYS.researchCycles,
  DATA_KEYS.researchFindings,
  DATA_KEYS.idea,
  DATA_KEYS.ideas,
  DATA_KEYS.maybePoolIdeas,
  DATA_KEYS.swipeEvent,
  DATA_KEYS.swipeEvents,
  DATA_KEYS.preferenceProfile,
  DATA_KEYS.planningArtifact,
  DATA_KEYS.planningArtifacts,
  DATA_KEYS.deliveryRun,
  DATA_KEYS.deliveryRuns,
  DATA_KEYS.workspaceLease,
  DATA_KEYS.companyBudget,
  DATA_KEYS.convoyTasks,
  DATA_KEYS.checkpoints,
  DATA_KEYS.productLocks,
  DATA_KEYS.operatorInterventions,
  DATA_KEYS.learnerSummaries,
  DATA_KEYS.knowledgeEntries,
  DATA_KEYS.digests,
  DATA_KEYS.releaseHealthChecks,
  DATA_KEYS.rollbackActions,
];

describe("worker registration", () => {
  it("registers the full expected action, data, tool, and job surface", () => {
    const { ctx, actions, data, tools, jobs } = createMockPluginContext();

    registerDataHandlers(ctx);
    registerActionHandlers(ctx);
    registerToolHandlers(ctx);
    registerJobHandlers(ctx);

    expect(new Set(actions.keys())).toEqual(new Set(REGISTERED_ACTION_KEYS));
    expect(new Set(data.keys())).toEqual(new Set(REGISTERED_DATA_KEYS));
    expect(new Set(tools.keys())).toEqual(new Set(Object.values(TOOL_KEYS)));
    expect(new Set(jobs.keys())).toEqual(new Set(Object.values(JOB_KEYS)));
  });

  it("registers callable handlers for every surface", () => {
    const { ctx, actions, data, tools, jobs } = createMockPluginContext();

    registerDataHandlers(ctx);
    registerActionHandlers(ctx);
    registerToolHandlers(ctx);
    registerJobHandlers(ctx);

    expect(Array.from(actions.values()).every((handler) => typeof handler === "function")).toBe(true);
    expect(Array.from(data.values()).every((handler) => typeof handler === "function")).toBe(true);
    expect(Array.from(tools.values()).every((tool) => typeof (tool as { handler: unknown }).handler === "function")).toBe(true);
    expect(Array.from(jobs.values()).every((handler) => typeof handler === "function")).toBe(true);
  });
});
