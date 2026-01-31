import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { AppTile, AppData } from '@/components/AppTile';
const placeholderIcon = '/placeholder.svg';

const Index = () => {
  const navigate = useNavigate();
  const { isInstallable, installPWA } = usePWAInstall();

  const handlePWAInstall = () => {
    installPWA();
    toast.success('Installing APEX App...');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleOpenUrl = (url: string) => {
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        navigate('/auth');
      }
    };
    globalThis.addEventListener('keydown', handleKeyPress);
    return () => globalThis.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const scrollToApps = () => {
    document.getElementById('apps-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  const apps: AppData[] = [
    { name: 'TradeLine 24/7', icon: placeholderIcon, alt: 'TradeLine 24/7 app icon', url: 'https://tradeline247ai.com' },
    { name: 'Built Canadian', icon: placeholderIcon, alt: 'Built Canadian app icon', path: '/apps/built-canadian' },
    { name: 'AutoRepAi', icon: placeholderIcon, alt: 'AutoRepAi app icon', url: 'https://autorepai.ca' },
    { name: 'FLOWBills', icon: placeholderIcon, alt: 'FLOWBills app icon', url: 'https://flowbills.ca' },
    { name: 'RobuxMinerPro', icon: placeholderIcon, alt: 'RobuxMinerPro app icon', url: 'https://robuxminer.pro' },
    { name: 'APEX', icon: placeholderIcon, alt: 'APEX app icon', path: '/dashboard' },
    { name: 'StrideGuide', icon: placeholderIcon, alt: 'StrideGuide app icon', url: 'https://strideguide.cam' },
    { name: 'KeepSafe', icon: placeholderIcon, alt: 'KeepSafe icon', url: 'https://keepsafe.icu' },
    { name: 'JubeeLove', icon: placeholderIcon, alt: 'JubeeLove icon', url: 'https://jubee.love' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      {/* Hero Section */}
      <section className="px-4 py-12 md:py-16 lg:py-20 pt-16 md:pt-20 lg:pt-24 relative overflow-hidden">
        {/* Grid Background Effect (Simulated) */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left Column - Content */}
            <div className="max-w-[600px] space-y-6 lg:space-y-8">
              {/* Move Up Fix: Negative margin or reduced padding applied to container above */}
              <div className="space-y-2 -mt-8 md:-mt-12">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.9] tracking-tight text-[hsl(var(--navy))]">
                  Intelligence<br />
                  <span className="text-[hsl(var(--navy-600))]">Designed</span>
                </h1>
              </div>

              {/* Visual Hierarchy Section */}
              <div className="space-y-4 border-l-2 border-primary/20 pl-6 py-2">
                <p className="text-sm font-serif italic text-muted-foreground">
                  It Sees You
                </p>
                <p className="text-sm font-bold tracking-[0.2em] text-primary/80">
                  DIRECTABLE • ACCOUNTABLE • DEPENDABLE
                </p>
                <p className="text-xl md:text-2xl font-light leading-relaxed text-foreground">
                  Welcome to the future of <span className="font-medium text-primary">workflow automation</span> and <span className="font-medium text-primary">business intelligence</span>.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                  Understand Everything. Communicate Anything, to Every Platform.
                  OmniHub is your universal translator and orchestrator, connecting AI,
                  enterprise systems, and Web3 through a single controlled port.
                </p>

                {/* CTA Buttons - Fix Contrast */}
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <Button
                    size="lg"
                    onClick={scrollToApps}
                    className="bg-[hsl(var(--navy))] text-white hover:bg-[hsl(var(--navy-600))] h-12 px-8 shadow-lg transition-all hover:scale-105"
                  >
                    Get Started
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 px-6 hover:bg-transparent hover:underline"
                    onClick={() => handleNavigate('/demo')}
                  >
                    Watch Demo
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - App Icon Grid */}
            <div className="relative isolate">
               {/* Central "Eye" Glow Effect */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-[500px] mx-auto filter drop-shadow-xl transform perspective-1000">
                {apps.map((app, index) => (
                  <AppTile
                    key={index}
                    app={app}
                    isInstallable={isInstallable}
                    onInstall={handlePWAInstall}
                    onNavigate={handleNavigate}
                    onOpenUrl={handleOpenUrl}
                    variant="small"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section id="apps-grid" className="px-4 py-16 md:py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[hsl(var(--navy))] mb-12">
            Our Applications
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {apps.map((app, index) => (
              <AppTile
                key={index}
                app={app}
                isInstallable={isInstallable}
                onInstall={handlePWAInstall}
                onNavigate={handleNavigate}
                onOpenUrl={handleOpenUrl}
                variant="large"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © APEX Business Systems
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
