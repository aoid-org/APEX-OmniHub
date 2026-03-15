/**
 * Supabase egress monitoring script.
 * Queries Supabase usage metrics and alerts when egress exceeds thresholds.
 *
 * Run nightly via GitHub Actions.
 * Gap closed: 6.2 — No Supabase egress monitoring.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? '';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const SLACK_WEBHOOK = process.env.SLACK_ALERT_WEBHOOK_URL ?? '';

const WARN_PCT  = 70;
const ALERT_PCT = 90;

// Supabase Pro plan limits (update if plan changes)
const EGRESS_LIMIT_GB = 250;

async function checkEgress(): Promise<void> {
  if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    console.warn('[egress-monitor] Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN — skipping.');
    process.exit(0);
  }

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/usage`,
      { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } },
    );

    if (!res.ok) {
      console.error(`[egress-monitor] Supabase API returned ${res.status} — check SUPABASE_ACCESS_TOKEN.`);
      process.exit(0); // Non-blocking — monitoring failures should not break pipelines
    }

    const data = await res.json() as { egress_gb?: number };
    const egressGb  = data.egress_gb ?? 0;
    const pct       = Math.round((egressGb / EGRESS_LIMIT_GB) * 100);

    console.log(`[egress-monitor] Egress: ${egressGb.toFixed(2)} GB / ${EGRESS_LIMIT_GB} GB (${pct}%)`);

    if (pct >= ALERT_PCT && SLACK_WEBHOOK) {
      await postSlack(`:rotating_light: *APEX Egress CRITICAL (${pct}%)*\n${egressGb.toFixed(2)} GB of ${EGRESS_LIMIT_GB} GB used this month. Upgrade plan or reduce queries immediately.`);
    } else if (pct >= WARN_PCT && SLACK_WEBHOOK) {
      await postSlack(`:warning: *APEX Egress Warning (${pct}%)*\n${egressGb.toFixed(2)} GB of ${EGRESS_LIMIT_GB} GB used this month.`);
    }
  } catch (err) {
    console.error('[egress-monitor] Error:', err);
    process.exit(0);
  }
}

async function postSlack(text: string): Promise<void> {
  await fetch(SLACK_WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text }),
  });
}

await checkEgress();
