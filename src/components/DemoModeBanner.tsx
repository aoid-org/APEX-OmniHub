/**
 * DemoModeBanner - Persistent Banner for Demo Mode
 * 
 * Displays a clear indicator when in demo mode with option to log in.
 * "Demo Mode • Local-only • Login to execute live"
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessMode } from '@/contexts/AccessContext';
import { PlayCircle, LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DemoModeBanner: React.FC = () => {
  const { isDemo, disableDemo } = useAccessMode();
  const navigate = useNavigate();

  if (!isDemo) {
    return null;
  }

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleExit = () => {
    disableDemo();
    navigate('/');
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-4 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 backdrop-blur-sm"
      role="banner"
      aria-label="Demo mode indicator"
    >
      <div className="flex items-center gap-2">
        <PlayCircle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Demo Mode
        </span>
        <span className="hidden text-sm text-amber-600/80 dark:text-amber-400/80 sm:inline">
          • Local-only data • Login to execute live
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleLogin}
          size="sm"
          variant="default"
          className="h-7 bg-amber-600 text-white hover:bg-amber-700"
        >
          <LogIn className="mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Log In</span>
        </Button>
        <Button
          onClick={handleExit}
          size="sm"
          variant="ghost"
          className="h-7 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
          aria-label="Exit demo mode"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DemoModeBanner;
