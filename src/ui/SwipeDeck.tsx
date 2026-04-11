// SwipeDeck — Tinder-style card swiping for idea review
import React, { useState } from 'react';
import { Card } from './components.js';
import { Button } from './components.js';
import { Badge } from './components.js';
import { ScoreBar } from './components.js';
import { EmptyState } from './components.js';
import type { Idea } from '../types/entities.js';

interface SwipeDeckProps {
  ideas: Idea[];  // pending ideas to review
  onSwipe: (ideaId: string, decision: 'pass' | 'maybe' | 'yes' | 'now') => void;
  onSkip: () => void;
}

export function SwipeDeck({ ideas, onSwipe, onSkip }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  if (ideas.length === 0 || currentIndex >= ideas.length) {
    return (
      <EmptyState
        icon="✅"
        title="All caught up!"
        description="You've reviewed all pending ideas. Check back after the next research cycle."
        action={<Button variant="secondary" onClick={onSkip}>Back to Ideas List</Button>}
      />
    );
  }

  const current = ideas[currentIndex];
  const next = ideas[currentIndex + 1];

  function handleSwipe(decision: 'pass' | 'maybe' | 'yes' | 'now') {
    setDirection(decision === 'pass' ? 'left' : 'right');
    setTimeout(() => {
      onSwipe(current.id, decision);
      setDirection(null);
      setCurrentIndex(i => i + 1);
    }, 300);
  }

  const cardStyle: React.CSSProperties = {
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    transform: direction === 'left' ? 'translateX(-120%) rotate(-15deg)' :
               direction === 'right' ? 'translateX(120%) rotate(15deg)' : 'translateX(0) rotate(0deg)',
    opacity: direction ? 0 : 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      {/* Progress */}
      <div style={{ fontSize: '14px', color: '#6b7280' }}>
        {currentIndex + 1} of {ideas.length}
      </div>

      {/* Card stack */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
        {/* Next card (behind) */}
        {next && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            transform: 'scale(0.95)',
            opacity: 0.5,
            pointerEvents: 'none',
          }}>
            <SwipeCard idea={next} />
          </div>
        )}

        {/* Current card (top) */}
        <div style={{ position: 'relative', zIndex: 1, ...cardStyle }}>
          <SwipeCard idea={current} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Button
          variant="danger"
          size="lg"
          onClick={() => handleSwipe('pass')}
          style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, fontSize: '28px' }}
        >
          ✗
        </Button>
        <Button
          variant="warning"
          size="lg"
          onClick={() => handleSwipe('maybe')}
          style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, fontSize: '28px', background: '#f59e0b', border: 'none', color: 'white' }}
        >
          ?
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => handleSwipe('yes')}
          style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, fontSize: '28px' }}
        >
          ✓
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => handleSwipe('now')}
          style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, fontSize: '20px' }}
        >
          ⚡
        </Button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#6b7280' }}>
        <span>✗ Pass (reject)</span>
        <span>? Maybe (defer)</span>
        <span>✓ Yes (approve)</span>
        <span>⚡ Now (approve + execute)</span>
      </div>
    </div>
  );
}

function SwipeCard({ idea }: { idea: Idea }) {
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
    <Card style={{ minHeight: '360px', padding: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant={statusVariant[idea.status] ?? 'default'}>{idea.status}</Badge>
          <Badge variant="default">{idea.category}</Badge>
          <span style={{ fontSize: '12px', color: complexityColor[idea.complexity], fontWeight: 500, background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>
            {idea.complexity}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
          {idea.title}
        </h2>

        {/* Summary */}
        <p style={{ margin: 0, fontSize: '15px', color: '#374151', lineHeight: 1.6, flex: 1 }}>
          {idea.summary}
        </p>

        {/* Scores */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <ScoreBar value={idea.impactScore} label="Impact" />
          </div>
          <div style={{ flex: 1 }}>
            <ScoreBar value={idea.feasibilityScore} label="Feasibility" />
          </div>
        </div>

        {/* Approach and risks */}
        {idea.approach && (
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Approach</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{idea.approach}</p>
          </div>
        )}

        {idea.risks && idea.risks.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {idea.risks.map((risk, i) => (
              <span key={i} style={{ fontSize: '12px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px' }}>
                ⚠ {risk}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}