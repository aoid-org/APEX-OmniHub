import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The `single-page` format in `vite-react-ssg` expects your app to handle its own routing,
// OR you just use `BrowserRouter` normally, BUT since `BrowserRouter` throws during SSR...
// wait! The docs for vite-react-ssg say:
// "IF the router uses <BrowserRouter> with <Routes> JSX (declarative router — less likely but possible):"
// ```tsx
// import { ViteReactSSG } from 'vite-react-ssg/single-page'
// import App from './App'
// import './index.css' // ← preserve all existing CSS/global imports
//
// export const createRoot = ViteReactSSG(<App />)
// ```

// Perhaps `<BrowserRouter>` shouldn't be rendered on the server, or we should replace it with `<MemoryRouter>` on server.
// `typeof window === 'undefined' ? StaticRouter : BrowserRouter`
content = content.replace(`import { BrowserRouter, Route, Routes } from "react-router-dom";`, `import { BrowserRouter, Route, Routes } from "react-router-dom";\nimport { StaticRouter } from "react-router-dom/server";`);

content = content.replace(/function App\(\) \{\n  return \(\n    <HelmetProvider>\n      <BrowserRouter>/g, `function App() {\n  const Router = typeof window === 'undefined' ? StaticRouter : BrowserRouter;\n  return (\n    <HelmetProvider>\n      <Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`);
content = content.replace(/<\/BrowserRouter>\n    <\/HelmetProvider>/g, `</Router>\n    </HelmetProvider>`);

fs.writeFileSync(filePath, content);
