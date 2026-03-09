import fs from 'fs';
import path from 'path';

const files = [
  'apps/omnihub-site/src/request-access.tsx',
  'apps/omnihub-site/src/man-mode.tsx',
  'apps/omnihub-site/src/demo.tsx',
  'apps/omnihub-site/src/advanced-analytics.tsx',
  'apps/omnihub-site/src/smart-integrations.tsx',
  'apps/omnihub-site/src/terms.tsx',
  'apps/omnihub-site/src/orchestrator.tsx',
  'apps/omnihub-site/src/maestro.tsx',
  'apps/omnihub-site/src/omniport.tsx',
  'apps/omnihub-site/src/fortress.tsx',
  'apps/omnihub-site/src/login.tsx',
  'apps/omnihub-site/src/tech-specs.tsx',
  'apps/omnihub-site/src/main.tsx',
  'apps/omnihub-site/src/tri-force.tsx',
  'apps/omnihub-site/src/privacy.tsx',
  'apps/omnihub-site/src/ai-automation.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/createRoot\(document.getElementById\('root'\)!\)\.render\(/g, "if (typeof document !== 'undefined') {\n  createRoot(document.getElementById('root')!).render(");
  // Need to add the closing bracket for the if block. But wait, it's easier to just do:

  if (file === 'apps/omnihub-site/src/main.tsx') {
    content = content.replace("const rootElement = document.getElementById('root');\n\nif (!rootElement) {\n  throw new Error('APEX Critical Failure: DOM Root Not Found');\n}\n\ncreateRoot(rootElement).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);",
    "if (typeof document !== 'undefined') {\n  const rootElement = document.getElementById('root');\n  if (rootElement) {\n    createRoot(rootElement).render(\n      <StrictMode>\n        <App />\n      </StrictMode>\n    );\n  }\n}");
  } else {
    // For other files which are like `createRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <SomePage />\n  </StrictMode>\n);`
    content = content.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\(\s*<StrictMode>\s*<([A-Za-z0-9_]+) \/>\s*<\/StrictMode>\s*\);/g,
      "if (typeof document !== 'undefined') {\n  createRoot(document.getElementById('root')!).render(\n    <StrictMode>\n      <$1 />\n    </StrictMode>\n  );\n}");
  }

  fs.writeFileSync(file, content);
}
