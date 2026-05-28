/**
 * APEX-OmniHub Knowledge Graph — Watch Server
 * Serves .understand-anything/ via HTTP, watches project for changes,
 * rebuilds graph.json on change. Browser polls /api/meta for updates.
 *
 * Usage: node .understand-anything/tmp/ua-watch-server.mjs [projectRoot] [port]
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync, watch, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(process.argv[2] || join(__dir, '..', '..'));
const PORT = parseInt(process.argv[3] || '4242');
const SERVE_DIR = join(PROJECT_ROOT, '.understand-anything');
const SCAN_SCRIPT = join(__dir, 'ua-project-scan.mjs');
const BUILD_SCRIPT = join(__dir, 'ua-build-graph.mjs');
const SCAN_OUT = join(__dir, 'ua-scan-results.json');
const GRAPH_OUT = join(SERVE_DIR, 'knowledge-graph.json');
const META_OUT = join(SERVE_DIR, 'graph-meta.json');

function resolve(p) { return p; }

// ── Rebuild pipeline ─────────────────────────────────────────────────
let rebuilding = false;
let pendingRebuild = false;

function writeMeta(status, message) {
  writeFileSync(META_OUT, JSON.stringify({
    status, message,
    generatedAt: new Date().toISOString(),
    ts: Date.now(),
  }));
}

function rebuild() {
  if (rebuilding) { pendingRebuild = true; return; }
  rebuilding = true;
  const t0 = Date.now();
  console.log('[watch] 🔄 Rebuilding graph…');
  writeMeta('building', 'Scanning…');

  execFile('node', [SCAN_SCRIPT, PROJECT_ROOT, SCAN_OUT], (err, stdout, stderr) => {
    if (err) {
      console.error('[watch] scan error:', err.message);
      writeMeta('error', 'Scan failed: ' + err.message);
      rebuilding = false;
      return;
    }
    console.log('[watch]', stderr.trim().split('\n').pop());
    writeMeta('building', 'Assembling graph…');

    execFile('node', [BUILD_SCRIPT, PROJECT_ROOT], (err2, stdout2, stderr2) => {
      rebuilding = false;
      if (err2) {
        console.error('[watch] build error:', err2.message);
        writeMeta('error', 'Build failed: ' + err2.message);
      } else {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log('[watch] ✓ Graph ready in', elapsed + 's');
        writeMeta('ready', `Rebuilt in ${elapsed}s`);
      }
      if (pendingRebuild) { pendingRebuild = false; setTimeout(rebuild, 500); }
    });
  });
}

// ── File watcher (debounced) ─────────────────────────────────────────
const WATCH_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.sol', '.yaml', '.yml', '.json', '.toml']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.venv', '__pycache__', '.understand-anything']);

let debounceTimer = null;
function scheduleRebuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(rebuild, 1200);
}

function watchDir(dir, depth = 0) {
  if (depth > 4) return;
  try {
    watch(dir, { recursive: false }, (event, filename) => {
      if (!filename) return;
      const seg = filename.split(/[\\/]/)[0];
      if (IGNORE_DIRS.has(seg)) return;
      const ext = extname(filename).toLowerCase();
      if (WATCH_EXTENSIONS.has(ext)) {
        console.log('[watch] changed:', filename);
        scheduleRebuild();
      }
    });
  } catch { /* ignore permission errors */ }
}

// Watch top-level dirs
import { readdirSync } from 'fs';
const topDirs = ['src', 'orchestrator', 'supabase', 'contracts', 'edge', 'api', 'services', 'apps', 'packages'];
for (const d of topDirs) {
  const full = join(PROJECT_ROOT, d);
  if (existsSync(full)) watchDir(full);
}
watchDir(PROJECT_ROOT);

// ── HTTP Server ──────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);

  // API: meta endpoint for polling
  if (url.pathname === '/api/meta') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    if (existsSync(META_OUT)) {
      res.end(readFileSync(META_OUT));
    } else {
      res.end(JSON.stringify({ status: 'unknown', ts: 0 }));
    }
    return;
  }

  // API: trigger manual rebuild
  if (url.pathname === '/api/rebuild') {
    rebuild();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Static files from SERVE_DIR
  let filePath = url.pathname === '/' ? '/knowledge-graph.html' : url.pathname;
  const fullPath = join(SERVE_DIR, filePath.replace(/^\//, ''));

  if (existsSync(fullPath) && !statSync(fullPath).isDirectory()) {
    const ext = extname(fullPath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(readFileSync(fullPath));
  } else {
    res.writeHead(404);
    res.end('Not found: ' + filePath);
  }
});

server.listen(PORT, () => {
  console.log(`\n  ⬡ APEX-OmniHub Knowledge Graph`);
  console.log(`  → http://localhost:${PORT}\n`);
  writeMeta('building', 'Initial build…');
  rebuild();
});
