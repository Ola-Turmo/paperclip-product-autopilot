// Shared UI primitives: Card, Button, Badge, Modal, LoadingState, EmptyState
import React, { ReactNode, useEffect, useState } from 'react';

// ─── Card ──────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', onClick, hoverable, style }: CardProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`card ${className} ${hoverable ? 'hoverable' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hover && hoverable ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s ease',
        ...(style as Record<string, string> | undefined),
      }}
    >
      {children}
      <style>{`
        .card.hoverable:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#2563eb', color: 'white', border: 'none' },
  secondary: { background: 'white', color: '#374151', border: '1px solid #d1d5db' },
  danger: { background: '#dc2626', color: 'white', border: 'none' },
  ghost: { background: 'transparent', color: '#6b7280', border: 'none' },
  warning: { background: '#f59e0b', color: 'white', border: 'none' },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 12px', fontSize: '13px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
};

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, loading, fullWidth, style: styleProp }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: '6px',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        ...styleProp,
      }}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const badgeVariants: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: '#f3f4f6', color: '#374151' },
  success: { background: '#d1fae5', color: '#065f46' },
  warning: { background: '#fef3c7', color: '#92400e' },
  danger: { background: '#fee2e2', color: '#991b1b' },
  info: { background: '#dbeafe', color: '#1e40af' },
};

export function Badge({ children, variant = 'default', style: styleProp }: BadgeProps) {
  return (
    <span style={{
      ...badgeVariants[variant],
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
      display: 'inline-block',
      ...styleProp,
    }}>
      {children}
    </span>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '100%', maxWidth: '540px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ padding: '24px', overflow: 'auto', flex: 1 }}>
          {children}
        </div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {footer}
        </div>}
      </div>
    </div>
  );
}

// ─── LoadingState ───────────────────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '16px' }}>
      <Spinner size="lg" />
      <span style={{ color: '#6b7280', fontSize: '14px' }}>{message}</span>
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}

export function EmptyState({ title, description, action, icon = '📭' }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '12px', textAlign: 'center' }}>
      <span style={{ fontSize: '48px' }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{title}</h3>
      {description && <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', maxWidth: '360px' }}>{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

// ─── Spinner ────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 40 };
  const px = sizeMap[size];
  return (
    <div style={{
      width: px, height: px,
      border: '2px solid #e5e7eb',
      borderTopColor: '#2563eb',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── ScoreBar ───────────────────────────────────────────────────────────────
interface ScoreBarProps {
  value: number;  // 0-10
  label?: string;
  color?: string;
}

export function ScoreBar({ value, label, color }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, value * 10));
  const barColor = color ?? (value >= 7 ? '#10b981' : value >= 4 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {label && <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '80px' }}>{label}</span>}
      <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: barColor, minWidth: '28px', textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', padding: '0 24px', background: 'white' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === tab.id ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '-1px',
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── MetricCard ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export function MetricCard({ label, value, change, changeType = 'neutral', icon }: MetricCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#111827' }}>{value}</p>
          {change && (
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: changeType === 'positive' ? '#10b981' : changeType === 'negative' ? '#ef4444' : '#6b7280' }}>
              {change}
            </p>
          )}
        </div>
        {icon && <span style={{ fontSize: '24px', opacity: 0.7 }}>{icon}</span>}
      </div>
    </Card>
  );
}
