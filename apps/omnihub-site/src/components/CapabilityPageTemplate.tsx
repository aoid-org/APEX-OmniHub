import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { FeatureCard, CTASection, SpecTable, UseCaseCard } from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

// Base interface for title/description pattern
interface TitleDescriptionPair { readonly title: string; readonly description: string; }

// Base interface for label/value pattern
interface LabelValuePair { readonly label: string; readonly value: string; }

// Exported interfaces using composition
export interface CapabilityFeature extends TitleDescriptionPair {
  readonly icon: ReactNode;
  readonly details: string;
  readonly bulletPoints: readonly string[];
}

export type CapabilityUseCase = TitleDescriptionPair;

export type CapabilitySpec = LabelValuePair;

export interface CapabilityCTA extends TitleDescriptionPair {
  readonly buttonText: string;
  readonly buttonHref: string;
}

export interface CapabilityPageProps {
  readonly pageTitle: string;
  readonly title: string;
  readonly subtitle: string;
  readonly introText: string;
  readonly features: readonly CapabilityFeature[];
  readonly useCases: readonly CapabilityUseCase[];
  readonly technicalSpecs: readonly CapabilitySpec[];
  readonly cta: CapabilityCTA;
}

export function CapabilityPageTemplate({ pageTitle, title, subtitle, introText, features, useCases, technicalSpecs, cta }: CapabilityPageProps) {
  return (
    <Layout title={pageTitle}>
      <Section>
        <div className="capability-page capability-page--unified">
          <div className="capability-page__hero">
            <div className="capability-page__visual">
              <div className="capability-page__orb"></div>
              <div className="capability-page__mark">
                <span className="capability-page__orbit--one"></span>
                <span className="capability-page__orbit--two"></span>
                <span className="capability-page__orbit--three"></span>
              </div>
            </div>
            <div className="capability-page__copy">
              <div className="capability-page__eyebrow">capability</div>
              <SectionHeader title={title} subtitle={subtitle} centered={false} />
              <p className="capability-page__intro">{introText}</p>
              <div className="capability-page__signals">
                <span className="signal">Direct</span>
                <span className="signal">Audit</span>
                <span className="signal">Reverse</span>
              </div>
            </div>
          </div>
          <div className="page-content feature-page-copy-font">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              {useCases.map((u) => <UseCaseCard key={u.title} {...u} />)}
            </div>
          </div>
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Technical Specifications</h2>
            <SpecTable specs={technicalSpecs} />
          </div>
          <CTASection {...cta} />
        </div>
        </div>
      </Section>
    </Layout>
  );
}
