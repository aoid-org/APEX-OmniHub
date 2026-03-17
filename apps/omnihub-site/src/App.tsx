import type { ReactElement } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
};

const createProtectedElement = (element: ReactElement, isPublic = false): ReactElement => {
  if (isPublic) {
    return element;
  }

  return <ProtectedRoute>{element}</ProtectedRoute>;
};

const appRoutes: readonly AppRoute[] = [
  { path: "/", element: <HomePage />, isPublic: true },
  { path: "/launch", element: <OnboardingWizard />, isPublic: true },
  { path: "/auth", element: <LoginPage />, isPublic: true },
  { path: "/login", element: <LoginPage />, isPublic: true },
  { path: "/story", element: <FounderStory />, isPublic: true },
  { path: "/privacy", element: <PrivacyPage />, isPublic: true },
  { path: "/terms", element: <TermsPage />, isPublic: true },
  { path: "/tech-specs", element: <TechSpecsPage />, isPublic: true },
  { path: "/request-access", element: <RequestAccessPage />, isPublic: true },
  { path: "/advanced-analytics", element: <AdvancedAnalyticsPage />, isPublic: true },
  { path: "/ai-automation", element: <AiAutomationPage />, isPublic: true },
  { path: "/fortress", element: <FortressPage />, isPublic: true },
  { path: "/maestro", element: <MaestroPage />, isPublic: true },
  { path: "/man-mode", element: <ManModePage />, isPublic: true },
  { path: "/omniport", element: <OmniPortPage />, isPublic: true },
  { path: "/orchestrator", element: <OrchestratorPage />, isPublic: true },
  { path: "/smart-integrations", element: <SmartIntegrationsPage />, isPublic: true },
  { path: "/tri-force", element: <TriForcePage />, isPublic: true },
  { path: "/demo", element: <DemoPage />, isPublic: true },
  { path: "/demo.html", element: <DemoPage />, isPublic: true },
  { path: "/dashboard", element: <OmniDashShell /> },
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
            element={createProtectedElement(route.element, route.isPublic)}
          />
        ))}
        <Route path="/omnidash" element={createProtectedElement(<OmniDashProvider><OmniDashShell /></OmniDashProvider>)} />
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
