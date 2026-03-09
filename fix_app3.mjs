import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace("import { BrowserRouter, Route, Routes } from \"react-router-dom\";", "import { BrowserRouter, Route, Routes } from \"react-router-dom\";\nimport { StaticRouter } from \"react-router-dom/server\";");

content = content.replace(/function App\(\) \{\n  return \(\n    <HelmetProvider>\n      <BrowserRouter>/g, `function App() {\n  const Router = typeof window === 'undefined' ? StaticRouter : BrowserRouter;\n  return (\n    <HelmetProvider>\n      <Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`);

content = content.replace(/<\/BrowserRouter>\n    <\/HelmetProvider>/g, `</Router>\n    </HelmetProvider>`);

// Wait, the previous replacement might have failed because the `HelmetProvider` was gone or the syntax changed.
// Let's just do an absolute replace.
