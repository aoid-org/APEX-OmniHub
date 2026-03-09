import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// I will just replace `BrowserRouter` inside `App` directly.
content = content.replace(/<BrowserRouter>/g, `{typeof document === "undefined" ? null : <BrowserRouter>}`);
content = content.replace(/<\/BrowserRouter>/g, `{typeof document === "undefined" ? null : </BrowserRouter>}`);

// Wait, the React tree MUST be identical or it will hydrate badly.
// Actually, `vite-react-ssg/single-page` does NOT inject its own router for `react-router-dom`?
// Let's check `vite-react-ssg` source code or just use MemoryRouter for SSR.

content = content.replace(/<BrowserRouter>/g, `<Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`);
content = content.replace(/<\/BrowserRouter>/g, `</Router>`);

// then import:
if (!content.includes('StaticRouter')) {
  content = content.replace(`import { BrowserRouter, Route, Routes } from "react-router-dom";`, `import { BrowserRouter, Route, Routes } from "react-router-dom";\nimport { StaticRouter } from "react-router-dom/server";`);
}

content = content.replace(/function App\(\) \{/g, `function App() {\n  const Router = typeof window === 'undefined' ? StaticRouter : BrowserRouter;`);

fs.writeFileSync(filePath, content);
