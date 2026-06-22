/**
 * Skill Forge provider selection + SkillDefinition validation — contract tests.
 *
 * Proves the Phase 5 (Groq routing) and Phase 4 (generation/validation) contracts
 * for `supabase/functions/generate-business-skills/skill-provider.ts`. The module
 * is runtime-agnostic (env injected, bare `zod` specifier) so it runs under vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveSkillProvider,
  parseSkillDefinition,
  skillDefinitionSchema,
  SKILL_FORGE_SYSTEM_PROMPT,
} from '../../supabase/functions/generate-business-skills/skill-provider';

describe('resolveSkillProvider', () => {
  it('selects Groq when SKILL_FORGE_PROVIDER=groq and GROQ_API_KEY exists', () => {
    const r = resolveSkillProvider({ SKILL_FORGE_PROVIDER: 'groq', GROQ_API_KEY: 'gk' });
    expect(r).toEqual({ ok: true, provider: 'groq', model: undefined });
  });

  it('returns a safe config error when groq is requested but GROQ_API_KEY is missing', () => {
    const r = resolveSkillProvider({ SKILL_FORGE_PROVIDER: 'groq', ANTHROPIC_API_KEY: 'ak' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/GROQ_API_KEY/);
  });

  it('selects Anthropic only when explicitly configured with ANTHROPIC_API_KEY', () => {
    const r = resolveSkillProvider({
      SKILL_FORGE_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'ak',
      GROQ_API_KEY: 'gk',
    });
    expect(r).toEqual({ ok: true, provider: 'anthropic', model: undefined });
  });

  it('returns a safe config error when anthropic is requested but ANTHROPIC_API_KEY is missing', () => {
    const r = resolveSkillProvider({ SKILL_FORGE_PROVIDER: 'anthropic', GROQ_API_KEY: 'gk' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('prefers Groq (cheaper) when no provider is specified and GROQ_API_KEY exists', () => {
    const r = resolveSkillProvider({ GROQ_API_KEY: 'gk', ANTHROPIC_API_KEY: 'ak' });
    expect(r).toEqual({ ok: true, provider: 'groq', model: undefined });
  });

  it('falls back to Anthropic when no provider is specified and only ANTHROPIC_API_KEY exists', () => {
    const r = resolveSkillProvider({ ANTHROPIC_API_KEY: 'ak' });
    expect(r).toEqual({ ok: true, provider: 'anthropic', model: undefined });
  });

  it('returns a safe config error when neither key is configured', () => {
    const r = resolveSkillProvider({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/GROQ_API_KEY or ANTHROPIC_API_KEY/);
  });

  it('rejects an unknown provider value (no OpenAI / no other providers)', () => {
    const r = resolveSkillProvider({ SKILL_FORGE_PROVIDER: 'openai', GROQ_API_KEY: 'gk' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not allowed/);
  });

  it('passes through an explicit Groq model override without inventing a default', () => {
    const r = resolveSkillProvider({
      GROQ_API_KEY: 'gk',
      SKILL_FORGE_GROQ_MODEL: '  custom-groq-model  ',
    });
    expect(r).toEqual({ ok: true, provider: 'groq', model: 'custom-groq-model' });
  });

  it('leaves model undefined (shared-default) when no override is set', () => {
    const r = resolveSkillProvider({ ANTHROPIC_API_KEY: 'ak', SKILL_FORGE_ANTHROPIC_MODEL: '  ' });
    expect(r).toEqual({ ok: true, provider: 'anthropic', model: undefined });
  });
});

describe('parseSkillDefinition', () => {
  const valid = {
    name: 'auto-invoice',
    description: 'Save paid invoices to Xero',
    instructions: ['Receive webhook', 'Validate amount', 'Write to Xero'],
    required_apis: ['stripe', 'xero'],
  };

  it('accepts a well-formed object', () => {
    const r = parseSkillDefinition(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.skill.name).toBe('auto-invoice');
  });

  it('accepts a raw JSON string', () => {
    const r = parseSkillDefinition(JSON.stringify(valid));
    expect(r.ok).toBe(true);
  });

  it('accepts a fenced ```json code block', () => {
    const r = parseSkillDefinition('```json\n' + JSON.stringify(valid) + '\n```');
    expect(r.ok).toBe(true);
  });

  it('defaults required_apis to an empty array when omitted', () => {
    const { required_apis: _omit, ...withoutApis } = valid;
    const r = parseSkillDefinition(withoutApis);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.skill.required_apis).toEqual([]);
  });

  it('rejects invalid JSON (no fake skill produced)', () => {
    const r = parseSkillDefinition('not json {');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not valid JSON/);
  });

  it('rejects a definition with fewer than 3 instructions', () => {
    const r = parseSkillDefinition({ ...valid, instructions: ['only one'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/SkillDefinition schema/);
  });

  it('rejects a definition missing required fields', () => {
    const r = parseSkillDefinition({ description: 'x' });
    expect(r.ok).toBe(false);
  });
});

describe('skillDefinitionSchema / prompt', () => {
  it('exposes a schema that validates before insert', () => {
    expect(skillDefinitionSchema.safeParse({}).success).toBe(false);
  });

  it('system prompt requests exactly the validated shape', () => {
    expect(SKILL_FORGE_SYSTEM_PROMPT).toMatch(/instructions/);
    expect(SKILL_FORGE_SYSTEM_PROMPT).toMatch(/required_apis/);
    expect(SKILL_FORGE_SYSTEM_PROMPT).toMatch(/at least 3/);
  });
});
