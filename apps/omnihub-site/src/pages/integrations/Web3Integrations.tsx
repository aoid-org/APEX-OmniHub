import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';

export default function Web3Integrations() {
  return (
    <Layout title="Web3 Integrations">
      <Section>
        <section className="web3-integrations max-w-3xl mx-auto px-6 py-20">
          <h1 className="text-3xl font-bold mb-6">Optional Web3 Integrations</h1>
          <p className="text-muted-foreground mb-4">
            APEX OmniHub supports optional blockchain, wallet, and NFT integrations for
            organizations operating in Web3 environments. All Web3 features are disabled
            by default and require explicit operator activation.
          </p>
          <p className="text-muted-foreground">
            These integrations are maintained as isolated, opt-in extension modules and
            do not affect core platform behavior, security posture, or compliance
            certifications.
          </p>
        </section>
      </Section>
    </Layout>
  );
}
