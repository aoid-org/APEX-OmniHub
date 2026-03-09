import fs from 'fs';

// What about `src/main.tsx`?
let content = fs.readFileSync('src/main.tsx', 'utf-8');
// It already uses ViteReactSSG
console.log(content);
