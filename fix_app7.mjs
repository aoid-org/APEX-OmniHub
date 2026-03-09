import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// react-router-dom v6 moved it to react-router-dom/server
content = content.replace("import { StaticRouter } from \"react-router-dom/server\";", "import { StaticRouter } from \"react-router-dom/server.js\";");

// Wait, the error said "Missing './server' specifier in 'react-router-dom' package".
// Oh, react-router-dom v7 moved StaticRouter to `react-router` inside SSR context, or maybe it's just `react-router/server`?
// Actually in v7, it's `react-router` and you import `StaticRouter` from `react-router`?
// Let's check:
