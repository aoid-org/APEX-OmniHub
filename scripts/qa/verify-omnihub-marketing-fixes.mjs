import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const distDir = path.join(rootDir, 'dist');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${message}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${message}`);
  }
}

function check() {
  console.log('Running Marketing Fixes Verification against DIST...\n');

  if (!existsSync(distDir)) {
    console.error('[FATAL] dist/ directory not found. Run npm run build first.');
    process.exit(1);
  }

  // Read bundled files
  const assetsDir = path.join(distDir, 'assets');
  let bundleJs = '';
  let bundleCss = '';
  
  if (existsSync(assetsDir)) {
    const files = readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js')).map(f => readFileSync(path.join(assetsDir, f), 'utf8'));
    const cssFiles = files.filter(f => f.endsWith('.css')).map(f => readFileSync(path.join(assetsDir, f), 'utf8'));
    bundleJs = jsFiles.join('\n');
    bundleCss = cssFiles.join('\n');
  } else {
    console.warn('[WARN] dist/assets directory not found. Using root dir HTML parsing if needed.');
  }

  // 1. _redirects
  const redirectsPath = path.join(distDir, '_redirects');
  assert(existsSync(redirectsPath), '_redirects file is built into dist');
  if (existsSync(redirectsPath)) {
    const redirects = readFileSync(redirectsPath, 'utf8');
    assert(redirects.includes('/* /index.html 200'), '_redirects uses SPA catch-all');
    assert(!redirects.includes('/demo /demo.html 200'), '_redirects has removed old static route rewrites');
  }

  // 2. _headers
  const headersPath = path.join(distDir, '_headers');
  assert(existsSync(headersPath), '_headers file is built into dist');
  if (existsSync(headersPath)) {
    const headers = readFileSync(headersPath, 'utf8');
    assert(headers.includes('/apex-demo-video.mp4'), '_headers contains video headers');
    assert(headers.includes('/captions/*'), '_headers contains caption headers');
    assert(headers.includes('/audio/*'), '_headers contains audio headers');
  }

  // 3. Captions
  assert(existsSync(path.join(distDir, 'captions/demo.vtt')), 'Caption file exists in dist');
  assert(existsSync(path.join(distDir, 'captions/brand-anthem.vtt')), 'Brand anthem caption file exists in dist');

  // 4. Component checking in built assets
  if (bundleCss) {
    assert(bundleCss.includes('width:200px') || bundleCss.includes('width: 200px'), 'Hero CTA CSS defines 200px width (minified)');
    assert(bundleCss.includes('height:56px') || bundleCss.includes('height: 56px'), 'Hero CTA CSS defines 56px height (minified)');
  }

  // 5. Media processing against dist
  try {
    const demoVidPath = path.join(distDir, 'apex-demo-video.mp4');
    assert(existsSync(demoVidPath), 'apex-demo-video.mp4 exists in dist');
    if (existsSync(demoVidPath)) {
      const vidInfo = execSync(`ffprobe -hide_banner -v error -select_streams v:0 -show_entries stream=codec_name,codec_tag_string,width,pix_fmt -of csv=p=0 "${demoVidPath}"`, { encoding: 'utf8' }).trim();
      assert(vidInfo.includes('h264'), 'Demo video is H.264');
      assert(vidInfo.includes('avc1'), 'Demo video is avc1');
      assert(vidInfo.includes('yuv420p'), 'Demo video is yuv420p');
      const width = Number.parseInt(vidInfo.split(',')[2] || '0', 10);
      assert(width > 0 && width <= 1920, 'Demo video width <= 1920');
    }
  } catch (e) {
    console.error(e.message);
    assert(false, 'ffprobe demo video check failed on dist/apex-demo-video.mp4');
  }

  try {
    const anthemPath = path.join(distDir, 'audio/brand-anthem.mp3');
    assert(existsSync(anthemPath), 'brand-anthem.mp3 exists in dist');
    if (existsSync(anthemPath)) {
      const audioStreams = new Set(execSync(`ffprobe -hide_banner -v error -show_entries stream=codec_type -of csv=p=0 "${anthemPath}"`, { encoding: 'utf8' }).trim().split('\n'));
      assert(audioStreams.has('audio'), 'Brand anthem has audio stream');
      assert(!audioStreams.has('video'), 'Brand anthem has no video stream');
    }
  } catch (e) {
    console.error(e.message);
    assert(false, 'ffprobe brand anthem check failed on dist/audio/brand-anthem.mp3');
  }

  console.log(`\nVerification complete: ${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('Marketing fix verification passed.');
  }
}

check();
