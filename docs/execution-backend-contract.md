# Execution Backend Contract

## Purpose

This document defines the missing boundary between Product Autopilot's delivery model and the real system that executes code, tests, branches, and shipping work.

The delivery model is already strong internally:

- planning artifacts
- delivery runs
- workspace leases
- product locks
- checkpoints
- release-health checks
- rollback actions
- governance gates

What has been missing is an explicit contract for the real executor behind those runs.

## Core rule

Paperclip Product Autopilot should not assume that Paperclip itself is the coding engine.

Paperclip is the control plane.

The execution backend is a separate capability.

## Supported backend kinds

The current contract allows these kinds:

- `paperclip_agent`
- `paperclip_plugin_tool`
- `night_watch`
- `codex_local`
- `custom`

This keeps the app flexible enough to support:

- direct Paperclip agent execution
- execution through another Paperclip plugin
- Night Watch as a coding queue
- local Codex-backed execution
- later custom runtimes

## Backend requirements

Each backend is described by:

- `backendKey`
- `kind`
- `displayName`
- `description`
- `capabilities`

The key capabilities that matter operationally are:

- `codeExecution`
- `branchManagement`
- `prCreation`
- `checkpointing`
- `rollbackAssist`
- `liveLogs`

## Readiness policy

The new helper in `src/services/execution-backend.ts` makes the intended contract explicit:

- no backend means execution is not ready
- no code execution means the backend is not valid
- autonomous tiers require live logs
- `fullauto` requires checkpointing support

This is not the full execution implementation yet, but it moves the repo from vague aspiration to explicit contract.

## Recommended next implementations

Highest-value next backend integrations:

1. Night Watch backend
2. Paperclip agent backend
3. Paperclip plugin-tool backend for controlled execution delegation

Each implementation should return an `ExecutionRunReceipt` containing:

- backend key
- backend run id
- accepted timestamp
- execution status
- optional live URL
- optional log URL

## Acceptance standard

Execution backend integration is strong enough when:

- Product Autopilot can select a backend intentionally
- execution readiness is validated before autonomous runs start
- operators can see which backend owns a run
- live logs or equivalent run visibility exist for non-supervised tiers
- rollback and checkpoint semantics map cleanly onto backend reality
