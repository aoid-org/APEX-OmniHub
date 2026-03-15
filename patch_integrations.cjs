const fs = require('fs');
const path = 'apps/omnihub-site/dashboard/components/Integrations.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
`    const intent: OmniDashIntent = {
      appKey: 'quickbooks',`,
`    const intent: OmniDashIntent = {
      source: 'integration',
      appKey: 'quickbooks',`
);

content = content.replace(
`                      const intent: OmniDashIntent = {
                        appKey: connector.appSlug,`,
`                      const intent: OmniDashIntent = {
                        source: 'integration',
                        appKey: connector.appSlug,`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched integrations');
