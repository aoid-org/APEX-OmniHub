/**
 * OmniHub Site Components - Barrel Export
 * Import all components from this single entry point.
 *
 * Usage: import { Layout, Section, BulletList } from '@/components';
 */

// Layout components
export { Layout } from './Layout';
export { Section, SectionHeader } from './Section';

// UI components
export { BulletItem, BulletList } from './BulletItem';
export { CTAGroup } from './CTAGroup';
export { FortressList } from './FortressList';
export { HeroVisual } from './HeroVisual';
export { ProofGrid } from './ProofGrid';
export { ReferenceOverlay } from './ReferenceOverlay';
export { ShowcaseStrip } from './ShowcaseStrip';
export { SignalTrace } from './SignalTrace';
export { Stamp } from './Stamp';
export { Steps } from './Steps';
export { FeatureHighlightGrid } from './FeatureHighlightGrid';

// Capability page components
export { FeatureCard, CTASection, SpecTable, UseCaseCard } from './CapabilityPageComponents';
export { CapabilityPageTemplate } from './CapabilityPageTemplate';
export type {
  CapabilityPageProps,
  CapabilityFeature,
  CapabilityUseCase,
  CapabilitySpec,
  CapabilityCTA,
} from './CapabilityPageTemplate';
