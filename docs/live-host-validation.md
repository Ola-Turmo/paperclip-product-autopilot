# Live Host Validation

## Purpose

This document captures how Product Autopilot should be validated against a real Paperclip installation, not only local SDK harnesses and package smoke tests.

## What is already strong

The repo already has:

- package smoke validation
- UI serving smoke validation
- registration smoke validation
- worker entrypoint smoke validation
- SDK host harness validation
- integration tests for the main domain flows

That is strong local evidence.

## What still matters

A real Paperclip host can still fail in ways local tests do not catch:

- worker identity mismatch
- route wiring bugs
- plugin registration drift
- host-side tool dispatch bugs
- filesystem path resolution issues
- host-specific plugin lifecycle bugs

## Validation checklist

A real live-host pass should verify:

1. plugin install through the live API
2. plugin status transitions to `ready`
3. worker health endpoint reports healthy
4. UI contribution route exposes the plugin UI
5. plugin bundle is actually served
6. tool list route exposes the expected tool names
7. tool execution succeeds end to end
8. scheduled jobs can execute on the live host

## Current reality

The repo now has strong local proof.

The remaining gap is repeatable live-host proof with actual tool execution against a running Paperclip host.

That should be treated as a first-class validation step, not an optional extra.
