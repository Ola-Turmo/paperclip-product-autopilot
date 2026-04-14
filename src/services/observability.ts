import type { PluginContext } from "@paperclipai/plugin-sdk";
import { AUTOPILOT_EVENTS, AUTOPILOT_METRICS, type AutopilotEventKey } from "./event-taxonomy.js";

export async function recordAutopilotEvent(
  ctx: PluginContext,
  eventKey: AutopilotEventKey,
  companyId: string,
  tags?: Record<string, string>,
  metricValue = 1,
) {
  await ctx.metrics.write(AUTOPILOT_METRICS[eventKey], metricValue, tags);
  await ctx.telemetry.track(AUTOPILOT_EVENTS[eventKey], {
    companyId,
    ...(tags ?? {}),
  });
}

export async function recordAutopilotDurationMetric(
  ctx: PluginContext,
  metricName: string,
  companyId: string,
  durationMs: number,
  tags?: Record<string, string>,
) {
  await ctx.metrics.write(metricName, durationMs, tags);
  await ctx.telemetry.track(`${metricName}.recorded`, {
    companyId,
    durationMs,
    ...(tags ?? {}),
  });
}

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
