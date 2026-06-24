export interface NormalizedModuleItem {
  id: string;
  label: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  detail?: string;
}
