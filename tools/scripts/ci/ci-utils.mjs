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
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat?.isDirectory()) {
      results = results.concat(getAllFiles(file, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(file);
    }
  });
  return results;
}
