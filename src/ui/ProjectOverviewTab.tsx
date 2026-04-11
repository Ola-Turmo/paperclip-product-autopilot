import React from 'react';
import { PluginLayout } from './layout.js';
import { Card } from './components.js';
import { Button } from './components.js';
import { Badge } from './components.js';
import { MetricCard } from './components.js';
import { ScoreBar } from './components.js';
import { LoadingState } from './components.js';
import { EmptyState } from './components.js';
import type { AutopilotProject, Idea, DeliveryRun, ResearchCycle } from '../types/entities.js';

interface ProjectOverviewTabProps {
  companyId: string;
  projectId: string;
  projectName: string;
  autopilotProject?: AutopilotProject;
  ideas: Idea[];
  runs: DeliveryRun[];
  cycles: ResearchCycle[];
  onStartResearch: () => void;
  onGenerateIdeas: () => void;
  onPause: () => void;
  onResume: () => void;
  loading?: boolean;
}

export function ProjectOverviewTab({
  companyId,
  projectId,
  projectName,
  autopilotProject,
  ideas = [],
  runs = [],
  cycles = [],
  onStartResearch,
  onGenerateIdeas,
  onPause,
  onResume,
  loading = false,
}: ProjectOverviewTabProps) {
  if (!autopilotProject) {
    return (
      <PluginLayout title="Overview" subtitle={projectName}>
        <EmptyState
          icon="🚀"
          title="Autopilot not enabled"
          description="Enable Product Autopilot to start generating ideas from research and product programs."
          action={<Button variant="primary">Enable Autopilot</Button>}
        />
      </PluginLayout>
    );
  }

  if (loading) {
    return (
      <PluginLayout title="Overview" subtitle={projectName}>
        <LoadingState message="Loading project overview..." />
      </PluginLayout>
    );
  }

  const pendingIdeas = ideas.filter(i => i.status === 'pending').length;
  const approvedIdeas = ideas.filter(i => i.status === 'approved').length;
  const inProgressRuns = runs.filter(r => r.status === 'running' || r.status === 'review').length;
  const completedRuns = runs.filter(r => r.status === 'merged').length;
  const latestCycle = cycles.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

  const automationTierLabels: Record<string, { label: string; emoji: string; color: string }> = {
    'supervised': { label: 'Supervised', emoji: '👁', color: '#6b7280' },
    'semi-auto': { label: 'Semi-Auto', emoji: '⚡', color: '#2563eb' },
    'full-auto': { label: 'Full Auto', emoji: '🚀', color: '#10b981' },
  };
  const tier = automationTierLabels[autopilotProject.automationTier] ?? automationTierLabels['supervised'];

  return (
    <PluginLayout
      title="Overview"
      subtitle={projectName}
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge variant={autopilotProject.status === 'active' ? 'success' : autopilotProject.status === 'paused' ? 'warning' : 'default'}>
            {autopilotProject.status}
          </Badge>
          <span style={{ fontSize: '14px', color: tier.color }}>
            {tier.emoji} {tier.label}
          </span>
        </div>
      }
    >
      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <Button variant="primary" onClick={onStartResearch} disabled={autopilotProject.status !== 'active'}>
          🔬 Start Research
        </Button>
        <Button variant="secondary" onClick={onGenerateIdeas} disabled={autopilotProject.status !== 'active'}>
          💡 Generate Ideas
        </Button>
        <div style={{ flex: 1 }} />
        {autopilotProject.status === 'active' ? (
          <Button variant="ghost" onClick={onPause}>
            ⏸ Pause Autopilot
          </Button>
        ) : (
          <Button variant="secondary" onClick={onResume}>
            ▶ Resume Autopilot
          </Button>
        )}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <MetricCard
          label="Total Ideas"
          value={ideas.length}
          icon="💡"
        />
        <MetricCard
          label="Pending Review"
          value={pendingIdeas}
          change={pendingIdeas > 0 ? `${pendingIdeas} need swiping` : undefined}
          changeType="neutral"
          icon="👆"
        />
        <MetricCard
          label="Approved"
          value={approvedIdeas}
          icon="✅"
        />
        <MetricCard
          label="Active Runs"
          value={inProgressRuns}
          change={completedRuns > 0 ? `${completedRuns} completed` : undefined}
          changeType="positive"
          icon="🚀"
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Latest Research */}
        <Card>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            🔬 Latest Research
          </h3>
          {latestCycle ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Badge variant={
                  latestCycle.status === 'completed' ? 'success' :
                  latestCycle.status === 'running' ? 'info' :
                  latestCycle.status === 'failed' ? 'danger' : 'default'
                }>
                  {latestCycle.status}
                </Badge>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {new Date(latestCycle.startedAt).toLocaleDateString()}
                </span>
              </div>
              {latestCycle.reportSummary && (
                <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
                  {latestCycle.reportSummary}
                </p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              No research cycles yet.{' '}
              <button onClick={onStartResearch} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '14px' }}>
                Start one now
              </button>
            </p>
          )}
        </Card>

        {/* Right: Automation Status */}
        <Card>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            ⚙️ Automation Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Automation Tier</span>
              <span style={{ color: tier.color, fontWeight: 500 }}>{tier.emoji} {tier.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Research</span>
              <span style={{ color: '#374151' }}>
                {autopilotProject.schedulePolicy?.researchEnabled ? `Cron: ${autopilotProject.schedulePolicy.researchCron ?? 'daily'}` : 'Disabled'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Ideation</span>
              <span style={{ color: '#374151' }}>
                {autopilotProject.schedulePolicy?.ideationEnabled ? `Cron: ${autopilotProject.schedulePolicy.ideationCron ?? 'daily'}` : 'Disabled'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Budget Policy</span>
              <span style={{ color: '#374151' }}>
                {autopilotProject.budgetPolicy?.monthlyProjectLimit != null
                  ? `$${autopilotProject.budgetPolicy.monthlyProjectLimit}/mo`
                  : 'No limit'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top-scored pending ideas */}
      {pendingIdeas > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
            💡 Top Pending Ideas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ideas
              .filter(i => i.status === 'pending')
              .slice(0, 3)
              .map(idea => (
                <Card key={idea.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{idea.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{idea.summary.slice(0, 120)}{idea.summary.length > 120 ? '...' : ''}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                      <ScoreBar value={idea.impactScore} label="Impact" />
                      <ScoreBar value={idea.feasibilityScore} label="Feasibility" />
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}
    </PluginLayout>
  );
}
