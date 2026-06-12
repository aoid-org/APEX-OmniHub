import { LegalPage } from '@/components/legal/LegalPage';
import { SEOMeta } from '@/components/SEOMeta';

export function TermsPage() {
  return (
    <>
      <SEOMeta title="Terms of Service" description="APEX OmniHub terms of service." noIndex={true} />
      <LegalPage
        title="Terms of Service"
        documentPath="memory/omni-recall/docs/compliance/TERMS_OF_SERVICE.md"
        markdownLoader={() => import('@/content/legal/termsOfServiceContent')}
      />
    </>
  );
}
