import { describe, expect, it } from "vitest";
import { isExecutionBackendReady } from "../src/services/execution-backend.js";

const baseBackend = {
  backendKey: "night-watch",
  kind: "night_watch" as const,
  displayName: "Night Watch",
  description: "Queue-backed coding executor",
  capabilities: {
    codeExecution: true,
    branchManagement: true,
    prCreation: true,
    checkpointing: true,
    rollbackAssist: true,
    liveLogs: true,
  },
};

describe("execution backend readiness", () => {
  it("rejects missing backends", () => {
    expect(isExecutionBackendReady({ automationTier: "supervised", backend: null })).toEqual({
      ready: false,
      reason: "No execution backend is configured.",
    });
  });

  it("rejects non-code backends", () => {
    const result = isExecutionBackendReady({
      automationTier: "supervised",
      backend: {
        ...baseBackend,
        capabilities: { ...baseBackend.capabilities, codeExecution: false },
      },
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toContain("cannot run code");
  });

  it("requires live logs for autonomous tiers", () => {
    const result = isExecutionBackendReady({
      automationTier: "semiauto",
      backend: {
        ...baseBackend,
        capabilities: { ...baseBackend.capabilities, liveLogs: false },
      },
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toContain("live log support");
  });

  it("requires checkpointing for fullauto execution", () => {
    const result = isExecutionBackendReady({
      automationTier: "fullauto",
      backend: {
        ...baseBackend,
        capabilities: { ...baseBackend.capabilities, checkpointing: false },
      },
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toContain("checkpointing");
  });

  it("accepts a backend that satisfies the operational contract", () => {
    expect(isExecutionBackendReady({
      automationTier: "fullauto",
      backend: baseBackend,
    })).toEqual({ ready: true });
  });
});
