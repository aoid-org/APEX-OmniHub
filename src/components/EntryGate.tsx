/**
 * EntryGate - Product-First Entry Point
 * 
 * The first thing users see at "/". Offers two clear paths:
 * 1. "Log In" - For authenticated users
 * 2. "Explore Demo" - For trying the product without auth
 * 
 * Design: Luxury/refined aesthetic with APEX branding.
 * NO GHOST FEATURES - Both buttons are fully functional.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessMode } from '@/contexts/AccessContext';
import { LogIn, PlayCircle, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EntryGate: React.FC = () => {
  const navigate = useNavigate();
  const { enableDemo } = useAccessMode();

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleExploreDemo = () => {
    enableDemo();
    navigate('/omnidash');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black px-4 text-white">
      {/* Ambient glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-violet-500/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold tracking-tight">APEX OmniHub</h1>
            <p className="text-sm text-zinc-400">Business Intelligence Platform</p>
          </div>
        </div>

        {/* Hero Text */}
        <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Your Business.
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Unified. Automated.
          </span>
        </h2>

        <p className="mb-10 max-w-md text-lg text-zinc-400">
          One platform to manage leads, automate workflows, and drive growth.
          Enterprise-grade power. Startup-friendly simplicity.
        </p>

        {/* CTA Buttons */}
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={handleLogin}
            size="lg"
            className="h-14 w-full rounded-xl bg-white text-lg font-semibold text-black transition-all hover:bg-zinc-100 hover:shadow-xl hover:shadow-white/10"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Log In
          </Button>

          <Button
            onClick={handleExploreDemo}
            size="lg"
            variant="outline"
            className="h-14 w-full rounded-xl border-zinc-700 bg-zinc-800/50 text-lg font-semibold text-white transition-all hover:border-zinc-600 hover:bg-zinc-800"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Explore Demo
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex items-center gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>SOC 2 Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>99.9% Uptime</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex items-center gap-4 text-xs text-zinc-600">
        <a href="/privacy" className="transition-colors hover:text-zinc-400">
          Privacy
        </a>
        <span>•</span>
        <a href="/tech-specs" className="transition-colors hover:text-zinc-400">
          Tech Specs
        </a>
        <span>•</span>
        <span>© {new Date().getFullYear()} APEX Business Systems</span>
      </div>
    </div>
  );
};

export default EntryGate;
