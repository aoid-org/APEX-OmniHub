import fs from 'node:fs';
import path from 'node:path';

/**
 * Recursively gets all files in a directory matching specific extensions.
 * @param {string} dir - Directory to search
 * @param {string[]} exts - Extensions to include (e.g. ['.md'])
 * @returns {string[]} List of absolute file paths
 */
export function getAllFiles(dir, exts = ['.md']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(entry => {
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(filePath))) {
      results.push(filePath);
    }
  });
  return results;
}
