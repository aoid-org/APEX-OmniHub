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


export function useManMode(isDemo: boolean) {
  const [approvals, setApprovals] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchApprovals = async () => {
      try {
        const response = await fetch('/api/man-mode/approvals');
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        const data = await response.json();
        if (mounted) {
          setApprovals(data);
          setLoading(false);
        }
      } catch (error) {
        console.warn('[MANMode] Failed to fetch live approvals, keeping current state:', error);
        // Fallback for tests if needed, but per instructions we keep last known state and log warning.
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchApprovals();

    // Poll every 10 seconds
    const interval = setInterval(fetchApprovals, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
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
