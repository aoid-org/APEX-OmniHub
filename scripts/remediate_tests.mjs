import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('tests');
const pattern = /(?:it|test)\((['"`].*?['"`]),\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?expect\(true\)\.toBe\(true\);?[\s\S]*?\}\);?/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (pattern.test(content)) {
    const updated = content.replace(pattern, 'it.todo($1);');
    fs.writeFileSync(file, updated, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
