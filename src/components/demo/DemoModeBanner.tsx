/**
 * DemoModeBanner - Persistent indicator when in demo mode
 * 
 * Shows at top of screen when demo mode is active.
 * Provides button to exit demo mode.
 */

import { memo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAccess } from '@/contexts/AccessContext';
import { Button } from '@/components/ui/button';
import { useDemoStore } from '@/stores/demoStore';

export const DemoModeBanner = memo(function DemoModeBanner() {
  const { isDemo, setDemoMode } = useAccess();
  const resetDemoStore = useDemoStore((state) => state.reset);

  if (!isDemo) return null;

  const handleExitDemo = () => {
    setDemoMode(false);
    resetDemoStore();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Demo Mode — Changes are local only and will not be saved
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExitDemo}
        className="text-amber-950 hover:bg-amber-600 hover:text-amber-50"
      >
        <X className="h-4 w-4 mr-1" />
        Exit Demo
      </Button>
    </div>
  );
});

DemoModeBanner.displayName = 'DemoModeBanner';

/**
 * DemoModeToggle - Button to enter demo mode
 */
export const DemoModeToggle = memo(function DemoModeToggle() {
  const { isDemo, setDemoMode } = useAccess();

  if (isDemo) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setDemoMode(true)}
      className="border-dashed"
    >
      Enter Demo Mode
    </Button>
  );
});

DemoModeToggle.displayName = 'DemoModeToggle';
