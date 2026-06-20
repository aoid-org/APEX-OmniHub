import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isActionSupported, SUPPORTED_ACTIONS } from '../../apps/omnihub-site/dashboard/contracts/moduleActionCapabilities';

describe('Global Drift Guards', () => {
  it('LinksModule should not import or reference OmniBoardWizard', () => {
    const linksModulePath = path.resolve(__dirname, '../../apps/omnihub-site/dashboard/components/modules/LinksModule.tsx');
    const content = fs.readFileSync(linksModulePath, 'utf-8');
    
    // The strict boundary check
    expect(content).not.toMatch(/OmniBoardWizard/i);
    expect(content).not.toMatch(/omniboard-wizard/i);
  });

  it('SettingsModule should hardcode the 4 canonical controls to prevent UI blanking', () => {
    const settingsModulePath = path.resolve(__dirname, '../../apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx');
    const content = fs.readFileSync(settingsModulePath, 'utf-8');
    
    expect(content).toMatch(/demo_mode/);
    expect(content).toMatch(/anonymize_kpis/);
    expect(content).toMatch(/freeze_mode/);
    expect(content).toMatch(/show_connected_ecosystem/);
    
    // Ensure we iterate over the hardcoded labels instead of the dynamic backend list
    expect(content).toMatch(/Object\.entries\(SETTING_LABELS\)\.map/);
  });

  it('Module action capabilities should explicitly block unsupported actions', () => {
    // Only a small whitelist is permitted
    expect(SUPPORTED_ACTIONS.size).toBeGreaterThan(0);
    expect(isActionSupported('add-link')).toBe(true);
    expect(isActionSupported('send-to-omnislate')).toBe(true);
    
    // Everything else should be rejected by default
    expect(isActionSupported('manage-bundles')).toBe(false);
    expect(isActionSupported('trigger-workflow')).toBe(false);
    expect(isActionSupported('unknown-action')).toBe(false);
  });
});
