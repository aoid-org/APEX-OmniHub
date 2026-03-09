import fs from 'fs';
const filePath = 'apps/omnihub-site/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// I introduced syntax errors. Let's fix.
content = content.replace(`{typeof document === "undefined" ? null : <Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`, `<Router location={typeof window !== 'undefined' ? window.location.pathname : '/'}>`);
content = content.replace(`{typeof document === "undefined" ? null : </Router>}`, `</Router>`);

// wait, the previous `return (` might be missing its wrapper.
// Let's just restore original then do it clean.
