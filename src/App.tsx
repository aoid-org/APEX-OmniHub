import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Web3Provider } from "./providers/Web3Provider";
import { DashboardLayout } from "./components/DashboardLayout";
import { ConsentBanner } from "./components/ConsentBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PaidAccessRoute } from "./components/PaidAccessRoute";
import { MobileOnlyGate } from "./components/MobileOnlyGate";
import { useOfflineSupport } from "./hooks/useOfflineSupport";
import { useEffect, lazy, Suspense } from 'react';
import { initializeMonitoring } from './lib/monitoring';
import { initializeSecurity } from './lib/security';
import { logConfiguration } from './lib/config';
import { createDebugLogger } from './lib/debug-logger';
import { Loader2 } from 'lucide-react';

import { LocaleProvider } from './i18n';

// Lazy load OmniDash panel components (used by OmniLink mobile /omnitrace route)
const OmniDashRuns = lazy(() => import("./components/omnidash/Runs"));
const GlobalMediaDock = lazy(() => import("./components/omnidash/media/GlobalMediaDock").then(m => ({ default: m.GlobalMediaDock })));

// Lazy load pages for better code splitting
const Links = lazy(() => import("./pages/Links"));
const Files = lazy(() => import("./pages/Files"));
const Automations = lazy(() => import("./pages/Automations"));
const ApexAssistant = lazy(() => import("./pages/ApexAssistant"));
const Todos = lazy(() => import("./pages/Todos"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TradeLine247 = lazy(() => import("./pages/apps/TradeLine247"));
const AutoRepAi = lazy(() => import("./pages/apps/AutoRepAi"));
const KeepSafe = lazy(() => import("./pages/apps/KeepSafe"));
const StrideGuide = lazy(() => import("./pages/apps/StrideGuide"));
const RobuxMinerPro = lazy(() => import("./pages/apps/RobuxMinerPro"));
const FLOWBills = lazy(() => import("./pages/apps/FLOWBills"));
const JubeeLove = lazy(() => import("./pages/apps/JubeeLove"));
const BuiltCanadian = lazy(() => import("./pages/apps/BuiltCanadian"));
const TechSpecs = lazy(() => import("./pages/TechSpecs"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const Health = lazy(() => import("./pages/Health"));
const Translation = lazy(() => import("./pages/Translation"));
const Agent = lazy(() => import("./pages/Agent"));
const Settings = lazy(() => import("./pages/Settings"));
const FounderStory = lazy(() => import("./pages/FounderStory"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const log = createDebugLogger('App.tsx', 'C');
      // #region agent log
      log('React Query global error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      // #endregion
      if (import.meta.env.DEV) {
        console.error('React Query error:', error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const log = createDebugLogger('App.tsx', 'C');
      // #region agent log
      log('React Query mutation error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      // #endregion
      if (import.meta.env.DEV) {
        console.error('React Query mutation error:', error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const log = createDebugLogger('App.tsx', 'C');
        // #region agent log
        const errorStatus = (error as { status?: number })?.status;
        log('React Query retry check', {
          failureCount,
          errorStatus,
          willRetry: errorStatus !== undefined && (errorStatus < 400 || errorStatus >= 500) ? failureCount < 3 : false,
        });
        // #endregion
        // Don't retry on 4xx errors
        if (errorStatus !== undefined && errorStatus >= 400 && errorStatus < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Prevent excessive refetches
      refetchOnMount: true, // Refresh on mount to avoid cross-device stale views
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

const AppContent = () => {
  useOfflineSupport();

  useEffect(() => {
    const log = createDebugLogger('App.tsx', 'A');

    // #region agent log
    log('AppContent useEffect entry');
    // #endregion

    try {
      // Initialize production systems
      // #region agent log
      log('Before initializeMonitoring');
      // #endregion
      initializeMonitoring();

      // #region agent log
      log('Before initializeSecurity');
      // #endregion
      initializeSecurity();

      // #region agent log
      log('Before logConfiguration');
      // #endregion
      logConfiguration();

      // Initialize PWA features (async, non-blocking)
      import('./lib/pwa-analytics').then((module) => {
        module.initializePWAAnalytics();
      });

      import('./lib/biometric-auth').then((module) => {
        module.initializeBiometricAuth();
      });

      import('./lib/push-notifications').then((module) => {
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          module.initializePushNotifications(vapidKey);
        }
      });

      // #region agent log
      log('AppContent initialization complete');
      // #endregion
    } catch (error) {
      // #region agent log
      log('AppContent initialization error', {
        error: error instanceof Error ? error.message : 'unknown'
      });
      // #endregion
      console.error('Failed to initialize app:', error);
    }
  }, []);
  
  return null;
};


const App = () => (
  <div data-testid="app-shell">
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
          <ConsentBanner />
          <AuthProvider>
            <LocaleProvider>
            <Web3Provider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/health" element={<Health />} />

                {/* OmniLink mobile routes (with mobile gate) */}
                <Route path="/translation" element={<MobileOnlyGate><PaidAccessRoute><Translation /></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/agent" element={<MobileOnlyGate><PaidAccessRoute><Agent /></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/settings" element={<MobileOnlyGate><PaidAccessRoute><Settings /></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/omnitrace" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><OmniDashRuns /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />

                {/* OmniLink mobile routes (continued) */}
                <Route path="/links" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><Links /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/files" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><Files /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/automations" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><Automations /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/apex" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><ApexAssistant /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/todos" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><Todos /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />
                <Route path="/diagnostics" element={<MobileOnlyGate><PaidAccessRoute><DashboardLayout><Diagnostics /></DashboardLayout></PaidAccessRoute></MobileOnlyGate>} />

                {/* App routes (no mobile gate for now) */}
                {/* App-route access policy tracked in platform access-control roadmap. */}
                <Route path="/apps/tradeline247" element={<TradeLine247 />} />
                <Route path="/apps/autorepai" element={<AutoRepAi />} />
                <Route path="/apps/keepsafe" element={<KeepSafe />} />
                <Route path="/apps/strideguide" element={<StrideGuide />} />
                <Route path="/apps/robuxminerpro" element={<RobuxMinerPro />} />
                <Route path="/apps/flowbills" element={<FLOWBills />} />
                <Route path="/apps/jubeelove" element={<JubeeLove />} />
                <Route path="/apps/built-canadian" element={<BuiltCanadian />} />
                <Route path="/tech-specs" element={<TechSpecs />} />
                <Route path="/founder-story" element={<FounderStory />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            {/* Keep media dock isolated so route rendering never blocks on its lazy chunk */}
            <Suspense fallback={null}>
              <GlobalMediaDock />
            </Suspense>
            </Web3Provider>
            </LocaleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </div>
);

export default App;
