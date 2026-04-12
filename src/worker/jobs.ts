import type { PluginContext } from "@paperclipai/plugin-sdk";
import { registerMonitorJobHandlers } from "./jobs-monitor.js";
import { registerResurfaceJobHandlers } from "./jobs-resurface.js";
import { registerSweepJobHandlers } from "./jobs-sweep.js";

export function registerJobHandlers(ctx: PluginContext) {
  registerSweepJobHandlers(ctx);
  registerResurfaceJobHandlers(ctx);
  registerMonitorJobHandlers(ctx);
}
