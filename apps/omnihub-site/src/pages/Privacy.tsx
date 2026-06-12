import { LegalPage } from '@/components/legal/LegalPage';
import { SEOMeta } from '@/components/SEOMeta';

export function PrivacyPage() {
  return (
    <>
      <SEOMeta title="Privacy Policy" description="APEX OmniHub privacy policy and data handling practices." noIndex={true} />
      <LegalPage
        title="Privacy Policy"
        documentPath="memory/omni-recall/docs/compliance/PRIVACY_POLICY.md"
        markdownLoader={() => import('@/content/legal/privacyPolicyContent')}
      />
    </>
  );
}
