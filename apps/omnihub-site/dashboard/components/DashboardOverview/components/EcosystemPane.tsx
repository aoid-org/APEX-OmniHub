import { memo, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useOmniDash } from '../../../../src/stores/omniDashStore';
import { SPRING, GLASS_TILE, FONT_SG, ECO_ROW_STYLE, CAT_BADGE_STYLE } from '../constants';
import { LIVE_APEX_APPS } from '../../../contracts/apexApps';

const WIDGET_ID = 'ecosystem-pane';

interface EcosystemPaneProps {
  readonly ecoAppsVisible: boolean;
}

export const EcosystemPane = memo(function EcosystemPane({
  ecoAppsVisible,
}: EcosystemPaneProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const { openWidget, moveWidget, focusWidget } = useOmniDash();
  const widgetState = useOmniDash(st => st.widgets.get(WIDGET_ID));

  const motionX = useMotionValue(widgetState?.position.x ?? 0);
  const motionY = useMotionValue(widgetState?.position.y ?? 0);

  // Register with omniDashStore on mount
  useEffect(() => {
    openWidget(WIDGET_ID, 'APEX Ecosystem', 'ecosystemPane', { x: 0, y: 0 }, { width: 364, height: 468 });
  }, [openWidget]);

  const pos = widgetState?.position;
  // Sync motion values from store when store position changes
  useEffect(() => {
    if (pos) {
      motionX.set(pos.x);
      motionY.set(pos.y);
    }
  }, [pos, motionX, motionY]);

  const handleDragEnd = () => {
    moveWidget(WIDGET_ID, { x: motionX.get(), y: motionY.get() });
  };

  const handlePointerDown = () => {
    focusWidget(WIDGET_ID);
  };

  return (
    <div ref={canvasRef} className="apex-hero-tile-wrapper--sm" style={{ position: 'relative' }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        whileHover={{ scale: 1.01, transition: SPRING }}
        drag
        dragMomentum={false}
        dragConstraints={canvasRef}
        onPointerDown={handlePointerDown}
        onDragEnd={handleDragEnd}
        className={
          'apex-hero-tile apex-hero-tile--sm' +
          ' flex flex-col relative overflow-hidden'
        }
        style={{
          ...GLASS_TILE,
          padding: 20,
          x: motionX,
          y: motionY,
          zIndex: widgetState?.zIndex ?? 100,
          touchAction: 'none',
        }}
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
              LIVE_APEX_APPS.map(app => (
                <motion.div
                  key={app.id}
                  className={
                    'flex flex-row items-center' +
                    ' justify-between w-full p-3' +
                    ' rounded-xl overflow-hidden gap-2'
                  }
                  style={ECO_ROW_STYLE}
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
                        {app.label}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded w-max mt-0.5"
                        style={CAT_BADGE_STYLE}
                      >
                        {app.url}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span
                      className="text-white font-bold text-sm tracking-tight"
                      style={{ fontFamily: FONT_SG }}
                    >
                      ACTIVE
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
