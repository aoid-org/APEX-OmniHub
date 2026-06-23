import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getModuleActionCapability,
  isModuleActionSupported,
} from '../../apps/omnihub-site/dashboard/contracts/moduleActionCapabilities';
import {
  OMNIDASH_SIDEBAR_WIDGETS,
} from '../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets';

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../..', relativePath), 'utf-8');

describe('Global Drift Guards', () => {
  it('LinksModule should not import or reference OmniBoardWizard', () => {
    const content = readRepoFile(
      'apps/omnihub-site/dashboard/components/modules/LinksModule.tsx',
    );

    // The strict boundary check — Links collect URL context, never app integrations.
    expect(content).not.toMatch(/OmniBoardWizard/i);
    expect(content).not.toMatch(/omniboard-wizard/i);
  });

  it('SettingsModule should hardcode the 4 canonical controls to prevent UI blanking', () => {
    const content = readRepoFile(
      'apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx',
    );

    expect(content).toMatch(/demo_mode/);
    expect(content).toMatch(/anonymize_kpis/);
    expect(content).toMatch(/freeze_mode/);
    expect(content).toMatch(/show_connected_ecosystem/);

    // Ensure we iterate over the hardcoded meta map instead of the dynamic backend list
    expect(content).toMatch(/Object\.entries\(SETTING_META\)\.map/);
  });

  it('module-keyed capability map blocks unsupported actions with module-specific copy', () => {
    // No action is wired to a backend pipeline yet — everything fails closed.
    expect(isModuleActionSupported('workflows', 'create-workflow')).toBe(false);
    expect(isModuleActionSupported('files', 'upload_file')).toBe(false);
    expect(isModuleActionSupported('links', 'add-link')).toBe(false);

    // Copy is keyed by module, not a raw generic line per action.
    const workflows = getModuleActionCapability('workflows', 'create-workflow');
    const files = getModuleActionCapability('files', 'upload_file');
    expect(workflows.copy).not.toEqual(files.copy);
    expect(workflows.copy).toMatch(/workflow engine/i);
    expect(files.copy).toMatch(/storage/i);

    // No raw `Action "x" is not connected...` generic shape.
    expect(workflows.copy).not.toMatch(/Action "/);
  });

  it('capability map is keyed by moduleKey + actionId and covers baseline AND live ids', () => {
    // Same actionId, different module → different (module-specific) copy is possible.
    const linksTestAll = getModuleActionCapability('links', 'test-all');
    expect(linksTestAll.supported).toBe(false);

    // Live underscore ids resolve to the same module copy as their baseline twins.
    const liveCreate = getModuleActionCapability('workflows', 'create_workflow');
    const baselineCreate = getModuleActionCapability('workflows', 'create-workflow');
    expect(liveCreate.copy).toEqual(baselineCreate.copy);

    // Unknown action on a known module still gets module-specific copy.
    const unknown = getModuleActionCapability('workflows', 'totally-made-up');
    expect(unknown.supported).toBe(false);
    expect(unknown.copy).toEqual(baselineCreate.copy);
  });

  it('Links baseline copy describes URL/context collection, not app integrations', () => {
    const moduleData = JSON.parse(
      readRepoFile('apps/omnihub-site/dashboard/components/moduleData.json'),
    ) as Array<[string, string, ...unknown[]]>;

    const links = moduleData.find((m) => m[0] === 'links');
    expect(links).toBeTruthy();
    const headline = links![1];

    // Old integration-service semantics must be gone.
    expect(headline).not.toMatch(/Connected services/i);
    expect(headline).not.toMatch(/integration endpoints/i);

    // New copy must describe URL/context collection for OmniSlate/agent context.
    expect(headline).toMatch(/context/i);
    expect(headline).toMatch(/URL|OmniSlate|agent/i);
  });

  it('omnilink-port Links resolver returns honest empty link-context, never integration semantics or test-all', () => {
    const resolver = readRepoFile('supabase/functions/omnilink-port/index.ts');

    // Isolate the resolveLinks function body.
    const match = resolver.match(/function resolveLinks[\s\S]*?\n}/);
    expect(match).toBeTruthy();
    const body = match![0];

    // Links must NOT hydrate from the integrations table.
    expect(body).not.toMatch(/\.from\('integrations'\)/);
    // The integration-only `test-all` verb must be gone.
    expect(body).not.toMatch(/test-all/);
    // It must return an honest query from the omnilink_links table.
    expect(body).toMatch(/\.from\('omnilink_links'\)/);
    expect(body).not.toMatch(/items:\s*\[\]/);
  });

  it('OmniBoard opens from the sidebar as the app-integration surface', () => {
    const omniboard = OMNIDASH_SIDEBAR_WIDGETS.find((w) => w.id === 'omniboard');
    expect(omniboard).toBeTruthy();
    expect(omniboard!.label).toBe('OmniBoard');
    expect(omniboard!.moduleKey).toBe('omniboard');

    // The OmniBoard module surface keeps app-integration copy.
    const omniBoardModule = readRepoFile(
      'apps/omnihub-site/dashboard/components/modules/OmniBoardModule.tsx',
    );
    expect(omniBoardModule).toMatch(/App Integration/i);
  });
});
