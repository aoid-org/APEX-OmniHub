import * as fs from 'fs';
import * as path from 'path';

// Fix for ES Modules in raw bun execution
const scriptDir = new URL('.', import.meta.url).pathname;
const migrationsDir = path.join(scriptDir, '../../supabase/migrations');

const targetMigrations = [
  '20260508000000_apex_control_plane.sql',
  '20260508010000_apex_sales_vault.sql'
];

let failed = false;

for (const file of targetMigrations) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Migration file not found: ${file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Clean comments
  const lines = content.split('\n');
  const codeLines = lines.map(line => {
    const commentIdx = line.indexOf('--');
    return commentIdx !== -1 ? line.substring(0, commentIdx) : line;
  });

  const cleanContent = codeLines.join('\n');

  // For this specific check, we look for destructive actions, but we should distinguish between
  // dropping tables/columns vs "ON DELETE CASCADE" in foreign keys which is structural.
  // The prompt says: "The script must statically analyze the SQL and intentionally fail the CI build if any DROP, DELETE, or TRUNCATE operations are detected. State must remain 100% additive to allow instant routing rollbacks."
  // It literally says "any DROP, DELETE, or TRUNCATE operations". So if they exist in the file, it must fail.
  const destructiveRegex = /\b(DROP|DELETE|TRUNCATE)\b/i;

  if (destructiveRegex.test(cleanContent)) {
    console.error(`\n[FATAL] Destructive operation detected in ${file}!`);
    console.error(`Rule: Migrations must be strictly additive to support Shadow-Staged Atomic Flips.`);

    codeLines.forEach((line, index) => {
      if (destructiveRegex.test(line)) {
        console.error(`Line ${index + 1}: ${lines[index].trim()}`);
      }
    });

    failed = true;
  } else {
    console.log(`[PASS] Additive validation passed for ${file}.`);
  }
}

if (failed) {
  process.exit(1);
}
