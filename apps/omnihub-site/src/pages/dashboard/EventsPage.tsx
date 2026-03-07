/**
 * EventsPage — OmniLink event feed and activity log
 * Displays a filterable real-time event feed with timestamps and event types.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Radio,
  RefreshCw,
  Shield,
  Workflow,
  Bell,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type EventType = 'SYNC' | 'AUTH' | 'WORKFLOW' | 'ALERT';

interface FeedEvent {
  readonly id: string;
  readonly type: EventType;
  readonly description: string;
  readonly timestamp: string;
  readonly source: string;
}

const EVENT_TYPE_CONFIG: Record<EventType, { color: string; bg: string; icon: typeof Radio }> = {
  SYNC: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: RefreshCw },
  AUTH: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Shield },
  WORKFLOW: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Workflow },
  ALERT: { color: 'text-red-400', bg: 'bg-red-500/20', icon: Bell },
};

const ALL_TYPES: readonly EventType[] = ['SYNC', 'AUTH', 'WORKFLOW', 'ALERT'];

const EVENTS: readonly FeedEvent[] = [
  { id: 'evt-9a3f', type: 'SYNC', description: 'CRM contacts synced with Salesforce — 247 records updated', timestamp: '09:42:18', source: 'omnilink-crm' },
  { id: 'evt-8b2e', type: 'AUTH', description: 'New API key provisioned for workspace apex-prod', timestamp: '09:41:05', source: 'auth-service' },
  { id: 'evt-7c1d', type: 'WORKFLOW', description: 'Lead scoring pipeline completed — 52 leads re-scored', timestamp: '09:38:44', source: 'workflow-engine' },
  { id: 'evt-6d0c', type: 'ALERT', description: 'Edge function latency exceeded 500ms threshold in us-east-1', timestamp: '09:35:22', source: 'monitoring' },
  { id: 'evt-5e9b', type: 'SYNC', description: 'Inventory data synced with Shopify — 1,847 SKUs processed', timestamp: '09:32:10', source: 'omnilink-ecom' },
  { id: 'evt-4f8a', type: 'WORKFLOW', description: 'Customer onboarding sequence triggered for 3 new accounts', timestamp: '09:28:57', source: 'workflow-engine' },
  { id: 'evt-3g7b', type: 'AUTH', description: 'SSO login from maria.k@acmecorp.com via Okta', timestamp: '09:24:33', source: 'auth-service' },
  { id: 'evt-2h6c', type: 'SYNC', description: 'Stripe payment events webhook batch processed — 89 events', timestamp: '09:20:15', source: 'omnilink-billing' },
  { id: 'evt-1i5d', type: 'ALERT', description: 'Database connection pool utilization at 82% — scaling initiated', timestamp: '09:15:48', source: 'monitoring' },
  { id: 'evt-0j4e', type: 'WORKFLOW', description: 'Monthly report generation completed — 12 reports dispatched', timestamp: '09:10:02', source: 'workflow-engine' },
];

export const EventsPage = memo(function EventsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<EventType | 'ALL'>('ALL');

  const handleFilterClick = useCallback((filter: EventType | 'ALL') => {
    setActiveFilter(filter);
  }, []);

  const filteredEvents = activeFilter === 'ALL'
    ? EVENTS
    : EVENTS.filter((e) => e.type === activeFilter);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/omnidash')}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to OmniBoard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Events</h1>
        <p className="text-sm text-gray-400 mt-1">OmniLink event feed and activity log</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500 mr-1" />
        <button
          onClick={() => handleFilterClick('ALL')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            activeFilter === 'ALL'
              ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
              : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
          }`}
        >
          All Events
        </button>
        {ALL_TYPES.map((type) => {
          const cfg = EVENT_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => handleFilterClick(type)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === type
                  ? `border-white/10 ${cfg.bg} ${cfg.color}`
                  : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Event Feed */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-500">Live Feed</span>
        </div>
        <div className="space-y-1">
          {filteredEvents.map((evt) => {
            const cfg = EVENT_TYPE_CONFIG[evt.type];
            const Icon = cfg.icon;
            return (
              <div
                key={evt.id}
                className="flex items-start gap-4 rounded-xl px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[11px] font-mono text-gray-600 pt-0.5 shrink-0 w-16">
                  {evt.timestamp}
                </span>
                <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold ${cfg.color}`}>{evt.type}</span>
                    <span className="text-[10px] text-gray-600 font-mono">{evt.id}</span>
                  </div>
                  <p className="text-sm text-gray-300">{evt.description}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">source: {evt.source}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
