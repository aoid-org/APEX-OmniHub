import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { Section, SectionHeader } from '@/components/Section';
import { EyesVisionInput } from '@/components/byom/EyesVisionInput';

export function EyesVisionPage() {
  return (
    <Layout title="Eyes — Vision Input">
      <SEOMeta
        title="Eyes — Multimodal Vision Input | APEX OmniHub"
        description="Attach an image and ask your connected AI provider about it. Multimodal vision routed through the sovereign BYOM proxy — APEX never logs your image bytes."
        canonical="https://apexomnihub.icu/eyes/"
        appendBrandSuffix={false}
      />
      <Section>
        <SectionHeader
          title="Eyes"
          subtitle="Multimodal vision input — attach an image and ask your connected model"
        />
        <EyesVisionInput />
      </Section>
    </Layout>
  );
}
