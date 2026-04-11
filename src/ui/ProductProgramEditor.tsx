import React, { useState } from 'react';
import { PluginLayout } from './layout.js';
import { Card } from './components.js';
import { Button } from './components.js';
import { Badge } from './components.js';
import { LoadingState } from './components.js';
import type { ProductProgramRevision } from '../types/entities.js';

interface ProductProgramEditorProps {
  companyId: string;
  projectId: string;
  projectName: string;
  revisions: ProductProgramRevision[];
  currentContent: string;  // JSON string of the program document
  onSave: (content: string) => void;
  loading?: boolean;
}

// The 10 required sections of a Product Program
const PROGRAM_SECTIONS = [
  { key: 'vision', label: '🎯 Vision', placeholder: 'What is the long-term vision for this product? What problem does it solve for whom?' },
  { key: 'targetUsers', label: '👥 Target Users', placeholder: 'Who are the primary users? What are their characteristics, goals, and pain points?' },
  { key: 'coreProblem', label: '❗ Core Problem', placeholder: 'What is the most important problem we are solving? Why does it matter?' },
  { key: 'keyMetrics', label: '📊 Key Metrics', placeholder: 'What metrics define success? (DAU, retention, conversion, revenue, NPS...)' },
  { key: 'currentSolution', label: '🏠 Current Solution', placeholder: 'How do users currently solve this problem? What are the gaps in the current approach?' },
  { key: 'competitors', label: '🏢 Competitors', placeholder: 'Who else is solving this problem? What are their strengths and weaknesses?' },
  { key: 'swot', label: '📋 SWOT Analysis', placeholder: 'Strengths:...\nWeaknesses:...\nOpportunities:...\nThreats:...' },
  { key: 'roadmap', label: '🗺️ Roadmap', placeholder: 'What are the major milestones? What does the 3/6/12 month plan look like?' },
  { key: 'themes', label: '🎨 Themes', placeholder: 'What are the key product themes for the upcoming period? How do they align with company goals?' },
  { key: 'okrs', label: '🎯 OKRs', placeholder: 'What are the key objectives and measurable results for this period?' },
  { key: 'constraints', label: '⚠️ Constraints', placeholder: 'What are the technical, resource, regulatory, or timeline constraints?' },
];

const DEFAULT_CONTENT: Record<string, string> = Object.fromEntries(
  PROGRAM_SECTIONS.map(s => [s.key, ''])
);

export function ProductProgramEditor({
  companyId,
  projectId,
  projectName,
  revisions = [],
  currentContent,
  onSave,
  loading = false,
}: ProductProgramEditorProps) {
  const parsedContent = (() => {
    try {
      return currentContent ? JSON.parse(currentContent) : DEFAULT_CONTENT;
    } catch {
      return DEFAULT_CONTENT;
    }
  })();

  const [content, setContent] = useState<Record<string, string>>(parsedContent);
  const [activeSection, setActiveSection] = useState('vision');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(JSON.stringify(content, null, 2));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const latestVersion = revisions.sort((a, b) => b.version - a.version)[0];
  const sortedRevisions = [...revisions].sort((a, b) => b.version - a.version);

  if (loading) {
    return (
      <PluginLayout title="Product Program" subtitle={projectName}>
        <LoadingState message="Loading product program..." />
      </PluginLayout>
    );
  }

  return (
    <PluginLayout
      title="Product Program"
      subtitle={projectName}
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saved && <span style={{ fontSize: '13px', color: '#10b981' }}>✓ Saved</span>}
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {saving ? 'Saving...' : 'Save Program'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* Version History Sidebar */}
        <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #e5e7eb', paddingRight: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Version History
          </h4>
          {sortedRevisions.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No revisions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sortedRevisions.map(rev => (
                <button
                  key={rev.id}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(rev.content);
                      setContent(parsed);
                    } catch {
                      setContent(DEFAULT_CONTENT);
                    }
                  }}
                  style={{
                    textAlign: 'left',
                    background: rev.id === latestVersion?.id ? '#eff6ff' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>v{rev.version}</span>
                    {rev.id === latestVersion?.id && <Badge variant="info" style={{ fontSize: '10px', padding: '1px 4px' }}>Latest</Badge>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    by {rev.createdBy}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section Navigation + Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {PROGRAM_SECTIONS.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeSection === section.key ? '#2563eb' : '#f3f4f6',
                  color: activeSection === section.key ? 'white' : '#6b7280',
                  fontSize: '13px',
                  fontWeight: activeSection === section.key ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Active section editor */}
          <Card style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {PROGRAM_SECTIONS.find(s => s.key === activeSection)?.label}
            </h3>
            <textarea
              value={content[activeSection] ?? ''}
              onChange={e => handleChange(activeSection, e.target.value)}
              placeholder={PROGRAM_SECTIONS.find(s => s.key === activeSection)?.placeholder}
              style={{
                width: '100%',
                height: 'calc(100% - 40px)',
                minHeight: '200px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: 1.6,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </Card>
        </div>
      </div>
    </PluginLayout>
  );
}
