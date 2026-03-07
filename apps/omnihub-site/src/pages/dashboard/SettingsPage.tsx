import { memo, useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Bell,
  Puzzle,
  Key,
  Users,
  ChevronRight,
  Check,
  Globe,
  Clock,
  Smartphone,
  Lock,
  Mail,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  details: { label: string; value: string }[];
  actionLabel: string;
}

interface NotificationPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const SECTIONS: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your personal information and preferences',
    icon: <User className="h-5 w-5 text-blue-400" />,
    iconBg: 'bg-blue-500/10',
    details: [
      { label: 'Name', value: 'Alex Morgan' },
      { label: 'Email', value: 'alex.morgan@apex.io' },
      { label: 'Role', value: 'Admin' },
      { label: 'Timezone', value: 'UTC-8 (Pacific)' },
    ],
    actionLabel: 'Configure',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Authentication, sessions, and access controls',
    icon: <Shield className="h-5 w-5 text-emerald-400" />,
    iconBg: 'bg-emerald-500/10',
    details: [
      { label: '2FA Status', value: 'Enabled' },
      { label: 'Session Timeout', value: '30 minutes' },
      { label: 'Last Password Change', value: '14 days ago' },
      { label: 'Active Sessions', value: '3 devices' },
    ],
    actionLabel: 'Configure',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connected services and third-party applications',
    icon: <Puzzle className="h-5 w-5 text-purple-400" />,
    iconBg: 'bg-purple-500/10',
    details: [
      { label: 'Connected Apps', value: '12' },
      { label: 'OAuth Tokens', value: '8 active' },
      { label: 'Webhooks', value: '5 configured' },
      { label: 'Last Sync', value: '2 min ago' },
    ],
    actionLabel: 'Configure',
  },
  {
    id: 'team',
    title: 'Team Management',
    description: 'Manage team members, roles, and permissions',
    icon: <Users className="h-5 w-5 text-orange-400" />,
    iconBg: 'bg-orange-500/10',
    details: [
      { label: 'Team Members', value: '24' },
      { label: 'Pending Invites', value: '3' },
      { label: 'Roles Defined', value: '6' },
      { label: 'Departments', value: '4' },
    ],
    actionLabel: 'Configure',
  },
];

const INITIAL_NOTIFICATIONS: NotificationPref[] = [
  {
    id: 'email',
    label: 'Email Notifications',
    description: 'Receive updates and alerts via email',
    enabled: true,
  },
  {
    id: 'push',
    label: 'Push Notifications',
    description: 'Browser and mobile push alerts',
    enabled: true,
  },
  {
    id: 'slack',
    label: 'Slack Notifications',
    description: 'Send notifications to connected Slack channels',
    enabled: false,
  },
  {
    id: 'weekly',
    label: 'Weekly Digest',
    description: 'Receive a weekly summary of platform activity',
    enabled: true,
  },
  {
    id: 'incident',
    label: 'Incident Alerts',
    description: 'Immediate alerts for system incidents and outages',
    enabled: true,
  },
];

const API_KEYS = [
  {
    id: 'k1',
    name: 'Production API Key',
    prefix: 'apex_prod_',
    created: '2025-12-01',
    lastUsed: '2 min ago',
    status: 'active' as const,
  },
  {
    id: 'k2',
    name: 'Staging API Key',
    prefix: 'apex_stg_',
    created: '2025-11-15',
    lastUsed: '1 hr ago',
    status: 'active' as const,
  },
  {
    id: 'k3',
    name: 'Development Key',
    prefix: 'apex_dev_',
    created: '2025-10-20',
    lastUsed: '3 days ago',
    status: 'active' as const,
  },
];

export const SettingsPage = memo(function SettingsPage() {
  const [notifications, setNotifications] =
    useState<NotificationPref[]>(INITIAL_NOTIFICATIONS);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);

  const handleNotificationToggle = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-500/10">
          <Settings className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-gray-400">
            Platform configuration and preferences
          </p>
        </div>
      </div>

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.iconBg}`}
                >
                  {section.icon}
                </div>
                <div>
                  <h3 className="font-medium text-white">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
              {section.details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-400">{detail.label}</span>
                  <span className="text-gray-300">{detail.value}</span>
                </div>
              ))}
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.08]">
              {section.actionLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
            <Bell className="h-4 w-4 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Notification Preferences
          </h2>
        </div>
        <div className="space-y-3">
          {notifications.map((pref) => (
            <div
              key={pref.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white">{pref.label}</h4>
                <p className="text-xs text-gray-500">{pref.description}</p>
              </div>
              <button
                onClick={() => handleNotificationToggle(pref.id)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  pref.enabled ? 'bg-emerald-500/40' : 'bg-white/10'
                }`}
                aria-label={`Toggle ${pref.label}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    pref.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Key className="h-4 w-4 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">API Keys</h2>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30">
            <Key className="h-3.5 w-3.5" />
            Generate Key
          </button>
        </div>
        <div className="space-y-2">
          {API_KEYS.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white">{key.name}</h4>
                <p className="text-xs text-gray-500 font-mono">
                  {visibleKey === key.id
                    ? `${key.prefix}${'x'.repeat(24)}`
                    : `${key.prefix}${'*'.repeat(24)}`}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="text-gray-400">Last used: {key.lastUsed}</span>
                <span className="text-gray-500 mt-0.5">
                  Created: {key.created}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setVisibleKey(visibleKey === key.id ? null : key.id)
                  }
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
                  aria-label="Toggle visibility"
                >
                  {visibleKey === key.id ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
                  aria-label="Copy key"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SettingsPage;
