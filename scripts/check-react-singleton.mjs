import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Validates that there is only one version of React and React DOM
 * across the entire monorepo dependency tree.
 *
 * Multiple versions of React can cause the "Hooks can only be called inside the body of a function component" error.
 */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function findWorkspaceRoot() {
  let currentDir = process.cwd();

  // Just a simple safety valve to prevent infinite loops
  let depth = 0;
  while (depth < 10) {
    if (existsSync(join(currentDir, 'package.json')) &&
        (existsSync(join(currentDir, 'bun.lock')) || existsSync(join(currentDir, 'bun.lockb')) || existsSync(join(currentDir, 'package-lock.json')))) {
      return currentDir;
    }

    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) break; // reached root
    currentDir = parentDir;
    depth++;
  }

  return process.cwd(); // fallback
}

/**
 * Try to figure out if we're using npm or bun to list packages
 */
function resolveNpmRunner() {
  const root = findWorkspaceRoot();

  if (existsSync(join(root, 'bun.lock')) || existsSync(join(root, 'bun.lockb'))) {
    // Return bun command array
    return { command: 'bun', args: ['pm', 'ls', '--all'] };
  }

  return { command: 'npm', args: ['ls', '--all'] };
}

function checkPackageVersions(packageName) {
  console.log(`Checking for multiple versions of ${packageName}...`);

  try {
    const npmRunner = resolveNpmRunner();

    // Check if we have multiple versions in the actual tree
    // npm ls <package> returns non-zero if multiple versions are found that conflict,
    // but we want to manually parse to be certain.

    let output;
    try {
      // Use the appropriate runner to get the dependency tree
      let command = npmRunner.command;
      let args = npmRunner.command === 'bun' ? ['pm', 'ls', '--all'] : ['ls', '--all'];

      console.log(`Running: ${command} ${args.join(' ')}`);
      output = execSync(`${command} ${args.join(' ')}`, { // NOSONAR
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // ignore stderr which might have warnings
      });
    } catch (e) {
      // npm ls returns non-zero if there are missing peer deps, which is common
      // We still get the output in e.stdout
      if (e.stdout) {
        output = e.stdout.toString();
      } else {
        throw e;
      }
    }

    // Extract all version numbers for the package
    // Matches patterns like "react@18.2.0" or "├─ react@18.2.0"
    const versionRegex = new RegExp(
      String.raw`(?:^|\n)[|│\s]*(?:[├└]──|[+\x60]--)\s+${packageName}@([0-9]+\.[0-9]+\.[0-9]+(?:[-+][^\s]+)?)`,
      'g',
    );

    const versions = new Set();
    let match;

    while ((match = versionRegex.exec(output)) !== null) {
      versions.add(match[1]);
    }

    if (versions.size === 0) {
      console.log(`${YELLOW}Could not detect any installed versions of ${packageName}. This might be expected if it's not installed yet.${RESET}`);
      return true;
    }

    if (versions.size > 1) {
      console.error(`${RED}❌ Multiple versions of ${packageName} found: ${Array.from(versions).join(', ')}${RESET}`);
      console.error(`${YELLOW}This will cause issues. Please use package overrides or resolutions to force a single version.${RESET}`);
      return false;
    }

    console.log(`${GREEN}✅ Only one version of ${packageName} found: ${Array.from(versions)[0]}${RESET}`);
    return true;

  } catch (error) {
    console.error(`${RED}Error checking ${packageName} versions: ${error.message}${RESET}`);
    return false;
  }
}

function runCheck() {
  console.log('--- React Singleton Check ---');

  const reactValid = checkPackageVersions('react');
  const reactDomValid = checkPackageVersions('react-dom');

  if (!reactValid || !reactDomValid) {
    console.error(`\n${RED}Singleton validation failed. Multiple versions of React detected.${RESET}`);
    process.exit(1);
  }

  console.log(`\n${GREEN}Success! React singleton validation passed.${RESET}`);
  process.exit(0);
}

runCheck();
