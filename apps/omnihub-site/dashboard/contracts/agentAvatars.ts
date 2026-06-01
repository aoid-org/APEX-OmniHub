export const AGENT_AVATARS = [
  'companion-avatar-icon.png',
  'navigator-avatar-icon.png',
  'pulse-avatar-icon.png',
  'sentinel-avatar-icon.png',
  'avatar-default.png'
] as const;

export const DEFAULT_AGENT_AVATAR = 'avatar-default.png';

export function agentNameFromAvatarFile(fileName: string): string {
  // 1. Remove extension
  let name = fileName.replace(/\.[^/.]+$/, "");
  
  // 2. Remove suffix/prefix tokens: -avatar-icon, -avatar, -icon, avatar-
  name = name.replace(/-avatar-icon/gi, '')
             .replace(/-avatar/gi, '')
             .replace(/-icon/gi, '')
             .replace(/^avatar-/gi, '');
             
  // 3. Replace hyphens/underscores with spaces
  name = name.replace(/[-_]/g, ' ');
  
  // 4. Convert to Title Case
  return name.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  ).trim();
}
