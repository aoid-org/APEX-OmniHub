/**
 * OmniLink Delivery Service
 * Handles delivery of events to OmniLink with retry/backoff
 */

import { supabase } from '@/integrations/supabase/client';
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
 * TODO: Implement actual retry logic and dead-letter queue
 */
export class OmniLinkDelivery {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async deliverBatch(
    events: TranslatedEvent[],
    appId: string,
    correlationId: string
  ): Promise<number> {
    console.log(`[${correlationId}] Delivering ${events.length} events to OmniLink for app ${appId}`);

    let successCount = 0;

    for (const event of events) {
      try {
        await this.deliverEvent(event, correlationId);
        successCount++;
      } catch (error) {
        console.error(`[${correlationId}] Failed to deliver event ${event.eventId}:`, error);

        // Add to dead-letter queue
        const entry: IngressBufferEntry = {
          correlation_id: correlationId,
          raw_input: JSON.stringify(event),
          error_reason: error instanceof Error ? error.message : String(error),
          status: 'pending',
          risk_score: (event.metadata?.risk_lane as string) === 'RED' ? 100 : 0,
          source_type: 'omnilink_delivery_failure',
          user_id: event.userId,
        };

        // cast supabase to any because ingress_buffer table is not in generated types yet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: dlqError } = await (supabase as any).from('ingress_buffer').insert(entry);

        if (dlqError) {
          console.error(`[${correlationId}] Failed to write to DLQ for event ${event.eventId}:`, dlqError);
        } else {
          console.log(`[${correlationId}] Event ${event.eventId} written to DLQ`);
        }
      }
    }

    console.log(`[${correlationId}] Delivered ${successCount}/${events.length} events`);
    return successCount;
  }

  private async deliverEvent(
    event: TranslatedEvent,
    correlationId: string
  ): Promise<void> {
    // TODO: Implement retry logic with exponential backoff
    await requestOmniLink({
      path: '/events',
      method: 'POST',
      body: event,
      headers: {
        'X-Correlation-ID': correlationId,
        'X-App-ID': event.appId
      }
    });
  }

  async getDeliveryStatus(_eventId: string): Promise<DeliveryResult | null> {
    // TODO: Implement delivery status tracking
    return null;
  }

  async retryFailedDeliveries(appId: string): Promise<number> {
    // TODO: Implement retry logic for failed deliveries
    console.log(`Retrying failed deliveries for app ${appId}`);
    return 0;
  }
}