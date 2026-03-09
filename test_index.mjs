import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf-8');

console.log('Heading count:', (html.match(/<h[1-6]/g) || []).length);
console.log('Title tag:', html.match(/<title>.*?<\/title>/g)?.[0]);
console.log('JSON-LD schemas:', (html.match(/application\/ld\+json/g) || []).length);
