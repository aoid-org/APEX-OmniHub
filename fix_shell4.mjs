import fs from 'fs';
const filePath = 'apps/omnihub-site/src/lib/OmniAppShell.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// The SSR server has no window/document/customElements/HTMLElement
// We need to bypass this completely for SSR
content = content.replace(/class OmniAppShellElement extends HTMLElement \{/g, `const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};\nclass OmniAppShellElement extends BaseElement {`);
content = content.replace(/export function registerOmniAppShell\(\) \{/g, `export function registerOmniAppShell() {\n  if (typeof customElements === 'undefined') return;`);

fs.writeFileSync(filePath, content);
