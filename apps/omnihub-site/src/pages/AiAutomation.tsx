import { CapabilityPageTemplate } from '@/components/CapabilityPageTemplate';
import { AI_AUTOMATION_DATA } from '@/content/capabilityData';

export function AiAutomationPage() {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <CapabilityPageTemplate {...AI_AUTOMATION_DATA} />;
}
