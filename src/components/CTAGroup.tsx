/**
 * Stub for @/components/CTAGroup under root vitest.
 * Real implementation: apps/omnihub-site/src/components/CTAGroup.tsx
 * Replaced at runtime by vi.mock in omnihub-site tests.
 */
interface CTALink {
  label: string;
  href: string;
}
interface CTAGroupProps {
  primary: CTALink;
  secondary?: CTALink;
  centered?: boolean;
}

export const CTAGroup = ({ primary }: CTAGroupProps) => primary.label;
export default CTAGroup;
