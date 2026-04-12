import type * as React from "react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  usePluginAction,
  usePluginData,
  useHostContext,
  usePluginToast,
  type PluginDetailTabProps,
  type PluginProjectSidebarItemProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION_KEYS,
  DATA_KEYS,
  PLUGIN_ID,
  type IdeaStatus,
  type SwipeDecision,
  type AutomationTier,
  type ConvoyTaskStatus,
  type InterventionType,
  type DigestType,
  type HealthCheckType,
} from "../../constants.js";
import type {
  AutopilotProject,
  ResearchCycle,
  ResearchFinding,
  Idea,
  SwipeEvent,
  PreferenceProfile,
  PlanningArtifact,
  DeliveryRun,
  CompanyBudget,
  ConvoyTask,
  Checkpoint,
  ProductLock,
  OperatorIntervention,
  LearnerSummary,
  KnowledgeEntry,
  Digest,
  AutopilotOverview,
  ProductProgramRevision,
} from "../../types.js";

// ─── Shared styles ──────────────────────────────────────────────────────────────
const PAGE: CSSProperties = { display: "grid", gap: 20, padding: 24 };
const CARD: CSSProperties = {
  border: "1px solid rgba(100,116,139,0.22)",
  borderRadius: 16,
  padding: 20,
  background: "linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))",
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
};
const SECTION_HEAD: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: 12,
};
const INPUT: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(100,116,139,0.35)",
  background: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};
const BTN: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.16)",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};
const BTN_PRIMARY: CSSProperties = { ...BTN, background: "#0f172a", color: "#fff", borderColor: "#0f172a" };
const BTN_SM: CSSProperties = { ...BTN, padding: "6px 12px", fontSize: 12 };
const BTN_DANGER: CSSProperties = { ...BTN, background: "#ef4444", color: "#fff", borderColor: "#ef4444" };
const GRID_2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const GRID_3: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const TAG: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  background: "rgba(15,23,42,0.08)",
  color: "#475569",
};
const STATUS_DOT = (color: string): CSSProperties => ({
  display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6,
});
const IDEA_CARD: CSSProperties = {
  ...CARD,
  padding: 16,
  display: "grid",
  gap: 10,
};
const FLEX: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const };
const SWIPE_BTNS: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 8 };

// Swipe colors
const SWIPE_COLORS: Record<SwipeDecision, string> = {
  pass: "#ef4444",
  maybe: "#f59e0b",
  yes: "#22c55e",
  now: "#3b82f6",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", maybe: "#f59e0b", approved: "#3b82f6",
  rejected: "#ef4444", in_progress: "#8b5cf6", completed: "#22c55e",
  running: "#3b82f6", paused: "#f59e0b", failed: "#ef4444",
  pending: "#94a3b8", blocked: "#f59e0b",
};

// ─── Utility components ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span style={{ ...TAG, color, background: `${color}18` }}>
      <span style={STATUS_DOT(color)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {label && <span style={{ fontSize: 11, color: "#64748b" }}>{label} {score}</span>}
      <div style={{ height: 4, borderRadius: 2, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
      {message}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
      Error: {message}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={SECTION_HEAD}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Overview Stats ──────────────────────────────────────────────────────────────
function StatsRow({ overview }: { overview: AutopilotOverview }) {
  const stats = [
    { label: "Ideas", value: overview.activeIdeasCount, sub: "active" },
    { label: "Maybe", value: overview.maybePoolCount, sub: "in pool" },
    { label: "Approved", value: overview.approvedIdeasCount, sub: "ready" },
    { label: "Runs", value: overview.runningRunsCount, sub: "running" },
    { label: "Done", value: overview.completedRunsCount, sub: "completed" },
    { label: "Failed", value: overview.failedRunsCount, sub: "failed" },
    { label: "Swipes", value: overview.totalSwipesToday, sub: "today" },
    { label: "Budget", value: `${overview.budgetUsagePercent}%`, sub: "used" },
  ];
  return (
    <div style={GRID_3}>
      {stats.map((s) => (
        <div key={s.label} style={{ ...CARD, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.sub}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Project Settings Form ───────────────────────────────────────────────────────
function ProjectSettingsForm({ project, companyId, projectId }: {
  project: AutopilotProject | undefined;
  companyId: string;
  projectId: string;
}) {
  const saveProject = usePluginAction(ACTION_KEYS.saveAutopilotProject);
  const [tier, setTier] = useState<AutomationTier>(project?.automationTier ?? "supervised");
  const [budget, setBudget] = useState(project?.budgetMinutes ?? 120);
  const [enabled, setEnabled] = useState(project?.enabled ?? false);
  const [repoUrl, setRepoUrl] = useState(project?.repoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const toast = usePluginToast();

  useEffect(() => {
    if (project) {
      setTier(project.automationTier);
      setBudget(project.budgetMinutes);
      setEnabled(project.enabled);
      setRepoUrl(project.repoUrl ?? "");
    }
  }, [project]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveProject({ companyId, projectId, automationTier: tier, budgetMinutes: budget, enabled, repoUrl: repoUrl || undefined });
      toast({ title: "Autopilot settings saved", tone: "success" });
    } catch (e) {
      toast({ title: `Save failed: ${e}`, tone: "error" });
    } finally {
      setSaving(false);
    }
  }, [saveProject, companyId, projectId, tier, budget, enabled, repoUrl, toast]);

  return (
    <Section title="Autopilot Settings">
      <div style={{ display: "grid", gap: 14 }}>
        <div style={FLEX}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", minWidth: 120 }}>Enabled</label>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{ ...BTN_SM, background: enabled ? "#22c55e" : "#e2e8f0", color: enabled ? "#fff" : "#475569" }}
          >
            {enabled ? "On" : "Off"}
          </button>
        </div>
        <div style={FLEX}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", minWidth: 120 }}>Automation Tier</label>
          <select value={tier} onChange={(e: any) => setTier(e.target.value as AutomationTier)} style={{ ...INPUT, width: 180 }}>
            <option value="supervised">Supervised</option>
            <option value="semiauto">Semiauto</option>
            <option value="fullauto">Full Auto</option>
          </select>
        </div>
        <div style={FLEX}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", minWidth: 120 }}>Budget (min/month)</label>
          <input type="number" value={budget} onChange={(e: any) => setBudget(Number(e.target.value))} style={{ ...INPUT, width: 120 }} />
        </div>
        <div style={FLEX}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", minWidth: 120 }}>Repo URL</label>
          <input type="text" value={repoUrl} onChange={(e: any) => setRepoUrl(e.target.value)} style={{ ...INPUT, flex: 1 }} placeholder="https://github.com/..." />
        </div>
        <div style={{ marginTop: 4 }}>
          <button onClick={handleSave} disabled={saving} style={saving ? { ...BTN_PRIMARY, opacity: 0.6 } : BTN_PRIMARY}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </Section>
  );
}

// ─── Research Section ───────────────────────────────────────────────────────────
function ResearchSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const startCycle = usePluginAction(ACTION_KEYS.startResearchCycle);
  const completeCycle = usePluginAction(ACTION_KEYS.completeResearchCycle);
  const addFinding = usePluginAction(ACTION_KEYS.addResearchFinding);
  const { data: cycles, refresh } = usePluginData<ResearchCycle[]>(DATA_KEYS.researchCycles, { companyId, projectId });
  const [query, setQuery] = useState("");
  const [findingTitle, setFindingTitle] = useState("");
  const [findingDesc, setFindingDesc] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const toast = usePluginToast();

  const latestCycle = cycles?.[0];
  const isRunning = latestCycle?.status === "running";

  const handleStart = useCallback(async () => {
    if (!query.trim()) return;
    setRunning(true);
    try {
      await startCycle({ companyId, projectId, query: query.trim() });
      setQuery("");
      await refresh();
      toast({ title: "Research cycle started", tone: "success" });
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    } finally {
      setRunning(false);
    }
  }, [startCycle, companyId, projectId, query, refresh, toast]);

  const handleComplete = useCallback(async () => {
    if (!latestCycle) return;
    try {
      await completeCycle({ companyId, projectId, cycleId: latestCycle.cycleId });
      await refresh();
      toast({ title: "Research cycle completed", tone: "success" });
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    }
  }, [completeCycle, companyId, projectId, latestCycle, refresh, toast]);

  const handleAddFinding = useCallback(async () => {
    if (!findingTitle.trim() || !latestCycle) return;
    try {
      await addFinding({ companyId, projectId, cycleId: latestCycle.cycleId, title: findingTitle, description: findingDesc, confidence: 0.75 });
      setFindingTitle("");
      setFindingDesc("");
      await refresh();
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    }
  }, [addFinding, companyId, projectId, latestCycle, findingTitle, findingDesc, refresh, toast]);

  return (
    <Section title="Research">
      <div style={{ display: "grid", gap: 14 }}>
        {latestCycle && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: isRunning ? "#eff6ff" : "#f0fdf4", border: `1px solid ${isRunning ? "#bfdbfe" : "#bbf7d0"}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <StatusBadge status={latestCycle.status} />
              <span style={{ fontSize: 13, color: "#475569" }}>{latestCycle.query}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{latestCycle.findingsCount} findings</span>
            </div>
          </div>
        )}
        <div style={FLEX}>
          <input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Research query (e.g. 'How can we reduce onboarding time?')"
            style={{ ...INPUT, flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
          <button onClick={handleStart} disabled={running || !query.trim()} style={running ? { ...BTN_PRIMARY, opacity: 0.6 } : BTN_PRIMARY}>
            {isRunning ? "In Progress…" : "Start Research"}
          </button>
        </div>
        {isRunning && (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              <input value={findingTitle} onChange={(e: any) => setFindingTitle(e.target.value)} placeholder="Finding title" style={INPUT} />
              <textarea value={findingDesc} onChange={(e: any) => setFindingDesc(e.target.value)} placeholder="Finding description" style={{ ...INPUT, minHeight: 60, resize: "vertical" }} />
              <div style={FLEX}>
                <button onClick={handleAddFinding} style={BTN_PRIMARY}>Add Finding</button>
                <button onClick={handleComplete} style={BTN}>Mark Complete</button>
              </div>
            </div>
          </>
        )}
        {cycles && cycles.length > 0 && (
          <details>
            <summary style={{ fontSize: 13, color: "#64748b", cursor: "pointer" }}>History ({cycles.length} cycles)</summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {cycles.slice(0, 10).map((c) => (
                <div key={c.cycleId} style={{ fontSize: 12, color: "#64748b", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <StatusBadge status={c.status} />
                  {" "}{c.query.slice(0, 60)}{c.query.length > 60 ? "…" : ""} — {c.findingsCount} findings
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Section>
  );
}

// ─── Swipe Section ─────────────────────────────────────────────────────────────
function SwipeSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const recordSwipe = usePluginAction(ACTION_KEYS.recordSwipe);
  const { data: ideas, refresh } = usePluginData<Idea[]>(DATA_KEYS.ideas, { companyId, projectId });
  const { data: profile } = usePluginData<PreferenceProfile>(DATA_KEYS.preferenceProfile, { companyId, projectId });
  const [queue, setQueue] = useState<Idea[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const toast = usePluginToast();

  useEffect(() => {
    if (ideas) {
      const active = ideas.filter((i) => i.status === "active").slice(0, 50);
      setQueue(active);
      setCurrentIndex(0);
    }
  }, [ideas]);

  const current = queue[currentIndex];

  const handleSwipe = useCallback(async (decision: SwipeDecision, note?: string) => {
    if (!current) return;
    try {
      await recordSwipe({ companyId, projectId, ideaId: current.ideaId, decision, note });
      await refresh();
      if (currentIndex < queue.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setCurrentIndex(0);
        setQueue([]);
      }
    } catch (e) {
      toast({ title: `Swipe failed: ${e}`, tone: "error" });
    }
  }, [recordSwipe, companyId, projectId, current, refresh, currentIndex, queue, toast]);

  if (!current) {
    return (
      <Section title="Swipe Review">
        <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 14 }}>
          No ideas in the swipe queue. Ideas will appear here when added.
        </div>
        {profile && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Your Preferences</div>
            <div style={GRID_2}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{profile.yesCount}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Yes</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{profile.maybeCount}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Maybe</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{profile.passCount}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Pass</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>{profile.nowCount}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Now</div></div>
            </div>
          </div>
        )}
      </Section>
    );
  }

  return (
    <Section title={`Swipe Review — ${currentIndex + 1} / ${queue.length}`}>
      <div style={IDEA_CARD}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>{current.title}</div>
        {current.description && <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{current.description}</div>}
        {current.rationale && (
          <div style={{ fontSize: 12, color: "#475569", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, borderLeft: "3px solid #3b82f6" }}>
            Rationale: {current.rationale}
          </div>
        )}
        <div style={FLEX}>
          {current.tags?.map((tag: string) => <span key={tag} style={TAG}>{tag}</span>)}
          {current.category && <span style={{ ...TAG, background: "#eef2ff", color: "#4f46e5" }}>{current.category}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ScoreBar score={current.impactScore} label="Impact" />
          <ScoreBar score={current.feasibilityScore} label="Feasibility" />
        </div>
      </div>

      <div style={SWIPE_BTNS}>
        {(["pass", "maybe", "yes", "now"] as SwipeDecision[]).map((d) => (
          <button
            key={d}
            onClick={() => handleSwipe(d)}
            style={{
              ...BTN,
              background: `${SWIPE_COLORS[d]}18`,
              color: SWIPE_COLORS[d],
              borderColor: `${SWIPE_COLORS[d]}44`,
              fontWeight: 600,
              padding: "12px 8px",
            }}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Ideas Section ─────────────────────────────────────────────────────────────
function IdeasSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const createIdea = usePluginAction(ACTION_KEYS.createIdea);
  const updateIdea = usePluginAction(ACTION_KEYS.updateIdea);
  const { data: ideas, refresh } = usePluginData<Idea[]>(DATA_KEYS.ideas, { companyId, projectId });
  const [tab, setTab] = useState<"active" | "maybe" | "approved" | "all">("active");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const toast = usePluginToast();

  const filtered = useMemo(() => {
    if (!ideas) return [];
    if (tab === "all") return ideas;
    return ideas.filter((i) => i.status === tab);
  }, [ideas, tab]);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const result = await createIdea({ companyId, projectId, title: newTitle.trim(), description: newDesc.trim() }) as { duplicateAnnotated?: boolean; duplicateSimilarity?: number };
      if (result.duplicateAnnotated) {
        toast({ title: `Idea added (marked as duplicate, similarity: ${Math.round((result.duplicateSimilarity ?? 0) * 100)}%)`, tone: "warn" });
      } else {
        toast({ title: "Idea created", tone: "success" });
      }
      setNewTitle("");
      setNewDesc("");
      await refresh();
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    } finally {
      setAdding(false);
    }
  }, [createIdea, companyId, projectId, newTitle, newDesc, refresh, toast]);

  const tabs = [
    { key: "active" as const, label: "Active", count: ideas?.filter((i) => i.status === "active").length ?? 0 },
    { key: "maybe" as const, label: "Maybe", count: ideas?.filter((i) => i.status === "maybe").length ?? 0 },
    { key: "approved" as const, label: "Approved", count: ideas?.filter((i) => i.status === "approved").length ?? 0 },
    { key: "all" as const, label: "All", count: ideas?.length ?? 0 },
  ];

  return (
    <Section title="Ideas">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={FLEX}>
          <input value={newTitle} onChange={(e: any) => setNewTitle(e.target.value)} placeholder="New idea title" style={{ ...INPUT, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <button onClick={handleAdd} disabled={adding || !newTitle.trim()} style={adding ? { ...BTN_PRIMARY, opacity: 0.6 } : BTN_PRIMARY}>
            {adding ? "Adding…" : "Add Idea"}
          </button>
        </div>
        <textarea value={newDesc} onChange={(e: any) => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ ...INPUT, minHeight: 48, resize: "vertical" }} />

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                background: tab === t.key ? "#f8fafc" : "transparent",
                color: tab === t.key ? "#0f172a" : "#94a3b8",
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>No ideas in this category.</div>
          )}
          {filtered.map((idea) => (
            <div key={idea.ideaId} style={IDEA_CARD}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{idea.title}</div>
                  {idea.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{idea.description.slice(0, 100)}{idea.description.length > 100 ? "…" : ""}</div>}
                </div>
                <StatusBadge status={idea.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <ScoreBar score={idea.impactScore} label="Impact" />
                <ScoreBar score={idea.feasibilityScore} label="Feasibility" />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {idea.status === "maybe" && (
                  <button onClick={() => updateIdea({ companyId, projectId, ideaId: idea.ideaId, status: "active" })} style={BTN_SM}>Move to Active</button>
                )}
                {idea.status === "active" && (
                  <button onClick={() => updateIdea({ companyId, projectId, ideaId: idea.ideaId, status: "maybe" })} style={BTN_SM}>Move to Maybe</button>
                )}
                {idea.status === "approved" && (
                  <button onClick={() => updateIdea({ companyId, projectId, ideaId: idea.ideaId, status: "active" })} style={BTN_SM}>Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Preference Profile Section ────────────────────────────────────────────────
function PreferenceSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const { data: profile } = usePluginData<PreferenceProfile>(DATA_KEYS.preferenceProfile, { companyId, projectId });

  if (!profile) {
    return (
      <Section title="Preference Profile">
        <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>
          No preference data yet. Start swiping ideas to build your profile.
        </div>
      </Section>
    );
  }

  const catEntries = Object.entries(profile.categoryPreferences).sort((a, b) => (b[1].yes + b[1].now) - (a[1].yes + a[1].now));
  const tagEntries = Object.entries(profile.tagPreferences).sort((a, b) => (b[1].yes + b[1].now) - (a[1].yes + a[1].now));

  const approvalRate = profile.totalSwipes > 0
    ? Math.round(((profile.yesCount + profile.nowCount) / profile.totalSwipes) * 100)
    : 0;

  return (
    <Section title="Preference Profile">
      <div style={{ display: "grid", gap: 16 }}>
        <div style={GRID_3}>
          <div style={{ textAlign: "center", padding: 12, background: "#f0fdf4", borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{profile.yesCount + profile.nowCount}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Approved</div>
          </div>
          <div style={{ textAlign: "center", padding: 12, background: "#fffbeb", borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{profile.maybeCount}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Maybe</div>
          </div>
          <div style={{ textAlign: "center", padding: 12, background: "#fef2f2", borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>{profile.passCount}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Passed</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Approval Rate: {approvalRate}%</div>
          <div style={{ height: 8, borderRadius: 4, background: "#e2e8f0" }}>
            <div style={{ height: "100%", width: `${approvalRate}%`, background: "#22c55e", borderRadius: 4 }} />
          </div>
        </div>
        {catEntries.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Category Preferences</div>
            {catEntries.slice(0, 6).map(([cat, prefs]: [string, { pass: number; maybe: number; yes: number; now: number }]) => (
              <div key={cat} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 12 }}>
                <span style={{ minWidth: 100, color: "#475569" }}>{cat}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, ((prefs.yes + prefs.now) / Math.max(1, prefs.pass + prefs.maybe + prefs.yes + prefs.now)) * 100)}%`, background: "#22c55e" }} />
                </div>
                <span style={{ minWidth: 30, textAlign: "right", color: "#94a3b8" }}>{prefs.yes + prefs.now}</span>
              </div>
            ))}
          </div>
        )}
        {tagEntries.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Top Tags</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tagEntries.slice(0, 12).map(([tag, prefs]: [string, { pass: number; maybe: number; yes: number; now: number }]) => (
                <span key={tag} style={{ ...TAG, background: prefs.yes + prefs.now > prefs.pass ? "#f0fdf4" : "#fef2f2", color: prefs.yes + prefs.now > prefs.pass ? "#16a34a" : "#dc2626" }}>
                  {tag} ({prefs.yes + prefs.now})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Delivery Runs Section ──────────────────────────────────────────────────────
function DeliveryRunsSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const createRun = usePluginAction(ACTION_KEYS.createDeliveryRun);
  const completeRun = usePluginAction(ACTION_KEYS.completeDeliveryRun);
  const pauseRun = usePluginAction(ACTION_KEYS.pauseDeliveryRun);
  const resumeRun = usePluginAction(ACTION_KEYS.resumeDeliveryRun);
  const { data: runs, refresh } = usePluginData<DeliveryRun[]>(DATA_KEYS.deliveryRuns, { companyId, projectId });
  const { data: ideas } = usePluginData<Idea[]>(DATA_KEYS.ideas, { companyId, projectId });
  const [selectedIdea, setSelectedIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const toast = usePluginToast();

  const approvedIdeas = useMemo(() => ideas?.filter((i) => i.status === "approved") ?? [], [ideas]);

  const handleCreate = useCallback(async () => {
    if (!selectedIdea) return;
    setCreating(true);
    try {
      await createRun({ companyId, projectId, ideaId: selectedIdea });
      setSelectedIdea("");
      await refresh();
      toast({ title: "Delivery run created", tone: "success" });
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    } finally {
      setCreating(false);
    }
  }, [createRun, companyId, projectId, selectedIdea, refresh, toast]);

  return (
    <Section title="Delivery Runs">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={FLEX}>
          <select value={selectedIdea} onChange={(e: any) => setSelectedIdea(e.target.value)} style={{ ...INPUT, flex: 1 }}>
            <option value="">Select approved idea…</option>
            {approvedIdeas.map((i) => <option key={i.ideaId} value={i.ideaId}>{i.title}</option>)}
          </select>
          <button onClick={handleCreate} disabled={creating || !selectedIdea} style={creating ? { ...BTN_PRIMARY, opacity: 0.6 } : BTN_PRIMARY}>
            {creating ? "Creating…" : "Create Run"}
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {!runs || runs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>No delivery runs yet.</div>
          ) : runs.map((run) => (
            <div key={run.runId} style={{ ...IDEA_CARD, padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{run.title}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {run.branchName} · {run.status} · {run.automationTier}
                  </div>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {run.status === "running" && <button onClick={() => pauseRun({ companyId, projectId, runId: run.runId }).then(refresh)} style={BTN_SM}>Pause</button>}
                {run.status === "paused" && <button onClick={() => resumeRun({ companyId, projectId, runId: run.runId }).then(refresh)} style={BTN_SM}>Resume</button>}
                {run.status === "running" && <button onClick={() => completeRun({ companyId, projectId, runId: run.runId, status: "completed", commitSha: run.commitSha ?? undefined }).then(refresh)} style={{ ...BTN_SM, background: "#22c55e", color: "#fff" }}>Complete</button>}
                {run.status === "running" && <button onClick={() => completeRun({ companyId, projectId, runId: run.runId, status: "failed" }).then(refresh)} style={BTN_DANGER}>Fail</button>}
                {run.prUrl && <a href={run.prUrl} target="_blank" rel="noopener noreferrer" style={{ ...BTN_SM, textDecoration: "none" }}>View PR ↗</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Convoy Tasks Section ──────────────────────────────────────────────────────
function ConvoySection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const { data: tasks, refresh } = usePluginData<ConvoyTask[]>(DATA_KEYS.convoyTasks, { companyId, projectId });
  const updateStatus = usePluginAction(ACTION_KEYS.updateConvoyTaskStatus);

  const grouped = useMemo(() => {
    const map = new Map<string, ConvoyTask[]>();
    for (const task of tasks ?? []) {
      const existing = map.get(task.runId) ?? [];
      existing.push(task);
      map.set(task.runId, existing);
    }
    return map;
  }, [tasks]);

  return (
    <Section title="Convoy Tasks">
      <div style={{ display: "grid", gap: 12 }}>
        {grouped.size === 0 && <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>No convoy tasks. Create a delivery run to decompose tasks.</div>}
        {[...grouped.entries()].map(([runId, runTasks]) => (
          <details key={runId} open style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px" }}>
            <summary style={{ fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
              Run {runId.slice(0, 8)}… ({runTasks.length} tasks)
            </summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {runTasks.map((task) => (
                <div key={task.taskId} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
                  <StatusBadge status={task.status} />
                  <span style={{ flex: 1, fontSize: 13, color: "#334155" }}>{task.title}</span>
                  {task.status === "pending" && (
                    <button onClick={() => updateStatus({ companyId, projectId, taskId: task.taskId, status: "running" as ConvoyTaskStatus }).then(refresh)} style={BTN_SM}>Start</button>
                  )}
                  {task.status === "running" && (
                    <>
                      <button onClick={() => updateStatus({ companyId, projectId, taskId: task.taskId, status: "passed" as ConvoyTaskStatus }).then(refresh)} style={{ ...BTN_SM, background: "#22c55e", color: "#fff" }}>Pass</button>
                      <button onClick={() => updateStatus({ companyId, projectId, taskId: task.taskId, status: "failed" as ConvoyTaskStatus }).then(refresh)} style={BTN_DANGER}>Fail</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}

// ─── Checkpoint Section ────────────────────────────────────────────────────────
function CheckpointSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const createCheckpoint = usePluginAction(ACTION_KEYS.createCheckpoint);
  const resumeFromCheckpoint = usePluginAction(ACTION_KEYS.resumeFromCheckpoint);
  const { data: runs } = usePluginData<DeliveryRun[]>(DATA_KEYS.deliveryRuns, { companyId, projectId });
  const { data: checkpoints, refresh } = usePluginData<Checkpoint[]>(DATA_KEYS.checkpoints, { companyId, projectId });
  const [selectedRun, setSelectedRun] = useState("");
  const [label, setLabel] = useState("");
  const toast = usePluginToast();

  const handleCreate = useCallback(async () => {
    if (!selectedRun) return;
    try {
      await createCheckpoint({ companyId, projectId, runId: selectedRun, label: label || undefined });
      setLabel("");
      await refresh();
      toast({ title: "Checkpoint created", tone: "success" });
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    }
  }, [createCheckpoint, companyId, projectId, selectedRun, label, refresh, toast]);

  const handleResume = useCallback(async (checkpointId: string) => {
    try {
      await resumeFromCheckpoint({ companyId, projectId, runId: selectedRun, checkpointId });
      toast({ title: "Resumed from checkpoint", tone: "success" });
    } catch (e) {
      toast({ title: `Failed: ${e}`, tone: "error" });
    }
  }, [resumeFromCheckpoint, companyId, projectId, selectedRun, toast]);

  const filtered = checkpoints?.filter((c) => !selectedRun || c.runId === selectedRun) ?? [];

  return (
    <Section title="Checkpoints">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={FLEX}>
          <select value={selectedRun} onChange={(e: any) => setSelectedRun(e.target.value)} style={{ ...INPUT, flex: 1 }}>
            <option value="">All runs</option>
            {runs?.map((r) => <option key={r.runId} value={r.runId}>{r.title.slice(0, 50)}</option>)}
          </select>
          <input value={label} onChange={(e: any) => setLabel(e.target.value)} placeholder="Checkpoint label (optional)" style={{ ...INPUT, flex: 1 }} />
          <button onClick={handleCreate} disabled={!selectedRun} style={!selectedRun ? { ...BTN_PRIMARY, opacity: 0.6 } : BTN_PRIMARY}>Save Checkpoint</button>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>No checkpoints yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {filtered.map((cp) => (
              <div key={cp.checkpointId} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 10, fontSize: 13 }}>
                <span style={{ flex: 1, color: "#334155" }}>{(cp.label ?? `Checkpoint ${cp.checkpointId.slice(0, 8)}`) + " · " + new Date(cp.createdAt).toLocaleDateString()}</span>
                <button onClick={() => handleResume(cp.checkpointId)} style={BTN_SM}>Resume</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Digests / Alerts Section ──────────────────────────────────────────────────
function DigestsSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const dismissDigest = usePluginAction(ACTION_KEYS.dismissDigest);
  const { data: digests, refresh } = usePluginData<Digest[]>(DATA_KEYS.digests, { companyId, projectId });
  const PRIORITY_COLORS: Record<string, string> = { critical: "#dc2626", high: "#f97316", medium: "#f59e0b", low: "#94a3b8" };

  const handleDismiss = useCallback(async (digestId: string) => {
    try {
      await dismissDigest({ companyId, projectId, digestId });
      await refresh();
    } catch (e) {
      // ignore
    }
  }, [dismissDigest, companyId, projectId, refresh]);

  const unread = digests?.filter((d) => d.status !== "dismissed") ?? [];

  return (
    <Section title="Alerts & Digests">
      {unread.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>No pending alerts.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {unread.map((d) => (
            <div key={d.digestId} style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${PRIORITY_COLORS[d.priority]}33`,
              background: `${PRIORITY_COLORS[d.priority]}08`,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ ...TAG, background: `${PRIORITY_COLORS[d.priority]}18`, color: PRIORITY_COLORS[d.priority] }}>{d.priority}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{d.digestType}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{d.summary}</div>
                </div>
                <button onClick={() => handleDismiss(d.digestId)} style={{ ...BTN_SM, flexShrink: 0 }}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Learner & Knowledge Section ───────────────────────────────────────────────
function LearnerSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const { data: summaries } = usePluginData<LearnerSummary[]>(DATA_KEYS.learnerSummaries, { companyId, projectId });
  const { data: knowledge } = usePluginData<KnowledgeEntry[]>(DATA_KEYS.knowledgeEntries, { companyId, projectId });

  return (
    <Section title="Learner & Knowledge">
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Run Summaries</div>
          {!summaries || summaries.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>No learner summaries yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {summaries.slice(0, 5).map((s) => (
                <div key={s.summaryId} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.title}</div>
                  <div style={{ color: "#64748b", marginTop: 2 }}>{s.summaryText.slice(0, 120)}{s.summaryText.length > 120 ? "…" : ""}</div>
                  {s.keyLearnings.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {s.keyLearnings.map((l: string) => <span key={l} style={{ ...TAG, background: "#eef2ff", color: "#4f46e5" }}>{l}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Knowledge Entries</div>
          {!knowledge || knowledge.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>No knowledge entries yet.</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knowledge.map((e) => (
                <span key={e.entryId} style={{ ...TAG, background: "#f0fdf4", color: "#16a34a" }} title={e.content.slice(0, 100)}>
                  {e.title} ({e.usageCount}×)
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ─── Main Tab Component ────────────────────────────────────────────────────────
export function AutopilotProjectTab({ context }: PluginDetailTabProps) {
  const { companyId, entityId: projectId } = context ?? {};
  const { data: project } = usePluginData<AutopilotProject>(DATA_KEYS.autopilotProject, { companyId: companyId ?? "", projectId: projectId ?? "" });
  const { data: overview } = usePluginData<AutopilotOverview>("autopilot-overview", { companyId: companyId ?? "", projectId: projectId ?? "" });

  if (!companyId || !projectId) return <div style={PAGE}><LoadingState message="Loading Autopilot…" /></div>;

  return (
    <div style={PAGE}>
      {overview && <StatsRow overview={overview} />}
      <ProjectSettingsForm project={project ?? undefined} companyId={companyId} projectId={projectId} />
      <ResearchSection companyId={companyId} projectId={projectId} />
      <SwipeSection companyId={companyId} projectId={projectId} />
      <IdeasSection companyId={companyId} projectId={projectId} />
      <PreferenceSection companyId={companyId} projectId={projectId} />
      <DeliveryRunsSection companyId={companyId} projectId={projectId} />
      <ConvoySection companyId={companyId} projectId={projectId} />
      <CheckpointSection companyId={companyId} projectId={projectId} />
      <DigestsSection companyId={companyId} projectId={projectId} />
      <LearnerSection companyId={companyId} projectId={projectId} />
    </div>
  );
}

// ─── Sidebar Link ──────────────────────────────────────────────────────────────
export function AutopilotSidebarLink({ context }: PluginProjectSidebarItemProps) {
  const { entityId: projectId, companyId } = context ?? {};
  const { data: project } = usePluginData<AutopilotProject>(DATA_KEYS.autopilotProject, { companyId: companyId ?? "", projectId: projectId ?? "" });

  if (!project) return null;

  return (
    <div style={{ padding: "8px 16px", fontSize: 13, color: project.enabled ? "#22c55e" : "#94a3b8" }}>
      <StatusBadge status={project.enabled ? "active" : "inactive"} />
      {" "}Autopilot
      {project.paused && " · Paused"}
    </div>
  );
}

// ─── Project Widget ────────────────────────────────────────────────────────────
export function AutopilotProjectWidget({ context }: PluginWidgetProps) {
  const { companyId, entityId: projectId } = context ?? {};
  const { data: overview } = usePluginData<AutopilotOverview>("autopilot-overview", { companyId: companyId ?? "", projectId: projectId ?? "" });

  if (!overview) return <LoadingState />;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Product Autopilot</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{overview.activeIdeasCount}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Ideas</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>{overview.runningRunsCount}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Runs</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{overview.maybePoolCount}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Maybe</div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Widget ──────────────────────────────────────────────────────────
// NOTE: dashboardWidget slot is registered in manifest — this component uses PluginWidgetProps
export function AutopilotDashboardWidget({ context }: PluginWidgetProps) {
  const { companyId } = context ?? {};
  const { data: overview } = usePluginData<AutopilotOverview>("autopilot-overview", { companyId: companyId ?? "", projectId: "" });

  if (!overview) return <LoadingState />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Product Autopilot</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ textAlign: "center", padding: 10, background: "#f0fdf4", borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{overview.completedRunsCount}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Completed Runs</div>
        </div>
        <div style={{ textAlign: "center", padding: 10, background: "#fef2f2", borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>{overview.failedRunsCount}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Failed Runs</div>
        </div>
        <div style={{ textAlign: "center", padding: 10, background: "#eff6ff", borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{overview.budgetUsagePercent}%</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Budget Used</div>
        </div>
        <div style={{ textAlign: "center", padding: 10, background: "#fffbeb", borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{overview.totalSwipesToday}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Swipes Today</div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page (stub — slot removed) ───────────────────────────────────────
export function AutopilotSettings(_props: { context?: any }) {
  return null;
}

// ─── Run Detail Tab (stub — slot removed) ──────────────────────────────────────
export function AutopilotRunDetailTab(_props: { context?: any }) {
  return null;
}

export default { AutopilotProjectTab, AutopilotSidebarLink, AutopilotProjectWidget, AutopilotDashboardWidget, AutopilotSettings, AutopilotRunDetailTab };
