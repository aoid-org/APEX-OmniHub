import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '@/core/gateway/RoutePolicy';

describe('RoutePolicy', () => {

  it('should enforce migration rule to CLAUDE_OPUS regardless of scorer', () => {
    const override = evaluatePolicy(
      'Handle database migration',
      'GEMINI_PRO', // Scorer mistakenly picked Gemini
      'database'
    );
    expect(override).not.toBeNull();
    expect(override?.overriddenTarget).toBe('CLAUDE_OPUS');
    expect(override?.rule.id).toBe('rule-db-migration-claude');
  });

  it('should return null if scorer already selected correct rule target', () => {
    const override = evaluatePolicy(
      'Security task',
      'CLAUDE_OPUS',
      'security'
    );
    expect(override).toBeNull();
  });

  it('should enforce SVG generation rule to GEMINI_PRO', () => {
    const override = evaluatePolicy(
      'Create svg animation',
      'CLAUDE_OPUS',
      'visualization'
    );
    expect(override).not.toBeNull();
    expect(override?.overriddenTarget).toBe('GEMINI_PRO');
    expect(override?.rule.id).toBe('rule-svg-gemini');
  });

  it('should respect exact domain matching if required by rule', () => {
    // If domain isn't visualization, rule-svg-gemini won't apply even if "svg" is there
    const override = evaluatePolicy(
      'Talk about svg generation',
      'CLAUDE_OPUS',
      'general'
    );
    expect(override).toBeNull(); // Because rule-svg-gemini needs matchDomain='visualization'
  });

  it('should prioritize higher priority rules', () => {
    // Rule conflicts:
    // rule-security-claude (priority 100, targets CLAUDE_OPUS)
    // rule-svg-gemini (priority 80, targets GEMINI_PRO)
    
    const override = evaluatePolicy(
      'A secure authentication svg visualization',
      'GEMINI_PRO',
      'visualization'
    );

    // Should pick the security rule override because priority 100 > priority 80
    expect(override).not.toBeNull();
    expect(override?.overriddenTarget).toBe('CLAUDE_OPUS');
    expect(override?.rule.id).toBe('rule-security-claude');
  });

  it('should enforce requireAll condition across keywords', () => {
    const customRules = [
      {
        id: 'require-all-test',
        description: 'Test',
        matchKeywords: ['hello', 'world'],
        requireAll: true,
        forceTarget: 'CLAUDE_OPUS' as const,
        priority: 1000,
      }
    ];

    const overridePartial = evaluatePolicy('hello there', 'GEMINI_PRO', 'general', customRules);
    expect(overridePartial).toBeNull();

    const overrideFull = evaluatePolicy('hello beautiful world', 'GEMINI_PRO', 'general', customRules);
    expect(overrideFull).not.toBeNull();
    expect(overrideFull?.overriddenTarget).toBe('CLAUDE_OPUS');
  });

});
