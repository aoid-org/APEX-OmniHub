import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, Sparkles, LineChart, Shield, Lock, 
  MessageCircle, MessageSquare, Mail, Music, Zap, 
  Send, Globe, Smartphone, Bot, Share2, Video, Info
} from 'lucide-react';
import { HiddenValue } from './HiddenMetric';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Mock data definitions matching the screenshots exactly
const ecosystemApps = [
  {
    id: 'aspiral',
    name: 'aSpiral',
    description: 'AI-powered content generation and prompt orchestration.',
    icon: Sparkles,
    iconColor: 'text-purple-400',
    iconBg: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
    status: 'Available',
    action: 'Connect',
  },
  {
    id: 'tradeline',
    name: 'TradeLine 24/7',
    description: 'Real-time financial trading signals and analytics.',
    icon: LineChart,
    iconColor: 'text-orange-400',
    iconBg: 'bg-gradient-to-br from-orange-500/20 to-red-500/20',
    status: 'Available',
    action: 'Connect',
  },
  {
    id: 'armageddon',
    name: 'Armageddon Test Suite',
    description: 'Enterprise-grade automated testing and quality gates.',
    icon: Shield,
    iconColor: 'text-rose-400',
    iconBg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
    status: 'Available',
    action: 'Connect',
  },
  {
    id: 'guardian',
    name: 'APEX Guardian',
    description: 'Security monitoring, threat detection, and governance.',
    icon: Shield,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    status: 'Coming Soon',
  },
  {
    id: 'vault',
    name: 'APEX Vault',
    description: 'Secure file storage with blockchain-verified integrity.',
    icon: Lock,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    status: 'Coming Soon',
  },
];

const onboardApps = [
  { name: 'WhatsApp', desc: 'Business messaging platform', icon: MessageCircle, color: 'text-green-500' },
  { name: 'Facebook', desc: 'Social media integration', icon: Share2, color: 'text-blue-500' },
  { name: 'Messenger', desc: 'Facebook Messenger integration', icon: MessageSquare, color: 'text-blue-400' },
  { name: 'Google Apps', desc: 'Google Workspace integration', icon: Mail, color: 'text-red-500' },
  { name: 'YouTube', desc: 'Video platform integration', icon: Video, color: 'text-red-600' },
  { name: 'Instagram', desc: 'Social media integration', icon: Globe, color: 'text-pink-500' },
  { name: 'TikTok', desc: 'Short video platform', icon: Music, color: 'text-black dark:text-white' },
  { name: 'Zapier', desc: 'Automation platform', icon: Zap, color: 'text-orange-500' },
  { name: 'Klaviyo', desc: 'Email marketing automation', icon: Send, color: 'text-emerald-500' },
  { name: 'Gmail', desc: 'Email service integration', icon: Mail, color: 'text-red-400' },
  { name: 'IONOS.ca', desc: 'Hosting and domain services', icon: Globe, color: 'text-blue-600' },
  { name: 'Webnames.ca', desc: 'Domain management', icon: Globe, color: 'text-cyan-500' },
  { name: 'Samsung Apps', desc: 'Native Samsung integrations', icon: Smartphone, color: 'text-gray-400' },
  { name: 'ChatGPT', desc: 'AI assistant integration', icon: Bot, color: 'text-emerald-400' },
  { name: 'Grok', desc: 'AI assistant by xAI', icon: Bot, color: 'text-white' },
];

export const Integrations = () => {
  const [activeTab, setActiveTab] = useState('All Apps');

  // Generator helper to auto-populate layout positions based on index
  const generateLayouts = (items: { id?: string, name: string }[], colsMap: Record<string, number>): Partial<Record<string, Layout>> => {
    const layouts: Partial<Record<string, Layout>> = {};
    for (const [bp, cols] of Object.entries(colsMap)) {
      layouts[bp] = items.map((item, i) => ({
        i: item.id || item.name,
        x: i % cols,
        y: Math.floor(i / cols),
        w: 1,
        h: 1,
        isResizable: false
      }));
    }
    return layouts;
  };

  const ecosystemCols = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 };
  const onboardCols = { lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 };

  const [ecosystemLayouts, setEcosystemLayouts] = useState<Partial<Record<string, Layout>>>(() => generateLayouts(ecosystemApps, ecosystemCols));
  const [onboardLayouts, setOnboardLayouts] = useState<Partial<Record<string, Layout>>>(() => generateLayouts(onboardApps, onboardCols));

  return (
    <div className="flex flex-col min-h-full bg-[#0A0D14] text-gray-200 p-6 md:p-8 max-w-7xl mx-auto space-y-10 animate-in">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">OmniBoard</h1>
        <p className="text-sm text-gray-400">
          Integrations · Connect external services and APIs to enhance your workflow
        </p>
      </div>

      {/* APEX Ecosystem Section */}
      <section className="bg-[#121622]/80 border border-white/5 rounded-2xl p-6 md:p-8 glass-card">
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">APEX Ecosystem</h2>
            <p className="text-sm text-gray-400">Platform integrations & ecosystem apps</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 tracking-wider">
            <span className="bg-white/10 p-1 rounded">
              <Sparkles className="h-3 w-3" />
            </span>{' '}
            CONNECTED APPS &amp; SERVICES
          </div>

          <div className="flex gap-2">
            {['All Apps', 'Connected', 'Available'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveGridLayout
          className="layout -mx-2"
          layouts={ecosystemLayouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={ecosystemCols}
          rowHeight={150}
          onLayoutChange={(_layout, allLayouts) => setEcosystemLayouts(allLayouts)}
          draggableHandle=".custom-drag-handle"
          margin={[20, 20]}
        >
          {ecosystemApps.map((app) => (
            <div key={app.id}>
              <Card className="bg-[#1A1F2E]/50 border-white/5 hover:border-white/10 transition-colors hover-lift overflow-hidden rounded-xl h-full relative group">
                <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-colors z-20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                <CardContent className="p-3 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${app.iconBg}`}>
                      <app.icon className={`h-4 w-4 ${app.iconColor}`} />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-sm text-white">{app.name}</h3>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors text-[10px] px-2 py-0 rounded-full">
                        <HiddenValue icon={Info} value={
                          <><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5 inline-block" />{app.status}</>
                        } />
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 flex-1 pr-4">{app.description}</p>
                  {app.action && (
                    <Button variant="outline" className="w-full bg-[#0F131D] hover:bg-white/5 border-white/10 text-white rounded-lg h-8 text-xs cancel-drag">
                      <ExternalLink className="h-3 w-3 mr-1.5 opacity-70" />
                      {app.action}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      </section>

      {/* Onboard App Section */}
      <section className="bg-[#0E151A]/80 border border-emerald-900/20 rounded-2xl p-6 md:p-8 glass-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                 <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                 </div>
                 <h2 className="text-lg font-semibold text-white">Onboard App</h2>
             </div>
             <p className="text-sm text-gray-400 ml-7">0 of 15 services connected</p>
          </div>
          <button className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors flex items-center gap-1">
            Browse All <span className="text-lg relative top-[1px] ml-0.5">→</span>
          </button>
        </div>

        <ResponsiveGridLayout
          className="layout -mx-2"
          layouts={onboardLayouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={onboardCols}
          rowHeight={110}
          onLayoutChange={(_layout, allLayouts) => setOnboardLayouts(allLayouts)}
          draggableHandle=".custom-drag-handle"
          margin={[16, 16]}
        >
          {onboardApps.map((app) => (
            <div key={app.name}>
              <Card className="bg-[#141A22]/80 border-white/5 hover:border-white/10 transition-colors hover-lift rounded-xl h-full relative group">
                <div className="custom-drag-handle absolute top-0 right-0 p-3 h-8 w-8 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-colors z-20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                <CardContent className="p-3 flex flex-col justify-between gap-2 h-full">
                  <div className="flex items-center gap-2">
                    <app.icon className={`h-4 w-4 ${app.color}`} />
                    <h3 className="font-semibold text-sm text-white truncate pr-4">{app.name}</h3>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{app.desc}</p>
                  <Button className="w-full bg-white text-black hover:bg-gray-200 rounded-lg h-7 font-semibold text-xs transition-colors shadow-sm cancel-drag">
                    Connect
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      </section>

    </div>
  );
};

export default Integrations;
