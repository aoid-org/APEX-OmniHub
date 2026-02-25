import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchIncidents, addIncident } from '@/omnidash/api';
import { useOmniDashSettings } from '@/omnidash/hooks';
import { Incident } from '@/omnidash/types';
import { format } from 'date-fns';
import { HiddenValue } from './HiddenMetric';
import { ShieldAlert, CheckCircle, Info, Clock } from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export const Ops = () => {
  const { user } = useAuth();
  const settings = useOmniDashSettings();
  const queryClient = useQueryClient();

  const incidentsQuery = useQuery({
    queryKey: ['omnidash-incidents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      return fetchIncidents(user.id, 25);
    },
  });

  const [form, setForm] = useState<{ title: string; severity: Incident['severity']; description: string }>({
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
      queryClient.invalidateQueries({ queryKey: ['omnidash-incidents', user?.id] });
    },
  });

  const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>({
    lg: [
      { i: 'freeze', x: 0, y: 0, w: 1, h: 2, isResizable: false },
      { i: 'newlog', x: 0, y: 2, w: 1, h: 5, isResizable: false },
      { i: 'incidentlog', x: 1, y: 0, w: 1, h: 7, isResizable: false },
    ],
    md: [
      { i: 'freeze', x: 0, y: 0, w: 1, h: 2, isResizable: false },
      { i: 'newlog', x: 0, y: 2, w: 1, h: 5, isResizable: false },
      { i: 'incidentlog', x: 0, y: 7, w: 1, h: 7, isResizable: false },
    ],
    sm: [
      { i: 'freeze', x: 0, y: 0, w: 1, h: 2, isResizable: false },
      { i: 'newlog', x: 0, y: 2, w: 1, h: 5, isResizable: false },
      { i: 'incidentlog', x: 0, y: 7, w: 1, h: 7, isResizable: false },
    ]
  });

  return (
    <div className="py-2 w-full mx-auto overflow-x-hidden">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
        cols={{ lg: 2, md: 1, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={60}
        onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
        draggableHandle=".custom-drag-handle"
        margin={[16, 16]}
      >
        <div key="freeze">
          <Card className="h-full relative group shadow-md border-white/5 bg-[#121622]/50">
            <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:text-white/60 transition-colors z-20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <CardHeader>
              <CardTitle>Freeze switch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pr-10">
              <p className="text-muted-foreground">
                When freeze is ON, only bugfix and onboarding tasks are permitted. Current status:
              </p>
              <Badge variant={settings.data?.freeze_mode ? 'destructive' : 'secondary'}>
                <HiddenValue icon={settings.data?.freeze_mode ? ShieldAlert : CheckCircle} value={settings.data?.freeze_mode ? 'Freeze ON' : 'Freeze OFF'} />
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div key="newlog">
          <Card className="h-full relative group shadow-md border-white/5 bg-[#121622]/50">
            <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:text-white/60 transition-colors z-20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <CardHeader>
              <CardTitle>Log new incident</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3 pr-10">
              <div className="space-y-1">
                <p className="text-sm font-medium">Title</p>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="cancel-drag border-white/10" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Severity</p>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as Incident['severity'] }))}>
                  <SelectTrigger className="cancel-drag border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sev1">Sev-1</SelectItem>
                    <SelectItem value="sev2">Sev-2</SelectItem>
                    <SelectItem value="sev3">Sev-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <p className="text-sm font-medium">Description</p>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="cancel-drag border-white/10" />
              </div>
              <div className="md:col-span-2 pt-2">
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="cancel-drag bg-[#3A455D] hover:bg-white/20 text-white">Log incident</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div key="incidentlog">
          <Card className="h-full flex flex-col relative group shadow-md border-white/5 bg-[#0F131D]/80">
            <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:text-white/60 transition-colors z-20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <CardHeader>
              <CardTitle>Incident log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto pr-6">
              {incidentsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No incidents recorded.</p>}
              {incidentsQuery.data?.map((incident) => (
                <div key={incident.id} className="border border-white/5 rounded-md p-3 space-y-1 bg-[#1A1F2E]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={incident.severity === 'sev1' ? 'destructive' : 'outline'} className="capitalize border-white/10">
                        <HiddenValue icon={ShieldAlert} value={incident.severity} />
                      </Badge>
                      <Badge variant="secondary" className="capitalize bg-white/5 border border-white/10">
                        <HiddenValue icon={Info} value={incident.status} />
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      <HiddenValue icon={Clock} value={format(new Date(incident.occurred_at), 'MMM d, HH:mm')} />
                    </span>
                  </div>
                  <p className="font-semibold text-sm pt-1">{incident.title}</p>
                  {incident.description && <p className="text-xs text-muted-foreground">{incident.description}</p>}
                  {incident.resolution_notes && (
                    <p className="text-[11px] text-muted-foreground pt-1 italic">Resolution: {incident.resolution_notes}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default Ops;

