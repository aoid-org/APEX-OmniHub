/**
 * EntitiesPage — Managed entities and data objects
 * Displays entity type cards, recent entities table, and search/filter bar.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Building2,
  Handshake,
  ListChecks,
  Search,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type EntityType = 'Contact' | 'Company' | 'Deal' | 'Task';

interface EntityCard {
  readonly type: EntityType;
  readonly count: string;
  readonly icon: typeof Users;
  readonly color: string;
  readonly bg: string;
}

interface RecentEntity {
  readonly name: string;
  readonly type: EntityType;
  readonly status: string;
  readonly statusColor: string;
  readonly lastModified: string;
}

const ENTITY_CARDS: readonly EntityCard[] = [
  { type: 'Contact', count: '2,847', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { type: 'Company', count: '423', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { type: 'Deal', count: '189', icon: Handshake, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { type: 'Task', count: '1,247', icon: ListChecks, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
] as const;

const RECENT_ENTITIES: readonly RecentEntity[] = [
  { name: 'Sarah Mitchell', type: 'Contact', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/20', lastModified: '12 min ago' },
  { name: 'Acme Corporation', type: 'Company', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/20', lastModified: '34 min ago' },
  { name: 'Enterprise License Q2', type: 'Deal', status: 'In Progress', statusColor: 'text-amber-400 bg-amber-500/20', lastModified: '1h ago' },
  { name: 'Onboarding: CloudBridge', type: 'Task', status: 'Pending', statusColor: 'text-blue-400 bg-blue-500/20', lastModified: '2h ago' },
  { name: 'James Rodriguez', type: 'Contact', status: 'Active', statusColor: 'text-emerald-400 bg-emerald-500/20', lastModified: '2h ago' },
  { name: 'Nexgen AI Inc.', type: 'Company', status: 'Churned', statusColor: 'text-red-400 bg-red-500/20', lastModified: '3h ago' },
  { name: 'Platform Migration', type: 'Task', status: 'Completed', statusColor: 'text-emerald-400 bg-emerald-500/20', lastModified: '4h ago' },
  { name: 'Annual Renewal — DataVault', type: 'Deal', status: 'Won', statusColor: 'text-emerald-400 bg-emerald-500/20', lastModified: '5h ago' },
  { name: 'Maria Kowalski', type: 'Contact', status: 'Inactive', statusColor: 'text-gray-400 bg-gray-500/20', lastModified: '6h ago' },
  { name: 'Security Audit Follow-up', type: 'Task', status: 'In Progress', statusColor: 'text-amber-400 bg-amber-500/20', lastModified: '8h ago' },
] as const;

const ALL_ENTITY_TYPES: readonly EntityType[] = ['Contact', 'Company', 'Deal', 'Task'];

export const EntitiesPage = memo(function EntitiesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EntityType | 'ALL'>('ALL');

  const handleFilterClick = useCallback((filter: EntityType | 'ALL') => {
    setActiveFilter(filter);
  }, []);

  const filteredEntities = RECENT_ENTITIES.filter((entity) => {
    const matchesFilter = activeFilter === 'ALL' || entity.type === activeFilter;
    const matchesSearch =
      searchQuery === '' ||
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Entities</h1>
        <p className="text-sm text-gray-400 mt-1">Managed entities and data objects</p>
      </div>

      {/* Entity Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {ENTITY_CARDS.map((card) => (
          <div
            key={card.type}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/[0.04] blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-purple-400" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.bg} ${card.color}`}>
                {card.type}
              </span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{card.count}</p>
            <p className="text-xs text-gray-500 mt-1">Total {card.type}s</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500 mr-1" />
          <button
            onClick={() => handleFilterClick('ALL')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === 'ALL'
                ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
            }`}
          >
            All
          </button>
          {ALL_ENTITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleFilterClick(type)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === type
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                  : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Entities Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Entities</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-3 text-xs font-medium text-gray-500">Name</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Type</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Status</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => (
                <tr key={entity.name} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 text-sm text-white">{entity.name}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/[0.04] text-gray-300">
                      {entity.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${entity.statusColor}`}>
                      {entity.status}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{entity.lastModified}</td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                    No entities match your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
