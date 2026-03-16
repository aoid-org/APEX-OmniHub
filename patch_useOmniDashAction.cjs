const fs = require('fs');

const path = 'src/omnidash/useOmniDashAction.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /export interface OmniDashIntent \{([\s\S]*?)\}/m;

const match = content.match(regex);
if (match) {
    const properties = match[1];

    const newTypes = `
export type OmniDashIntentSource = 'module' | 'integration';

export interface BaseOmniDashIntent {
  readonly source: OmniDashIntentSource;
${properties}
}

export interface InternalModuleIntent extends BaseOmniDashIntent {
  readonly source: 'module';
}

export interface ExternalIntegrationIntent extends BaseOmniDashIntent {
  readonly source: 'integration';
}

export type OmniDashIntent = InternalModuleIntent | ExternalIntegrationIntent;
`;
    content = content.replace(regex, newTypes.trim());

    // Also, we need to enforce the rule:
    // "integration intents must never route to internal APEX pages like /omnidash/fortress or /omnidash/maestro"
    // "Rule 4: Internal SPA app — navigate via router, no modal required"
    // So if source === 'integration', it should not navigate via SPA router to an internal page if it somehow gets that rule.
    // Let's modify `resolveIntentModalType`

    const resolveRegex = /function resolveIntentModalType\(intent: OmniDashIntent\): ResolvedModalDirective \{([\s\S]*?)return \{ type: 'form', shouldNavigate: true \};\n\}/m;
    const resolveMatch = content.match(resolveRegex);
    if (resolveMatch) {
      const newResolve = `function resolveIntentModalType(intent: OmniDashIntent): ResolvedModalDirective {${resolveMatch[1]}
  // Rule 4: Internal SPA app — navigate via router, no modal required
  if (intent.source === 'module') {
    return { type: 'form', shouldNavigate: true };
  }

  // Fallback for integrations without explicit modal directive — prevent internal routing
  return { type: 'oauth', shouldNavigate: false };
}`;
      content = content.replace(resolveRegex, newResolve.trim());
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched');
} else {
    console.log('Regex failed');
}
