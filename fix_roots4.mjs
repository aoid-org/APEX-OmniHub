import fs from 'fs';

let content = `import { ViteReactSSG } from 'vite-react-ssg/single-page';
import App from './App';
import './index.css';
import '../apps/omnihub-site/src/i18n';
import '../apps/omnihub-site/src/styles/globals.css';
import '../apps/omnihub-site/src/styles/theme.css';
import '../apps/omnihub-site/src/styles/components.css';
import '../apps/omnihub-site/src/styles/omnidash-layout.css';

export const createRoot = ViteReactSSG(<App />);
`;

fs.writeFileSync('src/main.tsx', content);
