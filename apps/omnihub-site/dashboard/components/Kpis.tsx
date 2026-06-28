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
import { MonitorPlay, CreditCard, DollarSign, Siren, Clock } from 'lucide-react';

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
    flowbills_demos: todayRow?.flowbills_demos ?? 0,
    flowbills_paid_accounts: todayRow?.flowbills_paid_accounts ?? 0,
    cash_days_to_cash: todayRow?.cash_days_to_cash ?? 0,
    ops_sev1_incidents: todayRow?.ops_sev1_incidents ?? 0,
  });

  useEffect(() => {
    if (todayRow) {
      setForm({
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

  return (
    <div className="py-2 w-full mx-auto overflow-x-hidden">
      <div className="space-y-4">
        <section>
          <Card className="relative shadow-md border-white/5 bg-[#121622]/50">
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
                    className="border-white/10"
                  />
                </div>
              ))}
              <div className="md:col-span-3 pt-2">
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Save KPI for today</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="flex flex-col relative shadow-md border-white/5 bg-[#121622]/40">
            <CardHeader>
              <CardTitle>Daily KPIs</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-x-auto overflow-y-auto w-full">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
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
        </section>
      </div>
    </div>
  );
};

export default Kpis;

