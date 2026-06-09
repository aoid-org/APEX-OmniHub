// Root-package stub; tests mock this via vi.mock('@/lib/iframeOriginPolicy')
// The real file lives at apps/omnihub-site/src/lib/iframeOriginPolicy.ts
export type SandboxProfile = 'strict' | 'default' | 'permissive';

export interface SanitiseResult {
  allowed: boolean;
  profile: SandboxProfile;
  reason: string;
}

export function sanitiseIframeUrl(_url: string | undefined, _isDemoMode?: boolean): SanitiseResult {
  return { allowed: false, profile: 'strict', reason: 'stub' };
}

export function getSandboxAttribute(_profile: SandboxProfile): string {
  return 'allow-scripts';
}
