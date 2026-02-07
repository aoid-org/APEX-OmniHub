import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllFiles } from './ci-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;


function hasNewline(str) {
  return str.includes('\n') || str.includes('\r');
}

function isExternalLink(url) {
  return url.startsWith('http') || url.startsWith('#') || url.startsWith('mailto:');
}

/**
 * Extract all markdown links from content using manual parsing (avoids ReDoS S5852).
 * Returns an array of { url, pos } objects for local links only.
 */
function extractLocalLinks(content) {
  const links = [];
  let pos = 0;
  while (pos < content.length) {
    const startBracket = content.indexOf('[', pos);
    if (startBracket === -1) break;

    const endBracket = content.indexOf(']', startBracket);
    if (endBracket === -1) break;

    const linkText = content.slice(startBracket + 1, endBracket);
    if (hasNewline(linkText) || content[endBracket + 1] !== '(') {
      pos = startBracket + 1;
      continue;
    }

    const startParen = endBracket + 1;
    const endParen = content.indexOf(')', startParen);
    if (endParen === -1) break;

    const linkUrl = content.slice(startParen + 1, endParen);
    if (hasNewline(linkUrl)) {
      pos = startParen + 1;
      continue;
    }

    pos = endParen + 1;

    if (!isExternalLink(linkUrl)) {
      links.push(linkUrl);
    }
  }
  return links;
}

function checkLinksInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const localLinks = extractLocalLinks(content);

  for (const linkUrl of localLinks) {
    const targetPath = path.resolve(path.dirname(filePath), linkUrl);
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
