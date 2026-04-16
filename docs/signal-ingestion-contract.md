# Signal Ingestion Contract

## Purpose

This document defines the production-facing contract for pulling live product signals into Product Autopilot.

The current domain model for research findings is already strong:

- normalized provenance
- source quality scoring
- freshness scoring
- signal-family grouping
- topic inference
- dedupe support
- reproducible research-cycle snapshots

What has been missing is an explicit adapter boundary for where those signals come from.

This document closes that gap.

## Source classes

Supported source classes are now modeled as:

- `paperclip_data`
- `paperclip_plugin`
- `paperclip_tool`
- `external_api`
- `webhook`
- `manual_import`

These are intentionally broad enough to cover:

- Paperclip entities and data views
- other Paperclip plugins
- tool-exposed plugin interfaces
- third-party SaaS APIs
- event-driven webhook feeds
- manual or batch backfills

## Record contract

Each upstream signal should be normalized into a `SignalSourceRecord` before it becomes a `ResearchFinding`.

Required fields:

- `sourceKey`
- `sourceKind`
- `externalId`
- `title`
- `description`
- `observedAt`

Optional but strongly recommended:

- `sourceUrl`
- `sourceLabel`
- `sourceType`
- `evidenceText`
- `category`
- `metadata`

This lets Product Autopilot preserve enough traceability to:

- explain why a signal exists
- deduplicate against earlier findings
- rehydrate or replay ingestion later

## Adapter boundary

Each live source should implement `SignalSourceAdapter`:

- `sourceKey`
- `sourceKind`
- `displayName`
- `description`
- `fetchSince(cursor?)`

The `fetchSince(...)` contract is important because it gives the app a clean way to support:

- incremental sync
- backfill
- replay
- source-specific pagination

without baking source-specific logic into ideation or research scoring.

## Current path in code

Production-facing types and helpers now live in:

- `src/services/signal-ingestion.ts`
- `src/services/research.ts`

Recommended flow:

1. source adapter fetches upstream records
2. records are summarized and grouped
3. records are converted with `toResearchSignalInput(...)`
4. `createResearchFindingRecord(...)` turns them into normalized findings
5. findings are deduplicated and attached to a `ResearchCycle`

## Recommended next implementations

Highest-value live adapters to build next:

1. Paperclip data adapter for support-like project data
2. Paperclip plugin adapter for analytics-style plugin outputs
3. External API adapter for product analytics or incidents
4. Webhook adapter for event-driven feeds

## Acceptance standard

Signal ingestion is production-ready when:

- new sources can be added without changing ideation logic
- cursor-based incremental sync works
- provenance remains inspectable in the UI
- replay fixtures can compare different source mixes
- source failures are visible without corrupting downstream findings
