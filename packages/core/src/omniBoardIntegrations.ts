import type { AppRegistryCategory, AppHealthStatus, DashboardStatus } from './registry';

export interface ExternalIntegrationEntry {
  readonly key: string;
  readonly label: string;
  readonly category: AppRegistryCategory;
  readonly iconAssetKey: string;
  readonly logoDomain: string;
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

const EXTERNAL_INTEGRATIONS_SOURCE: readonly ExternalIntegrationEntry[] = [
  {
    key: 'quickbooks',
    label: 'QuickBooks',
    category: 'operations',
    iconAssetKey: 'billing',
    logoDomain: 'quickbooks.intuit.com',
    comingSoon: false,
    healthContext: {
      health: 'green',
      insight: 'Financial sync nominal.',
    },
    dashboard: {
      syncedMinutesAgo: 1,
      status: 'Partial',
    },
  },
  {
    key: 'salesforce',
    label: 'Salesforce',
    category: 'operations',
    iconAssetKey: 'links',
    logoDomain: 'salesforce.com',
    comingSoon: false,
    healthContext: {
      health: 'yellow',
      insight: 'API rate limits approaching.',
    },
    dashboard: {
      syncedMinutesAgo: 5,
      status: 'Live',
    },
  },
  {
    key: 'sap',
    label: 'SAP',
    category: 'operations',
    iconAssetKey: 'files',
    logoDomain: 'sap.com',
    comingSoon: true,
    healthContext: {
      health: 'green',
      insight: 'Awaiting deployment.',
    },
    dashboard: {
      syncedMinutesAgo: 0,
      status: 'Partial',
    },
  },
  {
    key: 'slack',
    label: 'Slack',
    category: 'operations',
    iconAssetKey: 'automations',
    logoDomain: 'slack.com',
    comingSoon: false,
    healthContext: {
      health: 'green',
      insight: 'Message streaming healthy.',
    },
    dashboard: {
      syncedMinutesAgo: 2,
      status: 'Live',
    },
  },
];

export const EXTERNAL_INTEGRATIONS: readonly ExternalIntegrationEntry[] = EXTERNAL_INTEGRATIONS_SOURCE;
