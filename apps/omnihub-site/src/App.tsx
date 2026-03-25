import type { ReactElement } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/Home";
import { OnboardingWizard } from "@/pages/Launch/OnboardingWizard";
import OmniDashShell from "@/dashboard/OmniDashShell";
import { OmniDashProvider } from "@/providers/OmniDashProvider";
import { LoginPage } from "@/pages/Login";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";
import FounderStory from "@/pages/FounderStory";
import { RequestAccessPage } from "@/pages/RequestAccess";
import Web3Integrations from "@/pages/integrations/Web3Integrations";
import OmniDash from "@/pages/product/OmniDash";

type AppRoute = {
  readonly path: string;
  readonly element: ReactElement;
  readonly isPublic?: boolean;
  readonly routeName?: string;
};

const createProtectedElement = (element: ReactElement, isPublic = false, routeName?: string): ReactElement => {
  const wrapped = (
    <RouteErrorBoundary routeName={routeName}>
      {element}
    </RouteErrorBoundary>
  );

  if (isPublic) {
    return wrapped;
  }

  return <ProtectedRoute>{wrapped}</ProtectedRoute>;
};

// ============================================================================
// SPA Architecture: OmniDash is the ONLY post-auth surface.
// All interactions happen via modals and persistent PiP windows.
// Pre-auth routes are minimal: landing, login, legal, onboarding.
// ============================================================================

const OmniDashApp = (
  <OmniDashProvider>
    <OmniDashShell />
  </OmniDashProvider>
);

/** Pre-auth public routes — the marketing site / legal pages. */
const preAuthRoutes: readonly AppRoute[] = [
  { path: "/", element: <HomePage />, isPublic: true, routeName: "Home" },
  { path: "/launch", element: <OnboardingWizard />, isPublic: true, routeName: "Launch" },
  { path: "/auth", element: <LoginPage />, isPublic: true, routeName: "Auth" },
  { path: "/login", element: <LoginPage />, isPublic: true, routeName: "Login" },
  { path: "/story", element: <FounderStory />, isPublic: true, routeName: "Founder Story" },
  { path: "/privacy", element: <PrivacyPage />, isPublic: true, routeName: "Privacy" },
  { path: "/terms", element: <TermsPage />, isPublic: true, routeName: "Terms" },
  { path: "/request-access", element: <RequestAccessPage />, isPublic: true, routeName: "Request Access" },
  { path: "/integrations/web3", element: <Web3Integrations />, isPublic: true, routeName: "Web3 Integrations" },
  { path: "/product/omnidash", element: <OmniDash />, isPublic: true, routeName: "OmniDash" },
];

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <div data-testid="app-shell">
        <Routes>
        {/* Pre-auth public routes */}
        {preAuthRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={createProtectedElement(route.element, route.isPublic, route.routeName)}
          />
        ))}

        {/* OmniDash — the single post-auth surface */}
        <Route path="/omnidash" element={createProtectedElement(OmniDashApp, false, "OmniDash")} />
        <Route path="/dashboard" element={createProtectedElement(OmniDashApp, false, "Dashboard")} />

        {/* All unmatched routes → OmniDash (SPA catch-all) */}
        <Route path="*" element={<Navigate to="/omnidash" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
