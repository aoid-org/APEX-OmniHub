import React from 'react';

export default function ApexAgentAvatar() {
  return (
    <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden">
       {/* Use high fidelity avatar asset if specified, else generic SVG */}
       <svg className="w-16 h-16 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
         <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
         <path d="M12 12 21.1 4.9" />
         <path d="M12 12 2.9 4.9" />
         <path d="M12 12 4.9 21.1" />
         <path d="M12 12 21.1 19.1" />
         <circle cx="12" cy="12" r="3" fill="currentColor"/>
       </svg>
       <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--accent))]/20 to-transparent pointer-events-none" />
       {/* Scanner line */}
       <div className="absolute top-0 left-0 w-full h-[2px] bg-[hsl(var(--accent))] opacity-50 shadow-[0_0_10px_hsl(var(--accent))] animate-[scan_3s_ease-in-out_infinite]" />
    </div>
  );
}
