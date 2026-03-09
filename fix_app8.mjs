import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// It says Missing "./server" specifier... because react-router-dom v7 handles SSR differently.
// Wait, react-router v7 uses `<StaticRouter>` from `react-router`!
content = content.replace("import { StaticRouter } from \"react-router-dom/server\";", "import { StaticRouter } from \"react-router\";");
content = content.replace("import { StaticRouter } from \"react-router-dom/server.js\";", "import { StaticRouter } from \"react-router\";");

fs.writeFileSync(filePath, content);
