/**
 * ComingSoonPage — Graduated module placeholder
 * Premium glassmorphic placeholder for modules under active development.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo } from 'react';
import { Rocket, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComingSoonPageProps {
  readonly title: string;
  readonly desc: string;
}

export const ComingSoonPage = memo(function ComingSoonPage({
  title,
  desc,
}: Readonly<ComingSoonPageProps>) {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate('/omnidash')}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to OmniBoard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-sm text-gray-400 mt-1">{desc}</p>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-10 max-w-lg text-center">
          {/* Corner glow */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-purple-500/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-cyan-500/[0.04] blur-3xl" />

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <Rocket className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Under Development</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            <strong className="text-gray-300">{title}</strong> is being integrated with APEX Core modules.
            This module will be available in a future release.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="h-1 w-8 rounded-full bg-purple-500/30" />
            <div className="h-1 w-6 rounded-full bg-purple-500/20" />
            <div className="h-1 w-4 rounded-full bg-purple-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
});
