import { describe, it, expect } from 'vitest';

// We will test the sidebar contract instead, or mock the minimum viable shell.
import { OMNIDASH_SIDEBAR_WIDGETS } from '../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets';

describe('OmniDash Sidebar Contracts', () => {
  it('OmniBoard widget has moduleKey set to omniboard', () => {
    const omniboard = OMNIDASH_SIDEBAR_WIDGETS.find(w => w.id === 'omniboard');
    expect(omniboard).toBeDefined();
    expect(omniboard?.moduleKey).toBe('omniboard');
  });
});
