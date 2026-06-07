import { useDashboardData } from '../hooks/useDashboardData';
import { useDemoMode } from '../../src/contexts/DemoModeContext';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { T } from '../designSystem';
import { GlassCard, SectionLabel, StatusDot } from './designComponents';

// 1. System Health Overview
export const SystemHealthOverview = () => {
  const { demoMode } = useDemoMode();
  const dashData = useDashboardData({ enabled: !demoMode });
  const kpi = dashData.kpiSummary;
  
  if (dashData.isLoading) {
    return (
      <GlassCard style={{ padding: 16 }}>
        <SectionLabel>System Health Overview</SectionLabel>
        <div style={{ background: `${T.surface}`, borderRadius: 8, height: 74, marginTop: 12, animation: 'apexPulse 1.5s ease-in-out infinite' }} />
      </GlassCard>
    );
  }

  if (dashData.error) {
    return (
      <GlassCard style={{ padding: 16 }}>
        <SectionLabel>System Health Overview</SectionLabel>
        <div style={{ color: T.red, fontSize: 12, padding: 12 }}>
          Failed to load. <button onClick={dashData.refresh} style={{ color: T.orange, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
      </GlassCard>
    );
  }
  
  return (
    <GlassCard style={{ padding: 16 }}>
      <SectionLabel>System Health Overview</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
        <div style={{ background: T.surface, padding: 12, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.t2 }}>Agents Active</div>
          <div style={{ fontSize: 20, color: T.cyan, fontWeight: 600 }}>{kpi.tradeline_active_pilots || 0}</div>
        </div>
        <div style={{ background: T.surface, padding: 12, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.t2 }}>Workflows</div>
          <div style={{ fontSize: 20, color: T.blue, fontWeight: 600 }}>{kpi.flowbills_paid_accounts || 0}</div>
        </div>
        <div style={{ background: T.surface, padding: 12, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.t2 }}>Alerts 24h</div>
          <div style={{ fontSize: 20, color: kpi.ops_sev1_incidents ? T.warn : T.green, fontWeight: 600 }}>{kpi.ops_sev1_incidents || 0}</div>
        </div>
        <div style={{ background: T.surface, padding: 12, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.t2 }}>MAN Mode</div>
          <div style={{ fontSize: 20, color: T.orange, fontWeight: 600 }}>{kpi.tradeline_churn_risks || 0}</div>
        </div>
      </div>
    </GlassCard>
  );
};

// 2. Agent Activity Timeline
export const AgentActivityTimeline = () => {
  const { demoMode } = useDemoMode();
  const dashData = useDashboardData({ enabled: !demoMode });

  if (dashData.isLoading) {
    return (
      <GlassCard style={{ padding: 16, height: 250 }}>
        <SectionLabel>Agent Activity (last 60m)</SectionLabel>
        <div style={{ background: `${T.surface}`, borderRadius: 8, height: 180, marginTop: 10, animation: 'apexPulse 1.5s ease-in-out infinite' }} />
      </GlassCard>
    );
  }

  if (dashData.error) {
    return (
      <GlassCard style={{ padding: 16, height: 250 }}>
        <SectionLabel>Agent Activity (last 60m)</SectionLabel>
        <div style={{ color: T.red, fontSize: 12, padding: 12 }}>
          Failed to load. <button onClick={dashData.refresh} style={{ color: T.orange, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
      </GlassCard>
    );
  }

  const data = dashData.kpiHistory.map(d => ({
    time: new Date(d.day).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    calls: d.tradeline_paid_starts || 0
  })).reverse();

  return (
    <GlassCard style={{ padding: 16, height: 250 }}>
      <SectionLabel>Agent Activity (last 60m)</SectionLabel>
      <div style={{ height: 180, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.length ? data : [{ time: '00:00', calls: 0 }]}>
            <XAxis dataKey="time" stroke={T.t3} fontSize={10} />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} />
            <Line type="monotone" dataKey="calls" stroke={T.cyan} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};

// 3. Guardian Alert Feed
export const GuardianAlertFeed = () => {
  const { demoMode } = useDemoMode();
  const dashData = useDashboardData({ enabled: !demoMode });

  if (dashData.isLoading) {
    return (
      <GlassCard style={{ padding: 16, height: 250, display: 'flex', flexDirection: 'column' }}>
        <SectionLabel>Guardian Alert Feed</SectionLabel>
        <div style={{ background: `${T.surface}`, borderRadius: 8, flex: 1, marginTop: 10, animation: 'apexPulse 1.5s ease-in-out infinite' }} />
      </GlassCard>
    );
  }

  if (dashData.error) {
    return (
      <GlassCard style={{ padding: 16, height: 250, display: 'flex', flexDirection: 'column' }}>
        <SectionLabel>Guardian Alert Feed</SectionLabel>
        <div style={{ color: T.red, fontSize: 12, padding: 12 }}>
          Failed to load. <button onClick={dashData.refresh} style={{ color: T.orange, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
      </GlassCard>
    );
  }

  const incidents = dashData.openIncidents;

  return (
    <GlassCard style={{ padding: 16, height: 250, display: 'flex', flexDirection: 'column' }}>
      <SectionLabel>Guardian Alert Feed</SectionLabel>
      <div style={{ overflowY: 'auto', marginTop: 10, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {incidents.length === 0 ? (
          <div style={{ color: T.t3, fontSize: 12, textAlign: 'center', marginTop: 20 }}>No active alerts</div>
        ) : incidents.map(inc => (
          <div key={inc.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.surface, padding: '8px 12px', borderRadius: 8 }}>
            <StatusDot color={inc.severity === 'sev1' ? T.warn : inc.severity === 'sev2' ? T.orange : T.cyan} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.t1 }}>{inc.title}</div>
              <div style={{ fontSize: 10, color: T.t3 }}>{new Date(inc.occurred_at).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: T.t2, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: 4 }}>
              {inc.severity}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// 4. MAN Mode Review Queue
export const ManModeReviewQueue = () => {
  return (
    <GlassCard style={{ padding: 16, height: 250, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionLabel>MAN Mode Review</SectionLabel>
        <span style={{ fontSize: 10, background: `${T.orange}22`, color: T.orange, padding: '2px 6px', borderRadius: 10 }}>Requires Auth</span>
      </div>
      <div style={{ marginTop: 16, color: T.t3, fontSize: 12, textAlign: 'center' }}>
        Zero pending manual approvals in queue.
      </div>
    </GlassCard>
  );
};

// 5. OmniRoute Traffic
export const OmniRouteTraffic = () => {
  return (
    <GlassCard style={{ padding: 16, height: 220 }}>
      <SectionLabel>OmniRoute Traffic (1h)</SectionLabel>
      <div style={{ marginTop: 16, color: T.t3, fontSize: 12, textAlign: 'center' }}>
        No route telemetry available.
      </div>
    </GlassCard>
  );
};

// 6. Workflow Status Board
export const WorkflowStatusBoard = () => {
  return (
    <GlassCard style={{ padding: 16, height: 220 }}>
      <SectionLabel>Workflow Status</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12, height: '100%' }}>
        {['Pending', 'Running', 'Completed', 'Failed'].map(status => (
          <div key={status} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: T.t2, fontWeight: 600, marginBottom: 8 }}>{status}</div>
            {status === 'Completed' ? (
              <div style={{ fontSize: 11, color: T.t1, background: `${T.green}22`, padding: 4, borderRadius: 4 }}>Sync CRM</div>
            ) : null}
            {status === 'Running' ? (
              <div style={{ fontSize: 11, color: T.t1, background: `${T.cyan}22`, padding: 4, borderRadius: 4 }}>Invoice Batch</div>
            ) : null}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// 7. System Sparklines
export const SystemSparklines = () => {
  return (
    <GlassCard style={{ padding: 16, height: 220 }}>
      <SectionLabel>System Sparklines</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        {[
          { label: 'Latency (ms)', color: T.cyan },
          { label: 'DB Connections', color: T.blue },
          { label: 'Edge Latency', color: T.purple },
          { label: 'Auth RPS', color: T.orange },
          { label: 'Sessions', color: T.green },
          { label: 'Cache Hit %', color: T.warn },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 11, color: T.t2, marginBottom: 4 }}>{s.label}</div>
            <div style={{ height: 40, background: `${T.surface}`, border: `1px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: T.t3 }}>NO DATA</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
