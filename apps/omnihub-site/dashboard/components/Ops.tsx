/**
 * @deprecated - This component is currently orphaned and scheduled for wiring or removal.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchIncidents, addIncident } from '@/omnidash/api';
import { useOmniDashSettings, useMemoryHealth } from '@/omnidash/hooks';
import { Incident } from '@/omnidash/types';
import { format } from 'date-fns';
import { HiddenValue } from './HiddenMetric';
import {
  ShieldAlert,
  CheckCircle,
  Info,
  Clock,
  Brain,
  Database,
  Shield,
  Activity,
} from 'lucide-react';

/** Circuit-breaker status indicator */
function circuitBreakerStatus(
  errorRate: number,
): { label: string; color: string; emoji: string } {
  if (errorRate > 0.5) {
    return { label: 'OPEN', color: 'text-red-400', emoji: '🔴' };
  }
  if (errorRate > 0.1) {
    return { label: 'HALF-OPEN', color: 'text-yellow-400', emoji: '🟡' };
  }
  return { label: 'CLOSED', color: 'text-emerald-400', emoji: '🟢' };
}

export const Ops = () => {
  const { user } = useAuth();
  const settings = useOmniDashSettings();
  const memoryHealth = useMemoryHealth();
  const queryClient = useQueryClient();

  const incidentsQuery = useQuery({
    queryKey: ['omnidash-incidents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      return fetchIncidents(user.id, 25);
    },
  });

  const [form, setForm] = useState<{
    title: string;
    severity: Incident['severity'];
    description: string;
  }>({
    title: '',
    severity: 'sev2',
    description: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User required');
      await addIncident({
        user_id: user.id,
        title: form.title,
        severity: form.severity,
        description: form.description,
      });
    },
    onSuccess: () => {
      setForm({ title: '', severity: 'sev2', description: '' });
      queryClient.invalidateQueries({
        queryKey: ['omnidash-incidents', user?.id],
      });
    },
  });


  // Derive circuit-breaker status from error ratio
  const mh = memoryHealth.data;
  const totalMem = mh?.total_memories ?? 0;
  const embeddedPct = totalMem > 0
    ? Math.round(((mh?.embedded_count ?? 0) / totalMem) * 100)
    : 0;
  const expiredRatio = totalMem > 0
    ? (mh?.expired_count ?? 0) / totalMem
    : 0;
  const breaker = circuitBreakerStatus(expiredRatio);

  return (
    <div className="py-2 w-full mx-auto overflow-x-hidden">
      <div className="flex flex-col gap-4">
        {/* ── Freeze Switch ─────────────────────────── */}
        <div key="freeze">
          <Card className="h-full relative shadow-md border-white/5 bg-[#121622]/50">
            <CardHeader>
              <CardTitle>Freeze switch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pr-10">
              <p className="text-muted-foreground">
                When freeze is ON, only bugfix and onboarding tasks
                are permitted. Current status:
              </p>
              <Badge
                variant={
                  settings.data?.freeze_mode ? 'destructive' : 'secondary'
                }
              >
                <HiddenValue
                  icon={
                    settings.data?.freeze_mode ? ShieldAlert : CheckCircle
                  }
                  value={
                    settings.data?.freeze_mode ? 'Freeze ON' : 'Freeze OFF'
                  }
                />
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* ── Memory Health (ACRA Observability) ──── */}
        <div key="memoryhealth" data-testid="widget-memory-health">
          <Card className="h-full relative shadow-md border-white/5 bg-[#121622]/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span>Memory Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pr-10">
              {memoryHealth.isLoading ? (
                <p className="text-muted-foreground animate-pulse">
                  Loading memory stats…
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-white/5 p-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Total
                      </p>
                      <p className="text-lg font-bold tabular-nums">
                        <HiddenValue
                          icon={Database}
                          value={String(totalMem)}
                        />
                      </p>
                    </div>
                    <div className="rounded-md bg-white/5 p-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Embedded
                      </p>
                      <p className="text-lg font-bold tabular-nums">
                        <HiddenValue
                          icon={Activity}
                          value={`${embeddedPct}%`}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <TypeBar
                      label="Episodic"
                      count={mh?.episodic_count ?? 0}
                      total={totalMem}
                      color="bg-blue-500"
                    />
                    <TypeBar
                      label="Semantic"
                      count={mh?.semantic_count ?? 0}
                      total={totalMem}
                      color="bg-emerald-500"
                    />
                    <TypeBar
                      label="Procedural"
                      count={mh?.procedural_count ?? 0}
                      total={totalMem}
                      color="bg-amber-500"
                    />
                    <TypeBar
                      label="Preference"
                      count={mh?.preference_count ?? 0}
                      total={totalMem}
                      color="bg-purple-500"
                    />
                  </div>
                  {mh?.latest_memory_at && (
                    <p className="text-xs text-muted-foreground">
                      Latest:{' '}
                      {format(
                        new Date(mh.latest_memory_at),
                        'MMM d, HH:mm',
                      )}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Log New Incident ──────────────────────── */}
        <div key="newlog">
          <Card className="h-full relative shadow-md border-white/5 bg-[#121622]/50">
            <CardHeader>
              <CardTitle>Log new incident</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3 pr-10">
              <div className="space-y-1">
                <p className="text-sm font-medium">Title</p>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="border-white/10"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Severity</p>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      severity: v as Incident['severity'],
                    }))
                  }
                >
                  <SelectTrigger className="border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sev1">Sev-1</SelectItem>
                    <SelectItem value="sev2">Sev-2</SelectItem>
                    <SelectItem value="sev3">Sev-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <p className="text-sm font-medium">Description</p>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="border-white/10"
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="bg-[#3A455D] hover:bg-white/20 text-white"
                >
                  Log incident
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── System Resilience (ACRA Observability) ── */}
        <div key="systemresilience" data-testid="widget-system-resilience">
          <Card className="h-full relative shadow-md border-white/5 bg-[#0F131D]/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>System Resilience</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pr-10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Circuit Breaker
                </span>
                <Badge
                  variant="outline"
                  className={`border-white/10 ${breaker.color}`}
                >
                  <HiddenValue
                    icon={Shield}
                    value={`${breaker.emoji} ${breaker.label}`}
                  />
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Dedup Attempts
                </span>
                <span className="font-mono text-xs tabular-nums">
                  <HiddenValue
                    icon={Database}
                    value={String(mh?.dedup_attempts ?? 0)}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Avg Importance
                </span>
                <span className="font-mono text-xs tabular-nums">
                  <HiddenValue
                    icon={Activity}
                    value={
                      (mh?.avg_importance ?? 0).toFixed(2)
                    }
                  />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Incident Log ──────────────────────────── */}
        <div key="incidentlog">
          <Card className="h-full flex flex-col relative shadow-md border-white/5 bg-[#0F131D]/80">
            <CardHeader>
              <CardTitle>Incident log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto pr-6">
              {incidentsQuery.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No incidents recorded.
                </p>
              )}
              {incidentsQuery.data?.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-white/5 rounded-md p-3 space-y-1 bg-[#1A1F2E]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          incident.severity === 'sev1'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="capitalize border-white/10"
                      >
                        <HiddenValue
                          icon={ShieldAlert}
                          value={incident.severity}
                        />
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="capitalize bg-white/5 border border-white/10"
                      >
                        <HiddenValue
                          icon={Info}
                          value={incident.status}
                        />
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      <HiddenValue
                        icon={Clock}
                        value={format(
                          new Date(incident.occurred_at),
                          'MMM d, HH:mm',
                        )}
                      />
                    </span>
                  </div>
                  <p className="font-semibold text-sm pt-1">
                    {incident.title}
                  </p>
                  {incident.description && (
                    <p className="text-xs text-muted-foreground">
                      {incident.description}
                    </p>
                  )}
                  {incident.resolution_notes && (
                    <p className="text-[11px] text-muted-foreground pt-1 italic">
                      Resolution: {incident.resolution_notes}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/** Memory type distribution bar for the health widget */
function TypeBar({
  label,
  count,
  total,
  color,
}: Readonly<{
  label: string;
  count: number;
  total: number;
  color: string;
}>) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export default Ops;
