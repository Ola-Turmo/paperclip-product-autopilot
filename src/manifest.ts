import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  PLUGIN_ID,
  PLUGIN_VERSION,
  JOB_KEYS,
  TOOL_KEYS,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Product Autopilot",
  description:
    "Autonomous product-improvement loop: research, ideation, swipe review, preference learning, planning, and delivery pipeline with convoys, checkpoints, and product locks.",
  author: "Ola-Turmo",
  categories: ["automation"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.workspaces.read",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "ui.page.register",
    "ui.detailTab.register",
    "ui.sidebar.register",
  ],
  entrypoints: {
    worker: "./dist/autopilot/worker.js",
    ui: "./dist/autopilot/ui",
  },
  jobs: [
    {
      jobKey: JOB_KEYS.autopilotSweep,
      displayName: "Autopilot Sweep",
      description: "Checks budget, pauses if exhausted, generates stuck-run and budget-alert digests for all enabled projects.",
      schedule: "0 * * * *",
    },
    {
      jobKey: JOB_KEYS.maybePoolResurface,
      displayName: "Maybe Pool Resurface",
      description: "Moves ideas older than maybePoolResurfaceDays back to active for re-review.",
      schedule: "0 8 * * *",
    },
    {
      jobKey: JOB_KEYS.deliveryRunMonitor,
      displayName: "Delivery Run Monitor",
      description: "Detects stuck delivery runs and logs alerts.",
      schedule: "*/15 * * * *",
    },
  ],
  tools: [
    {
      name: TOOL_KEYS.listAutopilotProjects,
      displayName: "List Autopilot Projects",
      description: "List all projects with Product Autopilot enabled.",
      parametersSchema: {
        type: "object",
        properties: { companyId: { type: "string" } },
        required: ["companyId"],
      },
    },
    {
      name: TOOL_KEYS.createIdea,
      displayName: "Create Product Idea",
      description: "Create a new product idea in the Autopilot idea pool.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
          sourceReferences: { type: "array", items: { type: "string" } },
          impactScore: { type: "number" },
        },
        required: ["companyId", "projectId", "title"],
      },
    },
    {
      name: TOOL_KEYS.getSwipeQueue,
      displayName: "Get Swipe Queue",
      description: "Get the current queue of ideas pending swipe review.",
      parametersSchema: {
        type: "object",
        properties: { companyId: { type: "string" }, projectId: { type: "string" } },
        required: ["companyId", "projectId"],
      },
    },
    {
      name: TOOL_KEYS.recordSwipeDecision,
      displayName: "Record Swipe Decision",
      description: "Record a swipe decision (pass/maybe/yes/now) for an idea.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          ideaId: { type: "string" },
          decision: { type: "string", enum: ["pass", "maybe", "yes", "now"] },
          note: { type: "string" },
        },
        required: ["companyId", "projectId", "ideaId", "decision"],
      },
    },
    {
      name: TOOL_KEYS.startResearchCycle,
      displayName: "Start Research Cycle",
      description: "Trigger a new research cycle for a project.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          query: { type: "string" },
        },
        required: ["companyId", "projectId"],
      },
    },
    {
      name: TOOL_KEYS.generateIdeas,
      displayName: "Generate Ideas",
      description: "Generate new product ideas using the Product Program and latest research.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          count: { type: "number" },
        },
        required: ["companyId", "projectId"],
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "detailTab",
        id: "product-autopilot-tab",
        displayName: "Autopilot",
        exportName: "AutopilotProjectTab",
        entityTypes: ["project"],
      },
      {
        type: "projectSidebarItem",
        id: "project-detail-autopilot-sidebar",
        displayName: "Autopilot",
        exportName: "AutopilotSidebarLink",
        entityTypes: ["project"],
      },
      {
        type: "dashboardWidget",
        id: "autopilot-dashboard-widget",
        displayName: "Autopilot Overview",
        exportName: "AutopilotDashboardWidget",
      },
    ],
  },
};

export default manifest;
