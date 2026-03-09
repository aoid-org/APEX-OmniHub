import fs from 'fs';
import path from 'path';

// Re-read main.tsx from original state and fix properly
let content = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import '../apps/omnihub-site/src/i18n';
import '../apps/omnihub-site/src/styles/globals.css';
import '../apps/omnihub-site/src/styles/theme.css';
import '../apps/omnihub-site/src/styles/components.css';
import '../apps/omnihub-site/src/styles/omnidash-layout.css';

if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('APEX Critical Failure: DOM Root Not Found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
`;

fs.writeFileSync('apps/omnihub-site/src/main.tsx', content);

// And wait! The entry file might be `src/main.tsx` not `apps/omnihub-site/src/main.tsx`. Let's check `vite.config.ts`.
