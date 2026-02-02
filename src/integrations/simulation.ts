/**
 * Integration Simulation & Live Edge Functions
 * 
 * PHASE 6: Provides integration functionality for both demo and live modes.
 * Demo mode: Simulates webhook receives, calendar syncs, API key generation
 * Live mode: Calls Supabase edge functions
 */

import { useExecute, demoStore } from '@/demo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookPayload {
  source: string;
  event: string;
  data: Record<string, unknown>;
}

export interface CalendarSyncResult {
  success: boolean;
  eventsAdded: number;
  errors: string[];
}

export interface ApiKeyResult {
  key: string;
  prefix: string;
  expiresAt: string;
}

// ============================================================================
// DEMO SIMULATIONS
// ============================================================================

/**
 * Simulate receiving a webhook event
 */
function simulateWebhookReceive(payload: WebhookPayload): void {
  demoStore.addEvent({
    type: `webhook.${payload.event}`,
    source: payload.source,
    payload: payload.data,
  });
  
  // Simulate delayed processing
  setTimeout(() => {
    demoStore.addTask({
      action: `process_${payload.event}`,
      payload: payload.data,
    });
  }, 500);
}

/**
 * Simulate calendar sync
 */
function simulateCalendarSync(): CalendarSyncResult {
  // Add some demo events
  const demoCalendarEvents = [
    { type: 'user.action', source: 'calendar', payload: { title: 'Team Standup', time: '9:00 AM' } },
    { type: 'user.action', source: 'calendar', payload: { title: 'Client Call', time: '2:00 PM' } },
  ];
  
  demoCalendarEvents.forEach((event) => {
    demoStore.addEvent(event);
  });
  
  return {
    success: true,
    eventsAdded: demoCalendarEvents.length,
    errors: [],
  };
}

/**
 * Simulate API key generation
 */
function simulateApiKeyGeneration(integrationId: string): ApiKeyResult {
  const key = demoStore.generateApiKey(integrationId);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    key,
    prefix: key.slice(0, 12) + '****',
    expiresAt,
  };
}

// ============================================================================
// INTEGRATION HOOKS
// ============================================================================

/**
 * Hook for receiving webhook events
 */
export function useReceiveWebhook() {
  const { execute, isExecuting } = useExecute();

  const receiveWebhook = async (payload: WebhookPayload) => {
    return execute('receiveWebhook', {
      demo: () => {
        simulateWebhookReceive(payload);
        return { processed: true, eventId: `demo_${Date.now()}` };
      },
      live: async () => {
        const { data, error } = await supabase.functions.invoke('receive-webhook', {
          body: payload,
        });
        if (error) throw error;
        return data as { processed: boolean; eventId: string };
      },
      successMessage: 'Webhook received',
      requiresAuth: false,
      demoToastMessage: 'Webhook simulated (Demo)',
    });
  };

  return { receiveWebhook, isExecuting };
}

/**
 * Hook for syncing calendar
 */
export function useSyncCalendar() {
  const { execute, isExecuting } = useExecute();

  const syncCalendar = async () => {
    return execute('syncCalendar', {
      demo: () => simulateCalendarSync(),
      live: async () => {
        const { data, error } = await supabase.functions.invoke('sync-calendar', {});
        if (error) throw error;
        return data as CalendarSyncResult;
      },
      successMessage: 'Calendar synced',
      requiresAuth: true,
      demoToastMessage: 'Calendar sync simulated (Demo)',
    });
  };

  return { syncCalendar, isExecuting };
}

/**
 * Hook for generating API keys
 */
export function useGenerateApiKey() {
  const { execute, isExecuting } = useExecute();

  const generateKey = async (integrationId: string) => {
    return execute('generateApiKey', {
      demo: () => simulateApiKeyGeneration(integrationId),
      live: async () => {
        const { data, error } = await supabase.functions.invoke('generate-api-key', {
          body: { integrationId },
        });
        if (error) throw error;
        return data as ApiKeyResult;
      },
      successMessage: 'API key generated',
      requiresAuth: true,
      demoToastMessage: 'API key simulated (Demo)',
    });
  };

  return { generateKey, isExecuting };
}

/**
 * Hook for testing integration connection
 */
export function useTestConnection() {
  const { execute, isExecuting } = useExecute();

  const testConnection = async (integrationId: string) => {
    return execute('testConnection', {
      demo: () => {
        // SAFE: Deterministic simulation for demo UX - no security context
        // Demo always succeeds with consistent latency based on integrationId
        const latencyMs = 50 + ((integrationId.codePointAt(0) ?? 97) % 150);
        return { 
          connected: true, 
          latencyMs,
          version: 'demo-v1.0.0',
        };
      },
      live: async () => {
        const { data, error } = await supabase.functions.invoke('test-connection', {
          body: { integrationId },
        });
        if (error) throw error;
        return data as { connected: boolean; latencyMs: number; version: string };
      },
      successMessage: 'Connection successful',
      errorMessage: 'Connection failed',
      requiresAuth: true,
    });
  };

  return { testConnection, isExecuting };
}

// ============================================================================
// STANDALONE FUNCTIONS
// ============================================================================

/**
 * Trigger a demo webhook event (for testing/demo purposes)
 */
export function triggerDemoWebhook(source: string, event: string): void {
  simulateWebhookReceive({
    source,
    event,
    data: {
      timestamp: new Date().toISOString(),
      demo: true,
    },
  });
  
  toast.info(`Demo webhook: ${source}.${event}`, {
    description: 'Event added to demo store',
  });
}

/**
 * Reset all demo integration data
 */
export function resetDemoIntegrations(): void {
  demoStore.reset();
  toast.success('Demo data reset', {
    description: 'All integrations returned to initial state',
  });
}
