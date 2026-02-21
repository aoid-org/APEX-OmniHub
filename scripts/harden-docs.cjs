const fs = require('node:fs');
const path = require('node:path');

const DOCS_DIR = path.join(__dirname, 'docs');
const TODAY = '2026-02-20';
const VERSION = 'v8.0-LAUNCH';
const HEADER_TAG = `<!-- APEX_DOC_STAMP: VERSION=${VERSION} | LAST_UPDATED=${TODAY} -->`;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let modifiedCount = 0;

walkDir(DOCS_DIR, (filePath) => {
  if (filePath.endsWith('.md')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove old stamp if it exists
    content = content.replaceAll(/<!-- APEX_DOC_STAMP:.*?-->\n?/g, '');
    
    // Add new stamp at the top
    const newContent = `${HEADER_TAG}\n${content}`;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log(`Successfully hardened and versioned ${modifiedCount} documentation files in /docs.`);
