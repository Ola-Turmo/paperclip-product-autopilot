import type { Checkpoint, DeliveryRun, KnowledgeEntry, LearnerSummary, ReleaseHealthCheck, RollbackAction } from "../types.js";
import { checkpointSummary, durationBetweenMs, formatDurationLabel } from "./lifecycle.js";

function describeRollbackType(rollbackType: RollbackAction["rollbackType"]): string {
  switch (rollbackType) {
    case "restore_checkpoint":
      return "restore checkpoint";
    case "revert_commit":
      return "revert commit";
    case "full_rollback":
      return "full rollback";
    default:
      return rollbackType;
  }
}

function buildKeyLearnings(input: {
  rollback: RollbackAction;
  relatedCheck?: ReleaseHealthCheck;
  checkpoint?: Checkpoint;
}): string[] {
  const learnings: string[] = [];
  if (input.relatedCheck) {
    learnings.push(`Failed check: ${input.relatedCheck.name}`);
  }
  if (input.rollback.status === "completed") {
    learnings.push(`Recovery path completed via ${describeRollbackType(input.rollback.rollbackType)}.`);
    if (input.checkpoint) {
      learnings.push(`Recovered from ${checkpointSummary(input.checkpoint)} before another rollout attempt.`);
    }
    learnings.push("Run stays paused until release-health checks are re-verified.");
    return learnings;
  }

  if (input.rollback.status === "failed") {
    learnings.push(`Rollback path ${describeRollbackType(input.rollback.rollbackType)} failed and needs operator review.`);
    if (input.checkpoint) {
      learnings.push(`Latest safe checkpoint remains ${checkpointSummary(input.checkpoint)}.`);
    }
    learnings.push("Escalate before attempting another delivery change.");
    return learnings;
  }

  learnings.push(`Rollback path ${describeRollbackType(input.rollback.rollbackType)} was skipped.`);
  learnings.push("Operator review is required before the run continues.");
  return learnings;
}

function buildSkillsReinjected(rollback: RollbackAction): string[] {
  const shared = ["release-health verification"];
  if (rollback.rollbackType === "restore_checkpoint") return [...shared, "checkpoint restore"];
  if (rollback.rollbackType === "revert_commit") return [...shared, "governed revert review"];
  return [...shared, "governed rollback review"];
}

export function buildRollbackClosureSummaryDraft(input: {
  companyId: string;
  projectId: string;
  run: DeliveryRun;
  rollback: RollbackAction;
  relatedCheck?: ReleaseHealthCheck;
  checkpoint?: Checkpoint;
  relatedDigestId?: string;
  createdAt: string;
}): Omit<LearnerSummary, "summaryId"> {
  const rollbackDurationMs = durationBetweenMs(input.rollback.createdAt, input.rollback.completedAt ?? input.createdAt);
  const recoveryTimeMs = durationBetweenMs(
    input.relatedCheck?.failedAt ?? input.relatedCheck?.createdAt,
    input.rollback.completedAt ?? input.createdAt,
  );
  const checkpointLabel = input.checkpoint ? checkpointSummary(input.checkpoint) : undefined;
  const rollbackDurationLabel = formatDurationLabel(rollbackDurationMs);
  const recoveryTimeLabel = formatDurationLabel(recoveryTimeMs);

  const title =
    input.rollback.status === "completed"
      ? `Rollback recovery for ${input.run.title}`
      : input.rollback.status === "failed"
        ? `Rollback incident for ${input.run.title}`
        : `Rollback review for ${input.run.title}`;

  const summaryParts = [
    input.relatedCheck
      ? `${input.relatedCheck.name} failed`
      : "Release health blocked the run",
    `${describeRollbackType(input.rollback.rollbackType)} ${input.rollback.status.replace(/_/g, " ")}`,
    checkpointLabel ? `checkpoint ${checkpointLabel}` : undefined,
    recoveryTimeLabel ? `recovery time ${recoveryTimeLabel}` : undefined,
  ].filter(Boolean);

  return {
    companyId: input.companyId,
    projectId: input.projectId,
    runId: input.run.runId,
    ideaId: input.run.ideaId,
    sourceRollbackId: input.rollback.rollbackId,
    sourceCheckId: input.relatedCheck?.checkId,
    sourceCheckpointId: input.checkpoint?.checkpointId,
    sourceDigestId: input.relatedDigestId,
    title,
    summaryText: summaryParts.join(" | "),
    keyLearnings: buildKeyLearnings(input),
    skillsReinjected: buildSkillsReinjected(input.rollback),
    metrics: {
      duration: recoveryTimeMs ?? rollbackDurationMs,
    },
    createdAt: input.createdAt,
  };
}

export function buildRollbackKnowledgeEntryDraft(input: {
  companyId: string;
  projectId: string;
  run: DeliveryRun;
  rollback: RollbackAction;
  relatedCheck?: ReleaseHealthCheck;
  checkpoint?: Checkpoint;
  relatedDigestId?: string;
  createdAt: string;
  sourceSummaryId: string;
}): Omit<KnowledgeEntry, "entryId" | "updatedAt"> {
  const rollbackDurationLabel = formatDurationLabel(
    durationBetweenMs(input.rollback.createdAt, input.rollback.completedAt ?? input.createdAt),
  );
  const checkpointLabel = input.checkpoint ? checkpointSummary(input.checkpoint) : "No checkpoint available";
  const content = [
    `Run: ${input.run.title}`,
    `Rollback path: ${describeRollbackType(input.rollback.rollbackType)} (${input.rollback.status})`,
    input.relatedCheck ? `Failed check: ${input.relatedCheck.name}` : "Failed check: unknown",
    `Checkpoint: ${checkpointLabel}`,
    rollbackDurationLabel ? `Rollback duration: ${rollbackDurationLabel}` : undefined,
    input.rollback.errorMessage ? `Error: ${input.rollback.errorMessage}` : undefined,
    input.rollback.status === "completed"
      ? "Next action: rerun release-health checks before resuming delivery."
      : "Next action: operator review required before another remediation attempt.",
  ].filter(Boolean).join("\n");

  return {
    companyId: input.companyId,
    projectId: input.projectId,
    knowledgeType: input.rollback.status === "completed" ? "procedure" : "lesson",
    title:
      input.rollback.status === "completed"
        ? `Recovery procedure: ${describeRollbackType(input.rollback.rollbackType)}`
        : `Recovery lesson: ${describeRollbackType(input.rollback.rollbackType)}`,
    content,
    sourceRunId: input.run.runId,
    sourceSummaryId: input.sourceSummaryId,
    sourceRollbackId: input.rollback.rollbackId,
    sourceCheckId: input.relatedCheck?.checkId,
    sourceCheckpointId: input.checkpoint?.checkpointId,
    sourceDigestId: input.relatedDigestId,
    usageCount: 0,
    tags: [
      "rollback",
      input.rollback.rollbackType,
      input.rollback.status,
      input.relatedCheck?.checkType ?? "unknown_check",
    ],
    createdAt: input.createdAt,
  };
}
