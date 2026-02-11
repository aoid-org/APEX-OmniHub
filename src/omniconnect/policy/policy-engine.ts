/**
 * Policy Engine
 * Filters events based on app-specific policies
 */

import { CanonicalEvent } from '../types/canonical';
import { AppFilterProfile } from '../types/policy';

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
      if (this.shouldInclude(event, profile)) {
        filteredEvents.push(this.transform(event, profile));
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
    return !profile || this.shouldInclude(event, profile);
  }

  private shouldInclude(event: CanonicalEvent, profile: AppFilterProfile): boolean {
    if (!profile.allowedEventTypes.includes(event.eventType)) return false;

    const { allow, deny } = profile.contentCategories;
    if (allow.length === 0 && deny.length === 0) return true;

    const body = JSON.stringify({ p: event.payload, m: event.metadata }).toLowerCase();
    const hasMatch = (list: string[]) => list.some(c => body.includes(c.toLowerCase()));

    return !hasMatch(deny) && (allow.length === 0 || hasMatch(allow));
  }

  private transform(event: CanonicalEvent, profile: AppFilterProfile): CanonicalEvent {
    const clone: CanonicalEvent = JSON.parse(JSON.stringify(event));

    const rules = [
      {
        enabled: profile.piiHandling !== 'allow',
        keys: ['email', 'phone', 'ssn', 'address', 'name', 'user_email', 'phoneNumber'],
        apply: (o: Record<string, unknown>, k: string) => {
          o[k] = profile.piiHandling === 'redact' ? '[REDACTED]' : '***';
        }
      },
      {
        enabled: !profile.emotionalDataEnabled,
        keys: ['sentiment', 'emotion', 'mood', 'emotional', 'score', 'mood_score'],
        apply: (o: Record<string, unknown>, k: string) => { delete o[k]; }
      }
    ];

    rules.forEach(r => {
      if (r.enabled) {
        const check = (k: string) => r.keys.some(f => k.toLowerCase().includes(f.toLowerCase()));
        [clone.payload, clone.metadata].forEach(p => this.walk(p as Record<string, unknown>, check, r.apply));
      }
    });

    return clone;
  }

  private walk(obj: Record<string, unknown>, check: (k: string) => boolean, apply: (o: Record<string, unknown>, k: string) => void): void {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    Object.keys(obj).forEach(k => {
      if (check(k)) {
        apply(obj, k);
      } else if (obj[k] && typeof obj[k] === 'object') {
        this.walk(obj[k] as Record<string, unknown>, check, apply);
      }
    });
  }
}
