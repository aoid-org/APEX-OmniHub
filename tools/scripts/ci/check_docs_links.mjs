import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllFiles } from './ci-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;


function checkLinksInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Hardened regex: limit length to prevent ReDoS (max 500 chars for text, 2000 for URL)
  // Using {1,N} instead of + to bound backtracking
  const linkRegex = /\[([^\]]{1,500})\]\(([^)]{1,2000})\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
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
