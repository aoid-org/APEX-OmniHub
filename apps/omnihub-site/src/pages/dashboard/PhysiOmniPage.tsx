import { memo } from 'react';
import {
  ArrowLeft,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Signal,
  Heart,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

interface Device {
  name: string;
  type: string;
  status: 'Online' | 'Offline';
  lastSync: string;
  battery: number;
}

const STATS = [
  { label: 'Connected Devices', value: '24', icon: <Signal size={20} />, color: 'text-cyan-400' },
  { label: 'Active Sessions', value: '8', icon: <Activity size={20} />, color: 'text-emerald-400' },
  { label: 'Data Points Today', value: '14,892', icon: <Zap size={20} />, color: 'text-amber-400' },
];

const DEVICES: Device[] = [
  { name: 'Edge Gateway Alpha', type: 'Gateway', status: 'Online', lastSync: '12 sec ago', battery: 100 },
  { name: 'Sensor Array B-7', type: 'Sensor', status: 'Online', lastSync: '34 sec ago', battery: 82 },
  { name: 'Actuator Node C-3', type: 'Actuator', status: 'Online', lastSync: '1 min ago', battery: 64 },
  { name: 'Camera Module D-1', type: 'Camera', status: 'Offline', lastSync: '3 hrs ago', battery: 12 },
  { name: 'Temperature Probe E-9', type: 'Sensor', status: 'Online', lastSync: '45 sec ago', battery: 91 },
  { name: 'Motor Controller F-2', type: 'Actuator', status: 'Online', lastSync: '2 min ago', battery: 55 },
];

const HEALTH_METRICS = [
  { label: 'Avg Latency', value: '24ms', icon: <Activity size={18} />, trend: 'Stable' },
  { label: 'Uptime', value: '99.97%', icon: <Heart size={18} />, trend: '+0.02%' },
  { label: 'Avg Temperature', value: '42 C', icon: <Thermometer size={18} />, trend: 'Normal' },
];

function BatteryIcon({ level }: { level: number }) {
  if (level > 60) return <BatteryFull size={16} className="text-emerald-400" />;
  if (level > 25) return <BatteryMedium size={16} className="text-amber-400" />;
  return <BatteryLow size={16} className="text-red-400" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const PhysiOmniPage = memo(function PhysiOmniPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <Cpu size={24} className="text-cyan-400" />
          <h1 className="text-2xl font-semibold text-white">PhysiOmni</h1>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-semibold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Device Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Devices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEVICES.map(d => (
            <div
              key={d.name}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition hover:border-white/[0.12]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.type}</p>
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    d.status === 'Online'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {d.status === 'Online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {d.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Synced: {d.lastSync}</span>
                <span className="flex items-center gap-1">
                  <BatteryIcon level={d.battery} /> {d.battery}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Health Metrics */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Health Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HEALTH_METRICS.map(m => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-3 text-gray-400">
                {m.icon}
                <span className="text-sm text-gray-500">{m.label}</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-white">{m.value}</p>
              <p className="mt-1 text-xs text-gray-500">{m.trend}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export default PhysiOmniPage;
