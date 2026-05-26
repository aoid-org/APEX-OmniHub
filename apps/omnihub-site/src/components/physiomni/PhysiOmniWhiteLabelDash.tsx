/**
 * PhysiOmni White-Label Dashboard
 *
 * Isolated tenant-branded view for the 30-day industrial hardware pilot.
 * Overrides APEX branding with tenant logo and hex color.
 *
 * Features:
 *   - Real-time telemetry chart (vibration XYZ + temperature)
 *   - OmniTrace Event Feed with live Supabase Realtime alerts
 *   - Responsive grid layout
 *
 * Author: APEX-OmniHub PhysiOmni
 * Date: 2026-05-26
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Radio,
  Shield,
  Thermometer,
  Vibrate,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

interface PhysiOmniWhiteLabelDashProps {
  tenantLogoUrl: string;
  brandHexColor: string;
  tenantId: string;
}

interface TelemetryPoint {
  time: string;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  temperature_c: number;
}

interface AlertEvent {
  id: string;
  device_serial: string;
  severity: 'info' | 'warning' | 'critical';
  alert_type: string;
  message: string;
  triggered_at: string;
  acknowledged: boolean;
}

// ── Mock Telemetry Generator ────────────────────────────────────────────────
// Generates realistic sensor data for chart rendering during pilot setup.

function generateMockTelemetry(count: number): TelemetryPoint[] {
  const now = Date.now();
  const points: TelemetryPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * 5000);
    const baseVibration = 2.0 + Math.sin(i * 0.3) * 1.5;
    const spike = i === Math.floor(count * 0.7) ? 8.0 : 0;

    points.push({
      time: time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      vibration_x: +(baseVibration + spike + Math.random() * 0.5).toFixed(2),
      vibration_y: +(baseVibration * 0.8 + Math.random() * 0.4).toFixed(2),
      vibration_z: +(baseVibration * 0.6 + Math.random() * 0.3).toFixed(2),
      temperature_c: +(42.0 + Math.sin(i * 0.1) * 3 + Math.random() * 0.5).toFixed(1),
    });
  }

  return points;
}

const INITIAL_EVENTS: AlertEvent[] = [
  {
    id: 'evt-001',
    device_serial: 'HVAC-Unit-7',
    severity: 'info',
    alert_type: 'baseline_established',
    message: 'Normal vibration baseline established — 2.3g RMS',
    triggered_at: new Date(Date.now() - 300000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'evt-002',
    device_serial: 'COMPRESSOR-A',
    severity: 'critical',
    alert_type: 'vibration_critical_x',
    message: 'Acoustic anomaly detected — vibration_x=16.8g exceeds 15.0g threshold. MAN Mode triggered.',
    triggered_at: new Date(Date.now() - 120000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'evt-003',
    device_serial: 'PUMP-STATION-3',
    severity: 'warning',
    alert_type: 'vibration_warning_y',
    message: 'Elevated vibration_y=11.2g on bearing assembly — monitoring escalated',
    triggered_at: new Date(Date.now() - 60000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'evt-004',
    device_serial: 'HVAC-Unit-7',
    severity: 'info',
    alert_type: 'temp_nominal',
    message: 'Temperature stable at 43.2°C — within operational range',
    triggered_at: new Date(Date.now() - 30000).toISOString(),
    acknowledged: true,
  },
];

// ── Severity Badge Component ────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertEvent['severity'] }) {
  const config = {
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/15',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'CRITICAL',
    },
    warning: {
      icon: Zap,
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      label: 'WARNING',
    },
    info: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'INFO',
    },
  }[severity];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${config.bg} ${config.border} ${config.text}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ── Main Dashboard Component ────────────────────────────────────────────────

export default function PhysiOmniWhiteLabelDash({
  tenantLogoUrl,
  brandHexColor,
  tenantId,
}: PhysiOmniWhiteLabelDashProps) {
  const [telemetryData] = useState<TelemetryPoint[]>(() => generateMockTelemetry(60));
  const [events, setEvents] = useState<AlertEvent[]>(INITIAL_EVENTS);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const feedRef = useRef<HTMLDivElement>(null);

  // Scroll feed to top on new events
  const scrollFeedToTop = useCallback(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, []);

  // ── Supabase Realtime Subscription ──────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`physiomni-alerts-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'physiomni_alerts',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newAlert = payload.new as AlertEvent;
          setEvents((prev) => [newAlert, ...prev].slice(0, 50));
          scrollFeedToTop();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    // Simulate connection after mount
    const timer = setTimeout(() => setConnectionStatus('connected'), 1500);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tenantId, scrollFeedToTop]);

  // ── Derived brand styles ──────────────────────────────────────────────────
  const brandStyle = {
    '--brand-color': brandHexColor,
    '--brand-color-15': `${brandHexColor}26`,
    '--brand-color-30': `${brandHexColor}4D`,
  } as React.CSSProperties;

  const statusConfig = {
    connecting: { color: 'text-amber-400', dot: 'bg-amber-400', label: 'Connecting...' },
    connected: { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Live' },
    disconnected: { color: 'text-red-400', dot: 'bg-red-400', label: 'Disconnected' },
  }[connectionStatus];

  return (
    <div
      className="min-h-screen bg-apex-bg text-apex-text font-sans"
      style={brandStyle}
    >
      {/* ── Top Navigation Bar ──────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: `${brandHexColor}08`,
          borderColor: `${brandHexColor}20`,
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Tenant Logo + Branding */}
            <div className="flex items-center gap-3">
              <img
                src={tenantLogoUrl}
                alt="Tenant Logo"
                className="h-8 w-auto object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="h-6 w-px bg-apex-border" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: brandHexColor }} />
                <span className="text-sm font-bold tracking-wide text-apex-text">
                  PhysiOmni
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-apex-surface2 text-apex-muted border border-apex-border">
                  PILOT
                </span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${statusConfig.color}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
                {statusConfig.label}
              </div>

              {/* Alert Counter */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                <Bell className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400">
                  {events.filter((e) => !e.acknowledged && e.severity === 'critical').length}
                </span>
              </div>

              {/* Powered-by */}
              <span className="text-[10px] text-apex-muted font-mono hidden sm:inline">
                Powered by APEX-OmniHub
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content Grid ───────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: Vibrate,
              label: 'Avg Vibration',
              value: `${(telemetryData.slice(-10).reduce((s, p) => s + p.vibration_x, 0) / 10).toFixed(1)}g`,
              sub: 'X-axis RMS',
            },
            {
              icon: Thermometer,
              label: 'Temperature',
              value: `${telemetryData[telemetryData.length - 1]?.temperature_c ?? 0}°C`,
              sub: 'Current',
            },
            {
              icon: Activity,
              label: 'Data Points',
              value: telemetryData.length.toString(),
              sub: 'Last 5 min',
            },
            {
              icon: AlertTriangle,
              label: 'Active Alerts',
              value: events.filter((e) => !e.acknowledged).length.toString(),
              sub: 'Unacknowledged',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-apex-border bg-apex-surface p-4 transition-all hover:border-opacity-60"
              style={{ '--tw-border-opacity': 0.4 } as React.CSSProperties}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-apex-muted" />
                <span className="text-xs text-apex-muted font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight" style={{ color: brandHexColor }}>
                {stat.value}
              </div>
              <div className="text-[11px] text-apex-muted mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Telemetry Chart (3/5 width) ──────────────────────────────── */}
          <div className="lg:col-span-3 rounded-xl border border-apex-border bg-apex-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: brandHexColor }} />
                <h2 className="text-sm font-bold tracking-wide">Real-Time Telemetry</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-apex-muted">
                <Radio className="w-3 h-3" />
                <span>5s interval • 60 samples</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={telemetryData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3e" strokeOpacity={0.5} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7d95', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e2d3e' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7d95', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e2d3e' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161d2b',
                    border: '1px solid #1e2d3e',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e8edf5',
                  }}
                  labelStyle={{ color: '#6b7d95', fontSize: '11px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#b0bdd0' }}
                  iconType="plainline"
                />
                <Line
                  type="monotone"
                  dataKey="vibration_x"
                  name="Vibration X (g)"
                  stroke={brandHexColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: brandHexColor }}
                />
                <Line
                  type="monotone"
                  dataKey="vibration_y"
                  name="Vibration Y (g)"
                  stroke="#4a9aba"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: '#4a9aba' }}
                  strokeDasharray="4 2"
                />
                <Line
                  type="monotone"
                  dataKey="vibration_z"
                  name="Vibration Z (g)"
                  stroke="#6b7d95"
                  strokeWidth={1}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: '#6b7d95' }}
                  strokeDasharray="2 2"
                />
                <Line
                  type="monotone"
                  dataKey="temperature_c"
                  name="Temp (°C)"
                  stroke="#e8832a"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: '#e8832a' }}
                  yAxisId={0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── OmniTrace Event Feed (2/5 width) ─────────────────────────── */}
          <div className="lg:col-span-2 rounded-xl border border-apex-border bg-apex-surface flex flex-col max-h-[480px]">
            {/* Feed Header */}
            <div className="flex items-center justify-between p-4 border-b border-apex-border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: brandHexColor }} />
                <h2 className="text-sm font-bold tracking-wide">OmniTrace Event Feed</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-apex-surface2 text-apex-muted border border-apex-border">
                {events.length} events
              </span>
            </div>

            {/* Event List */}
            <div ref={feedRef} className="flex-1 overflow-y-auto divide-y divide-apex-border/40">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`px-4 py-3 transition-colors hover:bg-apex-surface2/50 ${
                    event.severity === 'critical' && !event.acknowledged
                      ? 'border-l-2 border-l-red-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-apex-teal2 whitespace-nowrap font-mono">
                        {event.device_serial}
                      </span>
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <time className="text-[10px] text-apex-muted whitespace-nowrap font-mono">
                      {new Date(event.triggered_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </time>
                  </div>
                  <p className="text-[12px] text-apex-text-dim leading-relaxed">
                    {event.message}
                  </p>
                </div>
              ))}

              {events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-apex-muted">
                  <Radio className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm">Awaiting sensor data...</p>
                  <p className="text-xs mt-1">Events will appear here in real-time</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between text-[10px] text-apex-muted font-mono px-1">
          <span>PhysiOmni v1.0.0 • Pilot Build • {new Date().toLocaleDateString()}</span>
          <span>
            tenant:{tenantId.slice(0, 8)}… • Secured by APEX Fortress
          </span>
        </div>
      </main>
    </div>
  );
}
