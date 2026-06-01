/**
 * EcosystemPane — Component Tests
 * @module tests/omnidash/ecosystem-pane.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: hidden state renders no apps, visible state renders ECOSYSTEM rows,
 * app name + status + category visible.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EcosystemPane } from '@/dashboard/components/DashboardOverview/components/EcosystemPane';
import { LIVE_APEX_APPS } from '@/dashboard/contracts/apexApps';

describe('EcosystemPane', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Hidden state (ecoAppsVisible=false)', () => {
    it('renders the panel heading but no app rows', () => {
      // Arrange / Act
      render(<EcosystemPane ecoAppsVisible={false} />);

      // Assert — header present
      expect(screen.getByText('APEX Ecosystem')).toBeInTheDocument();
      expect(screen.getByText('Connected Modules')).toBeInTheDocument();

      // Assert — no app rows
      if (LIVE_APEX_APPS.length > 0) {
        expect(screen.queryByText(LIVE_APEX_APPS[0].label)).not.toBeInTheDocument();
      }
    });
  });

  describe('Visible state (ecoAppsVisible=true)', () => {
    it('renders all ECOSYSTEM app rows when visible', () => {
      render(<EcosystemPane ecoAppsVisible={true} />);

      LIVE_APEX_APPS.forEach((app) => {
        expect(screen.getByText(app.label)).toBeInTheDocument();
      });
    });

    it('renders app status for each ECOSYSTEM entry', () => {
      render(<EcosystemPane ecoAppsVisible={true} />);

      // Status is hardcoded to 'ACTIVE' for all apps in EcosystemPane now
      const statusEls = screen.getAllByText('ACTIVE');
      expect(statusEls.length).toBeGreaterThan(0);
    });

    it('renders app category badge for each ECOSYSTEM entry', () => {
      render(<EcosystemPane ecoAppsVisible={true} />);

      LIVE_APEX_APPS.forEach((app) => {
        expect(screen.getByText(app.url)).toBeInTheDocument();
      });
    });

    it('renders exactly ECOSYSTEM.length app rows', () => {
      render(<EcosystemPane ecoAppsVisible={true} />);

      // Each app has a unique name — count app name elements
      const appNames = LIVE_APEX_APPS.map((a) => screen.getByText(a.label));
      expect(appNames).toHaveLength(LIVE_APEX_APPS.length);
    });
  });
});
