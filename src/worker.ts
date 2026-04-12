import { definePlugin, runWorker, type PluginContext } from "@paperclipai/plugin-sdk";
import { PLUGIN_ID } from "./constants.js";
import { registerActionHandlers as registerActionHandlersModule } from "./worker/actions.js";
import { registerDataHandlers as registerDataHandlersModule } from "./worker/data.js";
import { registerJobHandlers as registerJobHandlersModule } from "./worker/jobs.js";
import { registerToolHandlers as registerToolHandlersModule } from "./worker/tools.js";

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info(`${PLUGIN_ID} worker starting`);
    registerDataHandlersModule(ctx);
    registerActionHandlersModule(ctx);
    registerToolHandlersModule(ctx);
    registerJobHandlersModule(ctx);
    ctx.logger.info(`${PLUGIN_ID} handlers registered`);
  },

  async onHealth() {
    return { status: "ok", message: "Product Autopilot plugin running" };
  },

  async onShutdown() {
    // no-op cleanup
  },
});

export { registerActionHandlers } from "./worker/actions.js";
export { registerDataHandlers } from "./worker/data.js";
export { registerJobHandlers } from "./worker/jobs.js";
export { registerToolHandlers } from "./worker/tools.js";

export default plugin;
runWorker(plugin, import.meta.url);
