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
  CompanyBudget,
  DeliveryRun,
  Digest,
  Idea,
  KnowledgeEntry,
  LearnerSummary,
  OperatorIntervention,
  PlanningArtifact,
  PreferenceProfile,
  ReleaseHealthCheck,
  RollbackAction,
  ResearchCycle,
} from "../types.js";
import { buildRunAuditTimeline } from "../services/audit.js";
import { getDigestPolicyBenchmarkSummary, getIdeationBenchmarkSummary, getQualityScorecardSummary } from "../services/evaluation-fixtures.js";
import { classifyFailureMessage, formatFailureCategory } from "../services/failure-taxonomy.js";
import { describeCheckpointPolicy, summarizeReleaseHealthChecks } from "../services/lifecycle.js";
import { requiresCheckpointForRunGate } from "../services/delivery.js";

const PAGE: CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 20,
  alignContent: "start",
};
const CARD: CSSProperties = {
  border: "1px solid rgba(11, 52, 68, 0.08)",
  borderRadius: 18,
  padding: 18,
  background: "#ffffff",
  boxShadow: "0 16px 36px rgba(11, 52, 68, 0.08)",
};
const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};
const LAYOUT: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 18,
  alignItems: "start",
};
const LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const INPUT: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 12,
  border: "1px solid rgba(11, 52, 68, 0.12)",
  background: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
  color: "#0B3444",
};
const BUTTON: CSSProperties = {
  padding: "10px 15px",
  borderRadius: 14,
  border: "1px solid #115E59",
  background: "#115E59",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  boxShadow: "0 12px 22px rgba(17, 94, 89, 0.18)",
};
const BUTTON_SECONDARY: CSSProperties = {
  ...BUTTON,
  background: "#fff",
  color: "#0B3444",
  border: "1px solid rgba(11, 52, 68, 0.15)",
  boxShadow: "none",
};
const MUTED: CSSProperties = { fontSize: 13, color: "rgba(11, 52, 68, 0.68)", lineHeight: 1.5 };
const EMPTY_PANEL: CSSProperties = {
  border: "1px dashed rgba(11, 52, 68, 0.14)",
  borderRadius: 16,
  padding: 18,
  background: "#F5F7FA",
  display: "grid",
  gap: 8,
};
const METRIC_CARD: CSSProperties = {
  ...CARD,
  padding: 16,
  boxShadow: "none",
  border: "1px solid rgba(11, 52, 68, 0.08)",
};
const HERO_CARD: CSSProperties = {
  ...CARD,
  padding: 24,
  background: "linear-gradient(180deg, #ffffff 0%, #F5F7FA 100%)",
  color: "#0B3444",
  boxShadow: "0 20px 48px rgba(11, 52, 68, 0.08)",
};
const STATUS: Record<string, string> = {
  active: "#115E59",
  approved: "#0E7490",
  maybe: "#B45309",
  rejected: "#DC2626",
  running: "#0E7490",
  completed: "#115E59",
  failed: "#DC2626",
  paused: "#B45309",
};
const STATUS_LABELS: Record<string, string> = {
  active: "aktiv",
  approved: "godkjent",
  maybe: "kanskje",
  rejected: "avvist",
  running: "kjører",
  completed: "fullført",
  failed: "feilet",
  paused: "pauset",
  pending: "venter",
  delivered: "sendt",
  read: "lest",
  dismissed: "lukket",
  cancelled: "avbrutt",
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
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

function Section(props: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={CARD}>
      <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 5 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{props.title}</div>
            {props.subtitle ? <div style={{ ...MUTED, maxWidth: 720 }}>{props.subtitle}</div> : null}
          </div>
          {props.action}
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(148,163,184,0.35) 0%, rgba(148,163,184,0.08) 100%)" }} />
      </div>
      {props.children}
    </section>
  );
}

function EmptyState(props: { title: string; body: string; action?: ReactNode }) {
  return (
    <div style={EMPTY_PANEL}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{props.title}</div>
      <div style={MUTED}>{props.body}</div>
      {props.action ? <div style={{ marginTop: 4 }}>{props.action}</div> : null}
    </div>
  );
}

function LoadingState(props: { label: string }) {
  return (
    <div style={EMPTY_PANEL}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Loading {props.label}</div>
      <div style={MUTED}>Fetching the latest operator state.</div>
    </div>
  );
}

function extractRationaleSignal(rationale: string | undefined, key: string): string | null {
  if (!rationale) return null;
  const match = rationale.match(new RegExp(`${key}=([^,]+)`));
  return match?.[1]?.trim() ?? null;
}

function OverviewHero(props: { project: AutopilotProject | null; overview: AutopilotOverview }) {
  const projectLabel = props.project?.productType ?? "digital tjeneste";
  const tier = props.project?.automationTier ?? "supervised";
  const strongestSignal =
    props.overview.failedRunsCount > 0
      ? "Feilede løp krever oppfølging"
      : props.overview.runningRunsCount > 0
        ? "Aktive leveringsløp pågår"
        : "Stabil operativ status";

  return (
    <section style={HERO_CARD}>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8, maxWidth: 760 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#115E59" }}>
              Kommunal operatørflate
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05, fontFamily: "\"Playfair Display\", Georgia, serif" }}>
              Product Autopilot for {projectLabel}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(11, 52, 68, 0.76)" }}>
              Ett styringspunkt for innsikt, prioritering, trygg leveranse og operatørinngrep. Flaten under er optimalisert for team som må balansere fart, etterprøvbarhet og offentlig tjenestekvalitet.
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, minWidth: 240 }}>
            <StatusPill status={props.project?.enabled ? "active" : "paused"} />
            <div style={{ padding: "14px 16px", borderRadius: 16, background: "#ffffff", border: "1px solid rgba(11,52,68,0.08)" }}>
              <div style={{ fontSize: 12, color: "#115E59", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Nå-signal</div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700 }}>{strongestSignal}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(11, 52, 68, 0.7)" }}>Tier: {tier} • Budsjett: {props.overview.budgetUsagePercent}% brukt</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            ["Aktive ideer", String(props.overview.activeIdeasCount)],
            ["Godkjente tiltak", String(props.overview.approvedIdeasCount)],
            ["Løp i arbeid", String(props.overview.runningRunsCount)],
            ["Swipe i dag", String(props.overview.totalSwipesToday)],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "14px 16px", borderRadius: 16, background: "#ffffff", border: "1px solid rgba(11, 52, 68, 0.08)" }}>
              <div style={{ fontSize: 12, color: "#115E59", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#0B3444" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreferenceSignalsCard(props: { companyId: string; projectId: string }) {
  const { data: profile } = usePluginData<PreferenceProfile | null>(DATA_KEYS.preferenceProfile, {
    companyId: props.companyId,
    projectId: props.projectId,
  });
  const preferenceProfile = profile;

  const topCategory = Object.entries(preferenceProfile?.categoryPreferences ?? {})
    .sort(([, left], [, right]) => (right.yes + right.now - right.pass) - (left.yes + left.now - left.pass))[0];
  const topComplexity = Object.entries(preferenceProfile?.complexityPreferences ?? {})
    .sort(([, left], [, right]) => (right.yes + right.now - right.pass) - (left.yes + left.now - left.pass))[0];

  return (
    <Section title="Preference Signals">
      {!preferenceProfile || !preferenceProfile.totalSwipes ? (
        <EmptyState
          title="No learned preference signal yet"
          body="Once operators swipe ideas and runs complete, the system will summarize the strongest learned preferences here."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={GRID}>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{preferenceProfile.totalSwipes}</div>
              <div style={MUTED}>Total Swipes</div>
            </div>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {Math.round(preferenceProfile.avgApprovedScore ?? 0)}
              </div>
              <div style={MUTED}>Avg Approved Score</div>
            </div>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {Math.round(preferenceProfile.avgRejectedScore ?? 0)}
              </div>
              <div style={MUTED}>Avg Rejected Score</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>Top Category Preference</div>
              <div style={MUTED}>{topCategory ? topCategory[0] : "No clear category preference yet"}</div>
            </div>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>Top Complexity Preference</div>
              <div style={MUTED}>{topComplexity ? topComplexity[0] : "No clear complexity preference yet"}</div>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function StatsRow({ overview }: { overview: AutopilotOverview }) {
  const items = [
    ["Aktive ideer", String(overview.activeIdeasCount), "Kandidater klare for videre vurdering"],
    ["Kanskje-pool", String(overview.maybePoolCount), "Forslag som bør tas opp igjen senere"],
    ["Godkjent", String(overview.approvedIdeasCount), "Tiltak klare for plan eller levering"],
    ["Løp i arbeid", String(overview.runningRunsCount), "Pågående endringer under oppfølging"],
    ["Fullført", String(overview.completedRunsCount), "Leveranser som er ferdig kjørt"],
    ["Feilet", String(overview.failedRunsCount), "Løp som krever ekstra vurdering"],
    ["Swipe i dag", String(overview.totalSwipesToday), "Operatøraktivitet siste døgn"],
    ["Budsjettbruk", `${overview.budgetUsagePercent}%`, "Andel av tilgjengelig autopilot-budsjett"],
  ];

  return (
    <div style={GRID}>
      {items.map(([label, value, detail]) => (
        <div key={label} style={METRIC_CARD}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{value}</div>
          <div style={{ ...MUTED, marginTop: 6 }}>{detail}</div>
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
    <Section
      title="Prosjektoppsett"
      subtitle="Styr automatiseringsnivå, budsjett og koblingen til den konkrete tjenesten. Endringene her setter rammene for hvordan autopiloten får arbeide."
      action={<StatusPill status={enabled ? "active" : "paused"} />}
    >
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
      title="Innsikt og ideer"
      subtitle="Start nye forskningssykluser og bruk dem til å fylle opp en prioriterbar idékø med tydelig begrunnelse."
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
            {latestCycle.snapshot ? (
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Avg freshness {latestCycle.snapshot.averageFreshnessScore} | Avg source quality {latestCycle.snapshot.averageSourceQualityScore}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Duplicate findings {latestCycle.snapshot.duplicateCount} | Topics {Object.keys(latestCycle.snapshot.topicCounts).slice(0, 3).join(", ") || "n/a"}
                </div>
              </div>
            ) : null}
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
    <Section
      title="Tiltakskø"
      subtitle="Forslagene under er de viktigste kandidatene akkurat nå. Hver idé viser kildegrunnlag, signalstyrke og hva modellen tror er verdt å gjøre."
    >
      {!ideas || ideas.length === 0 ? (
        <EmptyState
          title="No ideas yet"
          body="Run research or generate ideas to seed the opportunity queue for operator review."
        />
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
              {extractRationaleSignal(idea.rationale, "preferenceBoost") ? (
                <div style={{ fontSize: 12, color: "#0f766e", marginTop: 6 }}>
                  Preference boost {extractRationaleSignal(idea.rationale, "preferenceBoost")} | Complexity boost {extractRationaleSignal(idea.rationale, "complexityPreferenceBoost") ?? "0.0"} | Outcome boost {extractRationaleSignal(idea.rationale, "outcomeBoost") ?? "0.0"}
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
    <Section
      title="Leveringsløp"
      subtitle="Her ser du aktive og nylige løp, inkludert feilklassifisering, arbeidsgren og hvor i prosessen inngrep eventuelt trengs."
    >
      {!runs || runs.length === 0 ? (
        <EmptyState
          title="No delivery runs yet"
          body="Approved ideas will appear here once the system turns them into executable runs."
        />
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

function BudgetControlCard(props: { companyId: string; onSaved: () => void }) {
  const updateBudget = usePluginAction(ACTION_KEYS.updateCompanyBudget);
  const toast = usePluginToast();
  const { data: budget } = usePluginData<CompanyBudget>(DATA_KEYS.companyBudget, {
    companyId: props.companyId,
  });
  const [autopilotBudgetMinutes, setAutopilotBudgetMinutes] = useState(120);
  const [autopilotUsedMinutes, setAutopilotUsedMinutes] = useState(0);

  useEffect(() => {
    if (!budget) return;
    setAutopilotBudgetMinutes(budget.autopilotBudgetMinutes);
    setAutopilotUsedMinutes(budget.autopilotUsedMinutes);
  }, [budget]);

  const usagePercent =
    autopilotBudgetMinutes > 0 ? Math.round((autopilotUsedMinutes / autopilotBudgetMinutes) * 100) : 0;

  async function handleSave() {
    try {
      await updateBudget({
        companyId: props.companyId,
        autopilotBudgetMinutes,
        autopilotUsedMinutes,
      });
      toast({ title: "Budget settings saved", tone: "success" });
      props.onSaved();
    } catch (error) {
      toastError(toast, "Failed to update budget", error);
    }
  }

  return (
    <Section
      title="Budsjett og kapasitet"
      subtitle="Hold autopilot innenfor trygge rammer. Dette er operativt budsjett, ikke bare en passiv statusindikator."
      action={<StatusPill status={budget?.paused ? "paused" : usagePercent >= 100 ? "failed" : "active"} />}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={GRID}>
          <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{usagePercent}%</div>
            <div style={MUTED}>Autopilot Budget Usage</div>
          </div>
          <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{autopilotUsedMinutes}</div>
            <div style={MUTED}>Used Minutes</div>
          </div>
          <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{autopilotBudgetMinutes}</div>
            <div style={MUTED}>Allowed Minutes</div>
          </div>
        </div>
        <div style={GRID}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL}>Autopilot Budget Minutes</span>
            <input
              type="number"
              value={autopilotBudgetMinutes}
              onChange={(event) => setAutopilotBudgetMinutes(Number((event.target as HTMLInputElement).value) || 0)}
              style={INPUT}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL}>Autopilot Used Minutes</span>
            <input
              type="number"
              value={autopilotUsedMinutes}
              onChange={(event) => setAutopilotUsedMinutes(Number((event.target as HTMLInputElement).value) || 0)}
              style={INPUT}
            />
          </label>
        </div>
        <div style={MUTED}>
          {budget?.pauseReason ? `Pause reason: ${budget.pauseReason}` : "Use this surface to adjust and inspect operator budget state."}
        </div>
        <div>
          <button onClick={handleSave} style={BUTTON}>
            Save Budget
          </button>
        </div>
      </div>
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
    <Section
      title="Operatørinnboks"
      subtitle="Varsler med operativ betydning samles her. Bruk dem som prioriteringskø for inngrep, avklaringer og styringssignaler."
    >
      {!digests || digests.length === 0 ? (
        <EmptyState
          title="No digests right now"
          body="When budgets, stuck runs, or other operator-visible events need attention, they will land here."
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {digests.slice(0, 8).map((digest) => (
            <div key={digest.digestId} style={{ ...CARD, padding: 14, boxShadow: "none", borderLeft: `6px solid ${STATUS[digest.priority === "critical" ? "failed" : digest.priority === "high" ? "maybe" : "approved"] ?? "#64748b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{digest.title}</div>
                <StatusPill status={digest.status} />
              </div>
              <div style={MUTED}>{digest.summary}</div>
              <div style={{ ...MUTED, marginTop: 6 }}>
                Type {digest.digestType} | Prioritet {digest.priority}
              </div>
              {digest.urgency ? (
                <div style={{ fontSize: 12, color: "#0f172a", marginTop: 6 }}>
                  Urgency: {digest.urgency.replace(/_/g, " ")}
                </div>
              ) : null}
              {Number(digest.escalationLevel ?? 0) > 0 ? (
                <div style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
                  Escalation level {digest.escalationLevel}
                </div>
              ) : null}
              {digest.recommendedAction ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  Recommended action: {digest.recommendedAction}
                </div>
              ) : null}
              {digest.reopenCount ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  Reopened {digest.reopenCount} time(s)
                </div>
              ) : null}
              {digest.cooldownUntil ? (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                  Cooldown until {new Date(digest.cooldownUntil).toLocaleString()}
                </div>
              ) : null}
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
    <Section
      title="Læring og gjenbruk"
      subtitle="Oppsummeringer og gjenbrukbar kunnskap skal gjøre neste levering tryggere, raskere og mer konsistent."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Recent Learner Summaries</div>
          {!summaries || summaries.length === 0 ? (
            <EmptyState
              title="No learner summaries yet"
              body="Completed runs will feed back lessons, metrics, and reusable patterns here."
            />
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
            <EmptyState
              title="No reusable knowledge yet"
              body="As runs complete, proven lessons and procedures will accumulate here for later reuse."
            />
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
  const digestSummary = getDigestPolicyBenchmarkSummary();
  const qualityScorecard = getQualityScorecardSummary();

  return (
    <Section
      title="Evalueringsscore"
      subtitle="Målene under viser hvor troverdig rangering, digest-politikk og samlet kvalitet faktisk er over benchmark-scenarier."
    >
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
        <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(digestSummary.accuracy * 100)}%
          </div>
          <div style={MUTED}>Digest Policy Accuracy</div>
        </div>
        <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(qualityScorecard.overallScore * 100)}%
          </div>
          <div style={MUTED}>Overall Quality Score</div>
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
    <Section
      title="Revisjonsspor"
      subtitle="Et fortløpende hendelsesbilde av kjøringen, inkludert helse, tilbakeføring og menneskelige inngrep."
    >
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
    return (
      <div style={PAGE}>
        <EmptyState
          title="Company Context Required"
          body="Open this surface from a company-backed project so Product Autopilot can load the right state."
        />
      </div>
    );
  }

  return (
    <div style={PAGE}>
      {overview ? <OverviewHero project={project ?? null} overview={overview} /> : null}
      {overview ? <StatsRow overview={overview} /> : <LoadingState label="overview" />}
      <div style={LAYOUT}>
        <div style={{ display: "grid", gap: 18 }}>
          <ProjectSettingsCard companyId={companyId} projectId={projectId} project={project} onSaved={refreshAll} />
          <ResearchCard companyId={companyId} projectId={projectId} onRefresh={refreshAll} />
          <IdeasCard companyId={companyId} projectId={projectId} />
          <RunsCard companyId={companyId} projectId={projectId} />
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          <BudgetControlCard companyId={companyId} onSaved={refreshAll} />
          <DigestsCard companyId={companyId} projectId={projectId} onRefresh={refreshAll} />
          <EvaluationCard />
          <PreferenceSignalsCard companyId={companyId} projectId={projectId} />
          <LearningCard companyId={companyId} projectId={projectId} />
        </div>
      </div>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "grid", gap: 3 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Product Autopilot</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{project.productType ?? "Digital tjeneste"}</div>
      </div>
      <StatusPill status={project.enabled ? "active" : "paused"} />
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
    return (
      <div style={CARD}>
        <EmptyState
          title="Project Context Required"
          body="Open the widget from a project context to see Product Autopilot metrics."
        />
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={CARD}>
        <LoadingState label="autopilot overview" />
      </div>
    );
  }

  return (
    <div style={{ ...CARD, display: "grid", gap: 14, background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Product Autopilot</div>
          <div style={MUTED}>Kompakt status for prosjektets operative helse.</div>
        </div>
        <StatusPill status={overview.failedRunsCount > 0 ? "failed" : overview.runningRunsCount > 0 ? "running" : "active"} />
      </div>
      <div style={GRID}>
        <div style={METRIC_CARD}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ideer</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{overview.activeIdeasCount}</div>
        </div>
        <div style={METRIC_CARD}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Løp</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{overview.runningRunsCount}</div>
        </div>
        <div style={METRIC_CARD}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Budsjett</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{overview.budgetUsagePercent}%</div>
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
    <div style={{ ...CARD, display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Autopilot Dashboard</div>
        <div style={MUTED}>Sammendrag på tvers av tjenester og team.</div>
      </div>
      {!projects || projects.length === 0 ? (
        <EmptyState
          title="No autopilot-enabled projects yet"
          body="Enable Product Autopilot on a project to surface company-wide operator status here."
        />
      ) : (
        projects.slice(0, 8).map((project) => (
          <div key={project.autopilotId} style={{ ...METRIC_CARD, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>{project.projectId}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{project.productType ?? "Digital tjeneste"} • {project.automationTier}</span>
            </div>
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
      <Section
        title="Autopilot Settings"
        subtitle="Oversikt over hvilke tjenester som er aktivert, hvilken styringsprofil de bruker, og hvor kapasiteten ligger akkurat nå."
      >
        {!projects || projects.length === 0 ? (
          <EmptyState
            title="No configured projects yet"
            body="Once a project enables Product Autopilot, its configuration and policy settings will appear here."
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {projects.map((project) => (
              <div key={project.autopilotId} style={{ ...METRIC_CARD, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{project.projectId}</div>
                    <div style={MUTED}>
                      Tier {project.automationTier} • Budsjett {project.budgetMinutes} min • {project.productType ?? "Digital tjeneste"}
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
  const toast = usePluginToast();
  const cancelRun = usePluginAction(ACTION_KEYS.cancelDeliveryRun);
  const pauseRun = usePluginAction(ACTION_KEYS.pauseDeliveryRun);
  const resumeRun = usePluginAction(ACTION_KEYS.resumeDeliveryRun);
  const requestCheckpoint = usePluginAction(ACTION_KEYS.requestCheckpoint);
  const addOperatorNote = usePluginAction(ACTION_KEYS.addOperatorNote);
  const [operatorNote, setOperatorNote] = useState("");
  const { data: run, refresh: refreshRun } = usePluginData<DeliveryRun>(DATA_KEYS.deliveryRun, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    runId: context.entityId,
  });
  const { data: checkpoints, refresh: refreshCheckpoints } = usePluginData<Checkpoint[]>(DATA_KEYS.checkpoints, {
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
  const { data: planningArtifact } = usePluginData<PlanningArtifact | null>(DATA_KEYS.planningArtifact, {
    companyId: context.companyId,
    projectId: context.projectId ?? "",
    artifactId: run?.artifactId ?? "",
  });
  const { data: interventions, refresh: refreshInterventions } = usePluginData<OperatorIntervention[]>(DATA_KEYS.operatorInterventions, {
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
  const healthSummary = summarizeReleaseHealthChecks(checks ?? []);
  const checkpointPolicy = requiresCheckpointForRunGate({
    artifact: planningArtifact ?? undefined,
    checkpoints: checkpoints ?? [],
  });

  if (!run) {
    return (
      <div style={PAGE}>
        <LoadingState label="run details" />
      </div>
    );
  }
  const activeRun = run;

  async function refreshRunViews() {
    refreshRun();
    refreshCheckpoints();
    refreshInterventions();
  }

  async function handlePauseResume() {
    try {
      if (activeRun.status === "paused") {
        await resumeRun({
          companyId: context.companyId,
          projectId: context.projectId ?? "",
          runId: activeRun.runId,
        });
        toast({ title: "Run resumed", tone: "success" });
      } else {
        await pauseRun({
          companyId: context.companyId,
          projectId: context.projectId ?? "",
          runId: activeRun.runId,
          reason: operatorNote || "Paused by operator",
        });
        toast({ title: "Run paused", tone: "success" });
      }
      await refreshRunViews();
    } catch (error) {
      toastError(toast, "Failed to update run state", error);
    }
  }

  async function handleCheckpointRequest() {
    try {
      await requestCheckpoint({
        companyId: context.companyId,
        projectId: context.projectId ?? "",
        runId: activeRun.runId,
        reason: operatorNote || "Operator requested checkpoint",
      });
      toast({ title: "Checkpoint requested", tone: "success" });
      await refreshRunViews();
    } catch (error) {
      toastError(toast, "Failed to request checkpoint", error);
    }
  }

  async function handleCancelRun() {
    try {
      await cancelRun({
        companyId: context.companyId,
        projectId: context.projectId ?? "",
        runId: activeRun.runId,
        reason: operatorNote || "Cancelled by operator",
      });
      toast({ title: "Run cancelled", tone: "success" });
      await refreshRunViews();
    } catch (error) {
      toastError(toast, "Failed to cancel run", error);
    }
  }

  async function handleOperatorNote() {
    if (!operatorNote.trim()) return;
    try {
      await addOperatorNote({
        companyId: context.companyId,
        projectId: context.projectId ?? "",
        runId: activeRun.runId,
        note: operatorNote.trim(),
      });
      setOperatorNote("");
      toast({ title: "Operator note added", tone: "success" });
      await refreshRunViews();
    } catch (error) {
      toastError(toast, "Failed to add operator note", error);
    }
  }

  return (
    <div style={PAGE}>
      <Section
        title="Løpsstatus"
        subtitle="Dette er den operative kommandopulten for kjøringen: status, risiko, inngrep og direkte kontroll over pause, checkpoint og avbryt."
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <StatusPill status={activeRun.status} />
            {["pending", "running", "paused"].includes(activeRun.status) ? (
              <button onClick={handlePauseResume} style={BUTTON_SECONDARY}>
                {activeRun.status === "paused" ? "Resume" : "Pause"}
              </button>
            ) : null}
            {["running", "paused"].includes(activeRun.status) ? (
              <button onClick={handleCheckpointRequest} style={BUTTON_SECONDARY}>
                Request Checkpoint
              </button>
            ) : null}
            {["pending", "running", "paused"].includes(activeRun.status) ? (
              <button onClick={handleCancelRun} style={BUTTON_SECONDARY}>
                Cancel
              </button>
            ) : null}
          </div>
        }
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ ...METRIC_CARD, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ ...LABEL }}>Automatisering</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{activeRun.automationTier}</div>
            </div>
            <div>
              <div style={{ ...LABEL }}>Arbeidsgren</div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{activeRun.branchName}</div>
            </div>
            <div>
              <div style={{ ...LABEL }}>Checkpoint</div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: checkpointPolicy.satisfied ? "#0f766e" : "#b45309" }}>
                {checkpointPolicy.required ? (checkpointPolicy.satisfied ? "Påkrevd og oppfylt" : "Påkrevd") : "Ikke påkrevd"}
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{activeRun.title}</div>
          <div style={MUTED}>Branch: {activeRun.branchName}</div>
          <div style={MUTED}>Workspace: {activeRun.workspacePath}</div>
          <div style={MUTED}>Port: {activeRun.leasedPort ?? "n/a"}</div>
          <div style={MUTED}>Commit: {activeRun.commitSha ?? "n/a"}</div>
          {classifyFailureMessage(activeRun.error) ? (
            <div style={MUTED}>Failure class: {formatFailureCategory(classifyFailureMessage(activeRun.error))}</div>
          ) : null}
          <div style={MUTED}>Checkpoint policy: {describeCheckpointPolicy(planningArtifact ?? undefined)}</div>
          {checkpointPolicy.required ? (
            <div style={{ fontSize: 12, color: checkpointPolicy.satisfied ? "#0f766e" : "#b45309" }}>
              {checkpointPolicy.satisfied ? "Checkpoint requirement satisfied." : "Checkpoint required before risky execution."}
            </div>
          ) : null}
          {activeRun.pauseReason ? <div style={MUTED}>Pause reason: {activeRun.pauseReason}</div> : null}
          {activeRun.cancellationReason ? <div style={MUTED}>Cancellation reason: {activeRun.cancellationReason}</div> : null}
          {activeRun.error ? <div style={{ color: "#dc2626", fontSize: 13 }}>{activeRun.error}</div> : null}
          <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <span style={LABEL}>Operator Note</span>
            <textarea
              value={operatorNote}
              onChange={(event) => setOperatorNote((event.target as HTMLTextAreaElement).value)}
              style={{ ...INPUT, minHeight: 80, resize: "vertical" }}
            />
          </label>
          <div>
            <button onClick={handleOperatorNote} style={BUTTON}>
              Add Note
            </button>
          </div>
        </div>
      </Section>
      <Section
        title="Release Health"
        subtitle="Samlet helsebilde for testen, merge readiness og eventuelle blokkeringer før endringen kan gå videre."
      >
        {!checks || checks.length === 0 ? (
          <EmptyState
            title="No release health checks yet"
            body="Health checks appear after a run reaches a validation boundary or ships a change."
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...CARD, padding: 12, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>Overall Health</div>
                <StatusPill status={healthSummary.overallStatus} />
              </div>
              <div style={{ ...MUTED, marginTop: 6 }}>
                Passed {healthSummary.passed} | Failed {healthSummary.failed} | Pending {healthSummary.pending} | Running {healthSummary.running}
              </div>
            </div>
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
      <Section
        title="Operator Interventions"
        subtitle="Alle menneskelige inngrep logges her slik at kommunen kan etterprøve hvem som gjorde hva og hvorfor."
      >
        {!interventions || interventions.length === 0 ? (
          <EmptyState
            title="No operator interventions recorded"
            body="Notes, checkpoint requests, and nudges will show up here once an operator intervenes."
          />
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
      <Section
        title="Learning and Reuse"
        subtitle="Hva lærte systemet av dette løpet, og hvilken kunnskap bør brukes igjen i neste leveranse?"
      >
        {!summaries || summaries.filter((summary) => summary.runId === activeRun.runId).length === 0 ? (
          <EmptyState
            title="No learner summaries for this run"
            body="Once the run completes, the system can publish a post-run summary with learnings and metrics."
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {summaries.filter((summary) => summary.runId === activeRun.runId).slice(0, 3).map((summary) => (
              <div key={summary.summaryId} style={{ ...CARD, padding: 12, boxShadow: "none" }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{summary.title}</div>
                <div style={{ ...MUTED, marginTop: 6 }}>{summary.summaryText}</div>
              </div>
            ))}
          </div>
        )}
        {knowledge && knowledge.some((entry) => entry.sourceRunId === activeRun.runId) ? (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {knowledge.filter((entry) => entry.sourceRunId === activeRun.runId).slice(0, 3).map((entry) => (
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
        run={activeRun}
        checks={checks ?? []}
        interventions={interventions ?? []}
        checkpoints={checkpoints ?? []}
        rollbacks={rollbacks ?? []}
        digests={(digests ?? []).filter((digest) => digest.relatedRunId === activeRun.runId)}
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
