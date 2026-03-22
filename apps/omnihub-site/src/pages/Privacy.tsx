import { LegalPage } from '@/components/legal/LegalPage';
import { SEOMeta } from '@/components/SEOMeta';

export function PrivacyPage() {
  return (
    <>
      <SEOMeta title="Privacy Policy" description="Privacy Policy for aSpiral and APEX OmniHub. Learn how APEX Business Systems Ltd. collects, uses, and protects your personal data. GDPR, CCPA, and PIPEDA compliant." />
      <LegalPage
        title="Privacy Policy"
        documentPath="docs/compliance/PRIVACY_POLICY.md"
        markdownLoader={() => import('@/content/legal/privacyPolicyContent')}
      />
    </>
  );
}
