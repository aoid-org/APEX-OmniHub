import { promptDefenseConfig, PromptDefenseRule } from './promptDefenseConfig';

export interface PromptEvaluation {
  decision: 'block' | 'allow';
  triggeredRule?: string;
  reason?: string;
}

function matchesRule(prompt: string, rule: PromptDefenseRule): boolean {
  return rule.pattern.test(prompt);
}

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ⚡ Bolt: Pre-compiled regex lookup is O(1) compared to O(N) array search inside string traversal
const HIGH_RISK_KEYWORDS_REGEX = promptDefenseConfig.blockOnHighRiskKeywords.length > 0
  ? new RegExp(
      promptDefenseConfig.blockOnHighRiskKeywords.map(escapeRegExp).join('|'),
      'i'
    )
  : null;

export function evaluatePrompt(prompt: string): PromptEvaluation {
  if (!promptDefenseConfig.enabled) {
    return { decision: 'allow' };
  }

  if (prompt.length > promptDefenseConfig.maxPromptLength) {
    return {
      decision: 'block',
      triggeredRule: 'max-length',
      reason: `Prompt length ${prompt.length} exceeds ${promptDefenseConfig.maxPromptLength}`,
    };
  }

  // Block disallowed prefixes
  if (
    promptDefenseConfig.allowedPrefixes &&
    promptDefenseConfig.allowedPrefixes.length > 0 &&
    !promptDefenseConfig.allowedPrefixes.some((prefix) => prompt.startsWith(prefix))
  ) {
    return {
      decision: 'block',
      triggeredRule: 'prefix-policy',
      reason: 'Prompt missing required prefix',
    };
  }

  if (HIGH_RISK_KEYWORDS_REGEX) {
    const highRiskMatch = HIGH_RISK_KEYWORDS_REGEX.exec(prompt);
    if (highRiskMatch) {
      return {
        decision: 'block',
        triggeredRule: 'high-risk-keyword',
        reason: `High risk keyword detected: ${highRiskMatch[0]}`,
      };
    }
  }

  for (const rule of promptDefenseConfig.rules) {
    if (matchesRule(prompt, rule)) {
      return { decision: 'block', triggeredRule: rule.id, reason: rule.description };
    }
  }

  return { decision: 'allow' };
}

export function summarizeRuleHits(prompts: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  prompts.forEach((prompt) => {
    const evaluation = evaluatePrompt(prompt);
    if (evaluation.triggeredRule) {
      counts[evaluation.triggeredRule] = (counts[evaluation.triggeredRule] || 0) + 1;
    }
  });
  return counts;
}

