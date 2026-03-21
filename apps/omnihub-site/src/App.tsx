import type { ReactElement } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoonPage } from "@/pages/ComingSoon";
import { HomePage } from "@/pages/Home";
import { OnboardingWizard } from "@/pages/Launch/OnboardingWizard";
import { SkillForge } from "@/pages/Launch/SkillForge";
import OmniDashShell from "@/dashboard/OmniDashShell";
import { OmniDashProvider } from "@/providers/OmniDashProvider";
import { LoginPage } from "@/pages/Login";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";
import FounderStory from "@/pages/FounderStory";

import { TechSpecsPage } from "@/pages/TechSpecs";
import { RequestAccessPage } from "@/pages/RequestAccess";
import { AdvancedAnalyticsPage } from "@/pages/AdvancedAnalytics";
import { AiAutomationPage } from "@/pages/AiAutomation";
import { FortressPage } from "@/pages/Fortress";
import { MaestroPage } from "@/pages/Maestro";
import { ManModePage } from "@/pages/ManMode";
import { OmniPortPage } from "@/pages/OmniPort";
import { OrchestratorPage } from "@/pages/Orchestrator";
import { SmartIntegrationsPage } from "@/pages/SmartIntegrations";
import { TriForcePage } from "@/pages/TriForce";
import { DemoPage } from "@/pages/Demo";

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

const appRoutes: readonly AppRoute[] = [
  { path: "/", element: <HomePage />, isPublic: true, routeName: "Home" },
  { path: "/launch", element: <OnboardingWizard />, isPublic: true, routeName: "Launch" },
  { path: "/skill-forge", element: <SkillForge />, isPublic: false, routeName: "SkillForge" },
  { path: "/auth", element: <LoginPage />, isPublic: true, routeName: "Auth" },
  { path: "/login", element: <LoginPage />, isPublic: true, routeName: "Login" },
  { path: "/story", element: <FounderStory />, isPublic: true, routeName: "Founder Story" },
  { path: "/privacy", element: <PrivacyPage />, isPublic: true, routeName: "Privacy" },
  { path: "/terms", element: <TermsPage />, isPublic: true, routeName: "Terms" },
  { path: "/tech-specs", element: <TechSpecsPage />, isPublic: true, routeName: "Tech Specs" },
  { path: "/request-access", element: <RequestAccessPage />, isPublic: true, routeName: "Request Access" },
  { path: "/advanced-analytics", element: <AdvancedAnalyticsPage />, isPublic: true, routeName: "Advanced Analytics" },
  { path: "/ai-automation", element: <AiAutomationPage />, isPublic: true, routeName: "AI Automation" },
  { path: "/fortress", element: <FortressPage />, isPublic: true, routeName: "Fortress" },
  { path: "/maestro", element: <MaestroPage />, isPublic: true, routeName: "Maestro" },
  { path: "/man-mode", element: <ManModePage />, isPublic: true, routeName: "MAN Mode" },
  { path: "/omniport", element: <OmniPortPage />, isPublic: true, routeName: "OmniPort" },
  { path: "/orchestrator", element: <OrchestratorPage />, isPublic: true, routeName: "Orchestrator" },
  { path: "/smart-integrations", element: <SmartIntegrationsPage />, isPublic: true, routeName: "Smart Integrations" },
  { path: "/tri-force", element: <TriForcePage />, isPublic: true, routeName: "Tri-Force" },
  { path: "/demo", element: <DemoPage />, isPublic: true, routeName: "Demo" },
  { path: "/demo.html", element: <DemoPage />, isPublic: true, routeName: "Demo" },
  { path: "/dashboard", element: <OmniDashProvider><OmniDashShell /></OmniDashProvider>, routeName: "Dashboard" },
];

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <div data-testid="app-shell">
        <Routes>
        {appRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={createProtectedElement(route.element, route.isPublic, route.routeName)}
          />
        ))}
        <Route path="/omnidash" element={createProtectedElement(<OmniDashProvider><OmniDashShell /></OmniDashProvider>, false, "OmniDash")} />
        <Route
          path="*"
          element={<ComingSoonPage title="Page Not Found" desc="The requested route is not configured yet. Use Home or OmniDash navigation to continue." />}
        />
        </Routes>
      </div>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
