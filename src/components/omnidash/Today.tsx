import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTodayItems, upsertTodayItem } from '@/omnidash/api';
import { useOmniDashSettings } from '@/omnidash/hooks';
import { redactTodayItems } from '@/omnidash/redaction';
import { TodayItem } from '@/omnidash/types';
import { useToast } from '@/components/ui/use-toast';
import { useExecute } from '@/hooks/useExecute';
import { useDemoStore } from '@/stores/demoStore';
import lightbulbIcon from '@/assets/lightbulb-icon.png';

const ApexAgentAvatar = React.lazy(() => import('./ApexAgentAvatar'));

type ItemCategory = 'outcome' | 'outreach' | 'metric';

const getBadgeStyles = (category: string) => {
  if (category === 'outcome') return 'border-emerald-500/50 text-emerald-400';
  if (category === 'outreach') return 'border-sky-500/50 text-sky-400';
  return 'border-amber-500/50 text-amber-400';
};

const INTEGRATED_APPS = [
  { name: 'Salesforce', color: '#38bdf8', status: 'synced' },
  { name: 'HubSpot', color: '#f97316', status: 'synced' },
  { name: 'QuickBooks', color: '#34d399', status: 'synced' },
  { name: 'Stripe', color: '#a78bfa', status: 'synced' },
  { name: 'Slack', color: '#e879f9', status: 'synced' },
  { name: 'Jira', color: '#38bdf8', status: 'synced' },
  { name: 'GitHub', color: '#e2e8f0', status: 'synced' },
  { name: 'Notion', color: '#f8fafc', status: 'synced' },
  { name: 'Zapier', color: '#fb923c', status: 'synced' },
  { name: 'Mailchimp', color: '#fbbf24', status: 'synced' },
  { name: 'Twilio', color: '#f87171', status: 'synced' },
  { name: 'AWS', color: '#fb923c', status: 'synced' },
  { name: 'Google Cloud', color: '#60a5fa', status: 'synced' },
  { name: 'Azure', color: '#38bdf8', status: 'synced' },
  { name: 'Shopify', color: '#4ade80', status: 'synced' },
];

const ECOSYSTEM_APPS = [
  { name: 'aSpiral', desc: 'Autonomous workflow intelligence', status: 'Live' },
  { name: 'TradeLine 24/7', desc: 'Real-time trading orchestration', status: 'Live' },
  { name: 'Armageddon Test', desc: 'Chaos engineering & resilience', status: 'Live' },
];

const OUTCOMES = [
  { rank: 1, title: 'Close 12 invoices', dept: 'Finance', metric: '+$24.6K' },
  { rank: 2, title: 'Sync 48 leads', dept: 'Sales', metric: '+42' },
  { rank: 3, title: 'Resolve 7 tickets', dept: 'Support', metric: '95%' },
];

function useOmniDashTelemetry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const settings = useOmniDashSettings();
  const queryClient = useQueryClient();
  const { isDemo, execute } = useExecute();
  const demoStore = useDemoStore();
  const [newTitle, setNewTitle] = useState('');
  const [category] = useState<ItemCategory>('outcome');

  const itemsQuery = useQuery({
    queryKey: ['omnidash-today', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (isDemo) {
        return demoStore.tasks.slice(0, 3).map(
          (t, i): TodayItem => ({
            id: t.id,
            user_id: 'demo',
            title: t.title,
            next_action: null,
            category: (['outcome', 'outreach', 'metric'][i % 3]) as ItemCategory,
            order_index: i,
            is_active: true,
            power_block_started_at: null,
            power_block_duration_minutes: 90,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        );
      }
      if (!user) throw new Error('User required');
      const data = await fetchTodayItems(user.id);
      return settings.data?.demo_mode ? redactTodayItems(data) : data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error('Title required');
      if (isDemo) {
        await execute('task.create', { title: newTitle.trim(), priority: 'medium', status: 'pending' });
        return;
      }
      if (!user) throw new Error('User missing');
      await upsertTodayItem({
        user_id: user.id,
        title: newTitle.trim(),
        category,
        order_index: (itemsQuery.data?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      setNewTitle('');
      queryClient.invalidateQueries({ queryKey: ['omnidash-today', user?.id] });
    },
  });

  const handleNextAction = async (item: TodayItem) => {
    if (!user) return;
    await upsertTodayItem({
      ...item,
      user_id: user.id,
      next_action: `Next action triggered at ${new Date().toLocaleTimeString()}`,
    });
    queryClient.invalidateQueries({ queryKey: ['omnidash-today', user.id] });
    toast({ title: 'Next action captured', description: item.title });
  };

  return { itemsQuery, addMutation, handleNextAction, newTitle, setNewTitle };
}

export const Today = () => {
  const { itemsQuery, addMutation, handleNextAction, newTitle, setNewTitle } = useOmniDashTelemetry();
  const items = itemsQuery.data;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ═══ HERO HEX ═══ */}
      <section className="hero-hex">
        {/* Agent Column (30%) */}
        <div className="agent-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.12em' }}>
              APEX <span style={{ color: '#94a3b8' }}>AGENT</span>
            </h2>
            <span className="chip-live">Active</span>
          </div>

          <div className="agent-orb">
            <div className="agent-orb-glow" />
            <div className="agent-orb-ring" />
            <div className="agent-orb-ring-2" />
            <div className="agent-orb-avatar">
              <React.Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#0a1628' }} />}>
                <ApexAgentAvatar size="lg" />
              </React.Suspense>
            </div>
          </div>

          <div className="mic-cube" title="Voice input">
            <Mic className="h-4 w-4" style={{ color: '#38bdf8' }} />
          </div>
          <p style={{ fontSize: 9, color: '#475569', marginTop: 8 }}>Hold avatar to change persona</p>
        </div>

        {/* OmniSlate Column (50%) */}
        <div className="slate-col">
          <div className="prompt-canvas" style={{ flex: 1 }}>
            <img src={lightbulbIcon} alt="" className="prompt-canvas-lightbulb" />
            <Input
              placeholder="Type prompt or ask OmniAgent..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !addMutation.isPending) addMutation.mutate();
              }}
              className="bg-transparent border-0 text-slate-300 placeholder:text-slate-600 text-sm h-10 focus-visible:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              onClick={(e) => { e.stopPropagation(); addMutation.mutate(); }}
              disabled={addMutation.isPending || !newTitle.trim()}
              size="sm"
              className="absolute bottom-4 right-4 h-8 w-8 rounded-full p-0 bg-sky-500/20 border border-sky-500/30 hover:bg-sky-500/30"
            >
              <Plus className="h-4 w-4" style={{ color: '#38bdf8' }} />
            </Button>
          </div>

          <div className="slate-tiles">
            <span className="slate-tile" style={{ borderColor: 'rgba(52,211,153,0.4)', color: '#34d399', background: 'rgba(52,211,153,0.08)' }}>
              QuickBooks
            </span>
            <span className="slate-tile" style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}>
              Salesforce
            </span>
            <span className="slate-tile" style={{ borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8', background: 'rgba(56,189,248,0.08)' }}>
              Stripe
            </span>
          </div>
        </div>

        {/* Outcomes Column (20%) */}
        <div className="outcomes-col">
          {(items && items.length > 0 ? items.slice(0, 3) : OUTCOMES).map((item, idx) => {
            const isReal = 'id' in item;
            const title = isReal ? (item as TodayItem).title : (item as typeof OUTCOMES[0]).title;
            const category = isReal ? (item as TodayItem).category : undefined;
            const dept = !isReal ? (item as typeof OUTCOMES[0]).dept : undefined;
            const metric = !isReal ? (item as typeof OUTCOMES[0]).metric : undefined;
            const rank = !isReal ? (item as typeof OUTCOMES[0]).rank : idx + 1;

            return (
              <div key={isReal ? (item as TodayItem).id : idx} className="outcome-cube">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'rgba(56,189,248,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#38bdf8',
                  }}>
                    {rank}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {category ? (
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 capitalize ${getBadgeStyles(category)}`}>
                      {category}
                    </Badge>
                  ) : (
                    <span style={{ fontSize: 10, color: '#64748b' }}>{dept}</span>
                  )}
                  {metric && <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>{metric}</span>}
                  {isReal && !(item as TodayItem).next_action && (
                    <button
                      type="button"
                      onClick={() => handleNextAction(item as TodayItem)}
                      style={{ fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Set Target →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ INTEGRATED APPS HEX ═══ */}
      <section className="apps-hex">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Integrated Apps</h3>
          <span style={{ fontSize: 10, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            Synced 5m ago
          </span>
        </div>
        <div className="apps-grid">
          {INTEGRATED_APPS.map((app) => (
            <div key={app.name} className="app-tile">
              <span className="app-dot" style={{ background: app.color }} />
              {app.name}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ APEX ECOSYSTEM HEX ═══ */}
      <section className="eco-hex">
        {ECOSYSTEM_APPS.map((app) => (
          <div key={app.name} className="eco-cube">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{app.name}</h4>
              <span className="chip-live">{app.status}</span>
            </div>
            <p style={{ fontSize: 11, color: '#64748b' }}>{app.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Today;
