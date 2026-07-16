import { execFileSync } from 'node:child_process';
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

  // Safety valve prevents an accidental infinite parent-directory walk.
  let depth = 0;
  while (depth < 10) {
    if (existsSync(join(currentDir, 'package.json')) &&
        (existsSync(join(currentDir, 'package-lock.json')) || existsSync(join(currentDir, 'bun.lock')) || existsSync(join(currentDir, 'bun.lockb')))) {
      return currentDir;
    }

    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) break; // Reached filesystem root.
    currentDir = parentDir;
    depth++;
  }

  return process.cwd();
}

function commandExists(command) {
  try {
    const probe = process.platform === 'win32' ? 'where' : 'command';
    const args = process.platform === 'win32' ? [command] : ['-v', command];
    execFileSync(probe, args, { stdio: 'ignore', shell: process.platform !== 'win32' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the package-tree command. npm is canonical; Bun remains an optional local fallback only.
 */
function resolvePackageTreeRunner() {
  const root = findWorkspaceRoot();

  if (existsSync(join(root, 'package-lock.json'))) {
    return { command: 'npm', argsFor: (packageName) => ['ls', packageName, '--all', '--json'] };
  }

  if ((existsSync(join(root, 'bun.lock')) || existsSync(join(root, 'bun.lockb'))) && commandExists('bun')) {
    return { command: 'bun', argsFor: () => ['pm', 'ls', '--all'] };
  }

  return { command: 'npm', argsFor: (packageName) => ['ls', packageName, '--all', '--json'] };
}

function collectVersionsFromNpmTree(tree, packageName, versions = new Set()) {
  if (!tree || typeof tree !== 'object') return versions;

  const dependencies = tree.dependencies && typeof tree.dependencies === 'object' ? tree.dependencies : {};
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (name === packageName && dependency && typeof dependency === 'object' && typeof dependency.version === 'string') {
      versions.add(dependency.version);
    }
    collectVersionsFromNpmTree(dependency, packageName, versions);
  }

  return versions;
}

function collectVersionsFromTextTree(output, packageName) {
  const versionRegex = new RegExp(
    String.raw`(?:^|\n)[|│\s]*(?:[├└]──|[+\x60]--)?\s*${packageName}@([0-9]+\.[0-9]+\.[0-9]+(?:[-+][^\s]+)?)`,
    'g',
  );

  const versions = new Set();
  let match;
  while ((match = versionRegex.exec(output)) !== null) {
    versions.add(match[1]);
  }
  return versions;
}

function getPackageTreeOutput(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
  } catch (error) {
    // npm ls can exit non-zero for peer/dependency metadata issues while still returning a parseable tree.
    if (error.stdout) return error.stdout.toString();
    throw error;
  }
}

function checkPackageVersions(packageName) {
  console.log(`Checking for multiple versions of ${packageName}...`);

  try {
    const runner = resolvePackageTreeRunner();
    const args = runner.argsFor(packageName);

    console.log(`Running: ${runner.command} ${args.join(' ')}`);
    const output = getPackageTreeOutput(runner.command, args);
    let versions;

    if (runner.command === 'npm') {
      try {
        versions = collectVersionsFromNpmTree(JSON.parse(output), packageName);
      } catch (error) {
        console.error(`${YELLOW}Could not parse npm JSON output for ${packageName}; falling back to text scan: ${error.message}${RESET}`);
        versions = collectVersionsFromTextTree(output, packageName);
      }
    } else {
      versions = collectVersionsFromTextTree(output, packageName);
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
    console.error(`\n${RED}Singleton validation failed. See package-tree errors above.${RESET}`);
    process.exit(1);
  }

  console.log(`\n${GREEN}Success! React singleton validation passed.${RESET}`);
  process.exit(0);
}

runCheck();
