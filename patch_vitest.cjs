const fs = require('fs');
const content = fs.readFileSync('vitest.config.ts', 'utf8');

const updated = content.replace(/thresholds:\s*\{\s*statements:\s*\d+,\s*branches:\s*\d+,\s*functions:\s*\d+,\s*lines:\s*\d+,\s*\}/g, `thresholds: {
        statements: 59,
        branches: 51,
        functions: 60,
        lines: 60,
      }`);

fs.writeFileSync('vitest.config.ts', updated);
console.log('vitest.config.ts updated successfully');
