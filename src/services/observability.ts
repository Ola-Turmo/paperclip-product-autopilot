import type { PluginContext } from "@paperclipai/plugin-sdk";

export async function recordLifecycleSignals(
  ctx: PluginContext,
  eventName: string,
  companyId: string,
  metricName?: string,
  metricValue = 1,
  tags?: Record<string, string>,
) {
  if (metricName) {
    await ctx.metrics.write(metricName, metricValue, tags);
  }
  await ctx.telemetry.track(eventName, {
    companyId,
    ...(tags ?? {}),
  });
}
