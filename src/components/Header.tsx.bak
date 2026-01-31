import { Link } from 'react-router-dom';
import apexHeaderLogo from '@/assets/apex-header-logo.png';
import { Button } from '@/components/ui/button';
import { Moon, ShieldCheck } from 'lucide-react';

export const Header = () => {
  return <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="max-w-[calc(1280px+0.6cm)] mx-auto px-4 h-[61.6px] flex items-center justify-between">
      {/* Center - Wordmark */}
      <div className="flex items-center">
        <img
          src={apexHeaderLogo}
          alt="APEX OmniHub"
          className="h-8 w-auto object-contain transition-transform duration-300 hover:scale-[1.02]"
        />
      </div>

      {/* Right group */}
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[hsl(var(--navy))]">
          <Link to="/demo" className="hover:text-[hsl(var(--navy-600))] transition-colors">Demo</Link>
          <Link to="/tech-specs" className="hover:text-[hsl(var(--navy-600))] transition-colors">Tech Specs</Link>
          <Link to="/request-access" className="hover:text-[hsl(var(--navy-600))] transition-colors">Request Access</Link>
        </nav>

        <div className="flex items-center gap-3 ml-4">
           {/* White Fortress Button */}
           <Button variant="default" size="sm" className="bg-black text-white hover:bg-gray-800 hidden sm:flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" />
             WHITE FORTRESS
           </Button>

           {/* Night Watch Button/Toggle */}
           <Button variant="ghost" size="sm" className="text-[hsl(var(--navy))] hidden sm:flex items-center gap-2">
             <Moon className="w-4 h-4" />
             NIGHT WATCH
           </Button>

           {/* Login Button (Replacing crossed out text) */}
           <Button variant="outline" size="sm" className="border-[hsl(var(--navy))] text-[hsl(var(--navy))] hover:bg-[hsl(var(--navy))/10]">
             LOGIN
           </Button>
        </div>
      </div>
    </div>
  </header>;
};