import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { PLUGIN_ID, PLUGIN_VERSION } from "../constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Product Autopilot",
  description:
    "Autonomous product-improvement loop: research, ideation, swipe review, preference learning, planning, and delivery pipeline with convoys, checkpoints, and product locks.",
  author: "Ola-Turmo",
  categories: ["automation", "product", "research", "delivery"],
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
    "ui.widget.register",
    "ui.dashboard.register",
    "ui.settings.register",
    "ui.runDetailTab.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
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
        type: "projectWidget",
        id: "project-detail-autopilot-widget",
        displayName: "Autopilot Overview",
        exportName: "AutopilotProjectWidget",
        entityTypes: ["project"],
      },
      {
        type: "dashboard",
        id: "autopilot-dashboard-widget",
        displayName: "Autopilot",
        exportName: "AutopilotDashboardWidget",
        entityTypes: ["company"],
      },
      {
        type: "settings",
        id: "company-autopilot-settings",
        displayName: "Autopilot",
        exportName: "AutopilotSettings",
        entityTypes: ["company"],
      },
      {
        type: "runDetailTab",
        id: "autopilot-run-detail-tab",
        displayName: "Autopilot",
        exportName: "AutopilotRunDetailTab",
        entityTypes: ["delivery-run"],
      },
    ],
  },
};

export default manifest;
