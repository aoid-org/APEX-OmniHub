/**
 * Policy Engine
 * Filters events based on app-specific policies
 */

import { CanonicalEvent } from '../types/canonical';

export interface AppFilterProfile {
  appId: string;
  allowedEventTypes: string[];
  piiHandling: 'mask' | 'redact' | 'allow';
  emotionalDataEnabled: boolean;
  contentCategories: {
    allow: string[];
    deny: string[];
  };
  rateLimit: {
    eventsPerMinute: number;
    burstLimit: number;
  };
}

/**
 * Policy engine for filtering and transforming events
 */
export class PolicyEngine {
  private profiles = new Map<string, AppFilterProfile>();

  async filter(
    events: CanonicalEvent[],
    appId: string,
    correlationId: string
  ): Promise<CanonicalEvent[]> {
    const profile = await this.getProfile(appId);
    if (!profile) {
      console.log(`[${correlationId}] No policy profile found for app ${appId}. Passing through all events.`);
      return events;
    }

    console.log(`[${correlationId}] Applying policy filter for app ${appId}, ${events.length} events`);

    const filteredEvents: CanonicalEvent[] = [];

    for (const event of events) {
      if (await this.shouldIncludeEvent(event, profile)) {
        filteredEvents.push(await this.transformEvent(event, profile));
      }
    }

    return filteredEvents;
  }

  async getProfile(appId: string): Promise<AppFilterProfile | null> {
    return this.profiles.get(appId) || null;
  }

  async setProfile(profile: AppFilterProfile): Promise<void> {
    this.profiles.set(profile.appId, profile);
  }

  async validateEvent(event: CanonicalEvent, appId: string): Promise<boolean> {
    const profile = await this.getProfile(appId);
    if (!profile) return true;

    return this.shouldIncludeEvent(event, profile);
  }

  private async shouldIncludeEvent(event: CanonicalEvent, profile: AppFilterProfile): Promise<boolean> {
    if (!profile.allowedEventTypes.includes(event.eventType)) return false;

    const { allow, deny } = profile.contentCategories;
    if (allow.length === 0 && deny.length === 0) return true;

    const content = JSON.stringify({ p: event.payload, m: event.metadata }).toLowerCase();

    // Deny list takes precedence
    if (deny.some(cat => content.includes(cat.toLowerCase()))) return false;

    // If allow list is present, must match at least one
    return allow.length === 0 || allow.some(cat => content.includes(cat.toLowerCase()));
  }

  private async transformEvent(event: CanonicalEvent, profile: AppFilterProfile): Promise<CanonicalEvent> {
    const clonedEvent: CanonicalEvent = JSON.parse(JSON.stringify(event));

    if (profile.piiHandling !== 'allow') {
      const piiFields = ['email', 'phone', 'ssn', 'address', 'name', 'user_email', 'phoneNumber'];
      const replacement = profile.piiHandling === 'redact' ? '[REDACTED]' : '***';
      this.applyRecursiveTransform(clonedEvent,
        key => piiFields.some(f => key.toLowerCase().includes(f.toLowerCase())),
        (obj, key) => { obj[key] = replacement; }
      );
    }

    if (!profile.emotionalDataEnabled) {
      const emotionalFields = ['sentiment', 'emotion', 'mood', 'emotional', 'score', 'mood_score'];
      this.applyRecursiveTransform(clonedEvent,
        key => emotionalFields.some(f => key.toLowerCase().includes(f.toLowerCase())),
        (obj, key) => { delete obj[key]; }
      );
    }

    return clonedEvent;
  }

  private applyRecursiveTransform(
    event: CanonicalEvent,
    shouldTransform: (key: string) => boolean,
    transform: (obj: Record<string, unknown>, key: string) => void
  ): void {
    [event.payload, event.metadata].forEach(part => {
      this.recursiveTransform(part as Record<string, unknown>, shouldTransform, transform);
    });
  }

  private recursiveTransform(
    obj: Record<string, unknown>,
    shouldTransform: (key: string) => boolean,
    transform: (obj: Record<string, unknown>, key: string) => void
  ): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (shouldTransform(key)) {
        transform(obj, key);
      } else {
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          this.recursiveTransform(value as Record<string, unknown>, shouldTransform, transform);
        }
      }
    }
  }
}
