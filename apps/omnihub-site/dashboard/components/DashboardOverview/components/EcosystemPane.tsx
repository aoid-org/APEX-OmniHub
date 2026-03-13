import { memo } from 'react';
import { motion } from 'framer-motion';
import { SPRING, GLASS_TILE, FONT_SG, ECO_ROW_STYLE, CAT_BADGE_STYLE } from '../constants';
import { ECOSYSTEM } from '../data';

interface EcosystemPaneProps {
  readonly ecoAppsVisible: boolean;
}

export const EcosystemPane = memo(function EcosystemPane({
  ecoAppsVisible,
}: EcosystemPaneProps) {
  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: 0.1 }}
      whileHover={{ scale: 1.01, transition: SPRING }}
      className={
        'apex-hero-tile apex-hero-tile--sm' +
        ' flex flex-col relative overflow-hidden'
      }
      style={{ ...GLASS_TILE, padding: 20 }}
    >
      <div className="apex-noise-layer" />
      <div className="relative z-10 w-full">
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#e8ecf4',
            marginBottom: 2,
            letterSpacing: '-0.02em',
          }}
        >
          APEX Ecosystem
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#5a6478',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 14,
          }}
        >
          Connected Modules
        </div>
        <div className="flex flex-col gap-2.5 w-full">
          {ecoAppsVisible &&
            ECOSYSTEM.map(app => (
              <motion.div
                key={app.name}
                className={
                  'flex flex-row items-center' +
                  ' justify-between w-full p-3' +
                  ' rounded-xl overflow-hidden gap-2'
                }
                style={ECO_ROW_STYLE}
                drag
                dragConstraints={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
                dragElastic={0.4}
                whileHover={{ scale: 1.02, translateX: 4, rotate: 0.5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="flex flex-row items-center gap-2 min-w-0 flex-1"
                >
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-white text-sm font-semibold truncate"
                    >
                      {app.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded w-max mt-0.5"
                      style={CAT_BADGE_STYLE}
                    >
                      {app.cat}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-white font-bold text-sm tracking-tight"
                    style={{ fontFamily: FONT_SG }}
                  >
                    {app.status}
                  </span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </motion.div>
  );
});
