import React, { memo, useState, useEffect } from 'react';
import navigatorAvatar from '../../src/assets/avatars/navigator-avatar-icon.png';
import companionAvatar from '../../src/assets/avatars/companion-avatar-icon.png';
import sentinelAvatar from '../../src/assets/avatars/sentinel-avatar-icon.png';
import pulseAvatar from '../../src/assets/avatars/pulse-avatar-icon.png';
import type { AgentPersona } from './PersonaModal';

interface ApexAgentAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  showStatus?: boolean;
}

const AVATAR_MAP: Record<AgentPersona, string> = {
  Navigator: navigatorAvatar,
  Companion: companionAvatar,
  Sentinel: sentinelAvatar,
  Pulse: pulseAvatar,
};

const SIZE_CLASSES = {
  sm: { container: 'w-10 h-10', image: 'w-7 h-7', status: 'w-2.5 h-2.5' },
  md: { container: 'w-16 h-16', image: 'w-12 h-12', status: 'w-3 h-3' },
  lg: { container: 'w-24 h-24', image: 'w-20 h-20', status: 'w-4 h-4' },
  xl: { container: 'w-28 h-28', image: 'w-24 h-24', status: 'w-4 h-4' },
};

/**
 * ApexAgentAvatar — Displays the current agent persona avatar with status indicator.
 * Reads persona from localStorage and renders the corresponding avatar image.
 *
 * APEX REGRESSION SHIELD: Avatar images lazy-loaded, persona persisted in localStorage
 */
const ApexAgentAvatar: React.FC<ApexAgentAvatarProps> = memo(
  ({ size = 'md', onClick, showStatus = true }) => {
    const [currentPersona, setCurrentPersona] = useState<AgentPersona>('Navigator');

    useEffect(() => {
      const savedPersona = localStorage.getItem('apex.agent.persona') as AgentPersona;
      if (savedPersona && savedPersona in AVATAR_MAP) {
        setCurrentPersona(savedPersona);
      }

      // Listen for persona changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'apex.agent.persona' && e.newValue) {
          setCurrentPersona(e.newValue as AgentPersona);
        }
      };

      globalThis.addEventListener('storage', handleStorageChange);
      return () => globalThis.removeEventListener('storage', handleStorageChange);
    }, []);

    const sizeClass = SIZE_CLASSES[size];
    const avatarSrc = AVATAR_MAP[currentPersona];

    return (
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`relative flex items-center justify-center ${sizeClass.container} ${
          onClick ? 'cursor-pointer group' : 'cursor-default'
        }`}
        title={onClick ? 'Click to change agent persona' : currentPersona}
      >
        {/* Pulsing ring */}
        <div
          className={`absolute inset-0 rounded-full bg-[#c2501f]/20 ${
            onClick ? 'group-hover:bg-[#c2501f]/30' : ''
          } animate-pulse transition-all`}
        />

        {/* Avatar ring border */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-[#c2501f]/30 ${
            onClick ? 'group-hover:border-[#c2501f]/60' : ''
          } transition-all`}
        >
          <div className="absolute inset-0 rounded-full border border-slate-700/50 animate-[spin_12s_linear_infinite]" />
        </div>

        {/* Avatar image */}
        <div
          className={`relative ${sizeClass.image} rounded-full overflow-hidden bg-[#0a1628] flex items-center justify-center shadow-lg`}
        >
          <img
            src={avatarSrc}
            alt={`${currentPersona} avatar`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Status indicator */}
        {showStatus && (
          <div
            className={`absolute bottom-0 right-0 ${sizeClass.status} rounded-full bg-emerald-400 border-2 border-[#060d1a] shadow-[0_0_8px_rgba(16,185,129,0.6)]`}
            title="Agent active"
          />
        )}

        {/* Hover hint */}
        {onClick && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Change persona
          </div>
        )}
      </button>
    );
  }
);

ApexAgentAvatar.displayName = 'ApexAgentAvatar';

export default ApexAgentAvatar;
