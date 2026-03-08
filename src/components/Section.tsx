/**
 * Stub for @/components/Section under root vitest.
 * Real implementation: apps/omnihub-site/src/components/Section.tsx
 * Replaced at runtime by vi.mock in omnihub-site tests.
 */
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  variant?: string;
}
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const Section = ({ children }: SectionProps) => children;
export const SectionHeader = ({ title }: SectionHeaderProps) => title;
export default Section;
