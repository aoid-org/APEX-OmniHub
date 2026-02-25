import React, { memo } from 'react';

/**
 * ApexAgentAvatar — Animated avatar for the APEX AI Agent widget.
 * Renders a pulsing orb with status presence indicator.
 *
 * APEX REGRESSION SHIELD: Lazy-loaded from Today.tsx via React.lazy()
 */
const ApexAgentAvatar: React.FC = memo(() => {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {/* Pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 animate-pulse" />
      {/* Core orb */}
      <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/25 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white tracking-tight select-none">
          Ax
        </span>
      </div>
      {/* Status dot */}
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
    </div>
  );
});

ApexAgentAvatar.displayName = 'ApexAgentAvatar';

export default ApexAgentAvatar;
