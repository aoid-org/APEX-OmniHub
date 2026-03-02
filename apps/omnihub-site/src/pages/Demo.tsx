import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { CTAGroup } from '@/components/CTAGroup';
import { DemoVideoPlayer } from '@/components/DemoVideoPlayer';
import { demoConfig, siteConfig } from '@/content/site';

function InteractivePlaceholder() {
  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <h3 className="heading-4">{demoConfig.interactivePlaceholder.title}</h3>
      <p className="text-secondary mt-2">
        {demoConfig.interactivePlaceholder.description}
      </p>
      <div
        style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-6)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px dashed var(--color-border)',
          textAlign: 'center',
        }}
      >
        <p className="text-muted text-sm">Interactive demo coming soon</p>
      </div>
    </div>
  );
}

function DemoCTA() {
  return (
    <Section variant="navy">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">{demoConfig.cta.title}</h2>
        <p className="text-lg mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {demoConfig.cta.description}
        </p>
        <div className="mt-8">
          <CTAGroup
            primary={demoConfig.cta.button}
            secondary={siteConfig.ctas.secondary}
            centered
          />
        </div>
      </div>
    </Section>
  );
}

export function DemoPage() {
  return (
    <Layout title="Demo">
      <Section>
        <SectionHeader
          title={demoConfig.title}
          subtitle={demoConfig.subtitle}
        />
        <div className="demo-video" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <DemoVideoPlayer sourceUrl={demoConfig.video.src} />
          <InteractivePlaceholder />
        </div>
      </Section>
      <DemoCTA />
    </Layout>
  );
}
