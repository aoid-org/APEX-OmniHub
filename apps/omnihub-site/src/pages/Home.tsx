import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import '@/styles/home-refresh-shell.css';
import '@/styles/home-refresh-detail.css';
import homepageSchema from '../../public/schema/homepage.jsonld?raw';
import organizationSchema from '../../public/schema/organization.jsonld?raw';
import { MarketingHome } from '@/components/home/MarketingHome';

export function HomePage() {
  return <Layout><SEOMeta title="APEX OmniHub — The Universal Sync Orchestrator" description="Govern enterprise AI with directable orchestration, policy-gated execution, reversible workflows, and auditable multi-system control." canonical="https://apexomnihub.icu/" appendBrandSuffix={false} /><StructuredData id="homepage-schema" json={homepageSchema} /><StructuredData id="organization-schema" json={organizationSchema} /><MarketingHome /></Layout>;
}
