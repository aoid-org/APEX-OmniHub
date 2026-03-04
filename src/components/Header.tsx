import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import apexHeaderLogo from '@/assets/apex-header-logo.png';
import { cn } from '@/lib/utils';

export const Header = memo(function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[calc(1280px+0.6cm)] mx-auto px-4 h-[61.6px] flex items-center justify-between relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[95%] flex items-center">
          <img
            src={apexHeaderLogo}
            alt="APEX OmniHub"
            className="h-full w-auto object-contain py-1 transition-transform duration-300 hover:scale-[1.02]"
          />
        </div>

        <button
          type="button"
          className="md:hidden text-xs font-semibold border border-border rounded px-3 py-1.5"
          onClick={() => setDrawerOpen((prev) => !prev)}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          aria-label="Toggle navigation"
        >
          Menu
        </button>

        <div className="hidden md:flex items-center gap-4 ml-auto">
          <Link
            to="/tech-specs"
            className="text-sm font-medium text-[hsl(var(--navy))] hover:text-[hsl(var(--navy-600))] transition-colors"
          >
            Tech Specs
          </Link>
          <Link
            to="/founder-story"
            className={cn(
              'font-mono text-[0.55rem] tracking-[0.14em] uppercase px-[0.85em] py-[0.35em]',
              'border border-apex-orange/[0.22] rounded-[3px]',
              'bg-apex-orange/[0.08] text-apex-orange2',
              'transition-colors duration-150',
              'hover:bg-apex-orange hover:text-white hover:border-apex-orange',
            )}
          >
            Founder&apos;s Story
          </Link>
          <Link
            to="/auth"
            className="text-sm font-medium bg-[hsl(var(--navy))] hover:bg-[hsl(var(--navy-600))] text-white px-4 py-2 rounded-md transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {drawerOpen && (
        <div id="mobile-nav-drawer" className="md:hidden border-t bg-background px-4 py-3 flex flex-col gap-2">
          <Link
            to="/tech-specs"
            className="py-[0.65rem] border-b border-border/40 text-[0.9rem] font-medium"
            onClick={closeDrawer}
          >
            Tech Specs
          </Link>
          <Link
            to="/founder-story"
            className="text-apex-orange2 py-[0.65rem] border-b border-apex-teal/10 flex items-center justify-between text-[0.9rem] font-medium"
            onClick={closeDrawer}
          >
            Founder&apos;s Story
            <span className="font-mono text-[0.5rem] tracking-[0.14em] uppercase px-[0.6em] py-[0.22em] bg-apex-orange/[0.08] border border-apex-orange/[0.22] text-apex-orange2 rounded-[2px]">
              New
            </span>
          </Link>
          <Link
            to="/auth"
            className="py-[0.65rem] text-[0.9rem] font-medium"
            onClick={closeDrawer}
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
});
