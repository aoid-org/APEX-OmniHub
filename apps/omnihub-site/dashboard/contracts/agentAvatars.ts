/**
 * agentAvatars.ts — APEX Agent Avatar Contract
 *
 * All avatar paths are PUBLIC paths (/avatars/*.png).
 * These files live in public/avatars/ and are served directly by the CDN.
 * NEVER import PNG files statically — that adds them to the Vite bundle graph.
 *
 * APEX REGRESSION SHIELD: Adding a static `import x from '*.png'` to this file
 * or its consumers MUST fail the avatar-no-static-imports test.
 */

export const AVATAR_BASE_PATH = '/avatars' as const;

export const AGENT_AVATARS = [
  'companion-avatar-icon.png',
  'navigator-avatar-icon.png',
  'pulse-avatar-icon.png',
  'sentinel-avatar-icon.png',
  'avatar-default.png',
] as const;

export type AgentAvatarFilename =
  | 'companion-avatar-icon.png'
  | 'navigator-avatar-icon.png'
  | 'pulse-avatar-icon.png'
  | 'sentinel-avatar-icon.png'
  | 'avatar-default.png';

export const DEFAULT_AGENT_AVATAR: AgentAvatarFilename = 'avatar-default.png';

/**
 * Returns the public URL path for a given avatar filename.
 * e.g. avatarPath('navigator-avatar-icon.png') → '/avatars/navigator-avatar-icon.png'
 */
export function avatarPath(filename: AgentAvatarFilename): string {
  return `${AVATAR_BASE_PATH}/${filename}`;
}

/**
 * AVATAR_PATH_MAP — Named agent → full public path.
 * These paths are served by Cloudflare Pages from public/avatars/ at the repo root.
 */
export const AVATAR_PATH_MAP = {
  Navigator: '/avatars/navigator-avatar-icon.png',
  Companion: '/avatars/companion-avatar-icon.png',
  Sentinel:  '/avatars/sentinel-avatar-icon.png',
  Pulse:     '/avatars/pulse-avatar-icon.png',
  Default:   '/avatars/avatar-default.png',
} as const;

export type AvatarPathMapKey = keyof typeof AVATAR_PATH_MAP;

/**
 * Derives a display name from an avatar filename.
 * companion-avatar-icon.png → 'Companion'
 * navigator-avatar-icon.png → 'Navigator'
 * pulse-avatar-icon.png     → 'Pulse'
 * sentinel-avatar-icon.png  → 'Sentinel'
 * avatar-default.png        → 'Default'
 */
export function agentNameFromAvatarFile(fileName: string): string {
  // 1. Remove extension
  let name = fileName.replace(/\.[^/.]+$/, '');

  // 2. Remove suffix/prefix tokens: -avatar-icon, -avatar, -icon, avatar-
  name = name
    .replace(/-avatar-icon/gi, '')
    .replace(/-avatar/gi, '')
    .replace(/-icon/gi, '')
    .replace(/^avatar-/gi, '');

  // 3. Replace hyphens/underscores with spaces
  name = name.replace(/[-_]/g, ' ');

  // 4. Convert to Title Case
  return name
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
    )
    .trim();
}
