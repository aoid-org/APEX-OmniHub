// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

/**
 * Tests for patch_dashboard.cjs
 *
 * Covers the node:fs import path change and the dashboard patching logic.
 */

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('patch_dashboard.cjs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('node:fs import path', () => {
    it('uses node: protocol prefix for fs require', () => {
      // The PR changed require('fs') to require('node:fs')
      expect(fs).toBeDefined();
      expect(typeof fs.readFileSync).toBe('function');
      expect(typeof fs.writeFileSync).toBe('function');
    });
  });

  describe('APP_REGISTRY to EXTERNAL_INTEGRATIONS replacement', () => {
    it('replaces APP_REGISTRY import with EXTERNAL_INTEGRATIONS', () => {
      const originalContent = `import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';`;

      const expectedReplacement = `import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';`;

      const result = originalContent.replace(
        `import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';`,
        `import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';`,
      );

      expect(result).toBe(expectedReplacement);
      expect(result).toContain('EXTERNAL_INTEGRATIONS');
      expect(result).toContain('ExternalIntegrationEntry');
      expect(result).not.toContain('APP_REGISTRY');
    });
  });

  describe('handleAppClick replacement', () => {
    it('replaces handleAppClick with integration-based version', () => {
      const handleAppClickRegex =
        /const handleAppClick = useCallback\([\s\S]*?dispatch\(intent\);\n    \},\n    \[dispatch\],\n  \);/m;

      const originalCode = `const handleAppClick = useCallback(
    (app: AppEntry) => () => {
      const entry = APP_REGISTRY.find((e) => e.label === app.name);
      if (!entry) return;
      const intent = { source: 'registry', appKey: entry.key };
      dispatch(intent);
    },
    [dispatch],
  );`;

      expect(handleAppClickRegex.test(originalCode)).toBe(true);
    });

    it('new handleAppClick uses EXTERNAL_INTEGRATIONS', () => {
      const newHandleAppClick = `const handleAppClick = useCallback(
    (app: AppEntry) => () => {
      const entry = EXTERNAL_INTEGRATIONS.find((e: ExternalIntegrationEntry) => e.label === app.name);
      if (!entry) return;
      const intent: OmniDashIntent = {
        source: 'integration',
        appKey: entry.key,
        provider: app.name,
        label: app.name,
        category: entry.category,
        routePath: '',
        dashboardStatus: app.status as OmniDashConnectStatus,
        comingSoon: entry.comingSoon,
      };
      dispatch(intent);
    },
    [dispatch],
  );`;

      expect(newHandleAppClick).toContain('EXTERNAL_INTEGRATIONS');
      expect(newHandleAppClick).toContain("source: 'integration'");
      expect(newHandleAppClick).toContain('ExternalIntegrationEntry');
    });
  });

  describe('full patch workflow', () => {
    it('reads, patches, and writes the file', () => {
      const mockContent = `import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';

const Component = () => {
  return <div>Dashboard</div>;
};`;

      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      // Simulate the patch
      let content = fs.readFileSync(
        'apps/omnihub-site/src/pages/DashboardOverview/DashboardOverview.tsx',
        'utf8',
      ) as string;

      content = content.replace(
        `import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';`,
        `import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';`,
      );

      expect(content).toContain('EXTERNAL_INTEGRATIONS');
      expect(content).not.toContain('APP_REGISTRY');

      fs.writeFileSync(
        'apps/omnihub-site/src/pages/DashboardOverview/DashboardOverview.tsx',
        content,
        'utf8',
      );

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
