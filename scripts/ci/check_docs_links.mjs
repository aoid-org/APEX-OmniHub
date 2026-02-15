import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllFiles } from './ci-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;


const INVALID_LINK_TEXT = new Set(["", "\n", "\r"]);

function hasInvalidLinkText(linkText) {
  return INVALID_LINK_TEXT.has(linkText) || linkText.includes("\n") || linkText.includes("\r");
}

function parseNextLink(content, startPos) {
  const startBracket = content.indexOf("[", startPos);
  if (startBracket === -1) return null;
  const endBracket = content.indexOf("]", startBracket);
  if (endBracket === -1 || content[endBracket + 1] !== "(") return { nextPos: startBracket + 1 };
  const endParen = content.indexOf(")", endBracket + 1);
  if (endParen === -1) return null;
  return {
    nextPos: endParen + 1,
    linkText: content.slice(startBracket + 1, endBracket),
    linkUrl: content.slice(endBracket + 2, endParen),
  };
}

function checkLinksInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Manual parsing to avoid ReDoS (S5852)
  let pos = 0;
  while (pos < content.length) {
    const parsedLink = parseNextLink(content, pos);
    if (!parsedLink) break;
    pos = parsedLink.nextPos;
    if (!parsedLink.linkText || !parsedLink.linkUrl) continue;

    const { linkText, linkUrl } = parsedLink;
    if (hasInvalidLinkText(linkText)) continue;
    if (linkUrl.includes("\n") || linkUrl.includes("\r")) continue;

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
