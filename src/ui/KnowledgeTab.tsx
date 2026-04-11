// KnowledgeTab — searchable library of past learnings
import React, { useState } from 'react';
import { Card } from './components.js';
import { Badge } from './components.js';
import { Button } from './components.js';
import { EmptyState } from './components.js';
import { LoadingState } from './components.js';
import type { KnowledgeEntry } from '../types/entities.js';

interface KnowledgeTabProps {
  companyId: string;
  projectId: string;
  projectName: string;
  entries: KnowledgeEntry[];
  loading?: boolean;
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  'procedure': { emoji: '📋', color: '#065f46', bg: '#d1fae5', label: 'Procedure' },
  'pitfall': { emoji: '⚠️', color: '#991b1b', bg: '#fee2e2', label: 'Pitfall' },
  'command': { emoji: '⌨️', color: '#1e40af', bg: '#dbeafe', label: 'Command' },
  'script': { emoji: '📜', color: '#92400e', bg: '#fef3c7', label: 'Script' },
  'pattern': { emoji: '🔁', color: '#4b5563', bg: '#f3f4f6', label: 'Pattern' },
  'lesson': { emoji: '📚', color: '#6b21a8', bg: '#f3e8ff', label: 'Lesson' },
};

export function KnowledgeTab({ entries, loading }: KnowledgeTabProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingState message="Loading knowledge base..." />;

  const filtered = entries.filter(entry => {
    const matchesSearch = !search ||
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const sortedEntries = [...filtered].sort((a, b) => b.confidence - a.confidence);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
          Knowledge Base ({entries.length} entries)
        </h2>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search knowledge..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            width: '240px',
          }}
        />

        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            variant={filterType === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              variant={filterType === type ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {config.emoji} {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {sortedEntries.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No knowledge entries yet"
          description="Learnings from delivery runs will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedEntries.map(entry => {
            const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG['lesson'];
            const isExpanded = expandedId === entry.id;

            return (
              <Card key={entry.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px' }}>{config.emoji}</span>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                        {entry.title}
                      </h3>
                      <Badge variant="default" style={{ background: config.bg, color: config.color }}>
                        {config.label}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Confidence</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: entry.confidence >= 0.7 ? '#10b981' : '#f59e0b' }}>
                          {(entry.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span style={{ fontSize: '18px', color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {entry.content}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {entry.tags.map(tag => (
                          <span key={tag} style={{ fontSize: '12px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '12px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                      Created {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
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
