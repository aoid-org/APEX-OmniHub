export type HealthStatus = 'green' | 'yellow' | 'red';

export interface DashboardOverviewProps {
  readonly demoMode: boolean;
  readonly appHealth: HealthStatus;
  readonly setAppHealth: (v: HealthStatus) => void;
  readonly ecoAppsVisible: boolean;
  readonly setEcoAppsVisible: (v: boolean) => void;
}

export interface ContextItem {
  readonly name: string;
  readonly health: HealthStatus;
  readonly insight: string;
}

export interface AppEntry {
  readonly name: string;
  readonly cat: string;
  readonly logo: string;
  readonly synced: string;
  readonly status: 'Live' | 'Partial';
}
