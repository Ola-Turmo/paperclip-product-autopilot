// AutopilotHealthWidget — dashboard widget showing autopilot health metrics
import React from 'react';
import { Card } from './components.js';
import { Badge } from './components.js';
import type { AutopilotProject } from '../types/entities.js';

interface AutopilotHealthWidgetProps {
  autopilotProjects: AutopilotProject[];
  pendingIdeas?: number;
  stuckRuns?: number;
  awaitingApprovals?: number;
  overBudget?: number;
}

export function AutopilotHealthWidget({
  autopilotProjects,
  pendingIdeas = 0,
  stuckRuns = 0,
  awaitingApprovals = 0,
  overBudget = 0,
}: AutopilotHealthWidgetProps) {
  const pausedCount = autopilotProjects.filter(p => p.status === 'paused').length;
  const activeCount = autopilotProjects.filter(p => p.status === 'active').length;

  const issues = [];
  if (pendingIdeas > 0) issues.push({ label: 'Pending ideas', count: pendingIdeas, variant: 'warning' as const });
  if (stuckRuns > 0) issues.push({ label: 'Stuck runs', count: stuckRuns, variant: 'danger' as const });
  if (awaitingApprovals > 0) issues.push({ label: 'Awaiting approval', count: awaitingApprovals, variant: 'warning' as const });
  if (overBudget > 0) issues.push({ label: 'Over budget', count: overBudget, variant: 'danger' as const });
  if (pausedCount > 0) issues.push({ label: 'Paused', count: pausedCount, variant: 'info' as const });

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>Product Autopilot</h3>
        <Badge variant={issues.length > 0 ? 'warning' : 'success'}>
          {issues.length > 0 ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'Healthy'}
        </Badge>
      </div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
        {activeCount} active · {pausedCount} paused
      </div>
      {issues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
          {issues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>{issue.label}</span>
              <Badge variant={issue.variant}>{issue.count}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#10b981' }}>All projects running smoothly</p>
      )}
    </Card>
  );
}
