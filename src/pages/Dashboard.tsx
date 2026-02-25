import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, FileText, Zap, Package, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logError } from '@/lib/monitoring';

interface DashboardStats {
  links: number;
  files: number;
  automations: number;
  integrations: number;
}

const Dashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const [linksRes, filesRes, automationsRes, integrationsRes] = await Promise.all([
        supabase.from('links').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('automations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const errors = [linksRes.error, filesRes.error, automationsRes.error, integrationsRes.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors[0]?.message || 'Failed to fetch statistics');
      }

      return {
        links: linksRes.count || 0,
        files: filesRes.count || 0,
        automations: automationsRes.count || 0,
        integrations: integrationsRes.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    retry: 2,
  });

  const statCards = useMemo(() => {
    const defaultStats = { links: 0, files: 0, automations: 0, integrations: 0 };
    const currentStats = stats || defaultStats;
    
    return [
      { title: 'Links', value: currentStats.links, icon: Link2, color: 'text-blue-500' },
      { title: 'Files', value: currentStats.files, icon: FileText, color: 'text-green-500' },
      { title: 'Automations', value: currentStats.automations, icon: Zap, color: 'text-yellow-500' },
      { title: 'Integrations', value: currentStats.integrations, icon: Package, color: 'text-purple-500' },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    logError(error, { action: 'dashboard_stats_fetch', userId: user?.id });
    return (
      <div className="p-6">
        <div className="text-destructive">
          <h2 className="text-xl font-semibold mb-2">Error loading dashboard</h2>
          <p>{error instanceof Error ? error.message : 'Failed to load statistics'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full text-foreground p-6 md:p-8 max-w-7xl mx-auto space-y-10 animate-in">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's your overview.
        </p>
      </div>

      {/* Stats Section */}
      <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Platform Overview</h2>
          <p className="text-sm text-muted-foreground">Your connected resources at a glance</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="bg-card border-border hover:border-orange-500/20 transition-colors overflow-hidden rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default React.memo(Dashboard);