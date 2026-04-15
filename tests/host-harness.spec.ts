import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, DATA_KEYS, JOB_KEYS, TOOL_KEYS } from "../src/constants.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

describe("paperclip host harness", () => {
  it("boots through the SDK harness and serves core plugin flows", async () => {
    const harness = createTestHarness({ manifest });

    await plugin.definition.setup(harness.ctx);

    expect(harness.logs.some((entry) => entry.message.includes("worker starting"))).toBe(true);
    expect(harness.logs.some((entry) => entry.message.includes("handlers registered"))).toBe(true);

    const health = await plugin.definition.onHealth?.();
    expect(health).toEqual({
      status: "ok",
      message: "Product Autopilot plugin running",
    });

    await harness.performAction(ACTION_KEYS.saveAutopilotProject, {
      companyId: "company-1",
      projectId: "project-1",
      enabled: true,
      paused: false,
      defaultAutomationTier: "supervised",
      maybePoolResurfaceDays: 14,
      maxIdeasPerCycle: 5,
    });

    await harness.performAction(ACTION_KEYS.startResearchCycle, {
      companyId: "company-1",
      projectId: "project-1",
      query: "find onboarding friction",
    });

    const cycleList = await harness.getData<any[]>(DATA_KEYS.researchCycles, {
      companyId: "company-1",
      projectId: "project-1",
    });
    expect(cycleList).toHaveLength(1);

    const generatedToolResult = await harness.executeTool(TOOL_KEYS.generateIdeas, {
      companyId: "company-1",
      projectId: "project-1",
      count: 1,
    });
    expect(generatedToolResult.content).toContain("Generated");

    const ideas = await harness.getData<any[]>(DATA_KEYS.ideas, {
      companyId: "company-1",
      projectId: "project-1",
    });
    expect(ideas.length).toBeGreaterThan(0);

    await harness.runJob(JOB_KEYS.autopilotSweep);

    const overview = await harness.getData<Record<string, unknown>>("autopilot-overview", {
      companyId: "company-1",
      projectId: "project-1",
    });
    expect(overview).toBeTruthy();
  });
});
