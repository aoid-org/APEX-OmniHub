import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { AppTile, AppData } from '@/components/AppTile';
import { HeroBackground } from '@/components/HeroBackground';
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
    document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
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
      <section className="relative px-4 py-24 md:py-32 lg:py-40 pt-20 md:pt-24 lg:pt-28 overflow-hidden bg-gradient-to-b from-[hsl(216,65%,8%)] to-[hsl(216,65%,14%)]">
        <HeroBackground />
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-white drop-shadow-lg">
              Universal Synchronized Orchestrator
            </h1>
            <div className="space-y-4 text-lg md:text-xl text-gray-200">
              <p className="font-semibold text-xl md:text-2xl text-cyan-300">Your systems. Your rules.</p>
              <p>Build your systems so you can change them.</p>
              <p>Connect anything. Change anything. Stay in control.</p>
              <p className="text-base pt-2 text-cyan-200/90">Intelligence Designed. Freedom with structure.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                size="lg"
                onClick={scrollToApps}
                className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-semibold px-8 py-6 text-lg shadow-lg shadow-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-400/50 hover:scale-105"
              >
                Request Access
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-cyan-400/50 text-cyan-100 hover:text-white hover:bg-cyan-950/30 hover:border-cyan-300 backdrop-blur-sm px-8 py-6 text-lg transition-all hover:scale-105"
              >
                View Product
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Freedom Without Fear Section */}
      <section className="px-4 py-16 md:py-20 bg-muted/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[hsl(var(--navy))] mb-12">
            Freedom Without Fear
          </h2>
          <div className="space-y-6 text-lg">
            <div className="flex gap-4">
              <span className="text-[hsl(var(--navy))] font-bold">•</span>
              <p>Connect anything. Bring your apps together without rebuilding.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-[hsl(var(--navy))] font-bold">•</span>
              <p>Change anything. Switch providers when you need to. Your system still holds.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-[hsl(var(--navy))] font-bold">•</span>
              <p>Stay in control. Your rules decide what runs, what pauses, and what gets approved.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Belief Section */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--navy))] mb-8">
            Belief
          </h2>
          <p className="text-lg text-muted-foreground">
            Most platforms ask you to trust them.
          </p>
          <p className="text-lg text-muted-foreground">
            OmniHub helps you trust your own structure.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-4 py-16 md:py-20 bg-muted/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[hsl(var(--navy))] mb-12">
            FAQ
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[hsl(var(--navy))] mb-2">
                Is OmniHub another automation tool?
              </h3>
              <p className="text-muted-foreground">
                No. It is a synchronized control layer that keeps execution under your rules.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[hsl(var(--navy))] mb-2">
                Do I have to replace my stack?
              </h3>
              <p className="text-muted-foreground">
                No. OmniHub connects to what you already use.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[hsl(var(--navy))] mb-2">
                Will I get locked in?
              </h3>
              <p className="text-muted-foreground">
                No. You can change providers without rebuilding your system.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[hsl(var(--navy))] mb-2">
                Who is this for?
              </h3>
              <p className="text-muted-foreground">
                Anyone who wants control, from small teams to large organizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Section (Anchor Target) */}
      <section id="product" className="px-4 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[hsl(var(--navy))] mb-12">
            Our Applications
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
