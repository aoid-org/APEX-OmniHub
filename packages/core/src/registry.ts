export type AppRegistryCategory = 'control-plane' | 'security' | 'automation' | 'operations' | 'platform';
export type AppHealthStatus = 'green' | 'yellow' | 'red';
export type DashboardStatus = 'Live' | 'Partial';

export interface AppRegistryEntry {
  readonly key: string;
  readonly label: string;
  readonly routePath: `/omnidash${string}`;
  readonly category: AppRegistryCategory;
  readonly iconAssetKey: string;
  readonly logoDomain: string;
  readonly chaosTarget: boolean;
  readonly comingSoon: boolean;
  readonly healthContext: {
    readonly health: AppHealthStatus;
    readonly insight: string;
  };
  readonly dashboard: {
    readonly syncedMinutesAgo: number;
    readonly status: DashboardStatus;
  };
}

type AppRegistrySeed = {
  readonly key: AppRegistryEntry['key'];
  readonly label: AppRegistryEntry['label'];
  readonly routePath: AppRegistryEntry['routePath'];
  readonly category: AppRegistryCategory;
  readonly iconAssetKey: AppRegistryEntry['iconAssetKey'];
  readonly logoDomain: AppRegistryEntry['logoDomain'];
  readonly chaosTarget: AppRegistryEntry['chaosTarget'];
  readonly comingSoon: AppRegistryEntry['comingSoon'];
  readonly health: AppHealthStatus;
  readonly insight: string;
  readonly syncedMinutesAgo: number;
  readonly status: DashboardStatus;
};

const createAppRegistryEntry = (seed: AppRegistrySeed): AppRegistryEntry => ({
  key: seed.key,
  label: seed.label,
  routePath: seed.routePath,
  category: seed.category,
  iconAssetKey: seed.iconAssetKey,
  logoDomain: seed.logoDomain,
  chaosTarget: seed.chaosTarget,
  comingSoon: seed.comingSoon,
  healthContext: {
    health: seed.health,
    insight: seed.insight,
  },
  dashboard: {
    syncedMinutesAgo: seed.syncedMinutesAgo,
    status: seed.status,
  },
});

const APP_REGISTRY_SOURCE: readonly AppRegistrySeed[] = [
  {
    key: 'omniboard',
    label: 'OmniBoard',
    routePath: '/omnidash',
    category: 'control-plane',
    iconAssetKey: 'omniboard',
    logoDomain: 'apexomnihub.icu',
    chaosTarget: false,
    comingSoon: false,
    health: 'green',
    insight: 'Control plane telemetry healthy and within SLO.',
    syncedMinutesAgo: 1,
    status: 'Live',
  },
  {
    key: 'omniport',
    label: 'OmniPort',
    routePath: '/omnidash/omniport',
    category: 'platform',
    iconAssetKey: 'links',
    logoDomain: 'cloudflare.com',
    chaosTarget: true,
    comingSoon: false,
    health: 'yellow',
    insight: 'Throughput elevated; queue depth remains controlled.',
    syncedMinutesAgo: 2,
    status: 'Live',
  },
  {
    key: 'maestro',
    label: 'Maestro',
    routePath: '/omnidash/maestro',
    category: 'automation',
    iconAssetKey: 'automations',
    logoDomain: 'temporal.io',
    chaosTarget: true,
    comingSoon: false,
    health: 'green',
    insight: 'Workflow orchestration heartbeat stable across shards.',
    syncedMinutesAgo: 1,
    status: 'Live',
  },
  {
    key: 'fortress',
    label: 'Fortress',
    routePath: '/omnidash/fortress',
    category: 'security',
    iconAssetKey: 'audits',
    logoDomain: 'supabase.com',
    chaosTarget: true,
    comingSoon: false,
    health: 'green',
    insight: 'Zero-trust controls passing policy and audit checks.',
    syncedMinutesAgo: 1,
    status: 'Live',
  },
  {
    key: 'orchestrator',
    label: 'Orchestrator',
    routePath: '/omnidash/orchestrator',
    category: 'control-plane',
    iconAssetKey: 'workflows',
    logoDomain: 'python.org',
    chaosTarget: true,
    comingSoon: false,
    health: 'yellow',
    insight: 'Planner latency elevated during simulation windows.',
    syncedMinutesAgo: 3,
    status: 'Partial',
  },
  {
    key: 'omniskills',
    label: 'OmniSkills',
    routePath: '/omnidash/omniskills',
    category: 'platform',
    iconAssetKey: 'omniskills',
    logoDomain: 'openai.com',
    chaosTarget: false,
    comingSoon: true,
    health: 'green',
    insight: 'Skill bundle indexing remains up-to-date.',
    syncedMinutesAgo: 4,
    status: 'Live',
  },
  {
    key: 'physiomni',
    label: 'PhysiOmni',
    routePath: '/omnidash/physiomni',
    category: 'operations',
    iconAssetKey: 'physiomni',
    logoDomain: 'whoop.com',
    chaosTarget: false,
    comingSoon: true,
    health: 'green',
    insight: 'Device ingest channels reporting nominal cadence.',
    syncedMinutesAgo: 5,
    status: 'Live',
  },
  {
    key: 'audits',
    label: 'Audits',
    routePath: '/omnidash/audits',
    category: 'security',
    iconAssetKey: 'audits',
    logoDomain: 'vercel.com',
    chaosTarget: true,
    comingSoon: true,
    health: 'green',
    insight: 'Audit event writes are durable and replayable.',
    syncedMinutesAgo: 2,
    status: 'Live',
  },
  {
    key: 'links',
    label: 'Links',
    routePath: '/omnidash/links',
    category: 'platform',
    iconAssetKey: 'links',
    logoDomain: 'zapier.com',
    chaosTarget: true,
    comingSoon: true,
    health: 'yellow',
    insight: 'Connector retries active for one downstream endpoint.',
    syncedMinutesAgo: 6,
    status: 'Partial',
  },
  {
    key: 'automations',
    label: 'Automations',
    routePath: '/omnidash/automations',
    category: 'automation',
    iconAssetKey: 'automations',
    logoDomain: 'n8n.io',
    chaosTarget: true,
    comingSoon: true,
    health: 'green',
    insight: 'Automation schedules executing on configured cadence.',
    syncedMinutesAgo: 3,
    status: 'Live',
  },
  {
    key: 'workflows',
    label: 'Workflows',
    routePath: '/omnidash/workflows',
    category: 'automation',
    iconAssetKey: 'workflows',
    logoDomain: 'airflow.apache.org',
    chaosTarget: true,
    comingSoon: true,
    health: 'green',
    insight: 'Workflow graph validation passes pre-execution gates.',
    syncedMinutesAgo: 3,
    status: 'Live',
  },
  {
    key: 'files',
    label: 'Files',
    routePath: '/omnidash/files',
    category: 'operations',
    iconAssetKey: 'files',
    logoDomain: 'dropbox.com',
    chaosTarget: false,
    comingSoon: true,
    health: 'green',
    insight: 'Document sync jobs are processing without drift.',
    syncedMinutesAgo: 7,
    status: 'Live',
  },
  {
    key: 'billing',
    label: 'Billing',
    routePath: '/omnidash/billing',
    category: 'operations',
    iconAssetKey: 'billing',
    logoDomain: 'stripe.com',
    chaosTarget: false,
    comingSoon: true,
    health: 'yellow',
    insight: 'Billing export task retried and recovered automatically.',
    syncedMinutesAgo: 8,
    status: 'Partial',
  },
  {
    key: 'settings',
    label: 'Settings',
    routePath: '/omnidash/settings',
    category: 'control-plane',
    iconAssetKey: 'settings',
    logoDomain: 'okta.com',
    chaosTarget: false,
    comingSoon: true,
    health: 'green',
    insight: 'Configuration revisions persisted and versioned safely.',
    syncedMinutesAgo: 2,
    status: 'Live',
  },
] as const;

export const APP_REGISTRY: readonly AppRegistryEntry[] = APP_REGISTRY_SOURCE.map(createAppRegistryEntry);

if (APP_REGISTRY.length !== 14) {
  throw new Error(`APP_REGISTRY must contain exactly 14 entries. Found: ${APP_REGISTRY.length}`);
}
