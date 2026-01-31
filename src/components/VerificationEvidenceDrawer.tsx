/**
 * APEX Resilience Evidence Drawer
 * Progressive disclosure - shows ONLY what requires action
 */

import { useState, useEffect } from 'react';
import type { VerificationItem, VerificationDecision } from '@/lib/verification/types';
import { submitVerificationDecision, formatDuration } from '@/lib/verification/api';

interface Props {
  item: VerificationItem;
  onClose: () => void;
}

export function VerificationEvidenceDrawer({ item, onClose }: Props) {
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Keyboard-first: Escape to close drawer
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleDecision(decision: 'approve' | 'reject') {
    if (submitting) return;

    setSubmitting(true);
    try {
      const verificationDecision: VerificationDecision = {
        itemId: item.id,
        decision,
        reviewer: 'JR', // TODO: Get from auth context
        timestamp: new Date(),
      };

      await submitVerificationDecision(verificationDecision);
      onClose(); // Close and refresh
    } catch (error) {
      console.error('Decision submission failed:', error);
      alert('Failed to submit decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Find layers that need attention
  const warningLayers = item.layers.filter((l) => l.status === 'warning');
  const passedLayers = item.layers.filter((l) => l.status === 'passed');
  const failedLayers = item.layers.filter((l) => l.status === 'failed');

  return (
    <div className="evidence-drawer-overlay" onClick={onClose}>
      <div className="evidence-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header with status */}
        <header className="evidence-header">
          <div className="evidence-header__title">
            <span className={`evidence-icon evidence-icon--${item.status}`}>
              {getStatusIcon(item.status)}
            </span>
            <h2>
              #{item.number} - {item.title}
            </h2>
          </div>
          <span className="evidence-status">
            {item.requiresReview ? 'REVIEW REQUIRED' : getStatusLabel(item.status)}
          </span>
        </header>

        <div className="evidence-content">
          {/* Warning Section - ONLY shown when action needed */}
          {warningLayers.length > 0 && (
            <section className="evidence-section evidence-section--warning">
              <h3>Verification requires your decision:</h3>

              {warningLayers.map((layer) => (
                <div key={layer.layer} className="evidence-card">
                  <div className="evidence-card__header">
                    <h4>{getLayerTitle(layer.layer)}</h4>
                    <span className="evidence-confidence">{layer.confidence}%</span>
                  </div>

                  <p className="evidence-description">
                    {layer.details}
                  </p>

                  {layer.changes && layer.changes.length > 0 && (
                    <div className="evidence-files">
                      <p>
                        Affects:{' '}
                        {layer.changes[0].files.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="evidence-actions">
                    <button
                      className="evidence-btn evidence-btn--link"
                      onClick={() => setShowDetails(layer.layer)}
                    >
                      View Diff ↗
                    </button>
                    <button
                      className="evidence-btn evidence-btn--approve"
                      onClick={() => handleDecision('approve')}
                      disabled={submitting}
                    >
                      Approve ✓
                    </button>
                    <button
                      className="evidence-btn evidence-btn--reject"
                      onClick={() => handleDecision('reject')}
                      disabled={submitting}
                    >
                      Reject ✗
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Failed Section */}
          {failedLayers.length > 0 && (
            <section className="evidence-section evidence-section--error">
              <h3>Verification failed:</h3>

              {failedLayers.map((layer) => (
                <div key={layer.layer} className="evidence-card evidence-card--error">
                  <h4>{getLayerTitle(layer.layer)}</h4>
                  <p>{layer.details}</p>
                  <button
                    className="evidence-btn evidence-btn--link"
                    onClick={() => setShowDetails(layer.layer)}
                  >
                    Details ↗
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* Passed Checks - Collapsed by default (progressive disclosure) */}
          {passedLayers.length > 0 && (
            <section className="evidence-section">
              <h3>All other checks passed:</h3>

              <div className="evidence-passed">
                {passedLayers.map((layer) => (
                  <div key={layer.layer} className="evidence-passed__item">
                    <span className="evidence-passed__icon">✓</span>
                    <span className="evidence-passed__label">
                      {getLayerTitle(layer.layer)}: {layer.details}
                    </span>
                    <span className="evidence-passed__duration">
                      {formatDuration(layer.duration)}
                    </span>
                    <button
                      className="evidence-btn evidence-btn--link-small"
                      onClick={() => setShowDetails(layer.layer)}
                    >
                      Details ↗
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Primary Actions */}
          {item.status === 'review' && (
            <div className="evidence-primary-actions">
              <button
                className="evidence-btn evidence-btn--approve-all"
                onClick={() => handleDecision('approve')}
                disabled={submitting}
              >
                Approve All ✓
              </button>
              <button
                className="evidence-btn evidence-btn--request-changes"
                onClick={() => handleDecision('reject')}
                disabled={submitting}
              >
                Request Changes
              </button>
            </div>
          )}

          {/* Close hint */}
          <div className="evidence-hint">
            Press Escape to close
          </div>
        </div>
      </div>
    </div>
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

function getLayerTitle(layer: string): string {
  switch (layer) {
    case 'tests':
      return 'Tests';
    case 'visual':
      return 'Visual Change Detected';
    case 'security':
      return 'Security';
    case 'coverage':
      return 'Coverage';
    default:
      return layer;
  }
}
