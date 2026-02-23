import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Play, Pause, Activity, Shield, Database, LineChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTodayItems, upsertTodayItem, updateSettings } from '@/omnidash/api';
import { useOmniDashSettings } from '@/omnidash/hooks';
import { redactTodayItems } from '@/omnidash/redaction';
import { TodayItem } from '@/omnidash/types';
import { useToast } from '@/components/ui/use-toast';
import { useExecute } from '@/hooks/useExecute';
import { useDemoStore } from '@/stores/demoStore';
import { OmniTraceFeed } from '@/components/dashboard/OmniTraceFeed';
// Removed react-grid-layout imports

const getBadgeStyles = (category: string) => {
  if (category === 'outcome') return 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400';
  if (category === 'outreach') return 'border-sky-500/50 text-sky-600 dark:text-sky-400';
  return 'border-amber-500/50 text-amber-600 dark:text-amber-400';
};



export const Today = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const settings = useOmniDashSettings();
  const queryClient = useQueryClient();
  const { isDemo, execute } = useExecute();
  const demoStore = useDemoStore();
  const [newTitle, setNewTitle] = useState('');
  const [category, setCategory] = useState<'outcome' | 'outreach' | 'metric'>('outcome');

  const itemsQuery = useQuery({
    queryKey: ['omnidash-today', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (isDemo) {
        return demoStore.tasks.slice(0, 3).map((t, i): TodayItem => ({
          id: t.id,
          user_id: 'demo',
          title: t.title,
          next_action: null,
          category: ['outcome', 'outreach', 'metric'][i % 3] as 'outcome' | 'outreach' | 'metric',
          order_index: i,
          is_active: true,
          power_block_started_at: null,
          power_block_duration_minutes: 90,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
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
        await execute('task.create', {
          title: newTitle.trim(),
          priority: 'medium',
          status: 'pending'
        });
        return;
      }
      if (!user) throw new Error('User missing');
      const payload: Partial<TodayItem> & { user_id: string; title: string } = {
        user_id: user.id,
        title: newTitle.trim(),
        category,
        order_index: (itemsQuery.data?.length || 0) + 1,
      };
      await upsertTodayItem(payload);
    },
    onSuccess: () => {
      setNewTitle('');
      queryClient.invalidateQueries({ queryKey: ['omnidash-today', user?.id] });
    },
  });


  const powerBlockActive = !!settings.data?.power_block_started_at;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!powerBlockActive || !settings.data) {
      setRemaining(null);
      return;
    }
    const start = new Date(settings.data.power_block_started_at as string).getTime();
    const durationMs = (settings.data.power_block_duration_minutes ?? 90) * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, durationMs - elapsed);
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [powerBlockActive, settings.data]);

  const startPowerBlock = async () => {
    if (!user) return;
    await updateSettings(user.id, { power_block_started_at: new Date().toISOString() });
    await settings.refetch();
  };

  const stopPowerBlock = async () => {
    if (!user) return;
    await updateSettings(user.id, { power_block_started_at: null });
    await settings.refetch();
  };

  const formattedRemaining = useMemo(() => {
    if (remaining === null) return '90:00';
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [remaining]);

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

  return (
    <div className="py-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto">
        <div>
          <Card className="glass-card hover-lift animate-in border-l-4 border-l-accent rounded-2xl h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Top 3 Outcomes</CardTitle>
              <CardDescription>Today's focus with a single next action each.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="grid gap-3">
                {itemsQuery.data?.map((item) => (
                  <div 
                    key={item.id} 
                    className="border rounded-xl p-3 flex flex-col gap-2 hover:bg-accent/5 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className={`capitalize shrink-0 ${getBadgeStyles(item.category)}`}>
                          {item.category}
                        </Badge>
                        <span className="font-semibold text-sm truncate">{item.title}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleNextAction(item); }} className="shrink-0 text-xs h-7">
                        Next Action
                      </Button>
                    </div>
                    {item.next_action && (
                      <p className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                        {item.next_action}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col xl:flex-row gap-2 pt-2">
                <Input
                  placeholder="Add outcome/outreach/metric"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !addMutation.isPending) addMutation.mutate();
                  }}
                  className="flex-1 h-9"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-2">
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                    <SelectTrigger className="w-28 h-9" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="Cat." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outcome">Outcome</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="metric">Metric</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); addMutation.mutate(); }} 
                    disabled={addMutation.isPending || !newTitle.trim()}
                    className="btn-accent-gradient h-9 px-4 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Telemetry Wrapper */}
        <div className="lg:col-span-1 space-y-6">
          {/* APEX Power Block */}
          <div key="powerblock">
            <Card className="border-[hsl(var(--accent))]/30 bg-background/50 backdrop-blur-md shadow-lg h-full glass-card hover-lift cancel-drag">
            <CardHeader className="py-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-accent" /> Power Block
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between pb-4">
              <div className="text-left">
                <p className={`font-bold tabular-nums transition-all ${powerBlockActive ? 'text-5xl text-accent' : 'text-4xl text-muted-foreground'}`}>
                  {formattedRemaining}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); startPowerBlock(); }} disabled={powerBlockActive}>
                  <Play className="h-3 w-3 mr-1" /> Start
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); stopPowerBlock(); }} disabled={!powerBlockActive}>
                  <Pause className="h-3 w-3 mr-1" /> Stop
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Telemetry Stream */}
          <div key="telemetry">
            <Card className="glass-card hover-lift overflow-hidden h-full cancel-drag">
             <CardHeader className="p-4 pb-2 border-b border-white/5 bg-[#121622]/50">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[hsl(var(--accent))]" />
                  <CardTitle className="text-sm font-semibold text-gray-200">System Telemetry</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-400">CPU Usage</span>
                   <span className="text-gray-200 font-mono font-medium">12.4%</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-400">Memory (Heap)</span>
                   <span className="text-gray-200 font-mono font-medium">842 MB / 4 GB</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-400">Active Connects</span>
                   <span className="text-[hsl(var(--accent))] font-mono font-semibold">14,204</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-400">DB Latency</span>
                   <span className="text-emerald-400 font-mono font-medium">8ms</span>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* OmniTrace Event Log */}
        <div key="omnitrace" className="lg:col-span-2">
          <div className="h-full">
            <OmniTraceFeed maxItems={4} />
          </div>
        </div>

        <div>
          <Card className="glass-card hover-lift bg-[#120D1A]/90 border-purple-900/30 rounded-2xl h-full">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-purple-400">
                <LineChart className="h-4 w-4" /> Analytics Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Daily Active Users</span>
                  <span className="text-sm font-medium text-gray-200">1,248</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width: '74%'}}></div></div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-400">Workflow Execution</span>
                  <span className="text-sm font-medium text-gray-200">8.4k</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: '92%'}}></div></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card hover-lift bg-[#0A141A]/90 border-cyan-900/30 rounded-2xl h-full">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-cyan-400">
                <Shield className="h-4 w-4" /> Security Audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-cyan-950/50 border border-cyan-900/50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Zero Trust Active</p>
                  <p className="text-[10px] text-gray-500">All gateways secured</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white/5 rounded-md p-2 text-center">
                  <span className="block text-xs text-gray-400 mb-0.5">Threats</span>
                  <span className="text-sm font-bold text-emerald-500">0 Blocked</span>
                </div>
                <div className="bg-white/5 rounded-md p-2 text-center">
                  <span className="block text-xs text-gray-400 mb-0.5">Auth Fixes</span>
                  <span className="text-sm font-bold text-gray-200">Last 24h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card hover-lift bg-[#1A100A]/90 border-orange-900/30 rounded-2xl h-full">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-orange-400">
                <Database className="h-4 w-4" /> Knowledge Graph
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Database className="h-4 w-4 text-orange-500/70" />
                     <span className="text-sm text-gray-300">Vector Store</span>
                   </div>
                   <span className="text-xs font-medium text-orange-200">14.2 GB</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Database className="h-4 w-4 text-rose-500/70" />
                     <span className="text-sm text-gray-300">SQL Relational</span>
                   </div>
                   <span className="text-xs font-medium text-rose-200">2.1 GB</span>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Today;

