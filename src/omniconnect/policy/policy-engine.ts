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
    // 1. Filter by event type
    if (!profile.allowedEventTypes.includes(event.eventType)) {
      return false;
    }

    // 2. Filter by content categories
    if (profile.contentCategories.deny.length > 0 || profile.contentCategories.allow.length > 0) {
      const content = this.getEventContentString(event).toLowerCase();

      // Deny list takes precedence
      for (const category of profile.contentCategories.deny) {
        if (content.includes(category.toLowerCase())) {
          return false;
        }
      }

      // If allow list is present, must match at least one
      if (this.allowCategoriesPresent(profile)) {
        let allowed = false;
        for (const category of profile.contentCategories.allow) {
          if (content.includes(category.toLowerCase())) {
            allowed = true;
            break;
          }
        }
        if (!allowed) return false;
      }
    }

    return true;
  }

  private allowCategoriesPresent(profile: AppFilterProfile): boolean {
    return profile.contentCategories.allow && profile.contentCategories.allow.length > 0;
  }

  private async transformEvent(event: CanonicalEvent, profile: AppFilterProfile): Promise<CanonicalEvent> {
    // Deep clone to avoid mutating original event
    const clonedEvent: CanonicalEvent = JSON.parse(JSON.stringify(event));

    // 1. Handle PII
    if (profile.piiHandling !== 'allow') {
      this.handlePii(clonedEvent, profile.piiHandling);
    }

    // 2. Handle Emotional Data
    if (!profile.emotionalDataEnabled) {
      this.stripEmotionalData(clonedEvent);
    }

    return clonedEvent;
  }

  private handlePii(event: CanonicalEvent, handling: 'mask' | 'redact'): void {
    const piiFields = ['email', 'phone', 'ssn', 'address', 'name', 'user_email', 'phoneNumber'];
    const replacement = handling === 'redact' ? '[REDACTED]' : '***';

    const processObject = (obj: Record<string, any>) => {
      for (const key in obj) {
        if (piiFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = replacement;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          processObject(obj[key]);
        }
      }
    };

    processObject(event.payload);
    processObject(event.metadata);
  }

  private stripEmotionalData(event: CanonicalEvent): void {
    const emotionalFields = ['sentiment', 'emotion', 'mood', 'emotional', 'score', 'mood_score'];

    const processObject = (obj: Record<string, any>) => {
      for (const key in obj) {
        if (emotionalFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          processObject(obj[key]);
        }
      }
    };

    processObject(event.payload);
    processObject(event.metadata);
  }

  private getEventContentString(event: CanonicalEvent): string {
    const payloadStr = JSON.stringify(event.payload);
    const metadataStr = JSON.stringify(event.metadata);
    return `${payloadStr} ${metadataStr}`;
  }
}
