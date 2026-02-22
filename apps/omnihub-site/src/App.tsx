import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/Home';
import { OnboardingWizard } from '@/pages/Launch/OnboardingWizard';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { ApprovalsPage } from '@/pages/OmniDash/Approvals';

// New Stub Pages
import { PipelinePage } from '@/pages/OmniDash/Pipeline';
import { KpisPage } from '@/pages/OmniDash/Kpis';
import { OpsPage } from '@/pages/OmniDash/Ops';
import { IntegrationsPage } from '@/pages/OmniDash/Integrations';
import { EventsPage } from '@/pages/OmniDash/Events';
import { EntitiesPage } from '@/pages/OmniDash/Entities';
import { RunsPage } from '@/pages/OmniDash/Runs';
import { WorkflowsPage } from '@/pages/OmniDash/Workflows';
import { ApexAssistantPage } from '@/pages/OmniDash/ApexAssistant';

import { OmniDashLayout } from '@/layouts/OmniDashLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Legacy/Existing Pages
import { LoginPage } from '@/pages/Login';
import { PrivacyPage } from '@/pages/Privacy';
import { TermsPage } from '@/pages/Terms';
import { DemoPage } from '@/pages/Demo';
import { TechSpecsPage } from '@/pages/TechSpecs';
import { RequestAccessPage } from '@/pages/RequestAccess';
import { AdvancedAnalyticsPage } from '@/pages/AdvancedAnalytics';
import { AiAutomationPage } from '@/pages/AiAutomation';
import { FortressPage } from '@/pages/Fortress';
import { MaestroPage } from '@/pages/Maestro';
import { ManModePage } from '@/pages/ManMode';
import { OmniPortPage } from '@/pages/OmniPort';
import { OrchestratorPage } from '@/pages/Orchestrator';
import { SmartIntegrationsPage } from '@/pages/SmartIntegrations';
import { TriForcePage } from '@/pages/TriForce';

function App() {
  return (
    <Routes>
      {/* Core Application Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/launch" element={<OnboardingWizard />} />

      {/* OmniDash Console Routes */}
      <Route
        path="/omnidash"
        element={
          <ProtectedRoute>
            <OmniDashLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="kpis" element={<KpisPage />} />
        <Route path="ops" element={<OpsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="entities" element={<EntitiesPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
      </Route>

      <Route 
        path="/apex" 
        element={
          <ProtectedRoute>
            <ApexAssistantPage />
          </ProtectedRoute>
        } 
      />

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
    </Routes>
  );
}

export default App;
