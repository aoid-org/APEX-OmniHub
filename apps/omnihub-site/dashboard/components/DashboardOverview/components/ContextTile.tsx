import { memo } from 'react';
import { motion } from 'framer-motion';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import { useOmniSlateStore } from '../../../../src/stores/omniSlateStore';
import type { OmniSlateContextItem, OmniSlateHealth } from '../../../types/context.types';

const HC: Record<OmniSlateHealth, { border: string; bg: string; text: string; shadow?: string }> = {
  healthy: { border: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.05)', text: '#34d399', shadow: '0 0 10px rgba(16, 185, 129, 0.1)' },
  warning: { border: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.05)', text: '#facc15', shadow: '0 0 10px rgba(245, 158, 11, 0.1)' },
  broken: { border: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.05)', text: '#f87171', shadow: '0 0 10px rgba(239, 68, 68, 0.1)' },
  unknown: { border: 'rgba(148, 163, 184, 0.4)', bg: 'rgba(148, 163, 184, 0.05)', text: '#94a3b8' },
};

interface ContextTileProps {
  readonly ctx: OmniSlateContextItem;
  readonly activeInsight: string | null;
  readonly onToggle: (id: string) => void;
}

export const ContextTile = memo(function ContextTile({
  ctx,
  activeInsight,
  onToggle,
}: ContextTileProps) {
  const ch = HC[ctx.health] || HC.unknown;
  const isOpen = activeInsight === ctx.id;
  const removeContext = useOmniSlateStore(st => st.removeContext);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeContext(ctx.id);
  };

  return (
    <motion.div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      drag
      dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
          background: ch.bg,
          border: `1.5px solid ${ch.border}`,
          color: ch.text,
          boxShadow: ch.shadow,
          fontFamily: 'inherit',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => onToggle(ctx.id)}
          style={{
            padding: '5px 10px',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {ctx.iconUrl ? (
            <img src={ctx.iconUrl} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} />
          ) : (
            <span style={{ opacity: 0.7 }}>{ctx.kind === 'file' ? '📄' : ctx.kind === 'link' ? '🔗' : '🧩'}</span>
          )}
          <span style={{ maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ctx.label}
          </span>
        </button>
        <button
          type="button"
          data-testid={`remove-chip-${ctx.id}`}
          onClick={handleRemove}
          style={{
            padding: '5px 8px',
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderLeft: `1px solid ${ch.border}`,
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          ✕
        </button>
      </div>
      {isOpen && ctx.failureReason && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            zIndex: 10,
            padding: '8px 12px',
            borderRadius: 8,
            minWidth: 220,
            background: '#0f172a',
            border: `1px solid ${ch.border}`,
            fontSize: 12,
            color: '#cbd5e1',
            lineHeight: 1.5,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={lightbulbIcon}
            alt=""
            style={{
              width: 12,
              height: 12,
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          />
          {ctx.failureReason}
        </motion.div>
      )}
    </motion.div>
  );
});
