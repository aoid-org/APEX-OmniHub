/**
 * Connector Registry Implementation
 * Manages available connectors by provider name
 */

import { Connector, ConnectorRegistry } from '../types/connector';
import type { ElementType } from 'react';
import { MessageCircle, Mail, Music, Zap, Server, Globe, Smartphone, Bot, Play, Camera, DollarSign, BriefcaseBusiness, Building2 } from 'lucide-react';

export interface IntegrationDef {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: ElementType;
  requiresApiKey: boolean;
  requiresUsername?: boolean;
  scopes?: string[];
  category?: 'control-plane' | 'security' | 'automation' | 'operations' | 'platform' | 'communication' | 'marketing' | 'ai' | 'media';
  version?: string;
  status?: 'beta' | 'ga' | 'deprecated' | 'internal';
  docsUrl?: string;
  health?: {
    lastSuccessAt?: string;
    lastFailureAt?: string;
    lastFailureReason?: string;
  };
}

export const availableIntegrations: IntegrationDef[] = [
  { id: '2', name: 'WhatsApp', type: 'whatsapp', description: 'Business messaging platform', icon: MessageCircle, requiresApiKey: true },
  { id: '3', name: 'Meta', type: 'facebook', description: 'Social media integration', icon: Globe, requiresApiKey: true },
  { id: '4', name: 'Messenger', type: 'messenger', description: 'Facebook Messenger integration', icon: MessageCircle, requiresApiKey: true },
  { id: '5', name: 'Google Apps', type: 'google', description: 'Google Workspace integration', icon: Mail, requiresApiKey: true },
  { id: '6', name: 'YouTube', type: 'youtube', description: 'Video platform integration', icon: Play, requiresApiKey: true },
  { id: '7', name: 'Meta', type: 'instagram', description: 'Social media integration', icon: Camera, requiresApiKey: true },
  { id: '8', name: 'TikTok', type: 'tiktok', description: 'Short video platform', icon: Music, requiresApiKey: true },
  { id: '9', name: 'Zapier', type: 'zapier', description: 'Automation platform', icon: Zap, requiresApiKey: true },
  { id: '10', name: 'Klaviyo', type: 'klaviyo', description: 'Email marketing automation', icon: Mail, requiresApiKey: true },
  { id: '11', name: 'Gmail', type: 'gmail', description: 'Email service integration', icon: Mail, requiresApiKey: true },
  { id: '12', name: 'IONOS.ca', type: 'ionos', description: 'Hosting and domain services', icon: Server, requiresApiKey: true, requiresUsername: true },
  { id: '13', name: 'Webnames.ca', type: 'webnames', description: 'Domain management', icon: Globe, requiresApiKey: true, requiresUsername: true },
  { id: '14', name: 'Samsung Apps', type: 'samsung', description: 'Native Samsung integrations', icon: Smartphone, requiresApiKey: false },
  { id: '15', name: 'ChatGPT', type: 'chatgpt', description: 'AI assistant integration', icon: Bot, requiresApiKey: true },
  { id: '16', name: 'Grok', type: 'grok', description: 'AI assistant by xAI', icon: Bot, requiresApiKey: true, category: 'ai', status: 'ga', version: '1.0' },
  { id: 'quickbooks', name: 'QuickBooks', type: 'quickbooks', description: 'Accounting and finance sync for invoices, customers, and books', icon: DollarSign, requiresApiKey: true, category: 'operations', status: 'ga', version: '1.0', docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started' },
  { id: 'salesforce', name: 'Salesforce', type: 'salesforce', description: 'CRM account, contact, and opportunity integration', icon: BriefcaseBusiness, requiresApiKey: true, category: 'operations', status: 'ga', version: '1.0', docsUrl: 'https://developer.salesforce.com/docs' },
  { id: 'sap', name: 'SAP', type: 'sap', description: 'Enterprise resource planning connector for SAP landscapes', icon: Building2, requiresApiKey: true, category: 'operations', status: 'beta', version: '0.1', docsUrl: 'https://developers.sap.com' },
  { id: 'slack', name: 'Slack', type: 'slack', description: 'Team messaging and collaboration event streaming', icon: MessageCircle, requiresApiKey: true, category: 'operations', status: 'ga', version: '1.0', docsUrl: 'https://api.slack.com/docs' },
  { id: 'metamask', name: 'MetaMask', type: 'web3', description: 'Web3 Wallet connection', icon: Zap, requiresApiKey: false, category: 'security', status: 'ga', version: '1.0' },
];

class ConnectorRegistryImpl implements ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(provider: string, connector: Connector): void {
    if (this.connectors.has(provider)) {
      throw new Error(`Connector for provider '${provider}' is already registered`);
    }
    this.connectors.set(provider, connector);
  }

  get(provider: string): Connector | undefined {
    return this.connectors.get(provider);
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }

  has(provider: string): boolean {
    return this.connectors.has(provider);
  }

  unregister(provider: string): boolean {
    return this.connectors.delete(provider);
  }

  clear(): void {
    this.connectors.clear();
  }
}

// Global registry instance
export const connectorRegistry = new ConnectorRegistryImpl();

// Helper functions for common operations
export function registerConnector(provider: string, connector: Connector): void {
  connectorRegistry.register(provider, connector);
}

export function getConnector(provider: string): Connector | undefined {
  return connectorRegistry.get(provider);
}

export function hasConnector(provider: string): boolean {
  return connectorRegistry.has(provider);
}

export function listConnectors(): string[] {
  return connectorRegistry.list();
}

// =============================================================================
// Bootstrap: seed the dynamic registry from the static definitions.
// Called once at module load. Idempotent — guarded by has() check.
// StubConnector satisfies the Connector interface with safe no-op methods;
// the UI surface (ConnectorKit) does not call these — it calls the Supabase
// edge function directly. The registry merely signals "this type is known".
// =============================================================================
class StubConnector implements Connector {
  readonly provider: string;
  constructor(provider: string) { this.provider = provider; }
  getAuthUrl(): Promise<string> { return Promise.resolve(''); }
  completeHandshake(): Promise<import('../types/connector').SessionToken> {
    return Promise.reject(new Error('StubConnector: not implemented'));
  }
  disconnect(): Promise<void> { return Promise.resolve(); }
  refreshToken(s: import('../types/connector').SessionToken): Promise<import('../types/connector').SessionToken> { return Promise.resolve(s); }
  fetchDelta(): Promise<import('../types/connector').RawEvent[]> { return Promise.resolve([]); }
  normalizeToCanonical(): Promise<import('../types/canonical').CanonicalEvent[]> { return Promise.resolve([]); }
  validateToken(): Promise<boolean> { return Promise.resolve(false); }
}

availableIntegrations.forEach((def) => {
  if (!connectorRegistry.has(def.type)) {
    connectorRegistry.register(def.type, new StubConnector(def.type));
  }
});
