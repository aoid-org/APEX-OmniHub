import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PROD_TENANT_UUID = ['4b2f3a8b', '1e7c', '4c91', '923f', '5d02a895226c'].join('-');

describe('PhysiOmni ingress security hardening', () => {
  it('does not expose the production tenant UUID in firmware or provisioning sources', () => {
    const sourceFiles = [
      'edge/physiomni-firmware/prj.conf',
      'edge/physiomni-firmware/src/main.c',
      'tools/provisioning/provision_pilot_nodes.py',
    ];

    for (const file of sourceFiles) {
      expect(readFileSync(file, 'utf8')).not.toContain(PROD_TENANT_UUID);
    }
  });

  it('requires explicit live/demo enablement and validates live telemetry signatures', () => {
    const ingressSource = readFileSync('supabase/functions/physiomni-ingress/index.ts', 'utf8');

    expect(ingressSource).toContain("Deno.env.get('PHYSIOMNI_DEMO_ENABLED') === 'true'");
    expect(ingressSource).toContain("Deno.env.get('PHYSIOMNI_INGRESS_SHARED_SECRET')");
    expect(ingressSource).toContain("req.headers.get('x-physiomni-timestamp')");
    expect(ingressSource).toContain("req.headers.get('x-physiomni-signature')");
    expect(ingressSource).toContain('timingSafeEqualHex(expected, signature)');
  });

  it('authorizes writes through the active device registry before tenant-scoped inserts', () => {
    const ingressSource = readFileSync('supabase/functions/physiomni-ingress/index.ts', 'utf8');

    expect(ingressSource).toContain(".from('physiomni_devices')");
    expect(ingressSource).toContain(".eq('device_serial', data.device_serial)");
    expect(ingressSource).toContain(".eq('is_active', true)");
    expect(ingressSource).toContain('const authorizedTenantId = registeredDevice.device!.tenant_id');
    expect(ingressSource).toContain('tenant_id: authorizedTenantId');
  });
});
