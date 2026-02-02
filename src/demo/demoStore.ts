/**
 * Demo Store - Seeded Persistent Demo Data
 * 
 * Provides realistic demo data for all OmniDash features.
 * Data persists in localStorage for session continuity.
 * 
 * NO SUPABASE CALLS in demo mode - all data comes from here.
 */

import { nanoid } from 'nanoid';

// ============================================================================
// TYPES
// ============================================================================

export interface DemoTask {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface DemoEvent {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DemoRun {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  steps: number;
  currentStep: number;
}

export interface DemoIntegration {
  id: string;
  name: string;
  type: 'webhook' | 'calendar' | 'custom' | 'api';
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  keyPrefix?: string;
}

export interface DemoTodayItem {
  id: string;
  type: 'outcome' | 'outreach' | 'metric';
  label: string;
  value?: number;
  completed: boolean;
  createdAt: string;
}

export interface DemoPipelineDeal {
  id: string;
  name: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  probability: number;
  company: string;
  createdAt: string;
}

export interface DemoLocalAgent {
  id: string;
  name: string;
  type: 'lead-gen' | 'sales' | 'support' | 'custom';
  status: 'online' | 'offline' | 'busy';
  lastPing: string;
}

export interface DemoApproval {
  id: string;
  type: 'workflow' | 'expense' | 'access';
  title: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DemoStoreState {
  tasks: DemoTask[];
  events: DemoEvent[];
  runs: DemoRun[];
  integrations: DemoIntegration[];
  todayItems: DemoTodayItem[];
  pipeline: DemoPipelineDeal[];
  localAgents: DemoLocalAgent[];
  approvals: DemoApproval[];
  kpis: { label: string; value: number; trend: number; unit: string }[];
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'apex.demo.store';

function loadStore(): DemoStoreState | null {
  if (globalThis.localStorage === undefined) return null;
  const stored = globalThis.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DemoStoreState;
  } catch {
    return null;
  }
}

function saveStore(state: DemoStoreState): void {
  if (globalThis.localStorage === undefined) return;
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ============================================================================
// SEED DATA
// ============================================================================

function createSeedData(): DemoStoreState {
  const now = new Date().toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();

  return {
    tasks: [
      { id: nanoid(), action: 'send_email', payload: { to: 'demo@example.com' }, status: 'completed', createdAt: dayAgo, completedAt: hourAgo },
      { id: nanoid(), action: 'sync_crm', payload: { source: 'salesforce' }, status: 'running', createdAt: hourAgo },
      { id: nanoid(), action: 'generate_report', payload: { type: 'weekly' }, status: 'pending', createdAt: now },
    ],
    events: [
      { id: nanoid(), type: 'webhook.received', source: 'stripe', payload: { event: 'payment.success' }, timestamp: now },
      { id: nanoid(), type: 'user.action', source: 'app', payload: { action: 'login' }, timestamp: hourAgo },
      { id: nanoid(), type: 'system.alert', source: 'monitor', payload: { level: 'info' }, timestamp: dayAgo },
    ],
    runs: [
      { id: nanoid(), workflowId: 'onboarding-flow', status: 'completed', startedAt: dayAgo, completedAt: hourAgo, steps: 5, currentStep: 5 },
      { id: nanoid(), workflowId: 'daily-sync', status: 'running', startedAt: hourAgo, steps: 3, currentStep: 2 },
    ],
    integrations: [
      { id: nanoid(), name: 'Slack', type: 'webhook', status: 'active', lastSync: now },
      { id: nanoid(), name: 'Google Calendar', type: 'calendar', status: 'active', lastSync: hourAgo },
      { id: nanoid(), name: 'Custom API', type: 'api', status: 'inactive', keyPrefix: 'demo_key_****' },
    ],
    todayItems: [
      { id: nanoid(), type: 'outcome', label: 'Close 3 deals', completed: false, createdAt: now },
      { id: nanoid(), type: 'outreach', label: 'Send 10 follow-ups', completed: true, createdAt: now },
      { id: nanoid(), type: 'metric', label: 'Revenue', value: 12500, completed: false, createdAt: now },
    ],
    pipeline: [
      { id: nanoid(), name: 'Enterprise Deal', value: 50000, stage: 'proposal', probability: 60, company: 'Acme Corp', createdAt: dayAgo },
      { id: nanoid(), name: 'SMB Subscription', value: 5000, stage: 'qualified', probability: 40, company: 'StartupXYZ', createdAt: hourAgo },
      { id: nanoid(), name: 'Agency Retainer', value: 8000, stage: 'negotiation', probability: 80, company: 'CreativeHub', createdAt: now },
    ],
    localAgents: [
      { id: nanoid(), name: 'LeadGen Bot', type: 'lead-gen', status: 'online', lastPing: now },
      { id: nanoid(), name: 'Sales Assistant', type: 'sales', status: 'busy', lastPing: hourAgo },
    ],
    approvals: [
      { id: nanoid(), type: 'workflow', title: 'Deploy to Production', requester: 'dev@company.com', status: 'pending', createdAt: now },
      { id: nanoid(), type: 'expense', title: 'Marketing Budget Q1', requester: 'marketing@company.com', status: 'approved', createdAt: dayAgo },
    ],
    kpis: [
      { label: 'Revenue', value: 125000, trend: 12, unit: '$' },
      { label: 'Active Users', value: 1847, trend: 8, unit: '' },
      { label: 'Conversion Rate', value: 3.2, trend: -2, unit: '%' },
      { label: 'Tasks Completed', value: 342, trend: 24, unit: '' },
    ],
  };
}

// ============================================================================
// STORE API
// ============================================================================

class DemoStore {
  private state: DemoStoreState;

  constructor() {
    const loaded = loadStore();
    this.state = loaded || createSeedData();
    if (!loaded) {
      saveStore(this.state);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  getTasks(): DemoTask[] {
    return [...this.state.tasks];
  }

  getEvents(): DemoEvent[] {
    return [...this.state.events];
  }

  getRuns(): DemoRun[] {
    return [...this.state.runs];
  }

  getIntegrations(): DemoIntegration[] {
    return [...this.state.integrations];
  }

  getTodayItems(): DemoTodayItem[] {
    return [...this.state.todayItems];
  }

  getPipeline(): DemoPipelineDeal[] {
    return [...this.state.pipeline];
  }

  getLocalAgents(): DemoLocalAgent[] {
    return [...this.state.localAgents];
  }

  getApprovals(): DemoApproval[] {
    return [...this.state.approvals];
  }

  getKpis(): DemoStoreState['kpis'] {
    return [...this.state.kpis];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  addTask(task: Omit<DemoTask, 'id' | 'createdAt' | 'status'>): DemoTask {
    const newTask: DemoTask = {
      ...task,
      id: nanoid(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.state.tasks.unshift(newTask);
    saveStore(this.state);
    return newTask;
  }

  updateTask(id: string, updates: Partial<DemoTask>): DemoTask | null {
    const idx = this.state.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.state.tasks[idx] = { ...this.state.tasks[idx], ...updates };
    saveStore(this.state);
    return this.state.tasks[idx];
  }

  addEvent(event: Omit<DemoEvent, 'id' | 'timestamp'>): DemoEvent {
    const newEvent: DemoEvent = {
      ...event,
      id: nanoid(),
      timestamp: new Date().toISOString(),
    };
    this.state.events.unshift(newEvent);
    saveStore(this.state);
    return newEvent;
  }

  addTodayItem(item: Omit<DemoTodayItem, 'id' | 'createdAt' | 'completed'>): DemoTodayItem {
    const newItem: DemoTodayItem = {
      ...item,
      id: nanoid(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.state.todayItems.push(newItem);
    saveStore(this.state);
    return newItem;
  }

  toggleTodayItem(id: string): DemoTodayItem | null {
    const idx = this.state.todayItems.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.state.todayItems[idx].completed = !this.state.todayItems[idx].completed;
    saveStore(this.state);
    return this.state.todayItems[idx];
  }

  addIntegration(integration: Omit<DemoIntegration, 'id'>): DemoIntegration {
    const newIntegration: DemoIntegration = {
      ...integration,
      id: nanoid(),
    };
    this.state.integrations.push(newIntegration);
    saveStore(this.state);
    return newIntegration;
  }

  generateApiKey(integrationId: string): string {
    const key = `demo_${nanoid(24)}`;
    const integration = this.state.integrations.find((i) => i.id === integrationId);
    if (integration) {
      integration.keyPrefix = key.slice(0, 12) + '****';
      saveStore(this.state);
    }
    return key; // Return full key ONCE for display
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────

  reset(): void {
    this.state = createSeedData();
    saveStore(this.state);
  }
}

// Singleton instance
export const demoStore = new DemoStore();

export default demoStore;
