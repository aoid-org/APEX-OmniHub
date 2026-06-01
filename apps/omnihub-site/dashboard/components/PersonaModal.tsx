import React from 'react';
import { AVATAR_PATH_MAP } from '../contracts/agentAvatars';

export type AgentPersona = 'Navigator' | 'Companion' | 'Sentinel' | 'Pulse';

interface PersonaModalProps {
  isOpen: boolean;
  currentPersona: AgentPersona;
  onClose: () => void;
  onSelect: (persona: AgentPersona) => void;
}

const PERSONAS = [
  {
    id: 'Navigator' as AgentPersona,
    name: 'Navigator',
    tone: 'Calm & Trustworthy',
    focus: 'Strategic guidance',
    description: 'Long-term planning and decision support for complex business challenges',
    avatar: AVATAR_PATH_MAP.Navigator,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'Companion' as AgentPersona,
    name: 'Companion',
    tone: 'Human & Warm',
    focus: 'Approachable collaboration',
    description: 'Friendly assistance and team coordination for daily operations',
    avatar: AVATAR_PATH_MAP.Companion,
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-500/30',
  },
  {
    id: 'Sentinel' as AgentPersona,
    name: 'Sentinel',
    tone: 'Precise & Vigilant',
    focus: 'Security & compliance',
    description: 'Risk monitoring, threat detection, and regulatory compliance',
    avatar: AVATAR_PATH_MAP.Sentinel,
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'Pulse' as AgentPersona,
    name: 'Pulse',
    tone: 'Fast & Adaptive',
    focus: 'Rapid execution',
    description: 'High-speed workflow automation and real-time task processing',
    avatar: AVATAR_PATH_MAP.Pulse,
    color: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-500/30',
  },
];

const PersonaModal: React.FC<PersonaModalProps> = ({
  isOpen,
  currentPersona,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="persona-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* Backdrop Button */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-default border-none outline-none p-0 m-0"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); }}
        aria-label="Close modal"
        tabIndex={0}
      />

      <dialog
        open
        className="relative bg-[#0a1628] border border-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl animate-in zoom-in-95 duration-200 m-0 text-left"
        aria-label="Choose Agent Persona"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-xl">Choose Agent Persona</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select how your AI agent communicates and behaves
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Persona Grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {PERSONAS.map((persona) => {
            const isSelected = currentPersona === persona.id;
            return (
              <button
                key={persona.id}
                data-testid={`persona-option-${persona.id.toLowerCase()}`}
                onClick={() => onSelect(persona.id)}
                className={`group relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden ${
                  isSelected
                    ? `border-[#c2501f] bg-[#c2501f]/10 shadow-lg shadow-[#c2501f]/20`
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40'
                }`}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
                />

                <div className="relative z-10">
                  {/* Avatar + Title */}
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-14 h-14 rounded-xl border-2 ${persona.borderColor} bg-slate-900/50 p-1 shrink-0 overflow-hidden`}
                    >
                      <img
                        src={persona.avatar}
                        alt={`${persona.name} avatar`}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base">
                        {persona.name}
                      </h3>
                      <p className="text-xs text-slate-500">{persona.tone}</p>
                    </div>
                    {isSelected && (
                      <div className="shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#c2501f] flex items-center justify-center">
                          <i className="fa-solid fa-check text-white text-xs" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Focus
                      </span>
                      <span className="text-xs text-[#c2501f]">{persona.focus}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {persona.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/50">
          <p className="text-[10px] text-slate-600 text-center">
            Persona settings are saved locally and persist across sessions
          </p>
        </div>
      </dialog>
    </div>
  );
};

export default PersonaModal;
