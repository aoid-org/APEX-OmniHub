#!/usr/bin/env node
/**
 * APEX OmniHub — Deployed Bundle Smoke Test (real assertion, not a 200 check)
 *
 * WHY: A 200 on apexomnihub.icu/login is NECESSARY but NOT SUFFICIENT — the
 * apex domain is served by the already-healthy `apex-omnihub` project, so a
 * curl returns 200 even if THIS deploy went nowhere or shipped placeholder
 * config. PR #1262's smoke test was a false-green for exactly this reason.
 *
 * This script proves the deploy by downloading the live HTML + its JS bundles
 * and asserting the CORRECT Supabase config is baked in:
 *   - the expected Supabase host (default rtopreovkywofgwgmozi.supabase.co)
 *     appears as the active config, AND
 *   - a key of the expected shape (sb_publishable_ prefix OR a JWT) is present,
 *     AND
 *   - the bundle does NOT ship `placeholder.supabase.co` as active config.
 *
 * Env:
 *   PROD_URL                 production site to verify (e.g. https://apexomnihub.icu)
 *   DEPLOY_URL               optional *.pages.dev preview URL from wrangler
 *   EXPECTED_SUPABASE_HOST   default rtopreovkywofgwgmozi.supabase.co
 *
 * Exit 0 = bundle verified. Non-zero = fail the deploy job.
 */

/** Strip trailing slashes without regex — no backtracking, O(n). */
function stripTrailingSlashes(s) {
  let result = s;
  while (result.endsWith('/')) result = result.slice(0, -1);
  return result;
}
const PROD_URL = stripTrailingSlashes(process.env.PROD_URL || 'https://apexomnihub.icu');
const DEPLOY_URL = stripTrailingSlashes(process.env.DEPLOY_URL || '');
const EXPECTED_HOST = (process.env.EXPECTED_SUPABASE_HOST || 'rtopreovkywofgwgmozi.supabase.co').trim();
const PLACEHOLDER_HOST = 'placeholder.supabase.co';

// sb_publishable_... (current) OR a JWT (legacy anon key: three dot-separated b64url segments).
// Upper bounds on quantifiers prevent super-linear backtracking (S5852).
const KEY_SHAPE = /sb_publishable_[A-Za-z0-9_-]{8,128}|eyJ[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500}/;

async function fetchResponse(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'apex-omnihub-deploy-smoke-test', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response;
}

async function fetchText(url) {
  return (await fetchResponse(url)).text();
}

function extractScriptUrls(html, baseUrl) {
  const urls = new Set();
  const re = /<script[^>]{0,1000}src=["']([^"']{1,2048})["']/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      urls.add(new URL(match[1], baseUrl).toString());
    } catch {
      // ignore unparseable src
    }
  }
  return [...urls];
}

async function gatherBundleText(baseUrl) {
  const html = await fetchText(baseUrl);
  let combined = html;
  const scripts = extractScriptUrls(html, baseUrl);
  if (scripts.length === 0) {
    console.warn(`No <script src> found at ${baseUrl}; asserting against HTML only.`);
  }
  for (const scriptUrl of scripts) {
    try {
      combined += '\n' + (await fetchText(scriptUrl));
    } catch (error) {
      console.warn(`Could not fetch ${scriptUrl}: ${error.message}`);
    }
  }
  return { html, combined };
}

function hasServiceWorkerRegistration(text) {
  return text.includes('serviceWorker.register("/sw.js")') ||
    text.includes("serviceWorker.register('/sw.js')") ||
    /serviceWorker\.register\(\s*[`'"]\/sw\.js[`'"]/.test(text);
}

async function assertOmniBoardEdgeRoute(label) {
  const edgeUrl = `https://${EXPECTED_HOST}/functions/v1/omnilink-port/omniboard-start`;
  const response = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'apex-omnihub-deploy-smoke-test',
      'Origin': PROD_URL,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const cors = response.headers.get('access-control-allow-origin') || '';
  const body = await response.text();
  if (response.status === 404 || !cors) {
    console.error(`::error::[${label}] OmniBoard edge route is dead: status=${response.status}, cors=${cors || '<missing>'}`);
    return false;
  }
  if (response.status === 401 || response.status === 403 || response.status === 503 || response.ok) {
    console.log(`[${label}] OK — OmniBoard edge route reachable with status ${response.status}.`);
    return true;
  }
  console.error(`::error::[${label}] OmniBoard edge route returned unexpected status ${response.status}: ${body.slice(0, 200)}`);
  return false;
}

async function assertPwaSurface(label, baseUrl, html, bundleText) {
  const failures = [];
  if (!/<link[^>]+rel=["']manifest["'][^>]*>/i.test(html)) {
    failures.push('HTML does not include a manifest link');
  }
  const manifestResponse = await fetchResponse(`${baseUrl}/manifest.webmanifest`);
  const manifestType = manifestResponse.headers.get('content-type') || '';
  if (!manifestType.includes('application/manifest+json')) {
    failures.push(`/manifest.webmanifest content-type was "${manifestType}", expected application/manifest+json`);
  }
  JSON.parse(await manifestResponse.text());

  const swResponse = await fetchResponse(`${baseUrl}/sw.js`);
  const swType = swResponse.headers.get('content-type') || '';
  if (!/javascript|ecmascript/i.test(swType)) {
    failures.push(`/sw.js content-type was "${swType}", expected javascript`);
  }
  if (!hasServiceWorkerRegistration(bundleText)) {
    failures.push('fetched JS bundle does not register /sw.js');
  }
  if (failures.length > 0) {
    console.error(`::error::[${label}] deployed PWA verification FAILED:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    return false;
  }
  console.log(`[${label}] OK — manifest, service worker, and registration verified.`);
  return true;
}

function assertBundle(label, text) {
  const failures = [];

  if (!text.includes(EXPECTED_HOST)) {
    failures.push(`expected Supabase host "${EXPECTED_HOST}" NOT found in bundle`);
  }
  if (!KEY_SHAPE.test(text)) {
    failures.push('no Supabase key of expected shape (sb_publishable_ or JWT) found in bundle');
  }
  // Placeholder must not be the ACTIVE config. If the real host is present we
  // treat placeholder occurrences as inert fallback strings; if the real host
  // is absent but placeholder is present, that is a hard fail.
  if (text.includes(PLACEHOLDER_HOST) && !text.includes(EXPECTED_HOST)) {
    failures.push(`bundle ships "${PLACEHOLDER_HOST}" as active config (real host missing)`);
  }

  if (failures.length > 0) {
    console.error(`::error::[${label}] deployed bundle verification FAILED:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    return false;
  }
  console.log(`[${label}] OK — host "${EXPECTED_HOST}" present and a valid key shape detected.`);
  return true;
}

async function main() {
  const targets = [{ label: 'production', url: PROD_URL }];
  if (DEPLOY_URL && DEPLOY_URL !== PROD_URL) {
    targets.push({ label: 'pages-preview', url: DEPLOY_URL });
  }

  let allPass = true;
  for (const target of targets) {
    console.log(`\nVerifying ${target.label}: ${target.url}`);
    try {
      const { html, combined } = await gatherBundleText(target.url);
      if (!assertBundle(target.label, combined)) {
        allPass = false;
      }
      if (!(await assertPwaSurface(target.label, target.url, html, combined))) {
        allPass = false;
      }
      if (!(await assertOmniBoardEdgeRoute(target.label))) {
        allPass = false;
      }
    } catch (error) {
      console.error(`::error::[${target.label}] fetch failed: ${error.message}`);
      allPass = false;
    }
  }

  if (!allPass) {
    console.error('\nDeployed bundle smoke test FAILED — production config not verified.');
    process.exit(1);
  }
  console.log('\nDeployed bundle smoke test PASSED.');
}

try {
  await main();
} catch (error) {
  console.error(`::error::Unexpected smoke-test failure: ${error.message}`);
  process.exit(1);
}
