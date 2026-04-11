// PluginLayout — main layout wrapper with header, sidebar, and content area
import React, { ReactNode } from 'react';

interface PluginLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PluginLayout({ title, subtitle, children, actions }: PluginLayoutProps) {
  return (
    <div className="plugin-layout">
      <header className="plugin-header">
        <div className="plugin-header-left">
          <h1 className="plugin-title">{title}</h1>
          {subtitle && <span className="plugin-subtitle">{subtitle}</span>}
        </div>
        {actions && <div className="plugin-header-actions">{actions}</div>}
      </header>
      <main className="plugin-content">
        {children}
      </main>
      <style>{`
        .plugin-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f9fafb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .plugin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .plugin-header-left { display: flex; align-items: baseline; gap: 12px; }
        .plugin-title { font-size: 20px; font-weight: 600; color: #111827; margin: 0; }
        .plugin-subtitle { font-size: 14px; color: #6b7280; }
        .plugin-header-actions { display: flex; gap: 8px; }
        .plugin-content { flex: 1; overflow: auto; padding: 24px; }
      `}</style>
    </div>
  );
}
