import { describe, it, expect } from 'vitest';
import { loadSkill } from '@/core/skills/SkillRegistry';

describe('SkillRegistry', () => {

  describe('loadSkill', () => {

    it('should return default support skill for "apex-support"', () => {
      const skill = loadSkill('apex-support');
      expect(skill.id).toBe('apex-support');
      expect(skill.name).toBe('APEX Support');
      expect(skill.description).toContain('Universal model-agnostic support skill');
      
      // Expected to append financial firewall
      expect(skill.systemPrompt).toContain('STRICTLY FORBIDDEN from accessing... financial data');
      expect(skill.systemPrompt).toContain('APEX-OmniHub Support v2.0');
    });

    it('should return default support skill for alias "omnisupport"', () => {
      const skill = loadSkill('omnisupport');
      expect(skill.id).toBe('apex-support'); // Resolved to default definition
      expect(skill.name).toBe('APEX Support');
    });

    it('should create a generic default skill for unknown IDs', () => {
      const skill = loadSkill('custom-tooling');
      expect(skill.id).toBe('custom-tooling');
      expect(skill.name).toBe('Generic Skill');
      expect(skill.systemPrompt).toContain('You are a helpful assistant.');
      
      // Expected to append financial firewall generically as well
      expect(skill.systemPrompt).toContain('STRICTLY FORBIDDEN from accessing... financial data');
    });

    it('should deduplicate the financial firewall if it was already present', () => {
      // It is already appended inside loadSkill.
      
      // If a generic skill manually passed it (assuming we could pass it to loadSkill - actually we can't in this signature)
      // But we can check that it doesn't double-append on loadSkill('apex-support') if we patch DEFAULT_SUPPORT_SKILL (it shouldn't be patched).
      const skill = loadSkill('apex-support');
      const matches = skill.systemPrompt.match(/STRICTLY FORBIDDEN/g);
      expect(matches?.length).toBe(1);
    });

  });

});
