/**
 * Demo Store - Seeded data for all OmniDash features
 * 
 * Provides instant offline data for demo mode.
 * Uses Zustand for state management.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface DemoEntity {
  readonly id: string;
  readonly name: string;
  readonly type: 'lead' | 'customer' | 'vendor';
  readonly status: 'active' | 'pending' | 'inactive';
  readonly createdAt: string;
}

export interface DemoEvent {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
}

export interface DemoRun {
  readonly id: string;
  readonly workflowId: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly steps: number;
}

export interface DemoTask {
  readonly id: string;
  readonly title: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'pending' | 'in_progress' | 'completed';
  readonly assignee?: string;
  readonly dueDate?: string;
}

export interface DemoKpi {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly trend: 'up' | 'down' | 'stable';
  readonly target?: number;
}

export interface DemoPipelineItem {
  readonly id: string;
  readonly title: string;
  readonly stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  readonly value: number;
  readonly probability: number;
}

export interface DemoApproval {
  readonly id: string;
  readonly type: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly status: 'pending' | 'approved' | 'rejected';
}

interface DemoStore {
  // Data
  entities: DemoEntity[];
  events: DemoEvent[];
  runs: DemoRun[];
  tasks: DemoTask[];
  kpis: DemoKpi[];
  pipeline: DemoPipelineItem[];
  approvals: DemoApproval[];

  // Actions
  addEntity: (entity: Omit<DemoEntity, 'id' | 'createdAt'>) => void;
  updateEntity: (id: string, updates: Partial<DemoEntity>) => void;
  deleteEntity: (id: string) => void;
  addTask: (task: Omit<DemoTask, 'id'>) => void;
  updateTask: (id: string, updates: Partial<DemoTask>) => void;
  addEvent: (event: Omit<DemoEvent, 'id' | 'timestamp'>) => void;
  approveItem: (id: string) => void;
  rejectItem: (id: string) => void;
  reset: () => void;
}

// ============================================================================
// Seed Data
// ============================================================================

const seedEntities: DemoEntity[] = [
  { id: 'ent-001', name: 'Acme Corp', type: 'customer', status: 'active', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'ent-002', name: 'TechStart Inc', type: 'lead', status: 'pending', createdAt: '2026-01-20T14:30:00Z' },
  { id: 'ent-003', name: 'Global Suppliers', type: 'vendor', status: 'active', createdAt: '2026-01-10T09:00:00Z' },
  { id: 'ent-004', name: 'NewAge Digital', type: 'lead', status: 'active', createdAt: '2026-01-25T11:00:00Z' },
  { id: 'ent-005', name: 'Metro Systems', type: 'customer', status: 'active', createdAt: '2026-01-05T08:00:00Z' },
];

const seedEvents: DemoEvent[] = [
  { id: 'evt-001', type: 'entity.created', source: 'omnihub', timestamp: '2026-02-02T10:00:00Z', data: { entityId: 'ent-001' } },
  { id: 'evt-002', type: 'workflow.started', source: 'temporal', timestamp: '2026-02-02T10:05:00Z', data: { workflowId: 'wf-001' } },
  { id: 'evt-003', type: 'task.completed', source: 'omnidash', timestamp: '2026-02-02T10:10:00Z', data: { taskId: 'task-001' } },
  { id: 'evt-004', type: 'approval.requested', source: 'omnidash', timestamp: '2026-02-02T10:15:00Z', data: { approvalId: 'apr-001' } },
  { id: 'evt-005', type: 'integration.synced', source: 'omniconnect', timestamp: '2026-02-02T10:20:00Z', data: { integration: 'salesforce' } },
];

const seedRuns: DemoRun[] = [
  { id: 'run-001', workflowId: 'lead-enrichment', status: 'completed', startedAt: '2026-02-02T09:00:00Z', completedAt: '2026-02-02T09:05:00Z', steps: 5 },
  { id: 'run-002', workflowId: 'data-sync', status: 'running', startedAt: '2026-02-02T10:00:00Z', steps: 3 },
  { id: 'run-003', workflowId: 'report-generation', status: 'completed', startedAt: '2026-02-02T08:00:00Z', completedAt: '2026-02-02T08:30:00Z', steps: 8 },
  { id: 'run-004', workflowId: 'email-campaign', status: 'failed', startedAt: '2026-02-02T07:00:00Z', completedAt: '2026-02-02T07:02:00Z', steps: 2 },
];

const seedTasks: DemoTask[] = [
  { id: 'task-001', title: 'Review Q1 pipeline', priority: 'high', status: 'in_progress', assignee: 'user@example.com', dueDate: '2026-02-05' },
  { id: 'task-002', title: 'Update CRM integration', priority: 'medium', status: 'pending', assignee: 'dev@example.com', dueDate: '2026-02-10' },
  { id: 'task-003', title: 'Prepare investor deck', priority: 'critical', status: 'pending', dueDate: '2026-02-03' },
  { id: 'task-004', title: 'Onboard new customer', priority: 'high', status: 'completed', assignee: 'sales@example.com' },
  { id: 'task-005', title: 'Fix login bug', priority: 'high', status: 'in_progress', assignee: 'dev@example.com', dueDate: '2026-02-02' },
];

const seedKpis: DemoKpi[] = [
  { id: 'kpi-001', name: 'Monthly Revenue', value: 125000, unit: 'USD', trend: 'up', target: 150000 },
  { id: 'kpi-002', name: 'Active Users', value: 1247, unit: 'users', trend: 'up', target: 1500 },
  { id: 'kpi-003', name: 'Conversion Rate', value: 3.2, unit: '%', trend: 'stable', target: 4.0 },
  { id: 'kpi-004', name: 'Support Tickets', value: 23, unit: 'tickets', trend: 'down', target: 20 },
  { id: 'kpi-005', name: 'Uptime', value: 99.97, unit: '%', trend: 'stable', target: 99.9 },
];

const seedPipeline: DemoPipelineItem[] = [
  { id: 'pipe-001', title: 'Enterprise Deal - Acme', stage: 'negotiation', value: 75000, probability: 70 },
  { id: 'pipe-002', title: 'Mid-Market - TechStart', stage: 'proposal', value: 25000, probability: 50 },
  { id: 'pipe-003', title: 'Startup - NewAge', stage: 'qualified', value: 5000, probability: 30 },
  { id: 'pipe-004', title: 'Enterprise - Metro', stage: 'closed', value: 100000, probability: 100 },
  { id: 'pipe-005', title: 'SMB - LocalBiz', stage: 'lead', value: 3000, probability: 10 },
];

const seedApprovals: DemoApproval[] = [
  { id: 'apr-001', type: 'expense', requestedBy: 'marketing@example.com', requestedAt: '2026-02-01T10:00:00Z', status: 'pending' },
  { id: 'apr-002', type: 'access', requestedBy: 'newuser@example.com', requestedAt: '2026-02-02T09:00:00Z', status: 'pending' },
  { id: 'apr-003', type: 'workflow', requestedBy: 'ops@example.com', requestedAt: '2026-01-30T14:00:00Z', status: 'approved' },
];

// ============================================================================
// Store
// ============================================================================

function generateId(): string {
  return `demo-${globalThis.crypto.randomUUID()}`;
}

export const useDemoStore = create<DemoStore>((set) => ({
  // Initial seed data
  entities: seedEntities,
  events: seedEvents,
  runs: seedRuns,
  tasks: seedTasks,
  kpis: seedKpis,
  pipeline: seedPipeline,
  approvals: seedApprovals,

  // Actions
  addEntity: (entity) =>
    set((state) => ({
      entities: [
        ...state.entities,
        { ...entity, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateEntity: (id, updates) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  deleteEntity: (id) =>
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: generateId() }],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [
        { ...event, id: generateId(), timestamp: new Date().toISOString() },
        ...state.events,
      ],
    })),

  approveItem: (id) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id ? { ...a, status: 'approved' as const } : a
      ),
    })),

  rejectItem: (id) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id ? { ...a, status: 'rejected' as const } : a
      ),
    })),

  reset: () =>
    set({
      entities: seedEntities,
      events: seedEvents,
      runs: seedRuns,
      tasks: seedTasks,
      kpis: seedKpis,
      pipeline: seedPipeline,
      approvals: seedApprovals,
    }),
}));
