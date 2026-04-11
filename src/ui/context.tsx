// Company + Project context providers
import React, { createContext, useContext, ReactNode } from 'react';

export interface CompanyContextValue {
  companyId: string;
  companyName: string;
}

export interface ProjectContextValue {
  projectId: string;
  projectName: string;
  companyId: string;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function CompanyProvider({ company, children }: { company: CompanyContextValue; children: ReactNode }) {
  return <CompanyContext.Provider value={company}>{children}</CompanyContext.Provider>;
}

export function ProjectProvider({ project, children }: { project: ProjectContextValue; children: ReactNode }) {
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useCompany(): CompanyContextValue | null {
  return useContext(CompanyContext);
}

export function useProject(): ProjectContextValue | null {
  return useContext(ProjectContext);
}
