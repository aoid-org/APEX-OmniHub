/**
 * Capability page data definitions.
 * Data lives in capability-pages.data.json — this file is pure typed factory code only.
 */
import { IconAnalytics, IconAutomation, IconIntegrations } from '@/components/icons';
import type { CapabilityPageProps, CapabilityFeature } from '@/components/CapabilityPageTemplate';
import RAW from './capability-pages.data.json';

type RawPage = typeof RAW[keyof typeof RAW];

const ICON_MAP: Record<string, React.ReactNode> = {
  analytics: <IconAnalytics size={32} />,
  automation: <IconAutomation size={32} />,
  integrations: <IconIntegrations size={32} />,
};

function buildPage(p: RawPage): CapabilityPageProps {
  const icon = ICON_MAP[p.iconType] ?? ICON_MAP.automation;
  const features: CapabilityFeature[] = p.features.map((f) => ({
    icon,
    title: f.title,
    description: f.description,
    details: f.details,
    bulletPoints: f.bulletPoints,
  }));
  return {
    pageTitle: p.title,
    title: p.title,
    subtitle: p.subtitle,
    introText: p.intro,
    features,
    useCases: p.useCases,
    technicalSpecs: p.specs,
    cta: p.cta,
  };
}

export const advancedAnalyticsData = buildPage(RAW.advancedAnalytics);
export const aiAutomationData      = buildPage(RAW.aiAutomation);
export const omniboardData         = buildPage(RAW.omniboard);
export const omniSkillsData        = buildPage(RAW.omniSkills);
export const byomData              = buildPage(RAW.byom);
