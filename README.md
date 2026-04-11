# Paperclip Product Autopilot

Autonomous product-improvement plugin for [Paperclip](https://paperclip.ai) — runs continuous Darwin-Derby style evolution loops against your workspace.

## What It Does

The Product Autopilot runs scheduled loops across four phases:

1. **Research** — scans your industry, competitors, and user signals for improvement opportunities
2. **Ideation** — generates product ideas based on research findings and scoring models
3. **Swipe Review** — surfaces ideas for human review (pass / maybe / yes / now)
4. **Delivery** — executes approved ideas as scoped improvement jobs

Ideas that get "maybe" land in a resurface pool and come back after a configurable delay.

## Installation

Install as a Paperclip plugin from your Paperclip workspace:

```
/plugin install ola-turmo.paperclip-product-autopilot
```

Or from npm:

```bash
npm install @ola-turmo/paperclip-product-autopilot
```

## Configuration

After installing, configure via **Settings → Plugins → Product Autopilot**:

| Setting | Default | Description |
|---------|---------|-------------|
| `researchScheduleCron` | `0 9 * * 1` | Cron for research cycles (Mon 9am) |
| `ideationScheduleCron` | `0 10 * * 1` | Cron for ideation (Mon 10am) |
| `maybePoolResurfaceDays` | `14` | Days before Maybe-pool ideas resurface |
| `maxIdeasPerCycle` | `10` | Max ideas generated per cycle |
| `defaultAutomationTier` | `supervised` | `supervised`, `semiauto`, or `fullauto` |
| `defaultBudgetMinutes` | `120` | Budget minutes per project per week |
| `autoCreateIssues` | `true` | Auto-create Paperclip issues for approved ideas |
| `autoCreatePrs` | `false` | Auto-create GitHub PRs for supervised-approved runs |

## Tools

The plugin registers these agent tools:

```
list-autopilot-projects   List all projects with Autopilot enabled
create-idea              Add a new idea to the pool
get-swipe-queue          Get ideas pending swipe review
record-swipe-decision    Record pass/maybe/yes/now for an idea
start-research-cycle     Trigger a research cycle
generate-ideas            Generate ideas from the Product Program
```

## Architecture

```
src/
  manifest.ts        Plugin manifest + JSON Schema for instance config
  worker.ts          Job scheduler + tool handlers
  ui/
    index.tsx       Plugin UI components (detailTab, sidebar, page, widget)

paperclipPlugin:
  manifest:  ./dist/manifest.js   Plugin metadata
  worker:    ./dist/worker.js    Background job runner
  ui:        ./dist/ui/          React components
```

## Development

```bash
# Install deps (requires Paperclip SDK — see below)
npm install

# Build
npm run build

# Type check
npm run typecheck

# Tests
npm test

# Watch mode (worker)
npm run dev

# Watch mode (UI)
npm run dev:ui
```

### SDK Setup

This plugin requires the Paperclip plugin SDK. If `npm install` fails with resolution errors, install the SDK manually:

```bash
git clone https://github.com/paperclip/paperclip /tmp/paperclip
cd /tmp/paperclip/packages/plugins/sdk
npm install && npm run build
```

Then re-run `npm install` in this directory.

## License

MIT
