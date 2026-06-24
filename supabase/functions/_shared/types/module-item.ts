export interface NormalizedModuleItem {
  id: string;
  label: string;
  status: 'active' | 'inactive' | 'error' | 'unknown';
  detail?: string;
}
