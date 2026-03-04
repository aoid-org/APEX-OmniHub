import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoonPage } from "@/pages/ComingSoon";
import { HomePage } from "@/pages/Home";
import { OnboardingWizard } from "@/pages/Launch/OnboardingWizard";
import { OmniDashLayout } from "@/layouts/OmniDashLayout";
import { LoginPage } from "@/pages/Login";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";

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
  { path: "/login", element: <LoginPage />, isPublic: true },
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
];

const omniDashRoutes: readonly AppRoute[] = [
  { path: "pipeline", element: <ComingSoonPage title="Pipeline" desc="Sales pipeline and opportunity tracking" /> },
  { path: "kpis", element: <ComingSoonPage title="KPIs" desc="Key performance indicators and daily metrics" /> },
  { path: "ops", element: <ComingSoonPage title="Ops" desc="Operations, incidents, and system health" /> },
  { path: "integrations", element: <ComingSoonPage title="Integrations" desc="Connected services and data sources" /> },
  { path: "events", element: <ComingSoonPage title="Events" desc="OmniLink event feed and activity log" /> },
  { path: "entities", element: <ComingSoonPage title="Entities" desc="Managed entities and data objects" /> },
  { path: "runs", element: <ComingSoonPage title="Runs" desc="Workflow execution history and trace logs" /> },
  { path: "approvals", element: <ComingSoonPage title="Approvals" desc="MAN Mode approval queue and governance" /> },
  { path: "omniport", element: <OmniPortPage /> },
  { path: "maestro", element: <MaestroPage /> },
  { path: "fortress", element: <FortressPage /> },
  { path: "orchestrator", element: <OrchestratorPage /> },
  { path: "omniskills", element: <ComingSoonPage title="OmniSkills" desc="Skill management and task orchestration" /> },
  { path: "physiomni", element: <ComingSoonPage title="PhysiOmni" desc="Physical operations and execution tracking" /> },
  { path: "audits", element: <ComingSoonPage title="Audits" desc="Governance, compliance, and security gates" /> },
  { path: "billing", element: <ComingSoonPage title="Billing" desc="Subscription management and usage analytics" /> },
  { path: "links", element: <ComingSoonPage title="Links" desc="Connection management and integration endpoints" /> },
  { path: "automations", element: <ComingSoonPage title="Automations" desc="Workflow automation and pipeline orchestration" /> },
  { path: "workflows", element: <ComingSoonPage title="Workflows" desc="Visual workflow builder and process studio" /> },
  { path: "files", element: <ComingSoonPage title="Files" desc="Document management and file operations" /> },
  { path: "settings", element: <ComingSoonPage title="Settings" desc="Platform configuration and preferences" /> },
];

function App() {
  return (
    <Routes>
      {appRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={createProtectedElement(route.element, route.isPublic)}
        />
      ))}
      <Route path="/omnidash" element={createProtectedElement(<OmniDashLayout />)}>
        {omniDashRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={createProtectedElement(route.element, route.isPublic)} />
        ))}
      </Route>

    </Routes>
  );
}

export default App;
