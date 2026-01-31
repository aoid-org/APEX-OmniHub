/**
 * APEX Resilience Verification Types
 * Minimalist interface for code/UI change verification
 */

export type VerificationStatus = 'pending' | 'running' | 'review' | 'approved' | 'rejected';

export type VerificationLayerResult = {
  layer: 'tests' | 'visual' | 'security' | 'coverage';
  status: 'passed' | 'failed' | 'warning';
  duration: number; // milliseconds
  confidence: number; // 0-100
  details?: string;
  changes?: VerificationChange[];
};

export type VerificationChange = {
  type: 'visual' | 'code' | 'security';
  description: string;
  files: string[];
  severity: 'low' | 'medium' | 'high';
  before?: string;
  after?: string;
  metadata?: Record<string, unknown>;
};

export type VerificationItem = {
  id: string;
  number: number; // PR/change number
  title: string;
  description?: string;
  status: VerificationStatus;
  confidence: number;
  duration?: number;
  submittedAt: Date;
  submittedBy: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  layers: VerificationLayerResult[];
  requiresReview: boolean;
  reviewReason?: string;
  evidenceUrl: string;
};

export type VerificationDecision = {
  itemId: string;
  decision: 'approve' | 'reject';
  reviewer: string;
  comment?: string;
  timestamp: Date;
};

export type VerificationQueueFilters = {
  status?: VerificationStatus[];
  requiresReview?: boolean;
  submittedBy?: string;
  dateRange?: { from: Date; to: Date };
};

export type TeamActivity = {
  user: string;
  action: 'submitted' | 'approved' | 'rejected' | 'reviewing';
  itemId: string;
  itemTitle: string;
  timestamp: Date;
};

export type SystemHealth = {
  firstPassSuccessRate: number; // 0-100
  criticalIncidents: number;
  avgVerificationTime: number; // milliseconds
  periodStart: Date;
  periodEnd: Date;
};
