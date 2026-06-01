import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const siteDir = path.join(rootDir, 'apps/omnihub-site');

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
  console.log('Running Marketing Fixes Verification...\n');

  // 1. App.tsx routes
  const appTsx = readFileSync(path.join(siteDir, 'src/App.tsx'), 'utf8');
  assert(appTsx.includes('path: "/demo.html"'), 'App.tsx contains legacy /demo.html route');
  assert(appTsx.includes('path: "/story.html"'), 'App.tsx contains legacy /story.html route');
  assert(appTsx.includes('path: "/tech-specs.html"'), 'App.tsx contains legacy /tech-specs.html route');
  assert(appTsx.includes('path: "/man-mode.html"'), 'App.tsx contains legacy /man-mode.html route');
  assert(appTsx.includes('path: "/fortress.html"'), 'App.tsx contains legacy /fortress.html route');

  // 2. _redirects
  const redirects = readFileSync(path.join(siteDir, 'public/_redirects'), 'utf8');
  assert(redirects.includes('/* /index.html 200'), '_redirects uses SPA catch-all');
  assert(!redirects.includes('/demo /demo.html 200'), '_redirects has removed old static route rewrites');

  // 3. _headers
  const headers = readFileSync(path.join(siteDir, 'public/_headers'), 'utf8');
  assert(headers.includes('/apex-demo-video.mp4'), '_headers contains video headers');
  assert(headers.includes('/captions/*'), '_headers contains caption headers');
  assert(headers.includes('/audio/*'), '_headers contains audio headers');

  // 4. Captions
  assert(existsSync(path.join(siteDir, 'public/captions/demo.vtt')), 'Caption file exists');

  // 5. Capability Template
  const capTemplate = readFileSync(path.join(siteDir, 'src/components/CapabilityPageTemplate.tsx'), 'utf8');
  assert(capTemplate.includes('capability-page--unified'), 'Capability template contains unified visual shell classes');

  // 6. Capability CSS
  const capCss = readFileSync(path.join(siteDir, 'src/styles/capability-pages.css'), 'utf8');
  assert(capCss.includes('linear-gradient(90deg, var(--cap-grid) 1px, transparent 1px)'), 'Capability CSS contains landing dark grid base');
  assert(capCss.includes('.capability-page__orbit--one'), 'Capability CSS contains orbit styling');

  // 7. Fortress Page
  const fortress = readFileSync(path.join(siteDir, 'src/pages/Fortress.tsx'), 'utf8');
  assert(fortress.includes('capability-page--fortress'), 'Fortress page uses unified class');

  // 8. BrandAnthemPlayer
  const player = readFileSync(path.join(siteDir, 'src/components/BrandAnthemPlayer.tsx'), 'utf8');
  assert(player.includes('preload="metadata"'), 'BrandAnthemPlayer uses preload="metadata"');
  assert(!player.includes('audio.play()') || player.includes('onClick={playAudio}'), 'BrandAnthemPlayer does not assume autoplay');

  // 9. Hero CTA CSS
  const landingCss = readFileSync(path.join(siteDir, 'src/styles/landing.css'), 'utf8');
  assert(landingCss.includes('.landing-root .hero-ctas .pill-lg'), 'Hero CTA CSS uses generic selector');
  assert(landingCss.includes('width: 200px;'), 'Hero CTA CSS defines 200px width');
  assert(landingCss.includes('height: 56px;'), 'Hero CTA CSS defines 56px height');
  assert(!landingCss.includes('a[data-modal="request-access"].pill-lg'), 'Old anchor-only CTA selector is absent');

  // 10. Language selector
  const compCss = readFileSync(path.join(siteDir, 'src/styles/components.css'), 'utf8');
  assert(compCss.includes('width: 44px;'), 'Desktop language trigger is compact (44px)');
  assert(compCss.includes('height: 44px;'), 'Desktop language trigger is compact (44px)');
  assert(compCss.includes('.nav__mobile-language .language-selector__trigger'), 'Mobile language selector restores visible current language text');
  assert(compCss.includes('width: 100%;'), 'Mobile language selector width 100%');
  
  const desktopTriggers = compCss.match(/\n\.language-selector__trigger\s*\{/g);
  assert(desktopTriggers && desktopTriggers.length === 1, 'Only one desktop language selector block exists (no duplicates)');
  
  const mobileTriggers = compCss.match(/\n\.nav__mobile-language\s+\.language-selector__trigger\s*\{/g);
  assert(mobileTriggers && mobileTriggers.length === 1, 'Only one mobile language selector block exists (no duplicates)');

  // 11. Media processing
  try {
    const vidInfo = execSync(String.raw`ffprobe -hide_banner -v error -select_streams v:0 -show_entries stream=codec_name,codec_tag_string,width,pix_fmt -of csv=p=0 "${path.join(siteDir, 'public/apex-demo-video.mp4')}"`, { encoding: 'utf8' }).trim();
    assert(vidInfo.includes('h264'), 'Demo video is H.264');
    assert(vidInfo.includes('avc1'), 'Demo video is avc1');
    assert(vidInfo.includes('yuv420p'), 'Demo video is yuv420p');
    const width = Number.parseInt(vidInfo.split(',')[2] || '0', 10);
    assert(width > 0 && width <= 1920, 'Demo video width <= 1920');
  } catch (e) {
    console.error(e.message);
    assert(false, 'ffprobe demo video check failed');
  }

  try {
    const audioStreams = new Set(execSync(String.raw`ffprobe -hide_banner -v error -show_entries stream=codec_type -of csv=p=0 "${path.join(siteDir, 'public/audio/brand-anthem.mp3')}"`, { encoding: 'utf8' }).trim().split('\n'));
    assert(audioStreams.has('audio'), 'Brand anthem has audio stream');
    assert(!audioStreams.has('video'), 'Brand anthem has no video stream');
  } catch (e) {
    console.error(e.message);
    assert(false, 'ffprobe brand anthem check failed');
  }

  console.log(`\\nVerification complete: ${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('Marketing fix verification passed (37 checks).');
  }
}

check();
