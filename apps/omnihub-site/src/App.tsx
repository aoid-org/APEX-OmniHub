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
import { AdvancedAnalyticsPage } from "@/pages/AdvancedAnalytics";
import { AiAutomationPage } from "@/pages/AiAutomation";
import { DemoPage } from "@/pages/Demo";
import { FortressPage } from "@/pages/Fortress";
import Web3Integrations from "@/pages/integrations/Web3Integrations";
import { ManModePage } from "@/pages/ManMode";
import { MaestroPage } from "@/pages/Maestro";
import { OmniPortPage } from "@/pages/OmniPort";
import { OrchestratorPage } from "@/pages/Orchestrator";
import { RequestAccessPage } from "@/pages/RequestAccess";
import { SmartIntegrationsPage } from "@/pages/SmartIntegrations";
import { TechSpecsPage } from "@/pages/TechSpecs";
import { TriForcePage } from "@/pages/TriForce";
import OmniDash from "@/pages/product/OmniDash";
import { PhysiOmniPilotPage } from "@/pages/PhysiOmniPilot";

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
  { path: "/login.html", element: <LoginPage />, isPublic: true, routeName: "Login" },
  { path: "/story", element: <FounderStory />, isPublic: true, routeName: "Founder Story" },
  { path: "/story.html", element: <FounderStory />, isPublic: true, routeName: "Founder Story" },
  { path: "/tech-specs", element: <TechSpecsPage />, isPublic: true, routeName: "Tech Specs" },
  { path: "/tech-specs.html", element: <TechSpecsPage />, isPublic: true, routeName: "Tech Specs" },
  { path: "/features/man-mode", element: <ManModePage />, isPublic: true, routeName: "MAN Mode" },
  { path: "/man-mode", element: <ManModePage />, isPublic: true, routeName: "MAN Mode Legacy" },
  { path: "/man-mode.html", element: <ManModePage />, isPublic: true, routeName: "MAN Mode Legacy" },
  { path: "/privacy", element: <PrivacyPage />, isPublic: true, routeName: "Privacy" },
  { path: "/privacy.html", element: <PrivacyPage />, isPublic: true, routeName: "Privacy" },
  { path: "/terms", element: <TermsPage />, isPublic: true, routeName: "Terms" },
  { path: "/terms.html", element: <TermsPage />, isPublic: true, routeName: "Terms" },
  { path: "/request-access", element: <RequestAccessPage />, isPublic: true, routeName: "Request Access" },
  { path: "/request-access.html", element: <RequestAccessPage />, isPublic: true, routeName: "Request Access" },
  { path: "/advanced-analytics", element: <AdvancedAnalyticsPage />, isPublic: true, routeName: "Advanced Analytics" },
  { path: "/advanced-analytics.html", element: <AdvancedAnalyticsPage />, isPublic: true, routeName: "Advanced Analytics" },
  { path: "/ai-automation", element: <AiAutomationPage />, isPublic: true, routeName: "AI Automation" },
  { path: "/ai-automation.html", element: <AiAutomationPage />, isPublic: true, routeName: "AI Automation" },
  { path: "/fortress", element: <FortressPage />, isPublic: true, routeName: "Fortress" },
  { path: "/fortress.html", element: <FortressPage />, isPublic: true, routeName: "Fortress" },
  { path: "/maestro", element: <MaestroPage />, isPublic: true, routeName: "Maestro" },
  { path: "/maestro.html", element: <MaestroPage />, isPublic: true, routeName: "Maestro" },
  { path: "/omniport", element: <OmniPortPage />, isPublic: true, routeName: "OmniPort" },
  { path: "/omniport.html", element: <OmniPortPage />, isPublic: true, routeName: "OmniPort" },
  { path: "/orchestrator", element: <OrchestratorPage />, isPublic: true, routeName: "Orchestrator" },
  { path: "/orchestrator.html", element: <OrchestratorPage />, isPublic: true, routeName: "Orchestrator" },
  { path: "/smart-integrations", element: <SmartIntegrationsPage />, isPublic: true, routeName: "Smart Integrations" },
  { path: "/smart-integrations.html", element: <SmartIntegrationsPage />, isPublic: true, routeName: "Smart Integrations" },
  { path: "/tri-force", element: <TriForcePage />, isPublic: true, routeName: "Tri-Force" },
  { path: "/tri-force.html", element: <TriForcePage />, isPublic: true, routeName: "Tri-Force" },
  { path: "/integrations/web3", element: <Web3Integrations />, isPublic: true, routeName: "Web3 Integrations" },
  { path: "/product/omnidash", element: <OmniDash />, isPublic: true, routeName: "OmniDash" },
  { path: "/demo", element: <DemoPage />, isPublic: true, routeName: "Demo" },
  { path: "/demo.html", element: <DemoPage />, isPublic: true, routeName: "Demo" },
  { path: "/physiomni-pilot", element: <PhysiOmniPilotPage />, isPublic: true, routeName: "PhysiOmni Pilot" },
  { path: "/physiomni-pilot.html", element: <PhysiOmniPilotPage />, isPublic: true, routeName: "PhysiOmni Pilot" },
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
        {/* BUG-008 FIX: /omnidash had no wildcard — sub-paths like /omnidash/pipeline
            matched the catch-all * and redirected back to /omnidash instead of rendering.
            Now: base route + wildcard both serve OmniDashShell; the shell reads
            useLocation() to set active nav section. */}
        <Route path="/omnidash" element={createProtectedElement(OmniDashApp, false, "OmniDash")} />
        <Route path="/omnidash/*" element={createProtectedElement(OmniDashApp, false, "OmniDash")} />
        <Route path="/dashboard" element={createProtectedElement(OmniDashApp, false, "Dashboard")} />
        <Route path="/dashboard/*" element={createProtectedElement(OmniDashApp, false, "Dashboard")} />

        {/* All unmatched routes → OmniDash (SPA catch-all) */}
        <Route path="*" element={<Navigate to="/omnidash" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
