import { describe, expect, it, vi } from "vitest";
import { ACTION_KEYS, DATA_KEYS, JOB_KEYS, PLUGIN_ID, TOOL_KEYS } from "../src/constants.js";

function createMockPluginContext() {
  const actions = new Map<string, unknown>();
  const data = new Map<string, unknown>();
  const tools = new Map<string, unknown>();
  const jobs = new Map<string, unknown>();
  const logs: string[] = [];

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
      info(message: string) {
        logs.push(message);
      },
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

  return { ctx: ctx as any, actions, data, tools, jobs, logs };
}

describe("worker entrypoint", () => {
  it("wires definePlugin and runWorker correctly", async () => {
    vi.resetModules();

    const runWorker = vi.fn();
    const definePlugin = vi.fn((definition) => ({ definition }));

    vi.doMock("@paperclipai/plugin-sdk", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@paperclipai/plugin-sdk")>();
      return {
        ...actual,
        definePlugin,
        runWorker,
      };
    });

    const workerModule = await import("../src/worker.js");
    const plugin = workerModule.default as { definition: { setup: (ctx: unknown) => Promise<void>; onHealth: () => Promise<unknown> } };

    expect(definePlugin).toHaveBeenCalledTimes(1);
    expect(runWorker).toHaveBeenCalledTimes(1);
    expect(runWorker).toHaveBeenCalledWith(plugin, expect.stringContaining("/src/worker."));

    const { ctx, actions, data, tools, jobs, logs } = createMockPluginContext();
    await plugin.definition.setup(ctx);

    expect(logs).toContain(`${PLUGIN_ID} worker starting`);
    expect(logs).toContain(`${PLUGIN_ID} handlers registered`);
    expect(actions.has(ACTION_KEYS.startResearchCycle)).toBe(true);
    expect(data.has(DATA_KEYS.autopilotProject)).toBe(true);
    expect(data.has("autopilot-overview")).toBe(true);
    expect(tools.has(TOOL_KEYS.generateIdeas)).toBe(true);
    expect(jobs.has(JOB_KEYS.autopilotSweep)).toBe(true);
    await expect(plugin.definition.onHealth()).resolves.toEqual({
      status: "ok",
      message: "Product Autopilot plugin running",
    });
  }, 15000);
});
