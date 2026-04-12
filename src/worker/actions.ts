import type { PluginContext } from "@paperclipai/plugin-sdk";
import { registerDeliveryActionHandlers } from "./actions-delivery.js";
import { registerLifecycleActionHandlers } from "./actions-lifecycle.js";
import { registerOperationsActionHandlers } from "./actions-operations.js";
import { registerProjectResearchActionHandlers } from "./actions-project-research.js";

export function registerActionHandlers(ctx: PluginContext) {
  registerProjectResearchActionHandlers(ctx);
  registerDeliveryActionHandlers(ctx);
  registerLifecycleActionHandlers(ctx);
  registerOperationsActionHandlers(ctx);
}
