// IdeasList — filterable/sortable list of all ideas
import React, { useState } from 'react';
import { Card } from './components.js';
import { Badge } from './components.js';
import { Button } from './components.js';
import { ScoreBar } from './components.js';
import { EmptyState } from './components.js';
import type { Idea } from '../types/entities.js';

interface IdeasListProps {
  companyId: string;
  projectId: string;
  ideas: Idea[];
  onSwipe: (ideaId: string) => void;
  onViewDetail: (idea: Idea) => void;
}

type SortKey = 'impactScore' | 'feasibilityScore' | 'createdAt' | 'title';
type FilterStatus = 'all' | Idea['status'];

export function IdeasList({ ideas, onSwipe, onViewDetail }: IdeasListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('impactScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const filtered = ideas
    .filter(idea => filter === 'all' || idea.status === filter)
    .filter(idea => !search || idea.title.toLowerCase().includes(search.toLowerCase()) || idea.summary.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const statusCounts: Record<string, number> = {};
  for (const idea of ideas) {
    statusCounts[idea.status] = (statusCounts[idea.status] ?? 0) + 1;
  }

  const statuses: FilterStatus[] = ['all', 'pending', 'approved', 'maybe', 'rejected', 'in-progress', 'done'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters and search */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search ideas..."
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

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filter === status ? '#2563eb' : '#f3f4f6',
                color: filter === status ? 'white' : '#6b7280',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {status === 'all' ? 'All' : status} {statusCounts[status] !== undefined && `(${statusCounts[status]})`}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Sort:</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="impactScore">Impact</option>
            <option value="feasibilityScore">Feasibility</option>
            <option value="createdAt">Date</option>
            <option value="title">Title</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px' }}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Ideas */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No ideas found"
          description={search ? 'Try adjusting your search or filters' : 'Generate ideas from research to see them here'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onSwipe={onSwipe} onViewDetail={onViewDetail} />
          ))}
        </div>
      )}
    </div>
  );
}

interface IdeaCardProps {
  idea: Idea;
  onSwipe: (ideaId: string) => void;
  onViewDetail: (idea: Idea) => void;
}

export function IdeaCard({ idea, onSwipe, onViewDetail }: IdeaCardProps) {
  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    'pending': 'info',
    'approved': 'success',
    'rejected': 'danger',
    'maybe': 'warning',
    'in-progress': 'info',
    'done': 'success',
  };

  const complexityColor: Record<string, string> = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444',
  };

  return (
    <Card hoverable>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{idea.title}</h3>
            <Badge variant={statusVariant[idea.status] ?? 'default'}>{idea.status}</Badge>
            <Badge variant="default">{idea.category}</Badge>
            <span style={{ fontSize: '12px', color: complexityColor[idea.complexity], fontWeight: 500 }}>
              {idea.complexity}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
            {idea.summary.length > 200 ? idea.summary.slice(0, 200) + '...' : idea.summary}
          </p>
          {idea.researchRefs && idea.researchRefs.length > 0 && (
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              📚 {idea.researchRefs.length} research reference(s)
            </p>
          )}
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
          <ScoreBar value={idea.impactScore} label="Impact" />
          <ScoreBar value={idea.feasibilityScore} label="Feasibility" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Button variant="secondary" size="sm" onClick={() => onViewDetail(idea)}>
            View
          </Button>
          {idea.status === 'pending' && (
            <Button variant="primary" size="sm" onClick={() => onSwipe(idea.id)}>
              Swipe 👆
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}