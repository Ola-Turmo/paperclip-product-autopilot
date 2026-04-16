import React from "react";
import { createRoot } from "react-dom/client";
import { DATA_KEYS } from "../src/constants.js";
import uiModule from "../src/ui/index.js";
import { PreviewProvider } from "./mock-plugin-ui.js";

function makeKey(key: string, args?: unknown) {
  return JSON.stringify([key, args ?? null]);
}

function buildProjectData() {
  const project = {
      autopilotId: "ap-1",
      companyId: "company-kommune",
      projectId: "innbyggerdialog",
      enabled: true,
      automationTier: "semiauto",
      budgetMinutes: 240,
      repoUrl: "https://github.com/kommune/innbyggerdialog",
      workspaceId: "/workspace/innbyggerdialog",
      liveUrl: "https://kommune.no/innbyggerdialog",
      productType: "kommune-tjeneste",
      agentId: "agent-kommune-1",
      paused: false,
      researchScheduleCron: "0 8 * * 1",
      ideationScheduleCron: "0 9 * * 1",
      maybePoolResurfaceDays: 14,
      maxIdeasPerCycle: 8,
      autoCreateIssues: true,
      autoCreatePrs: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
  return [
    [makeKey(DATA_KEYS.autopilotProject, { companyId: "company-kommune", projectId: "innbyggerdialog" }), project],
    [makeKey(DATA_KEYS.autopilotProjects, { companyId: "company-kommune" }), [project]],
    [makeKey("autopilot-overview", { companyId: "company-kommune", projectId: "innbyggerdialog" }), {
      projectCount: 1,
      enabledCount: 1,
      pausedCount: 0,
      activeIdeasCount: 9,
      maybePoolCount: 3,
      approvedIdeasCount: 4,
      runningRunsCount: 2,
      completedRunsCount: 17,
      failedRunsCount: 1,
      totalSwipesToday: 11,
      budgetUsagePercent: 64,
    }],
    [makeKey(DATA_KEYS.researchCycles, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        cycleId: "cycle-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        status: "completed",
        query: "Finn friksjon i digitale kommunale skjemaer og selvbetjening",
        findingsCount: 14,
        snapshot: {
          findingIds: ["f1", "f2"],
          topicCounts: { "digitale-skjema": 5, "universell-utforming": 4, "innlogging": 3 },
          signalFamilyCounts: { support: 6, analytics: 5, qualitative: 3 },
          averageFreshnessScore: 82,
          averageSourceQualityScore: 76,
          duplicateCount: 2,
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T02:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.companyBudget, { companyId: "company-kommune" }), {
      budgetId: "budget-1",
      companyId: "company-kommune",
      totalBudgetMinutes: 1200,
      usedBudgetMinutes: 680,
      autopilotBudgetMinutes: 240,
      autopilotUsedMinutes: 154,
      paused: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }],
    [makeKey(DATA_KEYS.preferenceProfile, { companyId: "company-kommune", projectId: "innbyggerdialog" }), {
      profileId: "profile-1",
      companyId: "company-kommune",
      projectId: "innbyggerdialog",
      passCount: 2,
      maybeCount: 2,
      yesCount: 4,
      nowCount: 3,
      totalSwipes: 11,
      categoryPreferences: {
        user_feedback: { pass: 1, maybe: 1, yes: 3, now: 2 },
        accessibility: { pass: 0, maybe: 1, yes: 1, now: 1 },
      },
      tagPreferences: {
        "universell-utforming": { pass: 0, maybe: 0, yes: 2, now: 2 },
        "digitalt-skjema": { pass: 1, maybe: 1, yes: 2, now: 1 },
      },
      complexityPreferences: {
        low: { pass: 0, maybe: 0, yes: 2, now: 1 },
        medium: { pass: 1, maybe: 2, yes: 2, now: 2 },
      },
      avgApprovedScore: 81,
      avgRejectedScore: 39,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    }],
    [makeKey(DATA_KEYS.digests, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        digestId: "digest-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        digestType: "stuck_run",
        title: "Integrasjon mot ID-porten står fast",
        summary: "Kjøringen har ikke oppdatert seg på 48 minutter.",
        details: [
          "Sjekk tilgang til testmiljø.",
          "Vurder checkpoint før videre utrulling.",
        ],
        priority: "critical",
        urgency: "intervention_required",
        recommendedAction: "Se på kjøringen umiddelbart og avgjør om den skal pauses eller checkpointes.",
        escalationLevel: 2,
        reopenCount: 1,
        status: "pending",
        deliveredAt: null,
        readAt: null,
        dismissedAt: null,
        relatedRunId: "run-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        digestId: "digest-2",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        digestType: "budget_alert",
        title: "Autopilot bruker mye budsjett denne uken",
        summary: "64% av ukesbudsjettet er allerede brukt.",
        details: ["Følg med på to aktive leveringsløp."],
        priority: "medium",
        urgency: "attention",
        recommendedAction: "Vurder å stramme inn til supervised for neste løp.",
        status: "pending",
        deliveredAt: null,
        readAt: null,
        dismissedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.ideas, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        ideaId: "idea-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        title: "Forenkle skjema for søknad om parkeringstillatelse",
        description: "Innbyggere faller fra i steg 2 når vedlegg blir uklare.",
        rationale: "category=user_feedback, preferenceBoost=0.8, complexityPreferenceBoost=0.2, outcomeBoost=0.4, evidence=Høy andel avbrudd i steg 2.",
        sourceReferences: ["https://kommune.no/analytics/parking-form"],
        impactScore: 85,
        feasibilityScore: 72,
        complexityEstimate: "medium",
        category: "user_feedback",
        tags: ["digitalt-skjema", "parkering"],
        status: "active",
        duplicateAnnotated: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        ideaId: "idea-2",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        title: "Bedre universell utforming i innloggingsflyt",
        description: "Skjermlesere leser feilmeldinger for sent.",
        rationale: "category=accessibility, preferenceBoost=0.9, complexityPreferenceBoost=0.1, outcomeBoost=0.5, evidence=Brukertest og supportsaker peker samme vei.",
        sourceReferences: ["https://kommune.no/accessibility/report"],
        impactScore: 88,
        feasibilityScore: 66,
        complexityEstimate: "medium",
        category: "accessibility",
        tags: ["universell-utforming", "innlogging"],
        status: "maybe",
        duplicateAnnotated: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.deliveryRuns, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        runId: "run-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        ideaId: "idea-1",
        artifactId: "artifact-1",
        title: "Forenkle parkeringstillatelse",
        status: "running",
        automationTier: "semiauto",
        branchName: "autopilot/innbyggerdialog/parkering",
        workspacePath: "/workspace/innbyggerdialog",
        leasedPort: 3102,
        commitSha: null,
        paused: false,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        runId: "run-2",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        ideaId: "idea-3",
        artifactId: "artifact-2",
        title: "Rydd opp i meldingslogikk",
        status: "failed",
        automationTier: "supervised",
        branchName: "autopilot/innbyggerdialog/meldinger",
        workspacePath: "/workspace/innbyggerdialog",
        leasedPort: 3103,
        commitSha: null,
        paused: false,
        error: "Build failed because a required locale key is missing.",
        completedAt: "2026-01-02T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.learnerSummaries, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        summaryId: "summary-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        ideaId: "idea-1",
        title: "Lærdom fra skjema-forenkling",
        summaryText: "Små tekstendringer ga stor effekt når vedleggskrav ble forklart tidligere.",
        keyLearnings: ["Tidlig tydelighet slår sen detaljering"],
        skillsReinjected: ["release-health checks"],
        metrics: { duration: 180, commits: 4, testsAdded: 3, testsPassed: 28, filesChanged: 9 },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.knowledgeEntries, { companyId: "company-kommune", projectId: "innbyggerdialog" }), [
      {
        entryId: "knowledge-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        knowledgeType: "pattern",
        title: "Bruk konkret hjelpetekst før filopplasting",
        content: "Kommunale skjema fungerer bedre når vedleggskrav forklares før opplasting starter.",
        usageCount: 3,
        tags: ["digitalt-skjema", "hjelpetekst"],
        sourceRunId: "run-1",
        usedInRunId: "run-1",
        lastUsedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
  ] as Array<[string, unknown]>;
}

function buildRunData() {
  const shared = buildProjectData();
  return [
    ...shared,
    [makeKey(DATA_KEYS.deliveryRun, { companyId: "company-kommune", projectId: "innbyggerdialog", runId: "run-1" }), {
      runId: "run-1",
      companyId: "company-kommune",
      projectId: "innbyggerdialog",
      ideaId: "idea-1",
      artifactId: "artifact-1",
      title: "Forenkle parkeringstillatelse",
      status: "running",
      automationTier: "semiauto",
      branchName: "autopilot/innbyggerdialog/parkering",
      workspacePath: "/workspace/innbyggerdialog",
      leasedPort: 3102,
      commitSha: null,
      paused: false,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }],
    [makeKey(DATA_KEYS.checkpoints, { companyId: "company-kommune", projectId: "innbyggerdialog", runId: "run-1" }), [
      {
        checkpointId: "checkpoint-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        label: "Før test i staging",
        snapshotState: {},
        taskStates: { "task-1": "passed", "task-2": "running" },
        workspaceSnapshot: {
          branchName: "autopilot/innbyggerdialog/parkering",
          commitSha: "abc123",
          workspacePath: "/workspace/innbyggerdialog",
          leasedPort: 3102,
        },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.releaseHealthChecks, { companyId: "company-kommune", projectId: "innbyggerdialog", runId: "run-1" }), [
      {
        checkId: "check-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        checkType: "smoke_test",
        name: "Staging smoke",
        status: "failed",
        errorMessage: "Network timeout while validating ID-porten callback.",
        failedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        checkId: "check-2",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        checkType: "merge_check",
        name: "Merge readiness",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.rollbackActions, { companyId: "company-kommune", projectId: "innbyggerdialog", runId: "run-1" }), [
      {
        rollbackId: "rollback-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        checkId: "check-1",
        rollbackType: "restore_checkpoint",
        status: "pending",
        checkpointId: "checkpoint-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
    [makeKey(DATA_KEYS.planningArtifact, { companyId: "company-kommune", projectId: "innbyggerdialog", artifactId: "artifact-1" }), {
      artifactId: "artifact-1",
      companyId: "company-kommune",
      projectId: "innbyggerdialog",
      ideaId: "idea-1",
      title: "Plan for forenkling av parkeringstillatelse",
      goalAlignmentSummary: "Mindre frafall i søknadsløpet.",
      implementationSpec: "Kortere steg, tydelig vedleggstekst og bedre feltvalidering.",
      dependencies: ["id-porten", "saksbehandling-api"],
      rolloutPlan: "Staging, deretter begrenset produksjon.",
      testPlan: "Smoke, tilgjengelighet og skjematest.",
      approvalChecklist: ["Produktgodkjenning", "UU-vurdering"],
      executionMode: "convoy",
      approvalMode: "manual",
      checkpointRequired: true,
      checkpointReason: "Convoy-løp med integrasjonsendringer krever checkpoint.",
      automationTier: "semiauto",
      status: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }],
    [makeKey(DATA_KEYS.operatorInterventions, { companyId: "company-kommune", projectId: "innbyggerdialog", runId: "run-1" }), [
      {
        interventionId: "intervention-1",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        interventionType: "note",
        note: "Sjekk spesielt universell utforming før videre utrulling.",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        interventionId: "intervention-2",
        companyId: "company-kommune",
        projectId: "innbyggerdialog",
        runId: "run-1",
        interventionType: "checkpoint_request",
        note: "Checkpoint før ny deploy.",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]],
  ] as Array<[string, unknown]>;
}

function getSurface() {
  const params = new URLSearchParams(window.location.search);
  return params.get("surface") ?? "project-tab";
}

function getSurfaceData(surface: string) {
  if (surface === "run-detail") return buildRunData();
  return buildProjectData();
}

function getSurfaceMeta(surface: string) {
  switch (surface) {
    case "dashboard-widget":
      return {
        title: "Dashboard Widget",
        description: "Kompakt sammendrag for kommuneledelse og operatører.",
      };
    case "project-widget":
      return {
        title: "Project Widget",
        description: "Prosjektkort for status i en konkret kommunal tjeneste.",
      };
    case "settings":
      return {
        title: "Settings Page",
        description: "Sentralt oppsett for kommunenivå og tverrgående styring.",
      };
    case "run-detail":
      return {
        title: "Run Detail",
        description: "Operativ visning for pågående eller feilet leveringsløp.",
      };
    case "sidebar":
      return {
        title: "Sidebar Item",
        description: "Kompakt inngangspunkt i prosjektets navigasjon.",
      };
    default:
      return {
        title: "Project Tab",
        description: "Hovedflate for styring av en kommunal digital tjeneste.",
      };
  }
}

function renderSurface(surface: string) {
  switch (surface) {
    case "dashboard-widget":
      return <uiModule.AutopilotDashboardWidget context={{ companyId: "company-kommune", projectId: "innbyggerdialog", entityId: "innbyggerdialog" }} />;
    case "project-widget":
      return <uiModule.AutopilotProjectWidget context={{ companyId: "company-kommune", projectId: "innbyggerdialog", entityId: "innbyggerdialog" }} />;
    case "settings":
      return <uiModule.AutopilotSettings context={{ companyId: "company-kommune" }} />;
    case "run-detail":
      return <uiModule.AutopilotRunDetailTab context={{ companyId: "company-kommune", projectId: "innbyggerdialog", entityId: "run-1" }} />;
    case "sidebar":
      return <uiModule.AutopilotSidebarLink context={{ companyId: "company-kommune", entityId: "innbyggerdialog" }} />;
    default:
      return <uiModule.AutopilotProjectTab context={{ companyId: "company-kommune", entityId: "innbyggerdialog" }} />;
  }
}

const surface = getSurface();
const meta = getSurfaceMeta(surface);
const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <PreviewProvider data={getSurfaceData(surface)}>
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#0B3444",
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: "0 auto",
            padding: "28px 24px 40px",
            display: "grid",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "20px 24px",
              borderRadius: 20,
              background: "#ffffff",
              color: "#0B3444",
              boxShadow: "0 20px 50px rgba(11, 52, 68, 0.08)",
              border: "1px solid rgba(11, 52, 68, 0.08)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#115E59" }}>
              Kommune-preview
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "\"Playfair Display\", Georgia, serif" }}>{meta.title}</div>
            <div style={{ fontSize: 15, color: "rgba(11, 52, 68, 0.72)", maxWidth: 760 }}>{meta.description}</div>
          </div>
          <div>{renderSurface(surface)}</div>
        </div>
      </div>
    </PreviewProvider>
  </React.StrictMode>,
);
