import fs from 'fs';
import path from 'path';

const apps = [
  { name: 'salesforce', domain: 'salesforce.com' },
  { name: 'hubspot', domain: 'hubspot.com' },
  { name: 'quickbooks', domain: 'quickbooks.intuit.com' },
  { name: 'netsuite', domain: 'netsuite.com' },
  { name: 'sap', domain: 'sap.com' },
  { name: 'gmail', domain: 'gmail.com' },
  { name: 'slack', domain: 'slack.com' },
  { name: 'shopify', domain: 'shopify.com' },
  { name: 'stripe', domain: 'stripe.com' },
  { name: 'zapier', domain: 'zapier.com' },
  { name: 'intercom', domain: 'intercom.com' }
];

const dir = path.resolve('apps/omnihub-site/public/apps');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  for (const app of apps) {
    try {
      let res = await fetch(`https://logo.clearbit.com/${app.domain}`);
      if (!res.ok) {
        res = await fetch(`https://icon.horse/icon/${app.domain}`);
      }
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(path.join(dir, `${app.name}.png`), Buffer.from(buffer));
        console.log(`Downloaded ${app.name}.png`);
      } else {
        console.log(`Failed to download ${app.name}`);
      }
    } catch (e) {
      console.log(`Error on ${app.name}: ${e.message}`);
    }
  }
}

download();
