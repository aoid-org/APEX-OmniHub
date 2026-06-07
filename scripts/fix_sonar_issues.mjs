import fs from 'node:fs';
import path from 'node:path';

// Fix scripts/fix_eslint.mjs
let eslintMjs = fs.readFileSync('scripts/fix_eslint.mjs', 'utf-8');
eslintMjs = eslintMjs.replace("import fs from 'fs';", "import fs from 'node:fs';");
eslintMjs = eslintMjs.replace("import path from 'path';", "import path from 'node:path';");
fs.writeFileSync('scripts/fix_eslint.mjs', eslintMjs);

// Fix scripts/remediate_tests.mjs
let remediateMjs = fs.readFileSync('scripts/remediate_tests.mjs', 'utf-8');
remediateMjs = remediateMjs.replace("import fs from 'fs';", "import fs from 'node:fs';");
remediateMjs = remediateMjs.replace("import path from 'path';", "import path from 'node:path';");
remediateMjs = remediateMjs.replace("if (stat && stat.isDirectory())", "if (stat?.isDirectory())");
remediateMjs = remediateMjs.replace(
    "} else { \n            if (file.endsWith('.ts') || file.endsWith('.tsx')) {\n                results.push(file);\n            }\n        }",
    "} else if (file.endsWith('.ts') || file.endsWith('.tsx')) {\n            results.push(file);\n        }"
);
fs.writeFileSync('scripts/remediate_tests.mjs', remediateMjs);

// Fix unused expect in test files
const testFiles = [
    'tests/omnidash/connect-ai-byom.spec.tsx',
    'tests/omnidash/fake-success-guardrails.spec.tsx',
    'tests/omnidash/module-actions-realness.spec.tsx',
    'tests/omnidash/omnimedia-omnislate-boundary.spec.tsx',
    'tests/omnidash/omniskills-forge.spec.tsx',
    'tests/omnidash/orphaned-components-routing.spec.tsx',
    'tests/omnidash/production-truthfulness.spec.tsx',
    'tests/omnidash/theme-system.spec.tsx',
    'tests/omnidash/translation-realness.spec.tsx',
    'tests/omnidash/widget-lifecycle.spec.tsx',
    'tests/omnidash/zero-mock-widgets.spec.tsx'
];

for (const file of testFiles) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf-8');
        content = content.replace("import { describe, it, expect } from 'vitest';", "import { describe, it } from 'vitest';");
        fs.writeFileSync(file, content);
    }
}
console.log('SonarQube issues fixed.');
