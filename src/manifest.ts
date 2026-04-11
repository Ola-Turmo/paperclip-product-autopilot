// Plugin manifest for Product Autopilot
// Defines plugin metadata, capabilities, UI slots, jobs, and categories

export const manifest = {
  // Basic plugin info
  id: 'product-autopilot',
  name: 'Product Autopilot',
  version: '0.1.0',
  description: 'Autensa-inspired product-improvement engine — research, ideation, swipe review, and delivery for Paperclip projects',

  // Categories for plugin registry
  categories: ['automation', 'ui'] as const,

  // Required capabilities — must request at install time
  capabilities: {
    // Company/project read access
    companies: { read: true },
    projects: { read: true },
    
    // Entity read/write (plugin-owned entities)
    entities: { 
      read: true, 
      write: true,
      types: [
        'autopilot_project',
        'product_program_revision', 
        'research_cycle',
        'research_finding',
        'idea',
        'swipe_event',
        'preference_profile',
        'delivery_run',
        'convoy_task',
        'knowledge_entry',
        'workspace_lease',
      ]
    },
    
    // Plugin state
    'plugin.state': { write: true },
    
    // Jobs scheduling
    jobs: { schedule: true },
    
    // Events subscription
    events: { subscribe: true },
    
    // UI slots
    ui: {
      pages: true,           // company page
      tabs: true,           // project detail tabs
      dashboardWidget: true,
      toolbarButton: true,
      projectSidebarItem: true,
    },
    
    // Outbound HTTP for research
    'outbound.http': { methods: ['GET', 'POST'] },
    
    // Secrets for API keys
    secrets: { read: true },
    
    // Agent invocation
    agents: { invoke: true },
  },

  // UI Slots — where the plugin surfaces appear in Paperclip
  uiSlots: {
    // Company-level surfaces
    companyPage: {
      id: 'product-autopilot-company',
      name: 'Product Autopilot',
      path: '/company/autopilot',
    },
    
    // Dashboard widget
    dashboardWidget: {
      id: 'autopilot-health',
      name: 'Product Autopilot Health',
      size: 'small',
    },
    
    // Project-level detail tabs
    projectTabs: [
      { id: 'overview',       name: 'Overview',   path: '/overview' },
      { id: 'program',        name: 'Program',     path: '/program' },
      { id: 'ideas',          name: 'Ideas',        path: '/ideas' },
      { id: 'research',       name: 'Research',     path: '/research' },
      { id: 'runs',           name: 'Runs',         path: '/runs' },
      { id: 'costs',          name: 'Costs',        path: '/costs' },
      { id: 'knowledge',      name: 'Knowledge',     path: '/knowledge' },
      { id: 'workspaces',     name: 'Workspaces',   path: '/workspaces' },
    ],
  },

  // Job definitions — scheduled and event-driven work
  jobs: {
    'research-scheduler': {
      id: 'research-scheduler',
      name: 'Research Scheduler',
      description: 'Runs scheduled research cycles based on project schedule policy',
      trigger: 'schedule',  // or 'event'
      schedule: 'daily',   // configurable
      timeout: 3600,       // 1 hour max
    },
    'idea-scheduler': {
      id: 'idea-scheduler',
      name: 'Idea Scheduler',
      description: 'Generates ideas after research completes or on schedule',
      trigger: 'schedule',
      schedule: 'daily',
      timeout: 1800,
    },
    'maybe-pool-resurfacer': {
      id: 'maybe-pool-resurfacer',
      name: 'Maybe Pool Resurfacer',
      description: 'Checks maybed ideas and re-queues them based on resurfacing rules',
      trigger: 'schedule',
      schedule: 'weekly',
      timeout: 600,
    },
  },

  // Plugin metadata
  author: 'Paperclip AI',
  homepage: 'https://paperclip.ai',
  license: 'MIT',
};

export default manifest;
