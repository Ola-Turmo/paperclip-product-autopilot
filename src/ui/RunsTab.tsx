// RunsTab — delivery run list with status and workspace refs
import React from 'react';
import { Card } from './components.js';
import { Badge } from './components.js';
import { Button } from './components.js';
import { EmptyState } from './components.js';
import { LoadingState } from './components.js';
import type { DeliveryRun, Idea } from '../types/entities.js';

interface RunsTabProps {
  companyId: string;
  projectId: string;
  projectName: string;
  runs: DeliveryRun[];
  ideas: Idea[];
  onViewRun: (run: DeliveryRun) => void;
  onViewIdea: (ideaId: string) => void;
  loading?: boolean;
}

export function RunsTab({ runs, ideas, onViewRun, onViewIdea, loading }: RunsTabProps) {
  const sortedRuns = [...runs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) return <LoadingState message="Loading delivery runs..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
          Delivery Runs ({runs.length})
        </h2>
      </div>

      {sortedRuns.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No delivery runs yet"
          description="Approved ideas that start delivery will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedRuns.map(run => {
            const idea = ideas.find(i => i.id === run.ideaId);
            return (
              <Card key={run.id} hoverable onClick={() => onViewRun(run)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                        {idea?.title ?? 'Unknown idea'}
                      </h3>
                      <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      <Badge variant="default">{run.mode}</Badge>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Created {new Date(run.createdAt).toLocaleDateString()}
                      {run.startedAt && ` · Started ${new Date(run.startedAt).toLocaleDateString()}`}
                      {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleDateString()}`}
                    </p>
                    {run.workspaceRef && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        🖥 {run.workspaceRef}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {run.prUrl && (
                      <a href={run.prUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '13px', color: '#2563eb' }}>
                        🔗 View PR
                      </a>
                    )}
                    {run.costSummary?.total != null && (
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        ${run.costSummary.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost breakdown */}
                {run.costSummary && (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    {run.costSummary.build != null && (
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Build: <strong>${run.costSummary.build.toFixed(2)}</strong></span>
                    )}
                    {run.costSummary.test != null && (
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Test: <strong>${run.costSummary.test.toFixed(2)}</strong></span>
                    )}
                    {run.costSummary.review != null && (
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Review: <strong>${run.costSummary.review.toFixed(2)}</strong></span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    'pending': 'default',
    'planned': 'info',
    'running': 'info',
    'review': 'warning',
    'pr': 'warning',
    'merged': 'success',
    'failed': 'danger',
    'cancelled': 'danger',
  };
  return map[status] ?? 'default';
}
