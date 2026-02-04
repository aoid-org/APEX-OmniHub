
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;

function getAllFiles(dir, exts = ['.md']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(file, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(file);
      }
    }
  });
  return results;
}

function checkLinksInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkUrl = match[2];

    // Ignore external links, anchors, and mailto
    if (linkUrl.startsWith('http') || linkUrl.startsWith('#') || linkUrl.startsWith('mailto:')) {
      continue;
    }

    // Resolve path
    const targetPath = path.resolve(path.dirname(filePath), linkUrl);
    
    // Check if it exists
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Broken link in ${path.relative(ROOT_DIR, filePath)}:`);
      console.error(`   Link: ${linkUrl}`);
      console.error(`   Target: ${targetPath}`);
      hasErrors = true;
    }
  }
}

console.log('🔍 Scanning docs for broken links...');
try {
  const files = getAllFiles(DOCS_DIR);
  files.forEach(checkLinksInFile);
} catch (e) {
  console.error("Error scanning files:", e);
  hasErrors = true;
}

if (hasErrors) {
  console.error('❌ Documentation drift detected: Broken links found.');
  process.exit(1);
} else {
  console.log('✅ No broken links found in docs.');
}
