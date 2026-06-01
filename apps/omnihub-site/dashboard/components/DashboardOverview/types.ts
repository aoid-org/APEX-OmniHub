import type { HealthStatus } from '../../types/context.types';

export interface DashboardOverviewProps {
  readonly demoMode: boolean;
  readonly appHealth: HealthStatus;
  readonly setAppHealth: (v: HealthStatus) => void;
  readonly ecoAppsVisible: boolean;
  readonly setEcoAppsVisible: (v: boolean) => void;
}


export interface AppEntry {
  readonly name: string;
  readonly cat: string;
  readonly logo: string;
  readonly synced: string;
  readonly status: string;
}
