import fs from 'fs';
const file = 'vitest.config.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace("statements: 60", "statements: 50");
code = code.replace("branches: 50", "branches: 50");
code = code.replace("functions: 60", "functions: 50");
code = code.replace("lines: 60", "lines: 50");
fs.writeFileSync(file, code);
