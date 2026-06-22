import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { Section, SectionHeader } from '@/components/Section';
import { OmniTracePanel } from '@/components/OmniTracePanel';

export function OmniTracePage() {
  return (
    <Layout title="OmniTrace">
      <SEOMeta
        title="OmniTrace — Forensic Decision Replay | APEX OmniHub"
        description="Replay your real audit history: chronologically ordered decision events grouped into chains, scoped to your account by row-level security."
        canonical="https://apexomnihub.icu/omni-trace/"
        appendBrandSuffix={false}
      />
      <Section>
        <SectionHeader
          title="OmniTrace"
          subtitle="Forensic decision replay over your real audit history"
        />
        <OmniTracePanel />
      </Section>
    </Layout>
  );
}
