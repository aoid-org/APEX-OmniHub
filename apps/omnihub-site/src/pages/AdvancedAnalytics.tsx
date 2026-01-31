import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import { ADVANCED_ANALYTICS_DATA } from '@/content/capabilityData';

export function AdvancedAnalyticsPage() {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <CapabilityPageTemplate {...ADVANCED_ANALYTICS_DATA} />;
}
