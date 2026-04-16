import { describe, expect, it } from "vitest";
import {
  groupSignalsBySource,
  summarizeSignalIngestion,
  toResearchSignalInput,
  type SignalSourceRecord,
} from "../src/services/signal-ingestion.js";

function createRecord(overrides: Partial<SignalSourceRecord> = {}): SignalSourceRecord {
  return {
    sourceKey: "paperclip.analytics",
    sourceKind: "paperclip_plugin",
    externalId: "event-1",
    title: "Activation drop",
    description: "Completion drops on step two",
    observedAt: "2026-04-16T10:00:00.000Z",
    sourceUrl: "https://example.com/analytics/activation",
    sourceLabel: "analytics",
    sourceType: "analytics_report",
    category: "user_feedback",
    ...overrides,
  };
}

describe("signal ingestion contracts", () => {
  it("maps a source record into research signal input", () => {
    const input = toResearchSignalInput(createRecord());
    expect(input.sourceId).toBe("event-1");
    expect(input.sourceType).toBe("analytics_report");
    expect(input.sourceTimestamp).toBe("2026-04-16T10:00:00.000Z");
  });

  it("summarizes source and source-kind distribution", () => {
    const summary = summarizeSignalIngestion([
      createRecord(),
      createRecord({ externalId: "event-2", sourceKey: "paperclip.support", sourceKind: "paperclip_data", sourceType: "support_ticket" }),
    ]);

    expect(summary.totalRecords).toBe(2);
    expect(summary.sourceCounts["paperclip.analytics"]).toBe(1);
    expect(summary.sourceCounts["paperclip.support"]).toBe(1);
    expect(summary.sourceKindCounts.paperclip_plugin).toBe(1);
    expect(summary.sourceKindCounts.paperclip_data).toBe(1);
  });

  it("groups source records by source key", () => {
    const grouped = groupSignalsBySource([
      createRecord(),
      createRecord({ externalId: "event-2" }),
      createRecord({ externalId: "event-3", sourceKey: "external.stripe", sourceKind: "external_api" }),
    ]);

    expect(grouped["paperclip.analytics"]).toHaveLength(2);
    expect(grouped["external.stripe"]).toHaveLength(1);
  });
});
