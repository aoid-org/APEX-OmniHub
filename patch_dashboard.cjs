const fs = require('node:fs');
const path = 'apps/omnihub-site/src/pages/DashboardOverview/DashboardOverview.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace APP_REGISTRY import with EXTERNAL_INTEGRATIONS
content = content.replace(
`import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';`,
`import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';`
);

// update handleAppClick
const handleAppClickRegex = /const handleAppClick = useCallback\([\s\S]*?dispatch\(intent\);\n    \},\n    \[dispatch\],\n  \);/m;

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
        routePath: '', // Integrations do not have internal routePath
        dashboardStatus: app.status as OmniDashConnectStatus,
        comingSoon: entry.comingSoon,
      };
      dispatch(intent);
    },
    [dispatch],
  );`;

content = content.replace(handleAppClickRegex, newHandleAppClick);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched dashboard');
