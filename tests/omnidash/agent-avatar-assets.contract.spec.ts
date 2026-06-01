/**
 * agent-avatar-assets.contract.spec.ts
 *
 * APEX REGRESSION SHIELD:
 * - All approved avatar paths MUST start with /avatars/
 * - No approved avatar path may start with http, https, data:, blob:, or src/assets
 * - Filename-derived names must match the contract
 * - avatarPath() helper must produce /avatars/<filename>
 * - AVATAR_PATH_MAP must cover all named agents
 * - agentNameFromAvatarFile() behavior is unchanged
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_AVATARS,
  DEFAULT_AGENT_AVATAR,
  AVATAR_BASE_PATH,
  AVATAR_PATH_MAP,
  avatarPath,
  agentNameFromAvatarFile,
} from '../../apps/omnihub-site/dashboard/contracts/agentAvatars';

const FORBIDDEN_PREFIXES = ['http', 'https', 'data:', 'blob:', 'src/assets'];

describe('Agent Avatar Assets Contract', () => {
  it('must contain exactly the five approved asset filenames', () => {
    expect(AGENT_AVATARS).toContain('companion-avatar-icon.png');
    expect(AGENT_AVATARS).toContain('navigator-avatar-icon.png');
    expect(AGENT_AVATARS).toContain('pulse-avatar-icon.png');
    expect(AGENT_AVATARS).toContain('sentinel-avatar-icon.png');
    expect(AGENT_AVATARS).toContain('avatar-default.png');
    expect(AGENT_AVATARS.length).toBe(5);
  });

  it('default avatar is avatar-default.png', () => {
    expect(DEFAULT_AGENT_AVATAR).toBe('avatar-default.png');
  });

  it('AVATAR_BASE_PATH is /avatars', () => {
    expect(AVATAR_BASE_PATH).toBe('/avatars');
  });

  it('avatarPath() produces /avatars/<filename>', () => {
    expect(avatarPath('navigator-avatar-icon.png')).toBe('/avatars/navigator-avatar-icon.png');
    expect(avatarPath('avatar-default.png')).toBe('/avatars/avatar-default.png');
  });

  it('AVATAR_PATH_MAP covers all named agents with /avatars/ paths', () => {
    const expectedKeys = ['Navigator', 'Companion', 'Sentinel', 'Pulse', 'Default'] as const;
    for (const key of expectedKeys) {
      expect(AVATAR_PATH_MAP[key]).toBeDefined();
      expect(AVATAR_PATH_MAP[key]).toMatch(/^\/avatars\//);
    }
  });

  it('all AVATAR_PATH_MAP values start with /avatars/', () => {
    for (const [key, val] of Object.entries(AVATAR_PATH_MAP)) {
      expect(val, `AVATAR_PATH_MAP.${key} must start with /avatars/`).toMatch(/^\/avatars\//);
    }
  });

  it('no approved avatar path starts with a forbidden prefix', () => {
    for (const [key, val] of Object.entries(AVATAR_PATH_MAP)) {
      for (const prefix of FORBIDDEN_PREFIXES) {
        expect(val, `AVATAR_PATH_MAP.${key} must not start with '${prefix}'`).not.toMatch(
          new RegExp(`^${prefix}`),
        );
      }
    }
  });

  it('correctly derives persona names from filenames', () => {
    expect(agentNameFromAvatarFile('companion-avatar-icon.png')).toBe('Companion');
    expect(agentNameFromAvatarFile('navigator-avatar-icon.png')).toBe('Navigator');
    expect(agentNameFromAvatarFile('pulse-avatar-icon.png')).toBe('Pulse');
    expect(agentNameFromAvatarFile('sentinel-avatar-icon.png')).toBe('Sentinel');
    expect(agentNameFromAvatarFile('avatar-default.png')).toBe('Default');
  });
});
