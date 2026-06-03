const fs = require('fs');

function replaceFile(path, replacer) {
  try {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
    console.log('Fixed', path);
  } catch (e) {
    console.error('Error with', path, e.message);
  }
}

// 1. SettingsModule
replaceFile('apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx', c => {
  return c.replace(/import \{ LOCALES \} from '.*?';/, "import { SUPPORTED_LOCALES } from '../../../src/i18n/locales';")
          .replace(/LOCALES/g, 'SUPPORTED_LOCALES');
});

// 2. TranslationModule
replaceFile('apps/omnihub-site/dashboard/components/modules/TranslationModule.tsx', c => {
  return c.replace(/import \{ LOCALES \} from '.*?';/, "import { SUPPORTED_LOCALES } from '../../../src/i18n/locales';")
          .replace(/LOCALES/g, 'SUPPORTED_LOCALES');
});

// 3. omnilink-delivery
replaceFile('src/omniconnect/delivery/omnilink-delivery.ts', c => {
  // If my previous regex failed, it's because I already ran it and it didn't match. 
  // Let's use a safer replace.
  if (!c.includes('retry_count: 0')) {
    return c.replace(/user_id:\s+event\.userId\s+\?\?\s+null,/, "user_id: event.userId ?? null,\n        retry_count: 0,\n        last_retry_at: null,");
  }
  return c;
});

// 4. tile-stability
replaceFile('tests/omnidash/tile-stability.spec.tsx', c => {
  return c.replace(/insight:/g, 'droppedAt:')
          .replace(/'degraded'/g, "'warning'")
          .replace(/'down'/g, "'broken'");
});

// 5. omniport-logging
replaceFile('tests/unit/omniport-logging.test.ts', c => {
  // Remove unused expect and RawInput from imports completely
  let fixed = c.replace(/expect,/g, '').replace(/,\s*expect/g, '').replace(/RawInput,/g, '').replace(/,\s*RawInput/g, '');
  
  // Remove the variable declarations
  fixed = fixed.replace(/let omniPort: OmniPort;\r?\n/g, '')
               .replace(/let consoleLogSpy: any;\r?\n/g, '')
               .replace(/let consoleLogSpy: ReturnType<typeof vi\.spyOn>;\r?\n/g, '');
  return fixed;
});
