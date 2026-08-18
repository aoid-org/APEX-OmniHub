/**
 * Search index for OmniSearchPalette — every navigable OmniHub surface
 * (the nine canonical sidebar modules plus OmniSkills), with keyword
 * synonyms so "payment" finds Billing and "upload" finds Files.
 *
 * Kept separate from the palette component so the component file only
 * exports a component (react-refresh/only-export-components).
 */
import { OMNIDASH_SIDEBAR_WIDGETS } from '@/contracts/omnidash-sidebar-widgets';

export interface OmniSearchTarget {
  readonly key: string;
  readonly label: string;
  /** Extra match terms beyond the label (lowercase). */
  readonly keywords: string;
  readonly moduleKey: string;
}

const MODULE_KEYWORDS: Record<string, string> = {
  omniboard: 'connect integration third-party provider apps board antigravity google ai',
  physiomni: 'physical iot device actuation',
  audits: 'audit log history compliance export',
  links: 'omnilink url share deep link',
  automations: 'automation trigger schedule task bot',
  workflows: 'workflow studio dag pipeline replay',
  files: 'file upload media document storage',
  billing: 'billing payment plan subscription invoice stripe',
  settings: 'settings preferences workspace configuration language theme',
};

export function buildSearchTargets(): OmniSearchTarget[] {
  const targets: OmniSearchTarget[] = OMNIDASH_SIDEBAR_WIDGETS.map((w) => ({
    key: w.id,
    label: w.label,
    keywords: MODULE_KEYWORDS[w.id] ?? '',
    moduleKey: w.moduleKey,
  }));
  targets.push({
    key: 'omniskills',
    label: 'OmniSkills',
    keywords: 'skills marketplace forge generate business',
    moduleKey: 'omniskills',
  });
  return targets;
}

export function filterSearchTargets(
  targets: readonly OmniSearchTarget[],
  query: string,
): OmniSearchTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...targets];
  return targets.filter(
    (t) => t.label.toLowerCase().includes(q) || t.keywords.includes(q),
  );
}
