import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import { SMART_INTEGRATIONS_DATA } from '@/content/capabilityData';

export function SmartIntegrationsPage() {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <CapabilityPageTemplate {...SMART_INTEGRATIONS_DATA} />;
}
