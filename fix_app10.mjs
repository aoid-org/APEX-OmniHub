import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The single-page SSG rendering needs react-helmet-async's HelmetProvider context
// And wait, if we use `ViteReactSSG` and single-page, it automatically extracts helmet if we pass it
// wait, `vite-react-ssg` docs say:
// export const createRoot = ViteReactSSG(<App />)
// But `ViteReactSSG` uses `react-helmet-async` natively if you use data router
