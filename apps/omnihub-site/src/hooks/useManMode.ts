import { useState, useEffect } from 'react';

// Define the type for an Approval task
export interface ApprovalTask {
  id: string;
  agent: string;
  risk_class: 'A' | 'B' | 'C' | 'D';
  confidence_score: number;
  reasoning: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
}

const MOCK_APPROVALS: ApprovalTask[] = [
  {
    id: 'auth-req-001',
    agent: 'Financial_Agent_v4',
    risk_class: 'A',
    confidence_score: 0.95,
    reasoning: 'Transaction exceeds threshold ($10k)',
    status: 'PENDING',
  },
  {
    id: 'auth-req-002',
    agent: 'Security_Bot_Alpha',
    risk_class: 'B',
    confidence_score: 0.88,
    reasoning: 'Unusual login pattern detected',
    status: 'PENDING',
  },
  {
    id: 'auth-req-003',
    agent: 'Data_Export_Tool',
    risk_class: 'C',
    confidence_score: 0.75,
    reasoning: 'Bulk export of user data',
    status: 'PENDING',
  },
  {
    id: 'auth-req-004',
    agent: 'Deployment_Script',
    risk_class: 'D',
    confidence_score: 0.6,
    reasoning: 'Production deployment triggered outside window',
    status: 'PENDING',
  },
];

export function useManMode(isDemo: boolean) {
  const [approvals, setApprovals] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => {
      if (isDemo) {
        setApprovals(MOCK_APPROVALS);
      } else {
        // In real implementation, fetch from API
        // For now, return empty or mock data
        setApprovals([]);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [isDemo]);

  // Handler functions for approve/deny actions
  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: 'APPROVED' } : task
      )
    );
  };

  const handleDeny = (id: string) => {
    setApprovals((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: 'DENIED' } : task
      )
    );
  };

  return { approvals, loading, handleApprove, handleDeny };
}
