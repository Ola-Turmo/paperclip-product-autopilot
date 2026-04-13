import type {
  Checkpoint,
  DeliveryRun,
  Digest,
  OperatorIntervention,
  ReleaseHealthCheck,
  RollbackAction,
} from "../types.js";
import { classifyFailureMessage, formatFailureCategory } from "./failure-taxonomy.js";

export interface AuditTimelineEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  status: string;
}

export function buildRunAuditTimeline(input: {
  run: DeliveryRun;
  checks: ReleaseHealthCheck[];
  interventions: OperatorIntervention[];
  checkpoints: Checkpoint[];
  rollbacks: RollbackAction[];
  digests: Digest[];
}): AuditTimelineEvent[] {
  return [
    {
      id: `run-created-${input.run.runId}`,
      at: input.run.createdAt,
      title: "Run created",
      detail: input.run.title,
      status: input.run.status,
    },
    ...input.checkpoints.map((checkpoint) => ({
      id: checkpoint.checkpointId,
      at: checkpoint.createdAt,
      title: "Checkpoint created",
      detail: checkpoint.label ?? checkpoint.checkpointId,
      status: "paused",
    })),
    ...input.checks.map((check) => ({
      id: check.checkId,
      at: check.failedAt ?? check.passedAt ?? check.createdAt,
      title: `Health check: ${check.name}`,
      detail: [
        check.errorMessage ?? check.checkType,
        formatFailureCategory(classifyFailureMessage(check.errorMessage)),
      ].filter(Boolean).join(" | "),
      status: check.status,
    })),
    ...input.rollbacks.map((rollback) => ({
      id: rollback.rollbackId,
      at: rollback.completedAt ?? rollback.createdAt,
      title: `Rollback: ${rollback.rollbackType}`,
      detail: [
        rollback.errorMessage ?? rollback.status,
        formatFailureCategory(classifyFailureMessage(rollback.errorMessage)),
      ].filter(Boolean).join(" | "),
      status: rollback.status,
    })),
    ...input.interventions.map((intervention) => ({
      id: intervention.interventionId,
      at: intervention.createdAt,
      title: `Operator ${intervention.interventionType.replace(/_/g, " ")}`,
      detail: intervention.note ?? "No note",
      status: "active",
    })),
    ...input.digests.map((digest) => ({
      id: digest.digestId,
      at: digest.dismissedAt ?? digest.readAt ?? digest.deliveredAt ?? digest.createdAt,
      title: `Digest: ${digest.digestType}`,
      detail: digest.summary,
      status: digest.status,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
