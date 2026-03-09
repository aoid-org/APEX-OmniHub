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
  readonly routePath: `/omnidash${string}`;
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
    key: 'omniskills',
    label: 'OmniSkills',
    routePath: '/omnidash/omniskills',
    category: 'platform',
    iconAssetKey: 'omniskills',
    logoDomain: 'openai.com',
    chaosTarget: false,
    comingSoon: false,
    health: 'green',
    insight: 'Skill bundle indexing remains up-to-date.',
    syncedMinutesAgo: 4,
    status: 'Live',
  },
  {
    key: 'orchestrator',
    label: 'Orchestrator',
    routePath: '/omnidash/orchestrator',
    category: 'automation',
    iconAssetKey: 'automations',
    logoDomain: 'temporal.io',
    chaosTarget: true,
    comingSoon: false,
    health: 'yellow',
    insight: 'Orchestration pipeline awaiting OAuth credential binding.',
    syncedMinutesAgo: 10,
    status: 'Partial',
  },
  {
    key: 'fortress',
    label: 'Fortress',
    routePath: '/omnidash/fortress',
    category: 'security',
    iconAssetKey: 'audits',
    logoDomain: 'crowdstrike.com',
    chaosTarget: true,
    comingSoon: false,
    health: 'green',
    insight: 'Perimeter defense and threat detection nominal.',
    syncedMinutesAgo: 1,
    status: 'Live',
  },
  {
    key: 'omniport',
    label: 'OmniPort',
    routePath: '/omnidash/omniport',
    category: 'platform',
    iconAssetKey: 'links',
    logoDomain: 'apexomnihub.icu',
    chaosTarget: false,
    comingSoon: false,
    health: 'green',
    insight: 'Integration gateway channels healthy.',
    syncedMinutesAgo: 3,
    status: 'Live',
  },
  {
    key: 'maestro',
    label: 'Maestro',
    routePath: '/omnidash/maestro',
    category: 'operations',
    iconAssetKey: 'workflows',
    logoDomain: 'apexomnihub.icu',
    chaosTarget: false,
    comingSoon: false,
    health: 'green',
    insight: 'Process orchestration engine running within SLA.',
    syncedMinutesAgo: 2,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
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
    comingSoon: false,
    health: 'green',
    insight: 'Configuration revisions persisted and versioned safely.',
    syncedMinutesAgo: 2,
    status: 'Live',
  },
];

export const APP_REGISTRY: readonly AppRegistryEntry[] = APP_REGISTRY_SOURCE.map(createAppRegistryEntry);

if (APP_REGISTRY.length !== 14) {
  throw new Error(`APP_REGISTRY must contain exactly 14 entries. Found: ${APP_REGISTRY.length}`);
}
