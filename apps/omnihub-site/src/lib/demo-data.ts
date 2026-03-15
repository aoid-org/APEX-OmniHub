/**
 * APEX OmniHub Demo Mode Data Engine
 *
 * Provides realistic, deterministic seeded data for the OmniDash
 * when VITE_DEMO_MODE=true or when Supabase credentials are absent.
 *
 * All data is client-side. No network calls. No credentials required.
 * Sales team can demo from anywhere — airport wifi, client site, offline.
 *
 * Seed is time-based — data changes day-to-day so it always looks "live."
 */

const TODAY  = new Date();
const SEED   = TODAY.getFullYear() * 10000 + (TODAY.getMonth() + 1) * 100 + TODAY.getDate();

/** Deterministic pseudo-random in range [min, max] seeded by offset */
function seeded(offset: number, min: number, max: number): number {
  const x = Math.sin(SEED + offset) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function offsetDate(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function demoActivityMessage(i: number): string {
  const messages = [
    'AgentWorkflow/CRM-sync-4892 completed — 3 records updated',
    'Guardian: YELLOW lane → approved automatically (risk: 0.12)',
    'MAN Mode approval: DELETE customer/bulk — approved by admin',
    'Semantic cache HIT — saved 2,840 tokens (GPT-4)',
    'OmniLink PWA: push notification delivered (iOS)',
    'OmniTrace: workflow replay captured — 47 events',
    'Guardian: RED lane detected — MAN approval request created',
    'AgentWorkflow/Invoice-gen-0021 completed — PDF attached',
    'Supabase RLS: tenant isolation verified (12 tables checked)',
    'Armageddon L7: all 265 tests passing',
    'AgentWorkflow/Email-blast-0099 — 1,204 sent, 0 bounced',
    'OmniEval: daily quality gate passed (score: 0.94)',
  ];
  return messages[i % messages.length];
}

export const DEMO_KPI = {
  activeAgents:     seeded(1, 12, 28),
  workflowsToday:   seeded(2, 84, 210),
  avgLatencyMs:     seeded(3, 120, 290),
  successRate:      seeded(4, 94, 99),
  guardianChecks:   seeded(5, 340, 890),
  manModeApprovals: seeded(6, 2, 8),
  tokensSaved:      seeded(7, 18000, 52000),
  monthlyAPISavings: seeded(8, 1200, 3400),
};

export const DEMO_PIPELINE = [
  { id: '1', account: 'TechCorp Global',   product: 'OmniHub Enterprise', stage: 'proposal',    mrr: 8500,  probability: 75, nextTouch: offsetDate(2) },
  { id: '2', account: 'FinServ Alliance',  product: 'OmniHub + OmniLink', stage: 'negotiation', mrr: 15000, probability: 85, nextTouch: offsetDate(1) },
  { id: '3', account: 'MedTech Solutions', product: 'OmniHub Enterprise', stage: 'meeting',     mrr: 6000,  probability: 40, nextTouch: offsetDate(0) },
  { id: '4', account: 'RetailCo West',     product: 'OmniLink PWA',       stage: 'contacted',   mrr: 3500,  probability: 30, nextTouch: offsetDate(4) },
  { id: '5', account: 'AutoMfg Inc',       product: 'OmniHub Enterprise', stage: 'paid',        mrr: 12000, probability: 100, nextTouch: offsetDate(30) },
];

export const DEMO_INCIDENTS = [
  { id: '1', severity: 'sev3', status: 'resolved',   title: 'Elevated API latency — EU region', occurredAt: offsetDate(-2) },
  { id: '2', severity: 'sev2', status: 'monitoring', title: 'Temporal worker restart loop',      occurredAt: offsetDate(-0.5) },
];

export const DEMO_ACTIVITY_FEED = Array.from({ length: 12 }, (_, i) => ({
  id:        String(i),
  type:      (['workflow_complete', 'guardian_check', 'man_approved', 'cache_hit'] as const)[i % 4],
  message:   demoActivityMessage(i),
  timestamp: new Date(Date.now() - i * seeded(i + 20, 120000, 900000)).toISOString(),
  status:    i === 3 ? ('warning' as const) : ('success' as const),
}));

export const isDemoMode = (): boolean =>
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';
