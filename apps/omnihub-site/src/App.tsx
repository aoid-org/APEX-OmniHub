import type { ReactElement } from "react";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
// APEX PWA INVARIANT: PWAInstallBanner MUST remain in App.tsx.
// Removal silently breaks the live-site install prompt. Guarded by: scripts/ci/check-pwa-integrity.mjs
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/Home";
import { OnboardingWizard } from "@/pages/Launch/OnboardingWizard";
import { SkillForge } from "@/pages/Launch/SkillForge";
import OmniDashShell from "@/dashboard/OmniDashShell";
import { OmniDashProvider } from "@/providers/OmniDashProvider";
import { LoginPage } from "@/pages/Login";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";
import FounderStory from "@/pages/FounderStory";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
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
import { OmniSentryPage } from "@/pages/OmniSentry";
import { OmniTracePage } from "@/pages/OmniTrace";
import { EyesVisionPage } from "@/pages/EyesVision";
import { TriForcePage } from "@/pages/TriForce";
import OmniDash from "@/pages/product/OmniDash";
import { PhysiOmniPilotPage } from "@/pages/PhysiOmniPilot";
import { ManifestoPage } from "@/pages/Manifesto";

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
  <DemoModeProvider>
    <OmniDashProvider>
      <OmniDashShell />
    </OmniDashProvider>
  </DemoModeProvider>
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
  { path: "/omni-sentry", element: <OmniSentryPage />, isPublic: true, routeName: "OmniSentry" },
  { path: "/omni-sentry.html", element: <OmniSentryPage />, isPublic: true, routeName: "OmniSentry" },
  { path: "/omni-trace", element: <OmniTracePage />, isPublic: true, routeName: "OmniTrace" },
  { path: "/omni-trace.html", element: <OmniTracePage />, isPublic: true, routeName: "OmniTrace" },
  { path: "/eyes", element: <EyesVisionPage />, isPublic: true, routeName: "EyesVision" },
  { path: "/eyes.html", element: <EyesVisionPage />, isPublic: true, routeName: "EyesVision" },
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
  // ── APEX Manifesto ──────────────────────────────────────────────────────
  { path: "/manifesto",           element: <ManifestoPage />, isPublic: true, routeName: "Manifesto" },
  { path: "/manifesto.html",      element: <ManifestoPage />, isPublic: true, routeName: "Manifesto" },
  { path: "/apex-manifesto",      element: <ManifestoPage />, isPublic: true, routeName: "Manifesto" },
  { path: "/apex-manifesto.html", element: <ManifestoPage />, isPublic: true, routeName: "Manifesto" },
];

function App() {
  return (
    <I18nextProvider i18n={i18n}>
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

        {/* Skill Forge — protected launch route. Invokes the generate-business-skills
            edge function with the user JWT, so it requires an authenticated session. */}
        <Route path="/launch/skillforge" element={createProtectedElement(<SkillForge />, false, "Skill Forge")} />

        {/* All unmatched routes → OmniDash (SPA catch-all) */}
        <Route path="*" element={<Navigate to="/omnidash" replace />} />
        </Routes>
        {/* PWA install banner — renders globally, zero render cost when not installable */}
        <PWAInstallBanner />
      </div>
    </BrowserRouter>
    </ErrorBoundary>
        </I18nextProvider>
  );
}

export default App;
