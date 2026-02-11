/**
 * Policy Types for OmniConnect
 */

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
