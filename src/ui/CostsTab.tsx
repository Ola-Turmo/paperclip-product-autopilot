// CostsTab — budget caps, usage bars, and alerts
import React from 'react';
import { Card } from './components.js';
import { Badge } from './components.js';
import { LoadingState } from './components.js';
import type { AutopilotProject } from '../types/entities.js';

interface CostsTabProps {
  companyId: string;
  projectId: string;
  projectName: string;
  autopilotProject?: AutopilotProject;
  currentSpend: {
    researchCycle?: number;
    buildRuns?: number;
    dailyTotal?: number;
    monthlyTotal?: number;
  };
  loading?: boolean;
}

export function CostsTab({ autopilotProject, currentSpend, loading }: CostsTabProps) {
  if (loading) return <LoadingState message="Loading cost data..." />;

  const policy = autopilotProject?.budgetPolicy;
  const warnAt = policy?.warnAtPercent ?? 80;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
        Cost Management
      </h2>

      {!policy ? (
        <Card>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            No budget policy configured for this project.{' '}
            Configure budget limits in the project settings.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* Research Cycle */}
          {policy.perResearchCycle != null && (
            <CostCard
              title="🔬 Per Research Cycle"
              limit={policy.perResearchCycle}
              current={currentSpend.researchCycle ?? 0}
              warnAt={warnAt}
            />
          )}

          {/* Per Build Run */}
          {policy.perBuildRun != null && (
            <CostCard
              title="🚀 Per Build Run"
              limit={policy.perBuildRun}
              current={currentSpend.buildRuns ?? 0}
              warnAt={warnAt}
            />
          )}

          {/* Daily */}
          {policy.dailyProjectLimit != null && (
            <CostCard
              title="📅 Daily Limit"
              limit={policy.dailyProjectLimit}
              current={currentSpend.dailyTotal ?? 0}
              warnAt={warnAt}
            />
          )}

          {/* Monthly */}
          {policy.monthlyProjectLimit != null && (
            <CostCard
              title="📆 Monthly Limit"
              limit={policy.monthlyProjectLimit}
              current={currentSpend.monthlyTotal ?? 0}
              warnAt={warnAt}
            />
          )}

          {/* Company-wide */}
          {policy.companyWideCap != null && (
            <CostCard
              title="🏢 Company-wide Cap"
              limit={policy.companyWideCap}
              current={currentSpend.monthlyTotal ?? 0}
              warnAt={warnAt}
            />
          )}
        </div>
      )}

      {/* Cost summary */}
      <Card>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
          Current Period Summary
        </h3>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Total Spent (Month)</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              ${(currentSpend.monthlyTotal ?? 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Research Cost</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              ${(currentSpend.researchCycle ?? 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Build Cost</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              ${(currentSpend.buildRuns ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CostCard({ title, limit, current, warnAt }: {
  title: string;
  limit: number;
  current: number;
  warnAt: number;
}) {
  const pct = Math.min(100, (current / limit) * 100);
  const isOver = pct >= 100;
  const isWarn = pct >= warnAt && !isOver;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#374151' }}>{title}</h4>
        <Badge variant={isOver ? 'danger' : isWarn ? 'warning' : 'success'}>
          {pct.toFixed(0)}%
        </Badge>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: isOver ? '#ef4444' : '#111827' }}>
          ${current.toFixed(2)}
        </span>
        <span style={{ fontSize: '14px', color: '#9ca3af' }}> / ${limit.toFixed(2)}</span>
      </div>
      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isOver ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </Card>
  );
}
