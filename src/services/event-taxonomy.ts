export const AUTOPILOT_EVENTS = {
  researchCycleStarted: "research_cycle_started",
  researchCycleCompleted: "research_cycle_completed",
  researchFindingAdded: "research_finding_added",
  ideaCreated: "idea_created",
  deliveryRunCreated: "delivery_run_created",
  deliveryRunCompleted: "delivery_run_completed",
  operatorInterventionCreated: "operator_intervention_created",
  digestDismissed: "digest_dismissed",
  checkpointCreated: "checkpoint_created",
  checkpointRestored: "checkpoint_restored",
  releaseHealthCreated: "release_health_created",
  releaseHealthUpdated: "release_health_updated",
  rollbackTriggered: "rollback_triggered",
} as const;

export const AUTOPILOT_METRICS = {
  researchCycleStarted: "research_cycle.started",
  researchCycleCompleted: "research_cycle.completed",
  researchFindingAdded: "research_finding.added",
  ideaCreated: "idea.created",
  deliveryRunCreated: "delivery_run.created",
  deliveryRunCompleted: "delivery_run.completed",
  operatorInterventionCreated: "operator_intervention.created",
  digestDismissed: "digest.dismissed",
  checkpointCreated: "checkpoint.created",
  checkpointRestored: "checkpoint.restored",
  releaseHealthCreated: "release_health.created",
  releaseHealthUpdated: "release_health.updated",
  rollbackTriggered: "rollback.triggered",
} as const;

export type AutopilotEventKey = keyof typeof AUTOPILOT_EVENTS;
