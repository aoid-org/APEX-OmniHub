import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import { SMART_INTEGRATIONS_DATA } from '@/content/capabilityData';

export function SmartIntegrationsPage() {
  return <CapabilityPageTemplate {...SMART_INTEGRATIONS_DATA} />;
}
