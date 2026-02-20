import { LegalPage } from '@/components/legal/LegalPage';

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      documentPath="docs/compliance/TERMS_OF_SERVICE.md"
      markdownLoader={() => import('@/content/legal/termsOfServiceContent')}
    />
  );
}
