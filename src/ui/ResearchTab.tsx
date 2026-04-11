import React, { useState } from 'react';
import { PluginLayout } from './layout.js';
import { Card } from './components.js';
import { Button } from './components.js';
import { Badge } from './components.js';
import { LoadingState } from './components.js';
import { EmptyState } from './components.js';
import { Modal } from './components.js';
import type { ResearchCycle, ResearchFinding } from '../types/entities.js';

interface ResearchTabProps {
  companyId: string;
  projectId: string;
  projectName: string;
  cycles: ResearchCycle[];
  findings: ResearchFinding[];
  onStartResearch: (config: ResearchConfig) => void;
  loading?: boolean;
}

export interface ResearchConfig {
  sources?: string[];
  focus?: string[];
}

export function ResearchTab({
  companyId,
  projectId,
  projectName,
  cycles = [],
  findings = [],
  onStartResearch,
  loading = false,
}: ResearchTabProps) {
  const [selectedCycle, setSelectedCycle] = useState<ResearchCycle | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);

  const sortedCycles = [...cycles].sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const cycleFindings = selectedCycle
    ? findings.filter(f => f.cycleId === selectedCycle.id)
    : [];

  if (loading) {
    return (
      <PluginLayout title="Research" subtitle={projectName}>
        <LoadingState message="Loading research history..." />
      </PluginLayout>
    );
  }

  return (
    <PluginLayout
      title="Research"
      subtitle={projectName}
      actions={
        <Button variant="primary" onClick={() => setShowStartForm(true)}>
          🔬 Start Research
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Left: Cycle list */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
            Research History ({sortedCycles.length})
          </h3>

          {sortedCycles.length === 0 ? (
            <EmptyState
              icon="🔬"
              title="No research yet"
              description="Start your first research cycle to discover opportunities and insights."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowStartForm(true)}>
                  Start Research
                </Button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedCycles.map(cycle => (
                <Card
                  key={cycle.id}
                  hoverable
                  onClick={() => setSelectedCycle(cycle)}
                  style={{
                    border: selectedCycle?.id === cycle.id ? '2px solid #2563eb' : undefined,
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Badge variant={
                      cycle.status === 'completed' ? 'success' :
                      cycle.status === 'running' ? 'info' :
                      cycle.status === 'failed' ? 'danger' : 'default'
                    }>
                      {cycle.status}
                    </Badge>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {new Date(cycle.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                    {cycle.triggerType === 'scheduled' ? '⏰ Scheduled' : '👆 Manual'}
                  </p>
                  {cycle.reportSummary && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#374151' }}>
                      {cycle.reportSummary.slice(0, 100)}{cycle.reportSummary.length > 100 ? '...' : ''}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Findings */}
        <div style={{ flex: 1 }}>
          {selectedCycle ? (
            <ResearchReportView cycle={selectedCycle} findings={cycleFindings} />
          ) : (
            <EmptyState
              icon="👆"
              title="Select a research cycle"
              description="Click on a cycle from the history to see its findings"
            />
          )}
        </div>
      </div>

      {/* Start Research Modal */}
      <StartResearchModal
        open={showStartForm}
        onClose={() => setShowStartForm(false)}
        onStart={(config) => {
          onStartResearch(config);
          setShowStartForm(false);
        }}
      />
    </PluginLayout>
  );
}

interface ResearchReportViewProps {
  cycle: ResearchCycle;
  findings: ResearchFinding[];
}

export function ResearchReportView({ cycle, findings }: ResearchReportViewProps) {
  const opportunities = findings.filter(f => f.findingType === 'opportunity');
  const threats = findings.filter(f => f.findingType === 'threat');
  const insights = findings.filter(f => f.findingType === 'insight');
  const userNeeds = findings.filter(f => f.findingType === 'user-need');
  const competitors = findings.filter(f => f.findingType === 'competitor');

  const findingTypeConfig: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    'opportunity': { label: 'Opportunities', emoji: '🚀', color: '#065f46', bg: '#d1fae5' },
    'threat': { label: 'Threats', emoji: '⚠️', color: '#991b1b', bg: '#fee2e2' },
    'insight': { label: 'Insights', emoji: '💡', color: '#1e40af', bg: '#dbeafe' },
    'user-need': { label: 'User Needs', emoji: '👥', color: '#92400e', bg: '#fef3c7' },
    'competitor': { label: 'Competitors', emoji: '🏢', color: '#4b5563', bg: '#f3f4f6' },
  };

  const groups = [
    { type: 'opportunity', items: opportunities },
    { type: 'threat', items: threats },
    { type: 'user-need', items: userNeeds },
    { type: 'insight', items: insights },
    { type: 'competitor', items: competitors },
  ].filter(g => g.items.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            Research Report
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            {new Date(cycle.startedAt).toLocaleDateString()} · {findings.length} findings
          </p>
        </div>
        <Badge variant={
          cycle.status === 'completed' ? 'success' :
          cycle.status === 'running' ? 'info' :
          cycle.status === 'failed' ? 'danger' : 'default'
        }>
          {cycle.status}
        </Badge>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No findings yet"
          description="Research is still running or no findings were generated"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groups.map(group => {
            const config = findingTypeConfig[group.type];
            return (
              <div key={group.type}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: config.color }}>
                  {config.emoji} {config.label} ({group.items.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.items.map(finding => (
                    <Card key={finding.id} style={{ borderLeft: `3px solid ${config.color}` }}>
                      <h5 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {finding.title}
                      </h5>
                      <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                        {finding.summary}
                      </p>
                      {finding.evidence && (
                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                          📎 Evidence: {finding.evidence}
                        </p>
                      )}
                      {finding.sourceUrl && (
                        <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer"
                          style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#2563eb' }}>
                          🔗 Source
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StartResearchModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (config: ResearchConfig) => void;
}

function StartResearchModal({ open, onClose, onStart }: StartResearchModalProps) {
  const [sources, setSources] = useState('');
  const [focus, setFocus] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🔬 Start Research"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onStart({
            sources: sources.split('\n').filter(s => s.trim()),
            focus: focus.split('\n').filter(s => s.trim()),
          })}>
            Start Research
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
            Sources (one URL per line)
          </label>
          <textarea
            value={sources}
            onChange={e => setSources(e.target.value)}
            placeholder="https://github.com/...\nhttps://docs.example.com/..."
            style={{
              width: '100%',
              height: '100px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
            Focus areas (one per line)
          </label>
          <textarea
            value={focus}
            onChange={e => setFocus(e.target.value)}
            placeholder="user onboarding\nmobile experience\nAPI performance"
            style={{
              width: '100%',
              height: '80px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
