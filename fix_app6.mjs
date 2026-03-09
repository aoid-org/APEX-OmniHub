import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(`{typeof document === "undefined" ? null : <Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>}`, `<HelmetProvider>\n      <Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`);
content = content.replace(`{typeof document === "undefined" ? null : </Router>}`, `</Router>\n    </HelmetProvider>`);

fs.writeFileSync(filePath, content);
