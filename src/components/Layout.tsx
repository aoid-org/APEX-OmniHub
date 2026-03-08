/**
 * Stub for @/components/Layout under root vitest.
 * The real implementation lives in apps/omnihub-site/src/components/Layout.tsx.
 * This file is only resolved when running tests from the repo root where the
 * '@/' alias points to './src/'. All call sites in those tests use vi.mock to
 * replace this module before any code executes.
 */
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export const Layout = ({ children }: LayoutProps) => children;
export default Layout;
