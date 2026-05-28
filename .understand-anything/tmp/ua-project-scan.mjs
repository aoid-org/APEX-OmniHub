#!/usr/bin/env node
/**
 * Understand-Anything Project Scanner
 * Deterministic file discovery, language detection, framework detection,
 * line counting, and import resolution.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, relative, dirname, extname, basename, resolve, sep } from 'path';

const PROJECT_ROOT = resolve(process.argv[2] || '.');
const OUTPUT_PATH = process.argv[3] || join(PROJECT_ROOT, '.understand-anything', 'tmp', 'ua-scan-results.json');

// Ensure output directory exists
const outDir = dirname(OUTPUT_PATH);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ── Step 1: File Discovery ──────────────────────────────────────────────
let rawFiles = [];
try {
  const gitOut = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  rawFiles = gitOut.split('\n').filter(Boolean);
} catch {
  // Fallback: recursive listing
  function walk(dir, root, acc) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'vendor', 'venv', '.venv', '__pycache__'].includes(entry.name)) {
          walk(full, root, acc);
        }
      } else {
        acc.push(relative(root, full).replace(/\\/g, '/'));
      }
    }
    return acc;
  }
  rawFiles = walk(PROJECT_ROOT, PROJECT_ROOT, []);
}

console.error(`[scan] Discovered ${rawFiles.length} raw files via git ls-files`);

// ── Step 2: Exclusion Filtering ─────────────────────────────────────────
const EXCLUDE_DIR_SEGMENTS = new Set([
  'node_modules', '.git', 'vendor', 'venv', '.venv', '__pycache__',
  'dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo',
  'target', 'obj', '.idea', '.vscode'
]);

const EXCLUDE_EXTENSIONS = new Set([
  '.lock', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf',
  '.zip', '.tar', '.gz', '.map', '.log'
]);

const EXCLUDE_BASENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock',
  'LICENSE', '.gitignore', '.editorconfig', '.prettierrc'
]);

function shouldExclude(filePath) {
  const parts = filePath.split('/');
  const base = parts[parts.length - 1];
  const ext = extname(base).toLowerCase();

  // Directory segment exclusions
  for (const part of parts.slice(0, -1)) {
    if (EXCLUDE_DIR_SEGMENTS.has(part)) return true;
  }

  // Basename exclusions
  if (EXCLUDE_BASENAMES.has(base)) return true;
  if (base.startsWith('.eslintrc')) return true;

  // Extension exclusions
  if (EXCLUDE_EXTENSIONS.has(ext)) return true;

  // Generated file patterns
  if (base.endsWith('.min.js') || base.endsWith('.min.css')) return true;
  if (base.includes('.generated.')) return true;

  // Binary coverage files
  if (ext === '.coverage' || base === '.coverage') return true;

  return false;
}

const filteredFiles = rawFiles.filter(f => !shouldExclude(f));
console.error(`[scan] After filtering: ${filteredFiles.length} files (excluded ${rawFiles.length - filteredFiles.length})`);

// ── Step 3: Language Detection ──────────────────────────────────────────
const EXT_TO_LANG = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
  '.c': 'c',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.php': 'php',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.sh': 'shell', '.bash': 'shell',
  '.ps1': 'powershell',
  '.bat': 'batch', '.cmd': 'batch',
  '.md': 'markdown', '.rst': 'markdown',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.json': 'json',
  '.jsonc': 'jsonc',
  '.toml': 'toml',
  '.sql': 'sql',
  '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'protobuf',
  '.tf': 'terraform', '.tfvars': 'terraform',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
  '.xml': 'xml',
  '.cfg': 'config', '.ini': 'config', '.env': 'config',
  '.sol': 'solidity',
  '.cts': 'typescript', '.mts': 'typescript',
  '.txt': 'text',
  '.csv': 'csv',
};

const SPECIAL_BASENAMES = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'Jenkinsfile': 'jenkinsfile',
  'Procfile': 'procfile',
  'Vagrantfile': 'vagrantfile',
  'Caddyfile': 'caddyfile',
  'CODEOWNERS': 'config',
};

function detectLanguage(filePath) {
  const base = basename(filePath);
  if (SPECIAL_BASENAMES[base]) return SPECIAL_BASENAMES[base];
  const ext = extname(base).toLowerCase();
  if (EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];
  if (ext) return ext.slice(1).toLowerCase();
  return 'unknown';
}

// ── Step 4: File Category Detection ─────────────────────────────────────
function detectCategory(filePath, lang) {
  const base = basename(filePath);
  const ext = extname(base).toLowerCase();
  const parts = filePath.split('/');

  // Infra patterns (check first - most specific)
  if (base === 'Dockerfile' || base.startsWith('docker-compose') || base === 'Makefile' ||
      base === 'Jenkinsfile' || base === 'Procfile' || base === 'Vagrantfile' ||
      base === 'Caddyfile') return 'infra';
  if (['.tf', '.tfvars'].includes(ext)) return 'infra';
  if (parts.some(p => ['.github', '.gitlab-ci.yml', '.circleci', 'k8s', 'kubernetes', 'terraform'].includes(p))) {
    if (parts.includes('.github') && parts.includes('workflows')) return 'infra';
    if (['terraform'].some(d => parts.includes(d))) return 'infra';
  }
  if (base.includes('.k8s.yaml') || base.includes('.k8s.yml')) return 'infra';

  // Docs
  if (['.md', '.rst'].includes(ext) && base !== 'LICENSE') return 'docs';
  if (ext === '.txt' && base !== 'LICENSE') return 'docs';

  // Data/Schema
  if (['.sql', '.graphql', '.gql', '.proto', '.prisma', '.csv'].includes(ext)) return 'data';
  if (base.endsWith('.schema.json')) return 'data';

  // Script
  if (['.sh', '.bash', '.ps1', '.bat', '.cmd'].includes(ext)) return 'script';

  // Markup
  if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) return 'markup';

  // Config
  if (['.yaml', '.yml', '.json', '.jsonc', '.toml', '.xml', '.cfg', '.ini', '.env'].includes(ext)) return 'config';
  if (base === 'CODEOWNERS') return 'config';
  if (base.endsWith('.config.js') || base.endsWith('.config.ts') || base.endsWith('.config.cjs') ||
      base.endsWith('.config.mjs') || base.endsWith('.config.cts')) return 'config';
  if (['tsconfig.json', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod',
       '.commitlintrc.json', 'components.json', 'turbo.json', '.lighthouserc.json',
       '.gitleaks.toml', '.prettierignore', '.stylelintignore', '.cursorrules',
       '.gitattributes', 'bunfig.toml', 'deno.lock', 'sonar-project.properties',
       '.trufflehog-exclude-paths.txt'].includes(base)) return 'config';

  // Code (default for programming languages)
  return 'code';
}

// ── Step 5: Line Counting ───────────────────────────────────────────────
function countLines(filePath) {
  try {
    const fullPath = join(PROJECT_ROOT, filePath);
    const content = readFileSync(fullPath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

// ── Build file list ─────────────────────────────────────────────────────
console.error('[scan] Building file list with language/category/line counts...');
const files = [];
const languageSet = new Set();

for (const f of filteredFiles) {
  const lang = detectLanguage(f);
  const category = detectCategory(f, lang);
  const lines = countLines(f);
  languageSet.add(lang);
  files.push({ path: f, language: lang, sizeLines: lines, fileCategory: category });
}

files.sort((a, b) => a.path.localeCompare(b.path));
const languages = [...languageSet].sort();

// ── Step 6: Framework Detection ─────────────────────────────────────────
console.error('[scan] Detecting frameworks...');
const frameworks = new Set();

// package.json
try {
  const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const fwMap = {
    'react': 'React', 'vue': 'Vue', 'svelte': 'Svelte', '@angular/core': 'Angular',
    'express': 'Express', 'fastify': 'Fastify', 'koa': 'Koa',
    'next': 'Next.js', 'nuxt': 'Nuxt', 'vite': 'Vite',
    'vitest': 'Vitest', 'jest': 'Jest', 'mocha': 'Mocha',
    'tailwindcss': 'TailwindCSS', 'prisma': 'Prisma', 'typeorm': 'TypeORM',
    'sequelize': 'Sequelize', 'mongoose': 'Mongoose',
    'redux': 'Redux', 'zustand': 'Zustand', 'mobx': 'MobX',
    '@supabase/supabase-js': 'Supabase', '@tanstack/react-query': 'TanStack Query',
    '@playwright/test': 'Playwright', 'hardhat': 'Hardhat',
    'ethers': 'Ethers.js', 'wagmi': 'Wagmi',
    'framer-motion': 'Framer Motion', 'react-router-dom': 'React Router',
    'zod': 'Zod', 'i18next': 'i18next',
    '@temporalio/client': 'Temporal', '@temporalio/worker': 'Temporal',
    '@opentelemetry/api': 'OpenTelemetry',
    '@capacitor/core': 'Capacitor',
    'ai': 'Vercel AI SDK',
  };
  for (const [dep, fw] of Object.entries(fwMap)) {
    if (allDeps[dep]) frameworks.add(fw);
  }
} catch { /* no package.json */ }

// tsconfig.json
if (existsSync(join(PROJECT_ROOT, 'tsconfig.json'))) {
  frameworks.add('TypeScript');
}

// pyproject.toml
if (existsSync(join(PROJECT_ROOT, 'pyproject.toml'))) {
  try {
    const content = readFileSync(join(PROJECT_ROOT, 'pyproject.toml'), 'utf-8');
    if (content.includes('ruff')) frameworks.add('Ruff');
    if (content.includes('pytest')) frameworks.add('Pytest');
    if (content.includes('temporal')) frameworks.add('Temporal');
  } catch { /* ignore */ }
}

// Infrastructure
if (files.some(f => f.path.includes('Dockerfile'))) frameworks.add('Docker');
if (files.some(f => f.path.includes('docker-compose'))) frameworks.add('Docker Compose');
if (files.some(f => f.path.endsWith('.tf'))) frameworks.add('Terraform');
if (files.some(f => f.path.includes('.github/workflows/'))) frameworks.add('GitHub Actions');
if (files.some(f => f.path.endsWith('.sol'))) frameworks.add('Solidity');

// ── Step 7: Complexity ──────────────────────────────────────────────────
const totalFiles = files.length;
let estimatedComplexity = 'small';
if (totalFiles > 500) estimatedComplexity = 'very-large';
else if (totalFiles > 150) estimatedComplexity = 'large';
else if (totalFiles > 30) estimatedComplexity = 'moderate';

// ── Step 8: Project Name ────────────────────────────────────────────────
let projectName = 'apex-omnihub';
let rawDescription = '';
let readmeHead = '';
try {
  const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
  if (pkg.name) projectName = pkg.name;
  if (pkg.description) rawDescription = pkg.description;
} catch { /* fallback to dir name */ }
try {
  const readme = readFileSync(join(PROJECT_ROOT, 'README.md'), 'utf-8');
  readmeHead = readme.split('\n').slice(0, 10).join('\n');
} catch { /* no readme */ }

// ── Step 9: Import Resolution ───────────────────────────────────────────
console.error('[scan] Resolving imports...');
const filePathSet = new Set(files.map(f => f.path));
const importMap = {};

// Read tsconfig for path aliases
let tsPaths = {};
let tsBaseUrl = '.';
try {
  const tsconfig = JSON.parse(readFileSync(join(PROJECT_ROOT, 'tsconfig.json'), 'utf-8').replace(/\/\/.*/g, '').replace(/,\s*([\]}])/g, '$1'));
  if (tsconfig.compilerOptions?.paths) tsPaths = tsconfig.compilerOptions.paths;
  if (tsconfig.compilerOptions?.baseUrl) tsBaseUrl = tsconfig.compilerOptions.baseUrl;

  // Also check tsconfig.app.json
  try {
    const tsconfigApp = JSON.parse(readFileSync(join(PROJECT_ROOT, 'tsconfig.app.json'), 'utf-8').replace(/\/\/.*/g, '').replace(/,\s*([\]}])/g, '$1'));
    if (tsconfigApp.compilerOptions?.paths) tsPaths = { ...tsPaths, ...tsconfigApp.compilerOptions.paths };
    if (tsconfigApp.compilerOptions?.baseUrl) tsBaseUrl = tsconfigApp.compilerOptions.baseUrl;
  } catch { /* no tsconfig.app.json */ }
} catch { /* no tsconfig */ }

const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

function resolveImportPath(importPath, importerDir) {
  // Try exact path first
  const candidates = [importPath];
  // Try with extensions
  for (const ext of TS_EXTENSIONS) {
    candidates.push(importPath + ext);
  }

  for (const candidate of candidates) {
    let resolved;
    if (candidate.startsWith('./') || candidate.startsWith('../')) {
      resolved = join(importerDir, candidate).replace(/\\/g, '/');
    } else {
      resolved = candidate;
    }
    // Normalize
    resolved = resolved.replace(/\\/g, '/');
    if (resolved.startsWith('/')) resolved = relative(PROJECT_ROOT, resolved).replace(/\\/g, '/');

    if (filePathSet.has(resolved)) return resolved;
  }
  return null;
}

function resolveAlias(importPath) {
  for (const [alias, targets] of Object.entries(tsPaths)) {
    const prefix = alias.replace('/*', '');
    if (importPath.startsWith(prefix)) {
      const suffix = importPath.slice(prefix.length);
      for (const target of targets) {
        const targetBase = target.replace('/*', '');
        const resolved = join(tsBaseUrl, targetBase, suffix).replace(/\\/g, '/');
        // Try with extensions
        const candidates = [resolved];
        for (const ext of TS_EXTENSIONS) {
          candidates.push(resolved + ext);
        }
        for (const c of candidates) {
          if (filePathSet.has(c)) return c;
        }
      }
    }
  }
  return null;
}

for (const file of files) {
  if (file.fileCategory !== 'code') {
    importMap[file.path] = [];
    continue;
  }

  const imports = [];
  try {
    const content = readFileSync(join(PROJECT_ROOT, file.path), 'utf-8');
    const importerDir = dirname(file.path);

    // TypeScript/JavaScript import patterns
    if (['typescript', 'javascript'].includes(file.language)) {
      // import ... from '...'
      const importFromRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g;
      // require('...')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      // Dynamic import
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

      for (const regex of [importFromRegex, requireRegex, dynamicImportRegex]) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const importPath = match[1];
          if (importPath.startsWith('.')) {
            const resolved = resolveImportPath(importPath, importerDir);
            if (resolved && !imports.includes(resolved)) imports.push(resolved);
          } else {
            // Check aliases
            const aliasResolved = resolveAlias(importPath);
            if (aliasResolved && !imports.includes(aliasResolved)) imports.push(aliasResolved);
          }
        }
      }
    }

    // Python imports
    if (file.language === 'python') {
      const fromImportRegex = /from\s+([\w.]+)\s+import/g;
      const plainImportRegex = /^import\s+([\w.]+)/gm;

      for (const regex of [fromImportRegex, plainImportRegex]) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const modPath = match[1];
          if (modPath.startsWith('.')) {
            // Relative import
            const dots = modPath.match(/^\.+/)[0].length;
            let base = importerDir;
            for (let i = 1; i < dots; i++) base = dirname(base);
            const rest = modPath.slice(dots).replace(/\./g, '/');
            const candidates = [
              join(base, rest + '.py'),
              join(base, rest, '__init__.py'),
            ].map(p => p.replace(/\\/g, '/'));
            for (const c of candidates) {
              if (filePathSet.has(c) && !imports.includes(c)) { imports.push(c); break; }
            }
          } else {
            // Absolute import
            const pathParts = modPath.replace(/\./g, '/');
            const candidates = [
              pathParts + '.py',
              pathParts + '/__init__.py',
              'orchestrator/' + pathParts + '.py',
              'orchestrator/' + pathParts + '/__init__.py',
            ];
            for (const c of candidates) {
              if (filePathSet.has(c) && !imports.includes(c)) { imports.push(c); break; }
            }
          }
        }
      }
    }

  } catch { /* file read error */ }

  importMap[file.path] = imports;
}

// Also add non-code files with empty imports if not already
for (const file of files) {
  if (!(file.path in importMap)) {
    importMap[file.path] = [];
  }
}

// ── Output ──────────────────────────────────────────────────────────────
const result = {
  scriptCompleted: true,
  name: projectName,
  rawDescription,
  readmeHead,
  languages,
  frameworks: [...frameworks].sort(),
  files,
  totalFiles,
  filteredByIgnore: 0,
  estimatedComplexity,
  importMap,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.error(`[scan] ✓ Scan complete: ${totalFiles} files, ${languages.length} languages, ${frameworks.size || frameworks.length || 0} frameworks`);
console.error(`[scan] Output: ${OUTPUT_PATH}`);
process.exit(0);
