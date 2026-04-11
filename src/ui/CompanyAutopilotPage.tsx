// CompanyAutopilotPage — lists all autopilot projects for a company
import React from 'react';
import { PluginLayout } from './layout.js';
import { Card } from './components.js';
import { Badge } from './components.js';
import { Button } from './components.js';
import { EmptyState } from './components.js';
import type { AutopilotProject } from '../types/entities.js';

interface CompanyAutopilotPageProps {
  companyId: string;
  companyName: string;
  projects: Array<{ id: string; name: string }>;
  autopilotProjects: AutopilotProject[];
}

export function CompanyAutopilotPage({ companyId, companyName, projects, autopilotProjects }: CompanyAutopilotPageProps) {
  // Group projects by status
  const activeProjects = autopilotProjects.filter(p => p.status === 'active');
  const pausedProjects = autopilotProjects.filter(p => p.status === 'paused');
  const stoppedProjects = autopilotProjects.filter(p => p.status === 'stopped');

  const autopilotProjectIds = new Set(autopilotProjects.map(ap => ap.projectId));
  const projectsWithoutAutopilot = projects.filter(p => !autopilotProjectIds.has(p.id));

  function getProjectName(projectId: string): string {
    return projects.find(p => p.id === projectId)?.name ?? projectId;
  }

  function getAutomationTierLabel(tier: string): string {
    const labels: Record<string, string> = {
      'supervised': '👁 Supervised',
      'semi-auto': '⚡ Semi-Auto',
      'full-auto': '🚀 Full Auto',
    };
    return labels[tier] ?? tier;
  }

  return (
    <PluginLayout
      title="Product Autopilot"
      subtitle={`${companyName} — ${autopilotProjects.length} autopilot project(s)`}
      actions={
        <Button variant="primary" size="sm">
          + Enable Autopilot
        </Button>
      }
    >
      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Total Projects</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 700, color: '#111827' }}>
            {autopilotProjects.length}
          </p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Active</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
            {activeProjects.length}
          </p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Paused</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
            {pausedProjects.length}
          </p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Stopped</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 700, color: '#6b7280' }}>
            {stoppedProjects.length}
          </p>
        </Card>
      </div>

      {autopilotProjects.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No autopilot projects yet"
          description="Enable Product Autopilot on a project to start generating ideas from research and product programs."
          action={<Button variant="primary">Enable on a Project</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active projects */}
          {activeProjects.length > 0 && (
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
                Active ({activeProjects.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {activeProjects.map(project => (
                  <ProjectCard key={project.id} project={project} projectName={getProjectName(project.projectId)} />
                ))}
              </div>
            </section>
          )}

          {/* Paused projects */}
          {pausedProjects.length > 0 && (
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
                Paused ({pausedProjects.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {pausedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} projectName={getProjectName(project.projectId)} />
                ))}
              </div>
            </section>
          )}

          {/* Stopped projects */}
          {stoppedProjects.length > 0 && (
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
                Stopped ({stoppedProjects.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {stoppedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} projectName={getProjectName(project.projectId)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PluginLayout>
  );
}

function ProjectCard({ project, projectName }: { project: AutopilotProject; projectName: string }) {
  const tierColors: Record<string, string> = {
    'supervised': '#6b7280',
    'semi-auto': '#2563eb',
    'full-auto': '#10b981',
  };

  return (
    <Card hoverable>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{projectName}</h3>
        <Badge variant={project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : 'default'}>
          {project.status}
        </Badge>
      </div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
        <span style={{ color: tierColors[project.automationTier] }}>
          {project.automationTier === 'supervised' ? '👁 Supervised' :
           project.automationTier === 'semi-auto' ? '⚡ Semi-Auto' : '🚀 Full Auto'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" size="sm">Open</Button>
        {project.status === 'active' ? (
          <Button variant="ghost" size="sm">Pause</Button>
        ) : (
          <Button variant="ghost" size="sm">Resume</Button>
        )}
      </div>
    </Card>
  );
}
