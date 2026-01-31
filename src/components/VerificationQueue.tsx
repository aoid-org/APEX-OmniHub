/**
 * APEX Resilience Verification Queue
 * Minimalist single-screen dashboard - Phase 1 implementation
 */

import { useState, useEffect } from 'react';
import type { VerificationItem, TeamActivity, SystemHealth } from '@/lib/verification/types';
import {
  fetchVerificationQueue,
  fetchTeamActivity,
  fetchSystemHealth,
  formatRelativeTime,
  formatDuration,
} from '@/lib/verification/api';
import { VerificationEvidenceDrawer } from './VerificationEvidenceDrawer';

export function VerificationQueue() {
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [queueData, activityData, healthData] = await Promise.all([
        fetchVerificationQueue(),
        fetchTeamActivity(3),
        fetchSystemHealth(),
      ]);
      setQueue(queueData);
      setActivity(activityData);
      setHealth(healthData);
    } finally {
      setLoading(false);
    }
  }

  // Reload when drawer closes
  function handleCloseDrawer() {
    setSelectedItem(null);
    loadData(); // Refresh data after decision
  }

  if (loading) {
    return (
      <div className="verification-queue">
        <header className="queue-header">
          <h1>APEX-OmniHub</h1>
        </header>
        <div className="queue-loading">Loading verification queue...</div>
      </div>
    );
  }

  return (
    <>
      <div className="verification-queue">
        {/* Header - Minimalist */}
        <header className="queue-header">
          <h1>APEX-OmniHub</h1>
          <div className="queue-header__actions">
            <span className="queue-user">JR</span>
            <button className="queue-settings" aria-label="Settings">
              ⚙️
            </button>
          </div>
        </header>

        <main className="queue-content">
          {/* Today's Queue - Primary section (80% of usage) */}
          <section className="queue-section">
            <div className="queue-section__header">
              <h2>Today's Verification Queue</h2>
              <span className="queue-count">{queue.length} items</span>
            </div>
            <div className="queue-divider" />

            <div className="queue-items">
              {queue.length === 0 ? (
                <div className="queue-empty">No items in queue</div>
              ) : (
                queue.map((item) => (
                  <button
                    key={item.id}
                    className={`queue-item queue-item--${item.status}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span className="queue-item__icon">
                      {getStatusIcon(item.status)}
                    </span>
                    <span className="queue-item__title">
                      #{item.number} - {item.title}
                    </span>
                    <span className="queue-item__status">
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="queue-item__duration">
                      {item.duration ? formatDuration(item.duration) : '--'}
                    </span>
                    <span className="queue-item__confidence">
                      {item.confidence > 0 ? `${item.confidence}%` : '--'}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="queue-hint">Click any row to see evidence</div>
          </section>

          {/* Team Activity - Secondary information */}
          <section className="queue-section queue-section--minor">
            <div className="queue-divider" />
            <h2>Team Activity (Live)</h2>
            <div className="queue-divider" />

            <div className="activity-list">
              {activity.map((item, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-item__user">{item.user}</span>
                  <span className="activity-item__arrow">→</span>
                  <span className="activity-item__action">
                    {getActivityText(item)}
                  </span>
                  <span className="activity-item__time">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* System Health - Tertiary information */}
          <section className="queue-section queue-section--minor">
            <div className="queue-divider" />
            <h2>System Health</h2>
            <div className="queue-divider" />

            {health && (
              <div className="health-metrics">
                <div className="health-metric">
                  <div className="health-bar">
                    <div
                      className="health-bar__fill"
                      style={{ width: `${health.firstPassSuccessRate}%` }}
                    />
                  </div>
                  <span className="health-label">
                    {health.firstPassSuccessRate}% First-Pass Success (Last 30 days)
                  </span>
                </div>

                <div className="health-metric">
                  <div className="health-bar health-bar--full">
                    <div className="health-bar__fill health-bar__fill--success" style={{ width: '100%' }} />
                  </div>
                  <span className="health-label">
                    {health.criticalIncidents} Critical Incidents
                  </span>
                </div>

                <div className="health-metric">
                  <div className="health-bar">
                    <div
                      className="health-bar__fill"
                      style={{ width: `${Math.min((health.avgVerificationTime / 5000) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="health-label">
                    {formatDuration(health.avgVerificationTime)} Avg Verification Time
                  </span>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Evidence Drawer - Progressive disclosure */}
      {selectedItem && (
        <VerificationEvidenceDrawer
          item={selectedItem}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}

// Helper functions
function getStatusIcon(status: string): string {
  switch (status) {
    case 'approved':
      return '✓';
    case 'review':
      return '⚠';
    case 'rejected':
      return '✗';
    case 'running':
      return '○';
    default:
      return '○';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'review':
      return 'REVIEW';
    case 'rejected':
      return 'REJECTED';
    case 'running':
      return 'RUNNING';
    default:
      return 'PENDING';
  }
}

function getActivityText(activity: TeamActivity): string {
  switch (activity.action) {
    case 'reviewing':
      return `Reviewing ${activity.itemTitle}`;
    case 'approved':
      return `Approved ${activity.itemTitle}`;
    case 'rejected':
      return `Rejected ${activity.itemTitle}`;
    case 'submitted':
      return `Submitted ${activity.itemTitle}`;
    default:
      return activity.itemTitle;
  }
}
