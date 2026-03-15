const fs = require('fs');
const path = 'tests/omnidash/integrations.spec.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
`vi.mock('@/omnidash/omnilink-api', () => ({`,
`vi.mock('../../src/omnidash/omnilink-api', () => ({`
);
content = content.replace(
`} from '@/omnidash/omnilink-api';`,
`} from '../../src/omnidash/omnilink-api';`
);

content = content.replace(
`import type { OmniLinkIntegration } from '@/omnidash/types';`,
`import type { OmniLinkIntegration } from '../../src/omnidash/types';`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
