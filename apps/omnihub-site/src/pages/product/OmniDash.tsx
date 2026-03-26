import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';
import { SEOMeta } from '@/components/SEOMeta';

export default function OmniDash() {
  return (
    <Layout title="OmniDash">
      <SEOMeta
        title="OmniDash — Single-Plane Command Interface | APEX OmniHub"
        description="One governed surface. Modal-first, PiP persistent, multilingual. Every action visible, every decision logged. Enterprise command, simplified."
        canonical="https://apexomnihub.icu/product/omnidash/"
        appendBrandSuffix={false}
      />
      <Section>
        <article className="omnidash-page max-w-4xl mx-auto px-6 py-20">
          <header className="mb-12">
            <h1 className="text-4xl font-bold mb-3">OmniDash</h1>
            <p className="text-xl text-muted-foreground">
              Single-plane command. Total situational awareness.
            </p>
          </header>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">Interface Design</h2>
            <p className="text-muted-foreground">
              OmniDash keeps execution in view. Single-plane. Modal-first. PiP
              persistent. One-hand ready.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">Multilingual Support</h2>
            <p className="text-muted-foreground">
              Translate across English, French, Spanish, German, Japanese, and
              Simplified Chinese - operator-switchable at runtime.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">Spatial System</h2>
            <p className="text-muted-foreground">
              Every panel, modal, and overlay is governed by the OmniDash spatial
              system - deterministic layout logic that prevents collision,
              occlusion, and context loss across any viewport.
            </p>
          </section>
        </article>
      </Section>
    </Layout>
  );
}
