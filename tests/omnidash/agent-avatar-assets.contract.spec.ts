import { describe, it, expect } from 'vitest';
import { 
  AGENT_AVATARS, 
  DEFAULT_AGENT_AVATAR, 
  agentNameFromAvatarFile 
} from '../../apps/omnihub-site/dashboard/contracts/agentAvatars';

describe('Agent Avatar Assets Contract', () => {
  it('must contain expected approved assets', () => {
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

  it('correctly derives persona names from filenames', () => {
    expect(agentNameFromAvatarFile('companion-avatar-icon.png')).toBe('Companion');
    expect(agentNameFromAvatarFile('navigator-avatar-icon.png')).toBe('Navigator');
    expect(agentNameFromAvatarFile('pulse-avatar-icon.png')).toBe('Pulse');
    expect(agentNameFromAvatarFile('sentinel-avatar-icon.png')).toBe('Sentinel');
    expect(agentNameFromAvatarFile('avatar-default.png')).toBe('Default');
  });
});
