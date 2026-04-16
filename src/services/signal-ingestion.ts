import type { ResearchFinding } from "../types.js";
import type { ResearchSignalInput } from "./research.js";

export type SignalSourceKind =
  | "paperclip_data"
  | "paperclip_plugin"
  | "paperclip_tool"
  | "external_api"
  | "webhook"
  | "manual_import";

export interface SignalSourceCursor {
  value: string;
  observedAt: string;
}

export interface SignalSourceRecord {
  sourceKey: string;
  sourceKind: SignalSourceKind;
  externalId: string;
  title: string;
  description: string;
  observedAt: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: ResearchFinding["sourceType"];
  evidenceText?: string;
  category?: ResearchFinding["category"];
  metadata?: Record<string, unknown>;
}

export interface SignalIngestionBatch {
  sourceKey: string;
  sourceKind: SignalSourceKind;
  fetchedAt: string;
  cursor?: SignalSourceCursor;
  records: SignalSourceRecord[];
}

export interface SignalSourceAdapter {
  sourceKey: string;
  sourceKind: SignalSourceKind;
  displayName: string;
  description: string;
  fetchSince(cursor?: SignalSourceCursor): Promise<SignalIngestionBatch>;
}

export interface SignalIngestionSummary {
  totalRecords: number;
  sourceCounts: Record<string, number>;
  sourceKindCounts: Record<SignalSourceKind, number>;
  newestObservedAt?: string;
}

export function toResearchSignalInput(record: SignalSourceRecord): ResearchSignalInput {
  return {
    title: record.title,
    description: record.description,
    sourceUrl: record.sourceUrl,
    sourceLabel: record.sourceLabel ?? record.sourceKey,
    sourceType: record.sourceType,
    sourceId: record.externalId,
    sourceTimestamp: record.observedAt,
    evidenceText: record.evidenceText,
    category: record.category,
  };
}

export function summarizeSignalIngestion(records: SignalSourceRecord[]): SignalIngestionSummary {
  const sourceCounts: Record<string, number> = {};
  const sourceKindCounts: Record<SignalSourceKind, number> = {
    paperclip_data: 0,
    paperclip_plugin: 0,
    paperclip_tool: 0,
    external_api: 0,
    webhook: 0,
    manual_import: 0,
  };

  let newestObservedAt: string | undefined;

  for (const record of records) {
    sourceCounts[record.sourceKey] = (sourceCounts[record.sourceKey] ?? 0) + 1;
    sourceKindCounts[record.sourceKind] += 1;
    if (!newestObservedAt || new Date(record.observedAt).getTime() > new Date(newestObservedAt).getTime()) {
      newestObservedAt = record.observedAt;
    }
  }

  return {
    totalRecords: records.length,
    sourceCounts,
    sourceKindCounts,
    newestObservedAt,
  };
}

export function groupSignalsBySource(records: SignalSourceRecord[]): Record<string, SignalSourceRecord[]> {
  const grouped: Record<string, SignalSourceRecord[]> = {};
  for (const record of records) {
    grouped[record.sourceKey] ??= [];
    grouped[record.sourceKey].push(record);
  }
  return grouped;
}
