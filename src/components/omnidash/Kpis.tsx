import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchKpiDaily, upsertKpiDailyEntry } from '@/omnidash/api';
import { useOmniDashSettings } from '@/omnidash/hooks';
import { redactKpiDaily, redactAmount } from '@/omnidash/redaction';
import { HiddenValue } from './HiddenMetric';
import { LineChart, PlayCircle, AlertTriangle, MonitorPlay, CreditCard, DollarSign, Siren, Clock } from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const today = () => new Date().toISOString().slice(0, 10);

export const Kpis = () => {
  const { user } = useAuth();
  const settings = useOmniDashSettings();
  const queryClient = useQueryClient();

  const kpiQuery = useQuery({
    queryKey: ['omnidash-kpis', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      const data = await fetchKpiDaily(user.id, 14);
      return settings.data?.demo_mode && settings.data.anonymize_kpis ? redactKpiDaily(data) : data;
    },
  });

  const todayRow = useMemo(
    () => kpiQuery.data?.find((row) => row.day === today()),
    [kpiQuery.data]
  );

  const [form, setForm] = useState({
    tradeline_paid_starts: todayRow?.tradeline_paid_starts ?? 0,
    tradeline_active_pilots: todayRow?.tradeline_active_pilots ?? 0,
    tradeline_churn_risks: todayRow?.tradeline_churn_risks ?? 0,
    flowbills_demos: todayRow?.flowbills_demos ?? 0,
    flowbills_paid_accounts: todayRow?.flowbills_paid_accounts ?? 0,
    cash_days_to_cash: todayRow?.cash_days_to_cash ?? 0,
    ops_sev1_incidents: todayRow?.ops_sev1_incidents ?? 0,
  });

  useEffect(() => {
    if (todayRow) {
      setForm({
        tradeline_paid_starts: todayRow.tradeline_paid_starts,
        tradeline_active_pilots: todayRow.tradeline_active_pilots,
        tradeline_churn_risks: todayRow.tradeline_churn_risks,
        flowbills_demos: todayRow.flowbills_demos,
        flowbills_paid_accounts: todayRow.flowbills_paid_accounts,
        cash_days_to_cash: todayRow.cash_days_to_cash ?? 0,
        ops_sev1_incidents: todayRow.ops_sev1_incidents,
      });
    }
  }, [todayRow]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User missing');
      await upsertKpiDailyEntry({
        user_id: user.id,
        day: today(),
        ...form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnidash-kpis', user?.id] });
    },
  });

  const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>({
    lg: [
      { i: 'update', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'daily', x: 0, y: 4, w: 1, h: 6, isResizable: false }
    ],
    md: [
      { i: 'update', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'daily', x: 0, y: 4, w: 1, h: 6, isResizable: false }
    ],
    sm: [
      { i: 'update', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'daily', x: 0, y: 4, w: 1, h: 6, isResizable: false }
    ],
  });

  return (
    <div className="py-2 w-full mx-auto overflow-x-hidden">
      <ResponsiveGridLayout
        className="layout -mx-2"
        layouts={layouts}
        breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
        cols={{ lg: 1, md: 1, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={80}
        onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
        draggableHandle=".custom-drag-handle"
        margin={[16, 16]}
      >
        <div key="update">
          <Card className="h-full relative group shadow-md border-white/5 bg-[#121622]/50">
            <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:text-white/60 transition-colors z-20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <CardHeader>
              <CardTitle>Update today</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3 pr-10">
              {Object.entries(form).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium capitalize">{key.replaceAll('_', ' ')}</p>
                  <Input
                    type="number"
                    value={value ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="cancel-drag border-white/10"
                  />
                </div>
              ))}
              <div className="md:col-span-3 pt-2">
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="cancel-drag">Save KPI for today</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div key="daily">
          <Card className="h-full flex flex-col relative group shadow-md border-white/5 bg-[#121622]/40">
            <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:text-white/60 transition-colors z-20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <CardHeader>
              <CardTitle>Daily KPIs</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-x-auto overflow-y-auto w-full">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>TradeLine paid starts</TableHead>
                <TableHead>Active pilots</TableHead>
                <TableHead>Churn risks</TableHead>
                <TableHead>FLOWBills demos</TableHead>
                <TableHead>FLOWBills paid</TableHead>
                <TableHead>Days to cash</TableHead>
                <TableHead>Ops Sev-1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(kpiQuery.data || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell><HiddenValue icon={Clock} value={row.day} /></TableCell>
                  <TableCell><HiddenValue icon={LineChart} value={row.tradeline_paid_starts} /></TableCell>
                  <TableCell><HiddenValue icon={PlayCircle} value={row.tradeline_active_pilots} /></TableCell>
                  <TableCell><HiddenValue icon={AlertTriangle} value={row.tradeline_churn_risks} /></TableCell>
                  <TableCell><HiddenValue icon={MonitorPlay} value={row.flowbills_demos} /></TableCell>
                  <TableCell><HiddenValue icon={CreditCard} value={row.flowbills_paid_accounts} /></TableCell>
                  <TableCell>
                    <HiddenValue icon={DollarSign} value={settings.data?.demo_mode && settings.data.anonymize_kpis
                      ? redactAmount(row.cash_days_to_cash) || '—'
                      : row.cash_days_to_cash ?? '—'} />
                  </TableCell>
                  <TableCell><HiddenValue icon={Siren} value={row.ops_sev1_incidents} /></TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ResponsiveGridLayout>
  </div>
  );
};

export default Kpis;

