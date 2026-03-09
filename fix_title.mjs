import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf-8');

// The react-helmet-async doesn't auto-extract for ViteReactSSG single-page format
// unless we wrap it properly. Wait, ViteReactSSG single-page doesn't extract helmet tags by itself.
// But wait! The prompt says "react-helmet-async is safe during SSG because it does NOT reference document".
// Does `vite-react-ssg` automatically extract `react-helmet-async`?
// Actually, `vite-react-ssg` has built-in support for `react-helmet-async` or standard `helmet` context.
// Let's check if the meta tags are in `dist/index.html`.
console.log('Description:', html.includes('Enterprise AI orchestration control plane'));
