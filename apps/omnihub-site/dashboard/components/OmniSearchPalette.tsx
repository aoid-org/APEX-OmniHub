/**
 * OmniSearchPalette — the functional surface behind the header "Search OmniHub…"
 * bar and the ⌘K / Ctrl+K shortcut.
 *
 * Searches every navigable OmniHub surface (the nine canonical sidebar modules
 * plus OmniSkills) and opens the selection through the same OmniSpatialHost
 * modal path the sidebar uses — no parallel navigation mechanism.
 *
 * Rendered through a portal to document.body: the header's backdropFilter makes
 * it a containing block, so a position:fixed overlay inside it would be clipped.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { T } from '../designSystem';
import { useOmniModal } from '@/stores/omniModalStore';
import { OMNIDASH_SIDEBAR_WIDGETS } from '@/contracts/omnidash-sidebar-widgets';

export interface OmniSearchTarget {
  readonly key: string;
  readonly label: string;
  /** Extra match terms beyond the label (lowercase). */
  readonly keywords: string;
  readonly moduleKey: string;
}

const MODULE_KEYWORDS: Record<string, string> = {
  omniboard: 'connect integration third-party provider apps board',
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

interface OmniSearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const OmniSearchPalette = ({ open, onClose }: OmniSearchPaletteProps) => {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const targets = useMemo(buildSearchTargets, []);
  const results = useMemo(
    () => filterSearchTargets(targets, query),
    [targets, query],
  );
  const clampedHighlight = Math.min(highlight, Math.max(results.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    // Focus after the portal paints.
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const openTarget = (target: OmniSearchTarget) => {
    onClose();
    useOmniModal.getState().invoke({
      id: `omni-search-${target.moduleKey}`,
      provider: 'omnidash',
      type: 'module',
      title: target.label,
      contextData: { moduleKey: target.moduleKey },
      onComplete: async () => {},
      onCancel: () => {},
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[clampedHighlight]) {
      e.preventDefault();
      openTarget(results[clampedHighlight]);
    }
  };

  return createPortal(
    <div
      data-testid="omni-search-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: 'rgba(4,8,18,0.55)',
        display: 'flex', justifyContent: 'center',
        alignItems: 'flex-start', padding: '12vh 12px 12px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search OmniHub"
        onKeyDown={onKeyDown}
        style={{
          width: 'min(560px, 100%)',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 14px', height: 48,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: T.t3, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            data-testid="omni-search-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="omni-search-results"
            aria-activedescendant={
              results[clampedHighlight]
                ? `omni-search-opt-${results[clampedHighlight].key}`
                : undefined
            }
            aria-label="Search OmniHub"
            placeholder="Search OmniHub…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
            style={{
              flex: 1, height: '100%', background: 'transparent',
              border: 'none', outline: 'none',
              color: T.t1, fontSize: 14,
            }}
          />
          <span style={{ fontSize: 10.3, color: T.t4, background: T.card, padding: '2px 5px', borderRadius: 5, fontWeight: 600 }}>Esc</span>
        </div>
        <div
          id="omni-search-results"
          role="listbox"
          aria-label="Search results"
          style={{ maxHeight: 'min(48vh, 396px)', overflowY: 'auto', padding: 6 }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '16px 12px', color: T.t3, fontSize: 13 }}>
              No OmniHub surface matches “{query}”.
            </div>
          ) : (
            results.map((t, i) => (
              <div
                key={t.key}
                id={`omni-search-opt-${t.key}`}
                role="option"
                aria-selected={i === clampedHighlight}
                data-testid={`omni-search-result-${t.key}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openTarget(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  minHeight: 44, padding: '0 10px', borderRadius: 9,
                  cursor: 'pointer', fontSize: 13.4, color: T.t1,
                  background: i === clampedHighlight ? T.card : 'transparent',
                  border: `1px solid ${i === clampedHighlight ? T.border : 'transparent'}`,
                }}
              >
                <span style={{ flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 10.6, color: T.t4 }}>Open</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
