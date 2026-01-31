/**
 * APEX Resilience Verification API
 * Backend integration for verification queue
 */

import type {
  VerificationItem,
  VerificationDecision,
  VerificationQueueFilters,
  TeamActivity,
  SystemHealth,
} from './types';

// Mock data for development - replace with Supabase calls in production
const mockVerifications: VerificationItem[] = [
  {
    id: 'v_847',
    number: 847,
    title: 'Auth module refactor',
    status: 'approved',
    confidence: 94,
    duration: 2400,
    submittedAt: new Date(Date.now() - 3600000),
    submittedBy: 'You',
    reviewedAt: new Date(Date.now() - 1800000),
    reviewedBy: 'You',
    requiresReview: false,
    evidenceUrl: '/verification/v_847',
    layers: [
      {
        layer: 'tests',
        status: 'passed',
        duration: 1200,
        confidence: 100,
        details: '847/847 tests passed',
      },
      {
        layer: 'visual',
        status: 'passed',
        duration: 800,
        confidence: 100,
        details: '0 visual changes detected',
      },
      {
        layer: 'security',
        status: 'passed',
        duration: 300,
        confidence: 100,
        details: '0 security issues',
      },
      {
        layer: 'coverage',
        status: 'passed',
        duration: 100,
        confidence: 94,
        details: '94% coverage',
      },
    ],
  },
  {
    id: 'v_848',
    number: 848,
    title: 'Payment UI redesign',
    status: 'review',
    confidence: 87,
    duration: 4100,
    submittedAt: new Date(Date.now() - 1200000),
    submittedBy: 'You',
    requiresReview: true,
    reviewReason: 'Visual change detected',
    evidenceUrl: '/verification/v_848',
    layers: [
      {
        layer: 'tests',
        status: 'passed',
        duration: 2400,
        confidence: 100,
        details: '847/847 tests passed',
      },
      {
        layer: 'visual',
        status: 'warning',
        duration: 1100,
        confidence: 87,
        details: 'Button color changed',
        changes: [
          {
            type: 'visual',
            description: 'Button color changed from #0066CC to #0052A3',
            files: ['src/components/checkout.tsx', 'src/components/payment-form.tsx'],
            severity: 'medium',
            before: '#0066CC',
            after: '#0052A3',
            metadata: { luminanceChange: '-3.2%', wcagCompliant: true },
          },
        ],
      },
      {
        layer: 'security',
        status: 'passed',
        duration: 500,
        confidence: 100,
        details: '0 security issues',
      },
      {
        layer: 'coverage',
        status: 'passed',
        duration: 100,
        confidence: 94,
        details: '94% coverage (+2%)',
      },
    ],
  },
  {
    id: 'v_849',
    number: 849,
    title: 'Database migration',
    status: 'running',
    confidence: 0,
    submittedAt: new Date(Date.now() - 300000),
    submittedBy: 'You',
    requiresReview: false,
    evidenceUrl: '/verification/v_849',
    layers: [],
  },
];

const mockTeamActivity: TeamActivity[] = [
  {
    user: 'Sarah',
    action: 'reviewing',
    itemId: 'v_848',
    itemTitle: '#848 visual changes',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    user: 'Mike',
    action: 'approved',
    itemId: 'v_846',
    itemTitle: '#846 security scan',
    timestamp: new Date(Date.now() - 480000),
  },
  {
    user: 'You',
    action: 'submitted',
    itemId: 'v_847',
    itemTitle: '#847 for verification',
    timestamp: new Date(Date.now() - 720000),
  },
];

const mockSystemHealth: SystemHealth = {
  firstPassSuccessRate: 89,
  criticalIncidents: 0,
  avgVerificationTime: 3200,
  periodStart: new Date(Date.now() - 30 * 24 * 3600000),
  periodEnd: new Date(),
};

/**
 * Fetch verification queue
 */
export async function fetchVerificationQueue(
  filters?: VerificationQueueFilters
): Promise<VerificationItem[]> {
  // TODO: Replace with Supabase query
  // const { data, error } = await supabase
  //   .from('verification_queue')
  //   .select('*')
  //   .order('submitted_at', { ascending: false });

  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay

  let filtered = [...mockVerifications];

  if (filters?.status) {
    filtered = filtered.filter((v) => filters.status!.includes(v.status));
  }

  if (filters?.requiresReview !== undefined) {
    filtered = filtered.filter((v) => v.requiresReview === filters.requiresReview);
  }

  return filtered;
}

/**
 * Fetch single verification by ID
 */
export async function fetchVerificationById(id: string): Promise<VerificationItem | null> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockVerifications.find((v) => v.id === id) || null;
}

/**
 * Submit verification decision
 */
export async function submitVerificationDecision(
  decision: VerificationDecision
): Promise<{ success: boolean; error?: string }> {
  // TODO: Replace with Supabase mutation
  // const { error } = await supabase.rpc('decide_verification', {
  //   p_item_id: decision.itemId,
  //   p_decision: decision.decision,
  //   p_comment: decision.comment,
  // });

  await new Promise((resolve) => setTimeout(resolve, 200));

  // Update mock data
  const item = mockVerifications.find((v) => v.id === decision.itemId);
  if (item) {
    item.status = decision.decision === 'approve' ? 'approved' : 'rejected';
    item.reviewedAt = decision.timestamp;
    item.reviewedBy = decision.reviewer;
  }

  return { success: true };
}

/**
 * Fetch team activity
 */
export async function fetchTeamActivity(limit = 10): Promise<TeamActivity[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockTeamActivity.slice(0, limit);
}

/**
 * Fetch system health metrics
 */
export async function fetchSystemHealth(): Promise<SystemHealth> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockSystemHealth;
}

/**
 * Format relative time (2m ago, 8m ago, 12m ago)
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Format duration (2.4s, 4.1s)
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
