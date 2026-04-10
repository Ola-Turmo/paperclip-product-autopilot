import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "ola-turmo.paperclip-product-autopilot";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Product Autopilot",
  description:
    "Autonomous product-improvement loop for Paperclip: research, ideation, swipe-based review, and delivery pipeline.",
  author: "Ola-Turmo",
  categories: ["automation", "workspace", "ui"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.workspaces.read",
    "issues.create",
    "issues.read",
    "activity.log.write",
    "plugin.state.read",
    "plugin.state.write",
    "metrics.write",
    "jobs.schedule",
    "agent.tools.register",
    "ui.page.register",
    "ui.dashboardWidget.register",
    "ui.detailTab.register",
    "ui.sidebar.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      researchScheduleCron: {
        type: "string",
        default: "0 9 * * 1",
        description: "Cron expression for scheduled research cycles (default: Monday 9am)",
      },
      ideationScheduleCron: {
        type: "string",
        default: "0 10 * * 1",
        description: "Cron expression for scheduled ideation (default: Monday 10am)",
      },
      maybePoolResurfaceDays: {
        type: "number",
        minimum: 1,
        maximum: 90,
        default: 14,
        description: "Days before a Maybe-pool idea surfaces again",
      },
      maxIdeasPerCycle: {
        type: "number",
        minimum: 1,
        maximum: 50,
        default: 10,
        description: "Maximum ideas to generate per ideation cycle",
      },
      defaultAutomationTier: {
        type: "string",
        enum: ["supervised", "semiauto", "fullauto"],
        default: "supervised",
        description: "Default automation tier for new projects",
      },
      defaultBudgetMinutes: {
        type: "number",
        minimum: 1,
        maximum: 10000,
        default: 120,
        description: "Default budget minutes per week per project",
      },
      autoCreateIssues: {
        type: "boolean",
        default: true,
        description: "Automatically create Paperclip issues when ideas are approved",
      },
      autoCreatePrs: {
        type: "boolean",
        default: false,
        description: "Automatically create GitHub PRs for supervised-approved runs",
      },
    },
  },
  jobs: [
    {
      jobKey: "autopilot-sweep",
      displayName: "Autopilot Sweep",
      description: "Runs scheduled research, ideation, maybe-pool resurfacing, and health checks.",
      schedule: "0 * * * *",
    },
    {
      jobKey: "maybe-pool-resurface",
      displayName: "Maybe Pool Resurface",
      description: "Moves Maybe-pool ideas back to active queue after configured delay.",
      schedule: "0 8 * * *",
    },
    {
      jobKey: "delivery-run-monitor",
      displayName: "Delivery Run Monitor",
      description: "Checks for stuck runs and generates alerts.",
      schedule: "*/15 * * * *",
    },
  ],
  tools: [
    {
      name: "list-autopilot-projects",
      displayName: "List autopilot projects",
      description: "List all projects with Product Autopilot enabled.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
        required: ["companyId"],
      },
    },
    {
      name: "create-idea",
      displayName: "Create product idea",
      description: "Create a new product idea in the Autopilot idea pool.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          title: { type: "string", description: "Brief idea title" },
          description: { type: "string", description: "Detailed description" },
          rationale: { type: "string", description: "Why this idea matters" },
          sourceReferences: {
            type: "array",
            items: { type: "string" },
            description: "URLs or evidence links backing this idea",
          },
          score: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Impact/feasibility score 0-100",
          },
        },
        required: ["companyId", "projectId", "title"],
      },
    },
    {
      name: "get-swipe-queue",
      displayName: "Get swipe review queue",
      description: "Get the current queue of ideas pending swipe review.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
        },
        required: ["companyId", "projectId"],
      },
    },
    {
      name: "record-swipe-decision",
      displayName: "Record swipe decision",
      description: "Record a swipe decision (pass/maybe/yes/now) for an idea.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          ideaId: { type: "string" },
          decision: {
            type: "string",
            enum: ["pass", "maybe", "yes", "now"],
            description: "Swipe decision",
          },
        },
        required: ["companyId", "projectId", "ideaId", "decision"],
      },
    },
    {
      name: "start-research-cycle",
      displayName: "Start research cycle",
      description: "Trigger a new research cycle for a project.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          query: { type: "string", description: "Research query or focus area" },
        },
        required: ["companyId", "projectId"],
      },
    },
    {
      name: "generate-ideas",
      displayName: "Generate product ideas",
      description: "Generate new product ideas using the Product Program and latest research.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          projectId: { type: "string" },
          count: {
            type: "number",
            minimum: 1,
            maximum: 20,
            default: 5,
            description: "Number of ideas to generate",
          },
        },
        required: ["companyId", "projectId"],
      },
    },
  ],
  ui: {
    slots: [
      {
        type: "detailTab",
        id: "autopilot-project-tab",
        displayName: "Autopilot",
        exportName: "AutopilotProjectTab",
        entityTypes: ["project"],
      },
      {
        type: "projectSidebarItem",
        id: "autopilot-project-link",
        displayName: "Autopilot",
        exportName: "AutopilotProjectSidebarLink",
        entityTypes: ["project"],
      },
      {
        type: "page",
        id: "autopilot-overview-page",
        displayName: "Autopilot Overview",
        exportName: "AutopilotOverviewPage",
      },
      {
        type: "dashboardWidget",
        id: "autopilot-overview-widget",
        displayName: "Autopilot Overview",
        exportName: "AutopilotDashboardWidget",
      },
    ],
  },
};

export default manifest;
