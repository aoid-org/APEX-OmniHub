import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { Section, SectionHeader } from '@/components/Section';
import { OmniSentryPanel } from '@/components/OmniSentryPanel';

export function OmniSentryPage() {
  return (
    <Layout title="OmniSentry">
      <SEOMeta
        title="OmniSentry — Self-Healing Monitor | APEX OmniHub"
        description="Live OmniSentry status: circuit-breaker protection, self-healing recovery, and runtime health diagnostics."
        canonical="https://apexomnihub.icu/omni-sentry/"
        appendBrandSuffix={false}
      />
      <Section>
        <SectionHeader
          title="OmniSentry"
          subtitle="Self-healing runtime monitoring with circuit-breaker protection"
        />
        <OmniSentryPanel />
      </Section>
    </Layout>
  );
}
