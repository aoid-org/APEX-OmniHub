import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes("import { HelmetProvider } from")) {
  content = `import { HelmetProvider } from 'react-helmet-async';\n${content}`;
}

fs.writeFileSync(filePath, content);
