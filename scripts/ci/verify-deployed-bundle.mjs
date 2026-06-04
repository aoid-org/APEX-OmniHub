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
const KEY_SHAPE = /sb_publishable_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'apex-omnihub-deploy-smoke-test', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

function extractScriptUrls(html, baseUrl) {
  const urls = new Set();
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
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
  return combined;
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
      const text = await gatherBundleText(target.url);
      if (!assertBundle(target.label, text)) {
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
