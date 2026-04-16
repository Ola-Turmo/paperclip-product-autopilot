import type { AutomationTier } from "../constants.js";

export type ExecutionBackendKind =
  | "paperclip_agent"
  | "paperclip_plugin_tool"
  | "night_watch"
  | "codex_local"
  | "custom";

export interface ExecutionBackendCapabilities {
  codeExecution: boolean;
  branchManagement: boolean;
  prCreation: boolean;
  checkpointing: boolean;
  rollbackAssist: boolean;
  liveLogs: boolean;
}

export interface ExecutionBackendDescriptor {
  backendKey: string;
  kind: ExecutionBackendKind;
  displayName: string;
  description: string;
  capabilities: ExecutionBackendCapabilities;
}

export interface ExecutionRunRequest {
  companyId: string;
  projectId: string;
  runId: string;
  branchName: string;
  workspacePath: string;
  automationTier: AutomationTier;
  implementationSpec: string;
  testPlan: string;
  rolloutPlan: string;
}

export interface ExecutionRunReceipt {
  backendKey: string;
  backendRunId: string;
  acceptedAt: string;
  status: "accepted" | "running" | "completed" | "failed";
  liveUrl?: string;
  logUrl?: string;
}

export interface ExecutionBackend {
  descriptor: ExecutionBackendDescriptor;
  run(input: ExecutionRunRequest): Promise<ExecutionRunReceipt>;
}

export interface ExecutionBackendSelectionInput {
  automationTier: AutomationTier;
  backend?: ExecutionBackendDescriptor | null;
}

export function isExecutionBackendReady(input: ExecutionBackendSelectionInput): {
  ready: boolean;
  reason?: string;
} {
  if (!input.backend) {
    return { ready: false, reason: "No execution backend is configured." };
  }

  if (!input.backend.capabilities.codeExecution) {
    return {
      ready: false,
      reason: `Execution backend "${input.backend.displayName}" cannot run code.`,
    };
  }

  if (input.automationTier !== "supervised" && !input.backend.capabilities.liveLogs) {
    return {
      ready: false,
      reason: `Execution backend "${input.backend.displayName}" is missing live log support for autonomous tiers.`,
    };
  }

  if (input.automationTier === "fullauto" && !input.backend.capabilities.checkpointing) {
    return {
      ready: false,
      reason: `Execution backend "${input.backend.displayName}" must support checkpointing for fullauto execution.`,
    };
  }

  return { ready: true };
}
