export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

const FINANCIAL_FIREWALL_PROMPT =
  '\n\nSTRICTLY FORBIDDEN from accessing... financial data';

export const DEFAULT_SUPPORT_SKILL: SkillDefinition = {
  id: 'apex-support',
  name: 'APEX Support',
  description: 'Provides customer support and assistance',
  systemPrompt:
    'You are a helpful APEX support agent. Answer questions clearly and professionally.',
};

export function loadSkill(skillId: string): SkillDefinition {
  let skill: SkillDefinition;

  if (skillId === 'apex-support' || skillId === 'omnisupport') {
    skill = DEFAULT_SUPPORT_SKILL;
  } else {
    skill = {
      id: skillId,
      name: 'Generic Skill',
      description: 'Safe default skill',
      systemPrompt: 'You are a helpful assistant.',
    };
  }

  if (!skill.systemPrompt.includes('STRICTLY FORBIDDEN')) {
    return { ...skill, systemPrompt: skill.systemPrompt + FINANCIAL_FIREWALL_PROMPT };
  }

  return skill;
}
