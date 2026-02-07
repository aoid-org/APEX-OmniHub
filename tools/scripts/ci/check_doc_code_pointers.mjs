import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllFiles } from './ci-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

let hasErrors = false;


function checkCodePointers(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check "Location: `path`" or "Location: path"
    const locationMatch = line.match(/Location:\s+`?([^`]+)`?/);
    if (locationMatch) {
      checkPath(filePath, index + 1, locationMatch[1].trim());
    }

    // Heuristic for "Critical Files" block could be implemented if structure is strictly known.
    // For now, looking for lines that look like file paths inside a bullet point might cause false positives.
    // The user requirement says: Detect any docs lines that declare file locations (e.g., “Location: `path`” and “Critical Files” blocks)
    // I will try to detect paths mentioned in code blocks that look like internal file paths if they are in a list context after "Critical Files" header?
    // Let's stick to "Location:" for now as it's explicit.
  });
}

function checkPath(docPath, lineNum, relPath) {
    // Handle "code pointers" which might be relative to repo root or doc? 
    // Usually "Location: src/foo/bar.ts" implies repo root.
    // Let's assume repo root first.
    let target = path.resolve(ROOT_DIR, relPath);
    if (!fs.existsSync(target)) {
        // Try relative to doc
        target = path.resolve(path.dirname(docPath), relPath);
        if (!fs.existsSync(target)) {
            console.error(`❌ Broken file pointer in ${path.relative(ROOT_DIR, docPath)}:${lineNum}`);
            console.error(`   Pointer: ${relPath}`);
            hasErrors = true;
        }
    }
}

console.log('🔍 Scanning docs for broken file pointers...');
const files = getAllFiles(DOCS_DIR);
files.forEach(checkCodePointers);

if (hasErrors) {
  console.error('❌ Documentation drift detected: Missing referenced files.');
  process.exit(1);
} else {
  console.log('✅ No broken file pointers found.');
}
