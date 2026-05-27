/**
 * OutreachDispatcher — Automated outreach pipeline with MAN Mode queue
 *
 * Risk-aware dispatch:
 * - GREEN lane: auto-send immediately
 * - YELLOW lane: queue for review, auto-approve after 30s
 * - RED lane: queue for MAN Mode manual approval
 */

import type { RiskLane } from '../integrations/maestro/types';
import { requestOmniLink } from '../integrations/omnilink';

export interface OutreachPayload {
  readonly recipientId: string;
  readonly channel: 'email' | 'sms' | 'push' | 'in-app';
  readonly subject?: string;
  readonly body: string;
  readonly templateId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface OutreachQueueItem {
  readonly id: string;
  readonly payload: OutreachPayload;
  readonly riskLane: RiskLane;
  readonly status: 'pending' | 'approved' | 'sent' | 'rejected';
  readonly queuedAt: number;
}

const YELLOW_AUTO_APPROVE_MS = 30_000;

let outreachQueue: OutreachQueueItem[] = [];
let queueIdCounter = 0;

function generateId(): string {
  queueIdCounter += 1;
  return `outreach-${Date.now()}-${queueIdCounter}`;
}

async function sendOutreach(payload: OutreachPayload): Promise<void> {
  await requestOmniLink({
    path: '/outreach/send',
    method: 'POST',
    body: payload,
  });
}

export async function dispatchOutreach(
  payload: OutreachPayload,
  riskLane: RiskLane,
): Promise<OutreachQueueItem> {
  const item: OutreachQueueItem = {
    id: generateId(),
    payload,
    riskLane,
    status: 'pending',
    queuedAt: Date.now(),
  };

  if (riskLane === 'GREEN') {
    await sendOutreach(payload);
    const sent = { ...item, status: 'sent' as const };
    outreachQueue.push(sent);
    return sent;
  }

  outreachQueue.push(item);

  if (riskLane === 'YELLOW') {
    setTimeout(async () => {
      const idx = outreachQueue.findIndex(q => q.id === item.id && q.status === 'pending');
      if (idx !== -1) {
        await sendOutreach(payload);
        outreachQueue[idx] = { ...outreachQueue[idx], status: 'sent' };
      }
    }, YELLOW_AUTO_APPROVE_MS);
  }

  // RED lane stays pending for MAN Mode approval
  return item;
}

export function getOutreachQueue(): readonly OutreachQueueItem[] {
  return outreachQueue;
}

export async function approveOutreach(id: string): Promise<boolean> {
  const idx = outreachQueue.findIndex(q => q.id === id && q.status === 'pending');
  if (idx === -1) return false;

  await sendOutreach(outreachQueue[idx].payload);
  outreachQueue[idx] = { ...outreachQueue[idx], status: 'sent' };
  return true;
}

export function rejectOutreach(id: string): boolean {
  const idx = outreachQueue.findIndex(q => q.id === id && q.status === 'pending');
  if (idx === -1) return false;

  outreachQueue[idx] = { ...outreachQueue[idx], status: 'rejected' };
  return true;
}

export function clearOutreachQueue(): void {
  outreachQueue = [];
  queueIdCounter = 0;
}
