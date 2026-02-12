/**
 * OmniLink Delivery Service
 * Handles delivery of events to OmniLink with retry/backoff
 */

import { supabase } from '@/integrations/supabase/client';
import { waitWithBackoff } from '@/lib/backoff';
import { IngressBufferEntry } from '../types/dlq';
import { TranslatedEvent } from '../translation/translator';
import { requestOmniLink } from '../../integrations/omnilink';

export interface DeliveryResult {
  eventId: string;
  success: boolean;
  attempts: number;
  error?: string;
  deliveredAt?: Date;
}

/**
 * Delivery service for OmniLink integration
 */
export class OmniLinkDelivery {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async deliverBatch(
    events: TranslatedEvent[],
    appId: string,
    correlationId: string
  ): Promise<number> {
    return this.executeBatchDelivery(
      events,
      correlationId,
      `Delivering ${events.length} events to OmniLink for app ${appId}`,
      async (event) => await this.deliverEvent(event, correlationId),
      async (event, error) => {
        console.error(`[${correlationId}] Failed to deliver event ${event.eventId}:`, error);
        await this.addToDLQ(event, correlationId, error);
      }
    );
  }

  private async deliverEvent(
    event: TranslatedEvent,
    correlationId: string
  ): Promise<void> {
    let lastError: Error | undefined;
    const maxAttempts = Math.max(1, this.maxRetries);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await requestOmniLink({
          path: '/events',
          method: 'POST',
          body: event,
          headers: {
            'X-Correlation-ID': correlationId,
            'X-App-ID': event.appId
          }
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[${correlationId}] Delivery attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < maxAttempts) {
          await waitWithBackoff(attempt, { baseMs: this.baseDelay });
        }
      }
    }

    throw lastError || new Error('Delivery failed with unknown error');
  }

  async getDeliveryStatus(_eventId: string): Promise<DeliveryResult | null> {
    return null;
  }

  async retryFailedDeliveries(appId: string): Promise<number> {
    const correlationId = `retry-${Date.now()}`;

    // Fetch failed events
    const failedEvents = await this.fetchPendingDLQEvents(appId);

    if (!failedEvents?.length) {
      console.log(`[${correlationId}] Retrying failed deliveries for app ${appId}`);
      return 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.executeBatchDelivery<any>(
      failedEvents,
      correlationId,
      `Retrying failed deliveries for app ${appId}`,
      async (entry) => {
        const rawInput = entry.raw_input;
        const event: TranslatedEvent = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
        await this.deliverEvent(event, correlationId);
        await this.markDLQEntryProcessed(entry.id);
      },
      async (entry, error) => {
        console.warn(`[${correlationId}] Retry failed for event ${entry.id}:`, error);
        await this.updateDLQRetryCount(entry.id, entry.retry_count || 0, error);
      }
    );
  }

  private async executeBatchDelivery<T>(
    items: T[],
    correlationId: string,
    startLogMessage: string,
    processor: (item: T) => Promise<void>,
    errorHandler: (item: T, error: unknown) => Promise<void>
  ): Promise<number> {
    console.log(`[${correlationId}] ${startLogMessage}`);

    const successCount = await this.processEvents(
      items,
      processor,
      errorHandler
    );

    console.log(`[${correlationId}] Processed ${successCount}/${items.length} events successfully`);
    return successCount;
  }

  private async processEvents<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    errorHandler: (item: T, error: unknown) => Promise<void>
  ): Promise<number> {
    let successCount = 0;
    for (const item of items) {
      try {
        await processor(item);
        successCount++;
      } catch (error) {
        await errorHandler(item, error);
      }
    }
    return successCount;
  }

  private async addToDLQ(event: TranslatedEvent, correlationId: string, error: unknown): Promise<void> {
    const entry: IngressBufferEntry = {
      correlation_id: correlationId,
      raw_input: JSON.stringify(event),
      error_reason: error instanceof Error ? error.message : String(error),
      status: 'pending',
      risk_score: (event.metadata?.risk_lane as string) === 'RED' ? 100 : 0,
      source_type: 'omnilink_delivery_failure',
      user_id: event.userId,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dlqError } = await (supabase as any).from('ingress_buffer').insert(entry);

    if (dlqError) {
      console.error(`[${correlationId}] Failed to write to DLQ for event ${event.eventId}:`, dlqError);
    } else {
      console.log(`[${correlationId}] Event ${event.eventId} written to DLQ`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchPendingDLQEvents(appId: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: failedEvents, error } = await (supabase as any)
      .from('ingress_buffer')
      .select('*')
      .eq('source_type', 'omnilink_delivery_failure')
      .eq('status', 'pending')
      .eq('raw_input->>appId', appId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Failed to fetch from DLQ:', error);
      throw error;
    }
    return failedEvents || [];
  }

  private async markDLQEntryProcessed(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('ingress_buffer')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', id);
  }

  private async updateDLQRetryCount(id: string, currentRetryCount: number, error: unknown): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('ingress_buffer')
      .update({
        retry_count: currentRetryCount + 1,
        error_reason: error instanceof Error ? error.message : String(error),
        last_retry_at: new Date().toISOString()
      })
      .eq('id', id);
  }
}
