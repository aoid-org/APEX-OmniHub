import { LegalPage } from '@/components/legal/LegalPage';

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      documentPath="docs/compliance/PRIVACY_POLICY.md"
      markdownLoader={() => import('@/content/legal/privacyPolicyContent')}
    />
  );
}
