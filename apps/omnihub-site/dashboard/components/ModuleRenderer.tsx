/**
 * ModuleRenderer — Dynamic module injection via React.lazy().
 *
 * Each module is a real React component loaded on demand. Components
 * fetch live data via useOmniModuleState and bind actions to the
 * Temporal workflow engine via triggerModuleAction.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// ── Dynamic module component map ────────────────────────────────
// React.lazy() ensures each module is code-split and loaded on demand.

const MODULE_COMPONENTS: Readonly<Record<string, React.LazyExoticComponent<React.ComponentType<{ onClose: () => void }>>>> = {
  omniskills: lazy(() => import('./modules/OmniSkillsModule')),
  physiomni: lazy(() => import('./modules/PhysiOmniModule')),
  audits: lazy(() => import('./modules/AuditsModule')),
  links: lazy(() => import('./modules/LinksModule')),
  automations: lazy(() => import('./modules/AutomationsModule')),
  workflows: lazy(() => import('./modules/WorkflowsModule')),
  files: lazy(() => import('./modules/FilesModule')),
  billing: lazy(() => import('./modules/BillingModule')),
  settings: lazy(() => import('./modules/SettingsModule')),
  dashboard: lazy(() => import('./modules/DashboardModule')),
  integrations: lazy(() => import('./modules/IntegrationsModule')),
  omnitrace: lazy(() => import('./modules/OmniTraceModule')),
  agent: lazy(() => import('./modules/AgentModule')),
  translation: lazy(() => import('./modules/TranslationModule')),
  omniboard: lazy(() => import('./modules/OmniBoardModule')),
  'omniboard-wizard': lazy(() => import('./modules/OmniBoardModule')),
  // First-party APEX ecosystem MCP connect — separate from OmniBoard (third-party).
  'apex-apps-mcp': lazy(() => import('./modules/ApexAppsMcpModule')),
  omnimedia: lazy(() => import('./modules/OmniMediaModule')),
};

// ── Loading fallback ────────────────────────────────────────────

function ModuleLoadingFallback() {
  return (
    <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading module...
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────

interface ModuleRendererProps {
  readonly moduleKey: string;
  readonly onClose: () => void;
}

// ── Renderer ────────────────────────────────────────────────────

function ModuleRendererInner({
  moduleKey,
  onClose,
}: ModuleRendererProps) {
  const DynamicModule = MODULE_COMPONENTS[moduleKey];

  if (!DynamicModule) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Module data unavailable.
      </div>
    );
  }

  return (
    <Suspense fallback={<ModuleLoadingFallback />}>
      <DynamicModule onClose={onClose} />
    </Suspense>
  );
}

export const ModuleRenderer = memo(ModuleRendererInner);
