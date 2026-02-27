import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/Home";
import { OnboardingWizard } from "@/pages/Launch/OnboardingWizard";
import { OmniDashLayout } from "@/layouts/OmniDashLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardOverview } from "@/pages/DashboardOverview";
import { ComingSoonPage } from "@/pages/ComingSoon";

// Legacy/Existing Pages
import { LoginPage } from "@/pages/Login";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";
import { DemoPage } from "@/pages/Demo";
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

function App() {
  return (
    <Routes>
      {/* Core Application Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/launch" element={<OnboardingWizard />} />

      {/* Graduated OmniDash Console — Nested Route Layout */}
      <Route
        path="/omnidash"
        element={
          <ProtectedRoute>
            <OmniDashLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="omniport" element={<OmniPortPage />} />
        <Route path="maestro" element={<MaestroPage />} />
        <Route path="fortress" element={<FortressPage />} />
        <Route path="orchestrator" element={<OrchestratorPage />} />
        <Route path="omniskills" element={<ComingSoonPage title="OmniSkills" desc="Skill management and task orchestration" />} />
        <Route path="physiomni" element={<ComingSoonPage title="PhysiOmni" desc="Physical operations and execution tracking" />} />
        <Route path="audits" element={<ComingSoonPage title="Audits" desc="Governance, compliance, and security gates" />} />
        <Route path="billing" element={<ComingSoonPage title="Billing" desc="Subscription management and usage analytics" />} />
        <Route path="links" element={<ComingSoonPage title="Links" desc="Connection management and integration endpoints" />} />
        <Route path="automations" element={<ComingSoonPage title="Automations" desc="Workflow automation and pipeline orchestration" />} />
        <Route path="workflows" element={<ComingSoonPage title="Workflows" desc="Visual workflow builder and process studio" />} />
        <Route path="files" element={<ComingSoonPage title="Files" desc="Document management and file operations" />} />
        <Route path="settings" element={<ComingSoonPage title="Settings" desc="Platform configuration and preferences" />} />
      </Route>

      {/* Existing Content Pages - Mapping to clean URLs */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/tech-specs" element={<TechSpecsPage />} />
      <Route path="/request-access" element={<RequestAccessPage />} />
      <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
      <Route path="/ai-automation" element={<AiAutomationPage />} />
      <Route path="/fortress" element={<FortressPage />} />
      <Route path="/maestro" element={<MaestroPage />} />
      <Route path="/man-mode" element={<ManModePage />} />
      <Route path="/omniport" element={<OmniPortPage />} />
      <Route path="/orchestrator" element={<OrchestratorPage />} />
      <Route path="/smart-integrations" element={<SmartIntegrationsPage />} />
      <Route path="/tri-force" element={<TriForcePage />} />

      {/* Fallback for .html URLs if any hardcoded links remain */}
      {/* Note: This assumes links like /demo.html are requested. React Router handles path matching. */}
      {/* However, if the server doesn't rewrite .html requests to index.html, this won't be hit. */}
      {/* Vite development server handles this usually if configured, but production might not. */}
      {/* For now, we assume clean URLs are used. */}
    </Routes>
  );
}

export default App;
