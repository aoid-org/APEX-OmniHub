import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ingressSource = readFileSync('supabase/functions/physiomni-ingress/index.ts', 'utf8');

describe('physiomni ingress security controls', () => {
  it('requires an HMAC secret and verifies x-physiomni-signature before service-role writes', () => {
    const signatureVerification = ingressSource.indexOf('await verifyRequestSignature(req, rawBody, corsHeaders)');
    const telemetryWrite = ingressSource.indexOf(".from('physiomni_telemetry')");

    expect(ingressSource).toContain("Deno.env.get('PHYSIOMNI_DEVICE_HMAC_SECRET')");
    expect(ingressSource).toContain("req.headers.get('x-physiomni-signature')");
    expect(ingressSource).toContain("crypto.subtle.sign('HMAC'");
    expect(signatureVerification).toBeGreaterThan(-1);
    expect(telemetryWrite).toBeGreaterThan(signatureVerification);
  });

  it('rejects stale telemetry and checks active tenant/device binding before insert', () => {
    const freshnessCheck = ingressSource.indexOf('rejectStaleTelemetry(data, corsHeaders)');
    const deviceBindingCheck = ingressSource.indexOf(".from('physiomni_devices')");
    const telemetryWrite = ingressSource.indexOf(".from('physiomni_telemetry')");

    expect(ingressSource).toContain("error: 'stale_telemetry'");
    expect(ingressSource).toContain(".eq('tenant_id', data.tenant_id)");
    expect(ingressSource).toContain(".eq('is_active', true)");
    expect(freshnessCheck).toBeGreaterThan(-1);
    expect(deviceBindingCheck).toBeGreaterThan(freshnessCheck);
    expect(telemetryWrite).toBeGreaterThan(deviceBindingCheck);
  });
});
