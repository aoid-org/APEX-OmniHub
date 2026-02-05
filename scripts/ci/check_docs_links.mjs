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
  // Manual parsing to avoid ReDoS (S5852)
  let pos = 0;
  while (pos < content.length) {
    const startBracket = content.indexOf('[', pos);
    if (startBracket === -1) break;

    const endBracket = content.indexOf(']', startBracket);
    if (endBracket === -1) break; // No more closing brackets

    // Ensure no newlines in text part
    const linkText = content.slice(startBracket + 1, endBracket);
    if (linkText.includes('\n') || linkText.includes('\r')) {
      pos = startBracket + 1; 
      continue;
    }

    // Must be followed immediately by '('
    if (content[endBracket + 1] !== '(') {
      pos = startBracket + 1;
      continue;
    }

    const startParen = endBracket + 1;
    const endParen = content.indexOf(')', startParen);
    if (endParen === -1) break; // Open paren but no close

    // Ensure no newlines in url part
    const linkUrl = content.slice(startParen + 1, endParen);
    if (linkUrl.includes('\n') || linkUrl.includes('\r')) {
      pos = startParen + 1;
      continue;
    }
    
    // Advance position
    pos = endParen + 1;

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
