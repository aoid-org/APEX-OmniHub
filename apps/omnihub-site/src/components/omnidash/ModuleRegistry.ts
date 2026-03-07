/**
 * ModuleRegistry — Functional data for OmniDash module modals.
 * Uses compact seed tuples expanded by buildModule() to eliminate
 * structural duplication (SonarQube CPD safe).
 *
 * APEX STANDARDS: Data-driven, zero side-effects, fully typed.
 * OWNED BY: APEX Business Systems Ltd.
 */

// ── Public types ──────────────────────────────────────────────

type Trend = 'up' | 'down' | 'stable';
type ItemStatus = 'active' | 'inactive' | 'pending' | 'error';
type ActionVariant = 'primary' | 'secondary' | 'destructive';

export interface ModuleStatItem {
  readonly label: string;
  readonly value: string;
  readonly trend?: Trend;
}

export interface ModuleListItem {
  readonly id: string;
  readonly label: string;
  readonly status: ItemStatus;
  readonly detail?: string;
}

export interface ModuleAction {
  readonly id: string;
  readonly label: string;
  readonly variant: ActionVariant;
}

export interface ModuleContent {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly ModuleStatItem[];
  readonly items: readonly ModuleListItem[];
  readonly actions: readonly ModuleAction[];
}

// ── Compact seed types (CPD-safe) ─────────────────────────────
// [label, value, trend?]
type StatSeed = readonly [string, string, Trend?];
// [id, label, status, detail?]
type ItemSeed = readonly [string, string, ItemStatus, string?];
// [id, label, variant]
type ActionSeed = readonly [string, string, ActionVariant];

interface ModuleSeed {
  readonly key: string;
  readonly headline: string;
  readonly stats: readonly StatSeed[];
  readonly items: readonly ItemSeed[];
  readonly actions: readonly ActionSeed[];
}

// ── Builder ───────────────────────────────────────────────────

function buildModule(seed: ModuleSeed): ModuleContent {
  return {
    moduleKey: seed.key,
    headline: seed.headline,
    stats: seed.stats.map(([label, value, trend]) => (
      trend ? { label, value, trend } : { label, value }
    )),
    items: seed.items.map(([id, label, status, detail]) => (
      detail ? { id, label, status, detail } : { id, label, status }
    )),
    actions: seed.actions.map(([id, label, variant]) => (
      { id, label, variant }
    )),
  };
}

// ── Seed data ─────────────────────────────────────────────────

const SEEDS: readonly ModuleSeed[] = [
  {
    key: 'omniskills',
    headline: 'AI skill bundles available for activation.',
    stats: [['Active Skills', '12', 'up'], ['Available', '47'], ['Avg Latency', '120ms', 'stable']],
    items: [
      ['sk-nlp', 'Natural Language Processing', 'active', 'Entity extraction, sentiment, intent'],
      ['sk-vision', 'Computer Vision', 'active', 'OCR, object detection, classification'],
      ['sk-codegen', 'Code Generation', 'active', 'TypeScript, Python, SQL synthesis'],
      ['sk-rag', 'RAG Pipeline', 'pending', 'Retrieval-augmented generation'],
      ['sk-voice', 'Voice Transcription', 'inactive', 'Whisper-based real-time STT'],
    ],
    actions: [['activate-all', 'Activate All', 'primary'], ['manage-bundles', 'Manage Bundles', 'secondary']],
  },
  {
    key: 'physiomni',
    headline: 'Physical operations and device telemetry.',
    stats: [['Connected Devices', '8', 'stable'], ['Data Points/hr', '2,400', 'up'], ['Uptime', '99.7%', 'stable']],
    items: [
      ['dev-whoop', 'WHOOP 4.0', 'active', 'HRV 62ms | Recovery 84%'],
      ['dev-oura', 'Oura Ring Gen 3', 'active', 'Sleep Score 88 | Readiness 91'],
      ['dev-garmin', 'Garmin Fenix 7', 'active', 'VO2 Max 48 | Steps 9,240'],
      ['dev-cgm', 'Dexcom G7', 'pending', 'Glucose monitoring \u2014 awaiting sync'],
    ],
    actions: [['sync-devices', 'Sync All Devices', 'primary'], ['export-data', 'Export Health Data', 'secondary']],
  },
  {
    key: 'audits',
    headline: 'Governance, compliance, and security audit trail.',
    stats: [['Events (24h)', '1,247', 'stable'], ['Violations', '0', 'stable'], ['Compliance', '100%', 'stable']],
    items: [
      ['aud-001', 'SOC 2 Type II Attestation', 'active', 'Last verified: 2026-03-01'],
      ['aud-002', 'GDPR Data Processing Audit', 'active', 'Next review: 2026-04-15'],
      ['aud-003', 'Zero-Trust Policy Enforcement', 'active', '847 policy checks passed today'],
      ['aud-004', 'API Access Audit Trail', 'active', '3,892 authenticated requests logged'],
    ],
    actions: [['export-audit', 'Export Audit Log', 'primary'], ['run-compliance', 'Run Compliance Check', 'secondary']],
  },
  {
    key: 'links',
    headline: 'Connected services and integration endpoints.',
    stats: [['Active Links', '14', 'up'], ['Throughput', '8.2K/hr', 'up'], ['Error Rate', '0.02%', 'down']],
    items: [
      ['lnk-sf', 'Salesforce CRM', 'active', 'Synced 2m ago | 48 records/hr'],
      ['lnk-qb', 'QuickBooks Online', 'active', 'Synced 5m ago | 12 invoices queued'],
      ['lnk-slack', 'Slack Workspace', 'active', 'Synced 1m ago | 230 events/hr'],
      ['lnk-gh', 'GitHub Enterprise', 'active', 'Synced 3m ago | Webhooks active'],
      ['lnk-stripe', 'Stripe Payments', 'error', 'Token expired \u2014 re-authorize required'],
    ],
    actions: [['add-link', 'Add Connection', 'primary'], ['test-all', 'Test All Links', 'secondary']],
  },
  {
    key: 'automations',
    headline: 'Workflow automation rules and triggers.',
    stats: [['Active Rules', '23', 'up'], ['Executions (24h)', '1,892', 'up'], ['Success Rate', '99.8%', 'stable']],
    items: [
      ['auto-lead', 'Lead Scoring Pipeline', 'active', 'Trigger: New contact | Runs: 340/day'],
      ['auto-invoice', 'Invoice Reconciliation', 'active', 'Trigger: Payment received | Runs: 48/day'],
      ['auto-alert', 'Anomaly Alert Dispatch', 'active', 'Trigger: Metric threshold | Runs: 12/day'],
      ['auto-backup', 'Nightly Data Backup', 'active', 'Trigger: Cron 02:00 UTC | Last: Success'],
      ['auto-onboard', 'Customer Onboarding Flow', 'pending', 'Trigger: Signup event | Draft'],
    ],
    actions: [['create-rule', 'Create Automation', 'primary'], ['view-logs', 'View Execution Logs', 'secondary']],
  },
  {
    key: 'workflows',
    headline: 'Visual workflow definitions and process studio.',
    stats: [['Workflows', '9', 'stable'], ['Active Runs', '3', 'up'], ['Avg Duration', '4.2s', 'down']],
    items: [
      ['wf-etl', 'ETL: CRM to Data Warehouse', 'active', '7 steps | Last run: 2m ago | 4.1s'],
      ['wf-deploy', 'CI/CD Deploy Pipeline', 'active', '12 steps | Last run: 18m ago | 8.3s'],
      ['wf-report', 'Weekly KPI Report Generator', 'active', '5 steps | Next run: Mon 08:00 UTC'],
      ['wf-nurture', 'Lead Nurture Sequence', 'pending', '9 steps | Draft \u2014 awaiting approval'],
    ],
    actions: [['create-workflow', 'New Workflow', 'primary'], ['import', 'Import Template', 'secondary']],
  },
  {
    key: 'files',
    headline: 'Document management and file operations.',
    stats: [['Total Files', '2,847', 'up'], ['Storage Used', '14.2 GB', 'up'], ['Shared Links', '89', 'stable']],
    items: [
      ['file-contracts', 'contracts/', 'active', '124 files | 2.1 GB | Last modified: today'],
      ['file-invoices', 'invoices/2026/', 'active', '892 files | 340 MB | Auto-synced'],
      ['file-reports', 'reports/weekly/', 'active', '52 files | 89 MB | Generated'],
      ['file-templates', 'templates/', 'active', '18 files | 4.2 MB | Shared'],
    ],
    actions: [['upload', 'Upload Files', 'primary'], ['browse', 'Browse Storage', 'secondary']],
  },
  {
    key: 'billing',
    headline: 'Subscription management and usage analytics.',
    stats: [['Plan', 'Enterprise'], ['MRR', '$4,200', 'stable'], ['Next Invoice', 'Apr 1', 'stable']],
    items: [
      ['inv-mar', 'INV-2026-0003 \u2014 March 2026', 'active', '$4,200.00 | Paid Mar 1'],
      ['inv-feb', 'INV-2026-0002 \u2014 February 2026', 'active', '$4,200.00 | Paid Feb 1'],
      ['inv-jan', 'INV-2026-0001 \u2014 January 2026', 'active', '$4,200.00 | Paid Jan 1'],
      ['usage-api', 'API Usage \u2014 Current Period', 'active', '142K / 500K requests (28.4%)'],
    ],
    actions: [['manage-plan', 'Manage Plan', 'primary'], ['download-invoices', 'Download Invoices', 'secondary']],
  },
  {
    key: 'settings',
    headline: 'Platform configuration and operational preferences.',
    stats: [['Environment', 'Production'], ['Region', 'us-east-1'], ['Version', 'v1.4.0']],
    items: [
      ['set-2fa', 'Two-Factor Authentication', 'active', 'TOTP enabled for all admin accounts'],
      ['set-sso', 'SSO via Okta', 'active', 'SAML 2.0 | 24 provisioned users'],
      ['set-webhooks', 'Webhook Notifications', 'active', '6 endpoints configured | HMAC-SHA256'],
      ['set-retention', 'Data Retention Policy', 'active', '90-day rolling window | Auto-archive'],
      ['set-sandbox', 'Sandbox Mode', 'inactive', 'Isolated test environment \u2014 disabled'],
    ],
    actions: [['save-settings', 'Save Changes', 'primary'], ['reset-defaults', 'Reset Defaults', 'destructive']],
  },
];

// ── Hydrated registry (built once at module load) ─────────────

const MODULES: ReadonlyMap<string, ModuleContent> = new Map(
  SEEDS.map((seed) => [seed.key, buildModule(seed)]),
);

export function getModuleContent(moduleKey: string): ModuleContent | undefined {
  return MODULES.get(moduleKey);
}

export function getAllModuleKeys(): readonly string[] {
  return SEEDS.map((s) => s.key);
}
