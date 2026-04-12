// Autopilot worker — re-exports handler registrations from parent worker
// This matches the plugin-autoresearch-improver pattern of a nested worker module.
import { runWorker, type PaperclipPlugin } from "@paperclipai/plugin-sdk";
import { PLUGIN_ID } from "./constants.js";
import { definePlugin } from "@paperclipai/plugin-sdk";

// Re-export all handlers from the parent worker module
// This ensures the nested worker is a complete plugin that can be loaded standalone.
export async function registerDataHandlers(ctx: Parameters<typeof import("../worker.js").registerDataHandlers>[0]) {
  const { registerDataHandlers: fn } = await import("../worker.js");
  fn(ctx);
}
export async function registerActionHandlers(ctx: Parameters<typeof import("../worker.js").registerActionHandlers>[0]) {
  const { registerActionHandlers: fn } = await import("../worker.js");
  fn(ctx);
}
export async function registerToolHandlers(ctx: Parameters<typeof import("../worker.js").registerToolHandlers>[0]) {
  const { registerToolHandlers: fn } = await import("../worker.js");
  fn(ctx);
}
export async function registerJobHandlers(ctx: Parameters<typeof import("../worker.js").registerJobHandlers>[0]) {
  const { registerJobHandlers: fn } = await import("../worker.js");
  fn(ctx);
}

// Root worker re-exports so the nested manifest can point to this file
export { PLUGIN_ID };

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    await registerDataHandlers(ctx);
    await registerActionHandlers(ctx);
    await registerToolHandlers(ctx);
    await registerJobHandlers(ctx);
    ctx.logger.info(`${PLUGIN_ID} autopilot worker ready`);
  },
  async onHealth() {
    return { status: "ok", message: "Autopilot worker ready" };
  },
  async onShutdown() {},
});

export default plugin;
runWorker(plugin, import.meta.url);
