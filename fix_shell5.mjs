import fs from 'fs';
const filePath = 'apps/omnihub-site/src/lib/OmniAppShell.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// replace
content = content.replace(/export function registerOmniAppShell\(\): void \{/g, `export function registerOmniAppShell(): void {\n  if (typeof customElements === 'undefined') return;`);

fs.writeFileSync(filePath, content);
