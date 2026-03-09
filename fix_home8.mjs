import fs from 'fs';
const filePath = 'apps/omnihub-site/src/pages/Home.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// replace path
content = content.replace(/..\/..\/..\/..\/src\/components\/seo\/SEOHead/g, "../../../../src/components/seo/SEOHead");
// actually wait, if Home.tsx is in apps/omnihub-site/src/pages/
// apps -> omnihub-site -> src -> pages (4 levels deep)
// so ../../../../src/components/seo/SEOHead would be root/src/components/seo/SEOHead
// which we created! Let's check where it actually got created.
