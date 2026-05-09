import { describe, it, expect, beforeEach } from 'vitest';
import {
  readAgentPrefs,
  writeAgentPrefs,
  AGENT_PREFS_STORAGE_KEY,
} from '@/omnidash/agentPrefs';
import type { AgentPrefs } from '@/omnidash/agentPrefs';

describe('agentPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('readAgentPrefs', () => {
    it('should return default prefs when nothing in localStorage', () => {
      const prefs = readAgentPrefs();
      expect(prefs).toEqual({ persona: 'Navigator' });
    });

    it('should return stored prefs when valid persona is in localStorage', () => {
      localStorage.setItem(AGENT_PREFS_STORAGE_KEY, JSON.stringify({ persona: 'Sentinel' }));
      expect(readAgentPrefs()).toEqual({ persona: 'Sentinel' });
    });

    it('should return default prefs for invalid persona', () => {
      localStorage.setItem(AGENT_PREFS_STORAGE_KEY, JSON.stringify({ persona: 'InvalidPersona' }));
      expect(readAgentPrefs()).toEqual({ persona: 'Navigator' });
    });

    it('should return default prefs for malformed JSON', () => {
      localStorage.setItem(AGENT_PREFS_STORAGE_KEY, 'not-json');
      expect(readAgentPrefs()).toEqual({ persona: 'Navigator' });
    });

    it('should return default prefs for empty object', () => {
      localStorage.setItem(AGENT_PREFS_STORAGE_KEY, JSON.stringify({}));
      expect(readAgentPrefs()).toEqual({ persona: 'Navigator' });
    });

    it('should accept all valid personas', () => {
      const validPersonas = ['Navigator', 'Companion', 'Sentinel', 'Pulse'] as const;
      for (const persona of validPersonas) {
        localStorage.setItem(AGENT_PREFS_STORAGE_KEY, JSON.stringify({ persona }));
        expect(readAgentPrefs().persona).toBe(persona);
      }
    });
  });

  describe('writeAgentPrefs', () => {
    it('should write prefs to localStorage', () => {
      const prefs: AgentPrefs = { persona: 'Pulse' };
      writeAgentPrefs(prefs);
      const stored = JSON.parse(localStorage.getItem(AGENT_PREFS_STORAGE_KEY)!);
      expect(stored).toEqual({ persona: 'Pulse' });
    });

    it('should overwrite existing prefs', () => {
      writeAgentPrefs({ persona: 'Companion' });
      writeAgentPrefs({ persona: 'Sentinel' });
      const stored = JSON.parse(localStorage.getItem(AGENT_PREFS_STORAGE_KEY)!);
      expect(stored).toEqual({ persona: 'Sentinel' });
    });
  });
});
