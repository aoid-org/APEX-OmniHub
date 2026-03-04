import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Blocks, Plus } from 'lucide-react';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';
import { useOmniModal } from '../../../../src/stores/omniModalStore';

type Health = 'green' | 'yellow' | 'red';

interface TileModel {
  readonly key: string;
  readonly label: string;
  readonly category: string;
  readonly status: string;
  readonly syncedMinutesAgo: number;
  readonly health: Health;
  readonly iconPath: string;
}

const FALLBACK_SUGGESTIONS = [
  'Sync degraded connectors and run Guardian audit',
  'Prioritize critical workflows for OmniPort queue',
  'Generate daily executive control-plane summary',
] as const;

const ICON_KEY_MAP: Readonly<Record<string, string>> = {
  omniboard: 'omnidash',
  orchestrator: 'dashboard',
  omniport: 'links',
  maestro: 'automations',
  fortress: 'guardian',
  omniskills: 'aspiral',
  physiomni: 'dashboard',
  audits: 'armageddon',
  links: 'links',
  automations: 'automations',
  workflows: 'dashboard',
  files: 'files',
  billing: 'tradeline',
  settings: 'settings',
};

const toTile = (entry: AppRegistryEntry): TileModel => ({
  key: entry.key,
  label: entry.label,
  category: entry.category,
  status: entry.dashboard.status,
  syncedMinutesAgo: entry.dashboard.syncedMinutesAgo,
  health: entry.healthContext.health,
  iconPath: `/icons/nav/${ICON_KEY_MAP[entry.iconAssetKey] ?? 'omnidash'}.png`,
});

const deriveBorderHealth = (items: readonly TileModel[]): Health => {
  if (items.some((item) => item.health === 'red')) return 'red';
  if (items.some((item) => item.health === 'yellow')) return 'yellow';
  return 'green';
};

export const DashboardOverview = memo(function DashboardOverview({ connectedEco }: { readonly connectedEco: boolean }) {
  const omniModal = useOmniModal();
  const ecosystemTiles = useMemo(() => APP_REGISTRY.map(toTile), []);
  const [integratedTiles, setIntegratedTiles] = useState<readonly TileModel[]>(ecosystemTiles);
  const [showMoreApps, setShowMoreApps] = useState(false);
  const [omniSlateContext, setOmniSlateContext] = useState<readonly TileModel[]>(ecosystemTiles.slice(0, 3));
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [mobileRevealedTile, setMobileRevealedTile] = useState<string | null>(null);

  const suggestions = useMemo(() => FALLBACK_SUGGESTIONS, []);
  const slateHealth = deriveBorderHealth(omniSlateContext);
  const ecosystemPrimary = ecosystemTiles.slice(0, 3);
  const ecosystemOverflow = ecosystemTiles.slice(3);

  const openAddContext = () => {
    omniModal.invoke({
      id: 'add-context',
      provider: 'omnislate',
      type: 'form',
      title: 'Add Context',
      description: 'Attach files and context to OmniSlate.',
      onComplete: async () => Promise.resolve(),
      onCancel: () => undefined,
    });
  };

  const onTileDropToSlate = (tile: TileModel) => {
    if (omniSlateContext.some((ctx) => ctx.key === tile.key)) return;
    setOmniSlateContext((prev) => [tile, ...prev].slice(0, 6));
  };

  const rotateSuggestion = () => {
    setActiveSuggestion((current) => (current + 1) % suggestions.length);
  };

  return (
    <div className="od-dashboard-root">
      <div className="od-hero-grid">
        <section className="od-widget od-agent-widget">
          <p className="od-widget-label">APEX Agent</p>
          <div className="od-agent-orb" />
          <p className="od-agent-text">Guardian listening for policy-safe commands.</p>
        </section>

        <section className={`od-widget od-omnislate od-health-${slateHealth}`}>
          <p className="od-widget-label">OmniSlate</p>
          <button type="button" className="od-suggestion-bar" onClick={rotateSuggestion}>
            Action: {suggestions[activeSuggestion]}
          </button>

          <div className="od-context-row">
            {omniSlateContext.map((tile) => (
              <motion.button
                key={tile.key}
                drag
                dragSnapToOrigin
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.03 }}
                type="button"
                className="od-context-chip"
                onDragEnd={() => onTileDropToSlate(tile)}
              >
                <img src={tile.iconPath} alt={tile.label} className="od-context-chip-icon" />
                <span>{tile.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="od-prompt-row">
            <input type="text" placeholder="Ask APEX Agent" className="od-prompt-input" />
            <button type="button" className="od-input-plus" onClick={openAddContext} aria-label="Add context">
              <Plus size={14} />
            </button>
          </div>
        </section>

        <section className="od-widget">
          <div className="od-ecosystem-header">
            <h2>APEX Ecosystem</h2>
            <p>Integrated Apps</p>
          </div>
          <div className="od-ecosystem-grid">
            {!connectedEco ? (
              <article className="od-tile od-zero-state-tile">
                <div className="od-tile-body">
                  <p>Add APEX App</p>
                  <span>Connect ecosystem providers</span>
                </div>
                <i className="od-health-dot" />
              </article>
            ) : ecosystemPrimary.map((tile) => (
              <motion.article
                key={tile.key}
                drag
                dragSnapToOrigin
                className="od-tile"
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.04 }}
                onDragEnd={() => onTileDropToSlate(tile)}
                onClick={() => setMobileRevealedTile((prev) => (prev === tile.key ? null : tile.key))}
              >
                <img src={tile.iconPath} alt={tile.label} className="od-tile-icon" />
                <div className="od-tile-body">
                  <p>{tile.label}</p>
                  <span>{tile.status}</span>
                </div>
                <i className="od-health-dot" />
                <div className={`od-mobile-reveal${mobileRevealedTile === tile.key ? ' is-visible' : ''}`}>{tile.category}</div>
              </motion.article>
            ))}
          </div>
          {connectedEco && ecosystemOverflow.length > 0 && (
            <button type="button" className="od-more-apps" onClick={() => setShowMoreApps(true)}>
              More apps
            </button>
          )}
        </section>
      </div>

      <section className="apps-hex od-widget">
        <div className="od-integrated-header">
          <h3>Integrated Apps</h3>
          <span>{integratedTiles.length} Apps</span>
        </div>
        <div className="od-integrated-grid">
          {integratedTiles.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <article key={`placeholder-${index}`} className="od-tile od-placeholder-tile">
                <div className="od-placeholder-text">Awaiting OmniBoard Integration</div>
              </article>
            ))
          ) : (
            integratedTiles.map((tile) => (
              <motion.article
                key={tile.key}
                drag
                dragSnapToOrigin
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.04 }}
                className="od-tile"
                onDragEnd={() => onTileDropToSlate(tile)}
                onDoubleClick={() => setIntegratedTiles((prev) => prev.filter((item) => item.key !== tile.key))}
              >
                <img src={tile.iconPath} alt={tile.label} className="od-tile-icon" />
                <div className="od-tile-body">
                  <p>{tile.label}</p>
                  <span>Synced {tile.syncedMinutesAgo}m</span>
                </div>
                <i className="od-health-dot" />
              </motion.article>
            ))
          )}
        </div>
      </section>

      {showMoreApps && (
        <div className="od-modal-overlay" role="dialog" aria-modal="true">
          <div className="od-modal-content">
            <button type="button" className="od-modal-close" onClick={() => setShowMoreApps(false)}>
              ×
            </button>
            <div className="od-more-grid">
              {ecosystemOverflow.map((tile) => (
                <article key={tile.key} className="od-tile">
                  <img src={tile.iconPath} alt={tile.label} className="od-tile-icon" />
                  <div className="od-tile-body">
                    <p>{tile.label}</p>
                    <span>{tile.status}</span>
                  </div>
                  <i className="od-health-dot" />
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="od-zero-state-row">
        <article className="od-tile od-zero-state-tile">
          <Blocks size={20} />
          <div className="od-tile-body">
            <p>Add APEX App</p>
            <span>Connect ecosystem providers</span>
          </div>
          <i className="od-health-dot" />
        </article>
      </section>
    </div>
  );
});
