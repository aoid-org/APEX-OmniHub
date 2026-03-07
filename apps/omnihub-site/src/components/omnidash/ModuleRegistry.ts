/**
 * ModuleRegistry — Functional data for OmniDash module modals.
 * Each module provides real, actionable content rendered by ModuleRenderer.
 *
 * APEX STANDARDS: Data-driven, zero side-effects, fully typed.
 * OWNED BY: APEX Business Systems Ltd.
 */

export interface ModuleStatItem {
  readonly label: string;
  readonly value: string;
  readonly trend?: 'up' | 'down' | 'stable';
}

export interface ModuleListItem {
  readonly id: string;
  readonly label: string;
  readonly status: 'active' | 'inactive' | 'pending' | 'error';
  readonly detail?: string;
}

export interface ModuleAction {
  readonly id: string;
  readonly label: string;
  readonly variant: 'primary' | 'secondary' | 'destructive';
}

export interface ModuleContent {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly ModuleStatItem[];
  readonly items: readonly ModuleListItem[];
  readonly actions: readonly ModuleAction[];
}

const MODULES: Readonly<Record<string, ModuleContent>> = {
  omniskills: {
    moduleKey: 'omniskills',
    headline: 'AI skill bundles available for activation.',
    stats: [
      { label: 'Active Skills', value: '12', trend: 'up' },
      { label: 'Available', value: '47' },
      { label: 'Avg Latency', value: '120ms', trend: 'stable' },
    ],
    items: [
      {
        id: 'sk-nlp',
        label: 'Natural Language Processing',
        status: 'active',
        detail: 'Entity extraction, sentiment, intent',
      },
      {
        id: 'sk-vision',
        label: 'Computer Vision',
        status: 'active',
        detail: 'OCR, object detection, classification',
      },
      {
        id: 'sk-codegen',
        label: 'Code Generation',
        status: 'active',
        detail: 'TypeScript, Python, SQL synthesis',
      },
      {
        id: 'sk-rag',
        label: 'RAG Pipeline',
        status: 'pending',
        detail: 'Retrieval-augmented generation',
      },
      {
        id: 'sk-voice',
        label: 'Voice Transcription',
        status: 'inactive',
        detail: 'Whisper-based real-time STT',
      },
    ],
    actions: [
      { id: 'activate-all', label: 'Activate All', variant: 'primary' },
      { id: 'manage-bundles', label: 'Manage Bundles', variant: 'secondary' },
    ],
  },

  physiomni: {
    moduleKey: 'physiomni',
    headline: 'Physical operations and device telemetry.',
    stats: [
      { label: 'Connected Devices', value: '8', trend: 'stable' },
      { label: 'Data Points/hr', value: '2,400', trend: 'up' },
      { label: 'Uptime', value: '99.7%', trend: 'stable' },
    ],
    items: [
      {
        id: 'dev-whoop',
        label: 'WHOOP 4.0',
        status: 'active',
        detail: 'HRV 62ms | Recovery 84%',
      },
      {
        id: 'dev-oura',
        label: 'Oura Ring Gen 3',
        status: 'active',
        detail: 'Sleep Score 88 | Readiness 91',
      },
      {
        id: 'dev-garmin',
        label: 'Garmin Fenix 7',
        status: 'active',
        detail: 'VO2 Max 48 | Steps 9,240',
      },
      {
        id: 'dev-cgm',
        label: 'Dexcom G7',
        status: 'pending',
        detail: 'Glucose monitoring — awaiting sync',
      },
    ],
    actions: [
      { id: 'sync-devices', label: 'Sync All Devices', variant: 'primary' },
      { id: 'export-data', label: 'Export Health Data', variant: 'secondary' },
    ],
  },

  audits: {
    moduleKey: 'audits',
    headline: 'Governance, compliance, and security audit trail.',
    stats: [
      { label: 'Events (24h)', value: '1,247', trend: 'stable' },
      { label: 'Violations', value: '0', trend: 'stable' },
      { label: 'Compliance', value: '100%', trend: 'stable' },
    ],
    items: [
      {
        id: 'aud-001',
        label: 'SOC 2 Type II Attestation',
        status: 'active',
        detail: 'Last verified: 2026-03-01',
      },
      {
        id: 'aud-002',
        label: 'GDPR Data Processing Audit',
        status: 'active',
        detail: 'Next review: 2026-04-15',
      },
      {
        id: 'aud-003',
        label: 'Zero-Trust Policy Enforcement',
        status: 'active',
        detail: '847 policy checks passed today',
      },
      {
        id: 'aud-004',
        label: 'API Access Audit Trail',
        status: 'active',
        detail: '3,892 authenticated requests logged',
      },
    ],
    actions: [
      { id: 'export-audit', label: 'Export Audit Log', variant: 'primary' },
      { id: 'run-compliance', label: 'Run Compliance Check', variant: 'secondary' },
    ],
  },

  links: {
    moduleKey: 'links',
    headline: 'Connected services and integration endpoints.',
    stats: [
      { label: 'Active Links', value: '14', trend: 'up' },
      { label: 'Throughput', value: '8.2K/hr', trend: 'up' },
      { label: 'Error Rate', value: '0.02%', trend: 'down' },
    ],
    items: [
      {
        id: 'lnk-sf',
        label: 'Salesforce CRM',
        status: 'active',
        detail: 'Synced 2m ago | 48 records/hr',
      },
      {
        id: 'lnk-qb',
        label: 'QuickBooks Online',
        status: 'active',
        detail: 'Synced 5m ago | 12 invoices queued',
      },
      {
        id: 'lnk-slack',
        label: 'Slack Workspace',
        status: 'active',
        detail: 'Synced 1m ago | 230 events/hr',
      },
      {
        id: 'lnk-gh',
        label: 'GitHub Enterprise',
        status: 'active',
        detail: 'Synced 3m ago | Webhooks active',
      },
      {
        id: 'lnk-stripe',
        label: 'Stripe Payments',
        status: 'error',
        detail: 'Token expired — re-authorize required',
      },
    ],
    actions: [
      { id: 'add-link', label: 'Add Connection', variant: 'primary' },
      { id: 'test-all', label: 'Test All Links', variant: 'secondary' },
    ],
  },

  automations: {
    moduleKey: 'automations',
    headline: 'Workflow automation rules and triggers.',
    stats: [
      { label: 'Active Rules', value: '23', trend: 'up' },
      { label: 'Executions (24h)', value: '1,892', trend: 'up' },
      { label: 'Success Rate', value: '99.8%', trend: 'stable' },
    ],
    items: [
      {
        id: 'auto-lead',
        label: 'Lead Scoring Pipeline',
        status: 'active',
        detail: 'Trigger: New contact | Runs: 340/day',
      },
      {
        id: 'auto-invoice',
        label: 'Invoice Reconciliation',
        status: 'active',
        detail: 'Trigger: Payment received | Runs: 48/day',
      },
      {
        id: 'auto-alert',
        label: 'Anomaly Alert Dispatch',
        status: 'active',
        detail: 'Trigger: Metric threshold | Runs: 12/day',
      },
      {
        id: 'auto-backup',
        label: 'Nightly Data Backup',
        status: 'active',
        detail: 'Trigger: Cron 02:00 UTC | Last: Success',
      },
      {
        id: 'auto-onboard',
        label: 'Customer Onboarding Flow',
        status: 'pending',
        detail: 'Trigger: Signup event | Draft',
      },
    ],
    actions: [
      { id: 'create-rule', label: 'Create Automation', variant: 'primary' },
      { id: 'view-logs', label: 'View Execution Logs', variant: 'secondary' },
    ],
  },

  workflows: {
    moduleKey: 'workflows',
    headline: 'Visual workflow definitions and process studio.',
    stats: [
      { label: 'Workflows', value: '9', trend: 'stable' },
      { label: 'Active Runs', value: '3', trend: 'up' },
      { label: 'Avg Duration', value: '4.2s', trend: 'down' },
    ],
    items: [
      {
        id: 'wf-etl',
        label: 'ETL: CRM to Data Warehouse',
        status: 'active',
        detail: '7 steps | Last run: 2m ago | 4.1s',
      },
      {
        id: 'wf-deploy',
        label: 'CI/CD Deploy Pipeline',
        status: 'active',
        detail: '12 steps | Last run: 18m ago | 8.3s',
      },
      {
        id: 'wf-report',
        label: 'Weekly KPI Report Generator',
        status: 'active',
        detail: '5 steps | Next run: Mon 08:00 UTC',
      },
      {
        id: 'wf-nurture',
        label: 'Lead Nurture Sequence',
        status: 'pending',
        detail: '9 steps | Draft — awaiting approval',
      },
    ],
    actions: [
      { id: 'create-workflow', label: 'New Workflow', variant: 'primary' },
      { id: 'import', label: 'Import Template', variant: 'secondary' },
    ],
  },

  files: {
    moduleKey: 'files',
    headline: 'Document management and file operations.',
    stats: [
      { label: 'Total Files', value: '2,847', trend: 'up' },
      { label: 'Storage Used', value: '14.2 GB', trend: 'up' },
      { label: 'Shared Links', value: '89', trend: 'stable' },
    ],
    items: [
      {
        id: 'file-contracts',
        label: 'contracts/',
        status: 'active',
        detail: '124 files | 2.1 GB | Last modified: today',
      },
      {
        id: 'file-invoices',
        label: 'invoices/2026/',
        status: 'active',
        detail: '892 files | 340 MB | Auto-synced',
      },
      {
        id: 'file-reports',
        label: 'reports/weekly/',
        status: 'active',
        detail: '52 files | 89 MB | Generated',
      },
      {
        id: 'file-templates',
        label: 'templates/',
        status: 'active',
        detail: '18 files | 4.2 MB | Shared',
      },
    ],
    actions: [
      { id: 'upload', label: 'Upload Files', variant: 'primary' },
      { id: 'browse', label: 'Browse Storage', variant: 'secondary' },
    ],
  },

  billing: {
    moduleKey: 'billing',
    headline: 'Subscription management and usage analytics.',
    stats: [
      { label: 'Plan', value: 'Enterprise' },
      { label: 'MRR', value: '$4,200', trend: 'stable' },
      { label: 'Next Invoice', value: 'Apr 1', trend: 'stable' },
    ],
    items: [
      {
        id: 'inv-mar',
        label: 'INV-2026-0003 — March 2026',
        status: 'active',
        detail: '$4,200.00 | Paid Mar 1',
      },
      {
        id: 'inv-feb',
        label: 'INV-2026-0002 — February 2026',
        status: 'active',
        detail: '$4,200.00 | Paid Feb 1',
      },
      {
        id: 'inv-jan',
        label: 'INV-2026-0001 — January 2026',
        status: 'active',
        detail: '$4,200.00 | Paid Jan 1',
      },
      {
        id: 'usage-api',
        label: 'API Usage — Current Period',
        status: 'active',
        detail: '142K / 500K requests (28.4%)',
      },
    ],
    actions: [
      { id: 'manage-plan', label: 'Manage Plan', variant: 'primary' },
      { id: 'download-invoices', label: 'Download Invoices', variant: 'secondary' },
    ],
  },

  settings: {
    moduleKey: 'settings',
    headline: 'Platform configuration and operational preferences.',
    stats: [
      { label: 'Environment', value: 'Production' },
      { label: 'Region', value: 'us-east-1' },
      { label: 'Version', value: 'v1.4.0' },
    ],
    items: [
      {
        id: 'set-2fa',
        label: 'Two-Factor Authentication',
        status: 'active',
        detail: 'TOTP enabled for all admin accounts',
      },
      {
        id: 'set-sso',
        label: 'SSO via Okta',
        status: 'active',
        detail: 'SAML 2.0 | 24 provisioned users',
      },
      {
        id: 'set-webhooks',
        label: 'Webhook Notifications',
        status: 'active',
        detail: '6 endpoints configured | HMAC-SHA256',
      },
      {
        id: 'set-retention',
        label: 'Data Retention Policy',
        status: 'active',
        detail: '90-day rolling window | Auto-archive',
      },
      {
        id: 'set-sandbox',
        label: 'Sandbox Mode',
        status: 'inactive',
        detail: 'Isolated test environment — disabled',
      },
    ],
    actions: [
      { id: 'save-settings', label: 'Save Changes', variant: 'primary' },
      { id: 'reset-defaults', label: 'Reset Defaults', variant: 'destructive' },
    ],
  },
};

export function getModuleContent(
  moduleKey: string,
): ModuleContent | undefined {
  return MODULES[moduleKey];
}

export function getAllModuleKeys(): readonly string[] {
  return Object.keys(MODULES);
}
