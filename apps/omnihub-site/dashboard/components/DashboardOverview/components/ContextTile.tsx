import { memo } from 'react';
import { motion } from 'framer-motion';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import { HC } from '../constants';
import type { ContextItem } from '../../../types/context.types';

interface ContextTileProps {
  readonly ctx: ContextItem;
  readonly activeInsight: string | null;
  readonly onToggle: (name: string) => void;
}

export const ContextTile = memo(function ContextTile({
  ctx,
  activeInsight,
  onToggle,
}: ContextTileProps) {
  const ch = HC[ctx.health];
  const isOpen = activeInsight === ctx.name;

  return (
    <motion.div
      style={{ position: 'relative' }}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      drag
      dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
    >
      <button
        type="button"
        onClick={() => onToggle(ctx.name)}
        style={{
          fontSize: 13,
          fontWeight: 700,
          padding: '5px 14px',
          borderRadius: 10,
          background: ch.bg,
          border: `1.5px solid ${ch.border}`,
          color: ch.text,
          cursor: 'pointer',
          boxShadow: ch.shadow,
          fontFamily: 'inherit',
        }}
      >
        {ctx.name}
      </button>
      {isOpen && (
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
          {ctx.insight}
        </motion.div>
      )}
    </motion.div>
  );
});
