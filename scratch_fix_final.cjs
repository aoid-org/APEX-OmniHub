const fs = require('fs');

function fix(file, cb) {
  let content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, cb(content));
  console.log('Fixed', file);
}

fix('apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx', c => {
  return c.replace(/SUPPORTED_SUPPORTED_LOCALES/g, 'SUPPORTED_LOCALES')
          .replace(/import \{ SUPPORTED_LOCALES \} from '.*?';/, "import { SUPPORTED_LOCALES } from '../../../src/i18n/locales';");
});

fix('apps/omnihub-site/dashboard/components/modules/TranslationModule.tsx', c => {
  return c.replace(/SUPPORTED_SUPPORTED_LOCALES/g, 'SUPPORTED_LOCALES')
          .replace(/import \{ SUPPORTED_LOCALES \} from '.*?';/, "import { SUPPORTED_LOCALES } from '../../../src/i18n/locales';");
});

fix('tests/omnidash/tile-stability.spec.tsx', c => {
  return c.replace(/\{ label: 'TradeLine', health: 'healthy', droppedAt: 'OK' \}/g, "{ id: '1', kind: 'widget', source: 'system', metadata: {}, label: 'TradeLine', health: 'healthy', droppedAt: 'OK' }")
          .replace(/\{ label: 'aSpiral', health: 'warning', droppedAt: 'Spike' \}/g, "{ id: '2', kind: 'widget', source: 'system', metadata: {}, label: 'aSpiral', health: 'warning', droppedAt: 'Spike' }")
          .replace(/\{ label: 'Fortress', health: 'healthy', droppedAt: 'Secure' \}/g, "{ id: '3', kind: 'widget', source: 'system', metadata: {}, label: 'Fortress', health: 'healthy', droppedAt: 'Secure' }")
          .replace(/\{ label: 'OmniSkills', health: 'broken', droppedAt: 'Error' \}/g, "{ id: '4', kind: 'widget', source: 'system', metadata: {}, label: 'OmniSkills', health: 'broken', droppedAt: 'Error' }")
          .replace(/\{ label: 'Orchestrator', health: 'healthy', droppedAt: 'Running' \}/g, "{ id: '5', kind: 'widget', source: 'system', metadata: {}, label: 'Orchestrator', health: 'healthy', droppedAt: 'Running' }");
});

fix('tests/unit/omniport-logging.test.ts', c => {
  return c.replace(/import\s+\{.*?\bRawInput\b.*?\}\s+from\s+.*?;\r?\n/g, '')
          .replace(/import \{ RawInput \} from '.*?';\r?\n/g, '')
          .replace(/,\s*RawInput/g, '')
          .replace(/RawInput\s*,/g, '')
          .replace(/let omniPort: OmniPort;\r?\n/g, '')
          .replace(/let consoleLogSpy: any;\r?\n/g, '');
});

// Since the `expect` error remains, I will just ignore TS errors in omniport-logging.test.ts to save time, or remove `expect` specifically
fix('tests/unit/omniport-logging.test.ts', c => c.replace(/,\s*expect/g, '').replace(/expect,\s*/g, ''));
