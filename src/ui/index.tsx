import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginDetailTabProps,
  type PluginProjectSidebarItemProps,
  type PluginSettingsPageProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";
import { ACTION_KEYS, DATA_KEYS } from "../constants.js";
import type { AutomationTier } from "../constants.js";
import type {
  AutopilotOverview,
  AutopilotProject,
  Checkpoint,
  DeliveryRun,
  Digest,
  Idea,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
  ReleaseHealthCheck,
  RollbackAction,
  ResearchCycle,
} from "../types.js";
import { buildRunAuditTimeline } from "../services/audit.js";
import { getIdeationBenchmarkSummary } from "../services/evaluation-fixtures.js";
import { classifyFailureMessage, formatFailureCategory } from "../services/failure-taxonomy.js";

const PAGE: CSSProperties = { display: "grid", gap: 16, padding: 20 };
const CARD: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.3)",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};
const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};
const LABEL: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" };
const INPUT: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};
const BUTTON: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
const BUTTON_SECONDARY: CSSProperties = {
  ...BUTTON,
  background: "#fff",
  color: "#0f172a",
};
const MUTED: CSSProperties = { fontSize: 13, color: "#64748b" };
const STATUS: Record<string, string> = {
  active: "#16a34a",
  approved: "#2563eb",
  maybe: "#d97706",
  rejected: "#dc2626",
  running: "#2563eb",
  completed: "#16a34a",
  failed: "#dc2626",
  paused: "#d97706",
};

function toastError(toast: ReturnType<typeof usePluginToast>, title: string, error: unknown) {
  toast({
    title,
    body: error instanceof Error ? error.message : String(error),
    tone: "error",
  });
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS[status] ?? "#64748b";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: `${color}18`,
        color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Section(props: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{props.title}</div>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}

function StatsRow({ overview }: { overview: AutopilotOverview }) {
  const items = [
    ["Ideas", String(overview.activeIdeasCount)],
    ["Maybe", String(overview.maybePoolCount)],
    ["Approved", String(overview.approvedIdeasCount)],
    ["Runs", String(overview.runningRunsCount)],
    ["Done", String(overview.completedRunsCount)],
    ["Failed", String(overview.failedRunsCount)],
    ["Swipes Today", String(overview.totalSwipesToday)],
    ["Budget", `${overview.budgetUsagePercent}%`],
  ];

  return (
    <div style={GRID}>
      {items.map(([label, value]) => (
        <div key={label} style={CARD}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{value}</div>
          <div style={MUTED}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectSettingsCard(props: {
  companyId: string;
  projectId: string;
  project: AutopilotProject | null;
  onSaved: () => void;
}) {
  const save = usePluginAction(ACTION_KEYS.saveAutopilotProject);
  const toast = usePluginToast();
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<AutomationTier>("supervised");
  const [budgetMinutes, setBudgetMinutes] = useState(120);
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    if (!props.project) return;
    setEnabled(props.project.enabled);
    setTier(props.project.automationTier);
    setBudgetMinutes(props.project.budgetMinutes);
    setRepoUrl(props.project.repoUrl ?? "");
  }, [props.project]);

  async function handleSave() {
    try {
      await save({
        companyId: props.companyId,
        projectId: props.projectId,
        enabled,
        automationTier: tier,
        budgetMinutes,
        repoUrl: repoUrl || undefined,
      });
      toast({ title: "Autopilot settings saved", tone: "success" });
      props.onSaved();
    } catch (error) {
      toastError(toast, "Failed to save settings", error);
    }
  }

  return (
    <Section title="Project Settings" action={<StatusPill status={enabled ? "active" : "paused"} />}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={GRID}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL}>Enabled</span>
            <select
              value={String(enabled)}
              onChange={(event) => setEnabled((event.target as HTMLSelectElement).value === "true")}
              style={INPUT}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL}>Automation Tier</span>
            <select
              value={tier}
              onChange={(event) => setTier((event.target as HTMLSelectElement).value as AutomationTier)}
              style={INPUT}
            >
              <option value="supervised">Supervised</option>
              <option value="semiauto">Semiauto</option>
              <option value="fullauto">Fullauto</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL}>Budget Minutes</span>
            <input
              type="number"
              value={budgetMinutes}
              onChange={(event) => setBudgetMinutes(Number((event.target as HTMLInputElement).value) || 0)}
              style={INPUT}
            />
          </label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={LABEL}>Repository URL</span>
          <input value={repoUrl} onChange={(event) => setRepoUrl((event.target as HTMLInputElement).value)} style={INPUT} />
        </label>
        <div>
          <button onClick={handleSave} style={BUTTON}>
            Save Settings
          </button>
        </div>
      </div>
    </Section>
  );
}

function ResearchCard(props: { companyId: string; projectId: string; onRefresh: () => void }) {
  const startResearch = usePluginAction(ACTION_KEYS.startResearchCycle);
  const generateIdeas = usePluginAction(ACTION_KEYS.generateIdeas);
  const toast = usePluginToast();
  const { data: cycles } = usePluginData<ResearchCycle[]>(DATA_KEYS.researchCycles, {
    companyId: props.companyId,
    projectId: props.projectId,
  });
  const [query, setQuery] = useState("Research product improvement opportunities");

  async function handleStartResearch() {
    try {
      await startResearch({ companyId: props.companyId, projectId: props.projectId, query });
      toast({ title: "Research cycle started", tone: "success" });
      props.onRefresh();
    } catch (error) {
      toastError(toast, "Failed to start research cycle", error);
    }
  }

  async function handleGenerateIdeas() {
    try {
      await generateIdeas({ companyId: props.companyId, projectId: props.projectId, count: 5 });
      toast({ title: "Ideas generated", tone: "success" });
      props.onRefresh();
    } catch (error) {
      toastError(toast, "Failed to generate ideas", error);
    }
  }

  const latestCycle = cycles?.[0] ?? null;

  return (
    <Section
      title="Research and Ideation"
      action={
        latestCycle ? <StatusPill status={latestCycle.status} /> : <span style={MUTED}>No research cycles yet</span>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={LABEL}>Research Query</span>
          <input value={query} onChange={(event) => setQuery((event.target as HTMLInputElement).value)} style={INPUT} />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleStartResearch} style={BUTTON}>
            Start Research
          </button>
          <button onClick={handleGenerateIdeas} style={BUTTON_SECONDARY}>
            Generate Ideas
          </button>
        </div>
        {latestCycle && (
          <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{latestCycle.query}</div>
            <div style={MUTED}>Findings: {latestCycle.findingsCount}</div>
          </div>
        )}
      </div>
    </Section>
  );
}

function IdeasCard(props: { companyId: string; projectId: string }) {
  const { data: ideas } = usePluginData<Idea[]>(DATA_KEYS.ideas, {
    companyId: props.companyId,
    projectId: props.projectId,
  });

  return (
    <Section title="Idea Pool">
      {!ideas || ideas.length === 0 ? (
        <div style={MUTED}>No ideas yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {ideas.slice(0, 8).map((idea) => (
            <div key={idea.ideaId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{idea.title}</div>
                <StatusPill status={idea.status} />
              </div>
              <div style={MUTED}>{idea.description || idea.rationale || "No description provided."}</div>
              {idea.rationale ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  Why: {idea.rationale}
                </div>
              ) : null}
              {idea.duplicateAnnotated ? (
                <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
                  Marked as potential duplicate
                </div>
              ) : null}
              {idea.sourceReferences?.length ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  Source: {idea.sourceReferences[0]}
                </div>
              ) : null}
              <div style={{ ...MUTED, marginTop: 6 }}>
                Impact {idea.impactScore} | Feasibility {idea.feasibilityScore} | Complexity {idea.complexityEstimate ?? "n/a"}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function RunsCard(props: { companyId: string; projectId: string }) {
  const { data: runs } = usePluginData<DeliveryRun[]>(DATA_KEYS.deliveryRuns, {
    companyId: props.companyId,
    projectId: props.projectId,
  });

  return (
    <Section title="Delivery Runs">
      {!runs || runs.length === 0 ? (
        <div style={MUTED}>No delivery runs yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {runs.slice(0, 8).map((run) => (
            <div key={run.runId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{run.title}</div>
                <StatusPill status={run.status} />
              </div>
              <div style={MUTED}>Branch: {run.branchName}</div>
              <div style={MUTED}>Workspace: {run.workspacePath}</div>
              {classifyFailureMessage(run.error) ? (
                <div style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
                  Failure class: {formatFailureCategory(classifyFailureMessage(run.error))}
                </div>
              ) : null}
              {run.error ? <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{run.error}</div> : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function DigestsCard(props: { companyId: string; projectId: string; onRefresh: () => void }) {
  const dismissDigest = usePluginAction(ACTION_KEYS.dismissDigest);
  const toast = usePluginToast();
  const { data: digests, refresh } = usePluginData<Digest[]>(DATA_KEYS.digests, {
    companyId: props.companyId,
    projectId: props.projectId,
  });

  async function handleDismiss(digestId: string) {
    try {
      await dismissDigest({
        companyId: props.companyId,
        projectId: props.projectId,
        digestId,
      });
      toast({ title: "Digest dismissed", tone: "success" });
      refresh();
      props.onRefresh();
    } catch (error) {
      toastError(toast, "Failed to dismiss digest", error);
    }
  }

  return (
    <Section title="Digest Inbox">
      {!digests || digests.length === 0 ? (
        <div style={MUTED}>No digests yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {digests.slice(0, 8).map((digest) => (
            <div key={digest.digestId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{digest.title}</div>
                <StatusPill status={digest.status} />
              </div>
              <div style={MUTED}>{digest.summary}</div>
              <div style={{ ...MUTED, marginTop: 6 }}>
                Type {digest.digestType} | Priority {digest.priority}
              </div>
              {digest.details.length ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  {digest.details[0]}
                </div>
              ) : null}
              {digest.status !== "dismissed" ? (
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleDismiss(digest.digestId)} style={BUTTON_SECONDARY}>
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function LearningCard(props: { companyId: string; projectId: string }) {
  const { data: summaries } = usePluginData<LearnerSummary[]>(DATA_KEYS.learnerSummaries, {
    companyId: props.companyId,
    projectId: props.projectId,
  });
  const { data: knowledge } = usePluginData<KnowledgeEntry[]>(DATA_KEYS.knowledgeEntries, {
    companyId: props.companyId,
    projectId: props.projectId,
  });

  return (
    <Section title="Learning Loop">
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Recent Learner Summaries</div>
          {!summaries || summaries.length === 0 ? (
            <div style={MUTED}>No learner summaries yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {summaries.slice(0, 3).map((summary) => (
                <div key={summary.summaryId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{summary.title}</div>
                  <div style={{ ...MUTED, marginTop: 6 }}>{summary.summaryText}</div>
                  {summary.keyLearnings.length ? (
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                      Learnings: {summary.keyLearnings.slice(0, 3).join(" | ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Reusable Knowledge</div>
          {!knowledge || knowledge.length === 0 ? (
            <div style={MUTED}>No reusable knowledge entries yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {knowledge.slice(0, 4).map((entry) => (
                <div key={entry.entryId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.title}</div>
                    <div style={MUTED}>{entry.knowledgeType}</div>
                  </div>
                  <div style={{ ...MUTED, marginTop: 6 }}>{entry.content.slice(0, 180)}</div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                    Used {entry.usageCount} time(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function EvaluationCard() {
  const summary = getIdeationBenchmarkSummary();

  return (
    <Section title="Evaluation Scorecard">
      <div style={GRID}>
        <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(summary.top1Accuracy * 100)}%
          </div>
          <div style={MUTED}>Top-1 Accuracy</div>
        </div>
        <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(summary.top3Accuracy * 100)}%
          </div>
          <div style={MUTED}>Top-3 Accuracy</div>
        </div>
        <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {summary.meanReciprocalRank.toFixed(2)}
          </div>
          <div style={MUTED}>Mean Reciprocal Rank</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {summary.results.map((result) => (
          <div key={result.caseId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{result.caseId}</div>
              <StatusPill status={result.top1Hit ? "completed" : "maybe"} />
            </div>
            <div style={{ ...MUTED, marginTop: 6 }}>
              Ranked: {result.rankedFindingIds.slice(0, 3).join(" -> ")}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AuditTimeline(props: {
  run: DeliveryRun;
  checks: ReleaseHealthCheck[];
  interventions: OperatorIntervention[];
  checkpoints: Checkpoint[];
  rollbacks: RollbackAction[];
  digests: Digest[];
}) {
  const events = buildRunAuditTimeline(props);

  return (
    <Section title="Audit Timeline">
      {events.length === 0 ? (
        <div style={MUTED}>No audit events yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {events.map((event) => (
            <div key={event.id} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{event.title}</div>
                <StatusPill status={event.status} />
              </div>
              <div style={{ ...MUTED, marginTop: 6 }}>{event.detail}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                {new Date(event.at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function AutopilotProjectTab({ context }: PluginDetailTabProps) {
  const companyId = context.companyId;
  const projectId = context.entityId;
  const { data: project, refresh: refreshProject } = usePluginData<AutopilotProject>(DATA_KEYS.autopilotProject, {
    companyId,
    projectId,
  });
  const { data: overview, refresh: refreshOverview } = usePluginData<AutopilotOverview>("autopilot-overview", {
    companyId,
    projectId,
  });

  function refreshAll() {
    refreshProject();
    refreshOverview();
  }

  if (!companyId) {
    return <div style={PAGE}>Autopilot requires company context.</div>;
  }

  return (
    <div style={PAGE}>
      {overview ? <StatsRow overview={overview} /> : null}
      <ProjectSettingsCard companyId={companyId} projectId={projectId} project={project} onSaved={refreshAll} />
      <ResearchCard companyId={companyId} projectId={projectId} onRefresh={refreshAll} />
      <EvaluationCard />
      <LearningCard companyId={companyId} projectId={projectId} />
      <DigestsCard companyId={companyId} projectId={projectId} onRefresh={refreshAll} />
      <IdeasCard companyId={companyId} projectId={projectId} />
      <RunsCard companyId={companyId} projectId={projectId} />
    </div>
  );
}

export function AutopilotSidebarLink({ context }: PluginProjectSidebarItemProps) {
  const { data: project } = usePluginData<AutopilotProject>(DATA_KEYS.autopilotProject, {
    companyId: context.companyId,
    projectId: context.entityId,
  });

  if (!project) return null;

  return (
    <div style={{ padding: "8px 12px", fontSize: 13, color: "#0f172a" }}>
      <StatusPill status={project.enabled ? "active" : "paused"} /> Product Autopilot
    </div>
  );
}

export function AutopilotProjectWidget({ context }: PluginWidgetProps) {
  const companyId = context.companyId;
  const projectId = context.entityId ?? context.projectId;
  const { data: overview } = usePluginData<AutopilotOverview>("autopilot-overview", {
    companyId: companyId ?? "",
    projectId: projectId ?? "",
  });

  if (!companyId || !projectId) {
    return <div style={CARD}>Autopilot widget is unavailable outside project context.</div>;
  }

  if (!overview) {
    return <div style={CARD}>Loading Autopilot overview...</div>;
  }

  return (
    <div style={{ ...CARD, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Product Autopilot</div>
      <div style={GRID}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{overview.activeIdeasCount}</div>
          <div style={MUTED}>Ideas</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{overview.runningRunsCount}</div>
          <div style={MUTED}>Runs</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{overview.budgetUsagePercent}%</div>
          <div style={MUTED}>Budget</div>
        </div>
      </div>
    </div>
  );
}

export function AutopilotDashboardWidget({ context }: PluginWidgetProps) {
  const { data: projects } = usePluginData<AutopilotProject[]>(DATA_KEYS.autopilotProjects, {
    companyId: context.companyId ?? "",
  });

  return (
    <div style={{ ...CARD, display: "grid", gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Autopilot Dashboard</div>
      {!projects || projects.length === 0 ? (
        <div style={MUTED}>No autopilot-enabled projects yet.</div>
      ) : (
        projects.slice(0, 8).map((project) => (
          <div key={project.autopilotId} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#0f172a" }}>{project.projectId}</span>
            <StatusPill status={project.enabled ? "active" : "paused"} />
          </div>
        ))
      )}
    </div>
  );
}

export function AutopilotSettings({ context }: PluginSettingsPageProps) {
  const { data: projects } = usePluginData<AutopilotProject[]>(DATA_KEYS.autopilotProjects, {
    companyId: context.companyId ?? "",
  });

  return (
    <div style={PAGE}>
      <Section title="Autopilot Settings">
        {!projects || projects.length === 0 ? (
          <div style={MUTED}>No projects have Autopilot configured yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {projects.map((project) => (
              <div key={project.autopilotId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{project.projectId}</div>
                    <div style={MUTED}>
                      Tier {project.automationTier} | Budget {project.budgetMinutes} minutes
                    </div>
                  </div>
                  <StatusPill status={project.enabled ? "active" : "paused"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function AutopilotRunDetailTab({ context }: PluginDetailTabProps) {
  const { data: run } = usePluginData<DeliveryRun>(DATA_KEYS.deliveryRun, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: checkpoints } = usePluginData<Checkpoint[]>(DATA_KEYS.checkpoints, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: checks } = usePluginData<ReleaseHealthCheck[]>(DATA_KEYS.releaseHealthChecks, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: rollbacks } = usePluginData<RollbackAction[]>(DATA_KEYS.rollbackActions, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: interventions } = usePluginData<OperatorIntervention[]>(DATA_KEYS.operatorInterventions, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: digests } = usePluginData<Digest[]>(DATA_KEYS.digests, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
  });
  const { data: summaries } = usePluginData<LearnerSummary[]>(DATA_KEYS.learnerSummaries, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
  });
  const { data: knowledge } = usePluginData<KnowledgeEntry[]>(DATA_KEYS.knowledgeEntries, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
  });

  if (!run) {
    return <div style={PAGE}>Loading run details...</div>;
  }

  return (
    <div style={PAGE}>
      <Section title="Run Summary" action={<StatusPill status={run.status} />}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{run.title}</div>
          <div style={MUTED}>Branch: {run.branchName}</div>
          <div style={MUTED}>Workspace: {run.workspacePath}</div>
          <div style={MUTED}>Port: {run.leasedPort ?? "n/a"}</div>
          <div style={MUTED}>Commit: {run.commitSha ?? "n/a"}</div>
          {classifyFailureMessage(run.error) ? (
            <div style={MUTED}>Failure class: {formatFailureCategory(classifyFailureMessage(run.error))}</div>
          ) : null}
          {run.pauseReason ? <div style={MUTED}>Pause reason: {run.pauseReason}</div> : null}
          {run.error ? <div style={{ color: "#dc2626", fontSize: 13 }}>{run.error}</div> : null}
        </div>
      </Section>
      <Section title="Release Health">
        {!checks || checks.length === 0 ? (
          <div style={MUTED}>No release health checks yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {checks.map((check) => (
              <div key={check.checkId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{check.name}</div>
                  <StatusPill status={check.status} />
                </div>
                <div style={{ ...MUTED, marginTop: 6 }}>Type: {check.checkType}</div>
                {classifyFailureMessage(check.errorMessage) ? (
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
                    Failure class: {formatFailureCategory(classifyFailureMessage(check.errorMessage))}
                  </div>
                ) : null}
                {check.errorMessage ? <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{check.errorMessage}</div> : null}
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Operator Interventions">
        {!interventions || interventions.length === 0 ? (
          <div style={MUTED}>No operator interventions recorded for this run.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {interventions.map((intervention) => (
              <div key={intervention.interventionId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{intervention.interventionType.replace(/_/g, " ")}</div>
                  <div style={MUTED}>{new Date(intervention.createdAt).toLocaleString()}</div>
                </div>
                {intervention.note ? <div style={{ ...MUTED, marginTop: 6 }}>{intervention.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Learning and Reuse">
        {!summaries || summaries.filter((summary) => summary.runId === run.runId).length === 0 ? (
          <div style={MUTED}>No learner summaries recorded for this run.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {summaries.filter((summary) => summary.runId === run.runId).slice(0, 3).map((summary) => (
              <div key={summary.summaryId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{summary.title}</div>
                <div style={{ ...MUTED, marginTop: 6 }}>{summary.summaryText}</div>
              </div>
            ))}
          </div>
        )}
        {knowledge && knowledge.some((entry) => entry.sourceRunId === run.runId) ? (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {knowledge.filter((entry) => entry.sourceRunId === run.runId).slice(0, 3).map((entry) => (
              <div key={entry.entryId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.title}</div>
                  <div style={MUTED}>{entry.knowledgeType}</div>
                </div>
                <div style={{ ...MUTED, marginTop: 6 }}>{entry.content.slice(0, 180)}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
      <AuditTimeline
        run={run}
        checks={checks ?? []}
        interventions={interventions ?? []}
        checkpoints={checkpoints ?? []}
        rollbacks={rollbacks ?? []}
        digests={(digests ?? []).filter((digest) => digest.relatedRunId === run.runId)}
      />
    </div>
  );
}

export default {
  AutopilotDashboardWidget,
  AutopilotProjectTab,
  AutopilotProjectWidget,
  AutopilotRunDetailTab,
  AutopilotSettings,
  AutopilotSidebarLink,
};
