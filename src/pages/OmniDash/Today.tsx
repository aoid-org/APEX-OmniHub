import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Play, Pause, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTodayItems, restartRitual, upsertTodayItem, updateSettings } from '@/omnidash/api';
import { useOmniDashSettings } from '@/omnidash/hooks';
import { redactTodayItems } from '@/omnidash/redaction';
import { TodayItem } from '@/omnidash/types';
import { useToast } from '@/components/ui/use-toast';
import { useExecute } from '@/hooks/useExecute';
import { useDemoStore } from '@/stores/demoStore';

type BadgeCategory = 'outcome' | 'outreach' | 'metric';

const getBadgeStyles = (category: BadgeCategory) => {
  switch (category) {
    case 'outcome': return 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400';
    case 'outreach': return 'border-sky-500/50 text-sky-600 dark:text-sky-400';
    default: return 'border-amber-500/50 text-amber-600 dark:text-amber-400';
  }
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
        // Map demo tasks to TodayItems
        return demoStore.tasks.slice(0, 3).map((t, i) => ({
          id: t.id,
          user_id: 'demo',
          title: t.title,
          category: ['outcome', 'outreach', 'metric'][i % 3] as 'outcome' | 'outreach' | 'metric',
          order_index: i,
          status: t.status === 'completed' ? 'completed' : 'pending',
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

  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User missing');
      await restartRitual(user.id);
    },
    onSuccess: () => {
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
    <div className="space-y-6">
      <Card className="glass-card hover-lift animate-in border-l-4 border-l-accent rounded-2xl">
        <CardHeader>
          <CardTitle>Top 3 Outcomes</CardTitle>
          <CardDescription>Today's focus with a single next action each.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {itemsQuery.data?.map((item) => (
              <div 
                key={item.id} 
                className="border rounded-xl p-4 flex flex-col gap-3 hover:bg-accent/5 transition-colors duration-200"
              >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge 
                      variant="outline" 
                      className={`capitalize shrink-0 ${getBadgeStyles(item.category)}`}
                    >
                      {item.category}
                    </Badge>
                    <span className="font-semibold truncate">{item.title}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleNextAction(item)}
                    className="shrink-0"
                  >
                    Next Action
                  </Button>
                </div>
                {item.next_action && (
                  <p className="text-sm text-muted-foreground pl-2 border-l-2 border-muted">
                    {item.next_action}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Add outcome/outreach/metric"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !addMutation.isPending) {
                  addMutation.mutate();
                }
              }}
              className="flex-1"
            />
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outcome">Outcome</SelectItem>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="metric">Metric</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => addMutation.mutate()} 
              disabled={addMutation.isPending || !newTitle.trim()}
              className="btn-accent-gradient w-full md:w-auto px-6 rounded-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button
              variant="ghost"
              onClick={() => restartMutation.mutate()}
              disabled={restartMutation.isPending}
              className="w-full md:w-auto opacity-60 hover:opacity-100"
            >
              <RefreshCcw className="h-4 w-4 mr-1" /> Restart
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`glass-card animate-in-delay-1 border-t-4 border-t-accent rounded-2xl ${powerBlockActive ? 'timer-active' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Power Block
          </CardTitle>
          <CardDescription>90-minute focus block with start/stop controls.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
            <div className="text-center md:text-left">
              <p className={`font-bold tabular-nums transition-all ${powerBlockActive ? 'text-6xl text-accent' : 'text-5xl text-muted-foreground'}`}>
                {formattedRemaining}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {powerBlockActive ? 'Power block running' : 'Not started'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-center md:justify-end">
            <Button 
              onClick={startPowerBlock} 
              disabled={powerBlockActive}
              className="px-6"
            >
              <Play className="h-4 w-4 mr-2" /> Start
            </Button>
            <Button 
              variant="outline" 
              onClick={stopPowerBlock} 
              disabled={!powerBlockActive}
              className="px-6"
            >
              <Pause className="h-4 w-4 mr-2" /> Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Today;

