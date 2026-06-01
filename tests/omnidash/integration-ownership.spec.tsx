import { describe, it, expect } from 'vitest';
import { 
  canOwnAppIntegration, 
  mustHandoffToOmniBoard, 
  IntegrationSurface 
} from '../../apps/omnihub-site/dashboard/contracts/appIntegrationOwnership';

describe('Integration Ownership Contract', () => {
  it('identifies OmniBoard as the only integration owner', () => {
    expect(canOwnAppIntegration('omniboard')).toBe(true);
    
    const nonOwners: IntegrationSurface[] = [
      'apex_ecosystem', 'omnislate', 'settings', 'header', 
      'right_rail', 'integrated_apps', 'links_module', 'other'
    ];
    
    nonOwners.forEach(surface => {
      expect(canOwnAppIntegration(surface)).toBe(false);
    });
  });

  it('requires handoff to OmniBoard for all other surfaces', () => {
    const nonOwners: IntegrationSurface[] = [
      'apex_ecosystem', 'settings', 'integrated_apps', 'links_module'
    ];
    
    nonOwners.forEach(surface => {
      expect(mustHandoffToOmniBoard(surface)).toBe(true);
    });
    
    expect(mustHandoffToOmniBoard('omniboard')).toBe(false);
  });
});
