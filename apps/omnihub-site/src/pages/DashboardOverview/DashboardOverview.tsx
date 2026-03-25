/**
 * DashboardOverview — OmniBoard Centre Content (thin orchestrator)
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useOmniDashAction,
  type OmniDashIntent,
  type OmniDashConnectStatus,
} from '@/hooks/useOmniDashAction';
import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';
import type { DashboardOverviewProps, ContextItem, AppEntry } from './types';
import { INITIAL_CONTEXT, ECOSYSTEM, deriveHealth } from './data';
import { invokeMcpIntent } from '@/omnihub-gateway/mcp-client';
import { useAgentRecording } from './hooks/useAgentRecording';
import { AgentPane } from './components/AgentPane';
import { OmniSlatePane } from './components/OmniSlatePane';
import { EcosystemPane } from './components/EcosystemPane';
import { AppsSection } from './components/AppsSection';

export const DashboardOverview = memo(function DashboardOverview({
  demoMode,
  appHealth,
  setAppHealth,
  ecoAppsVisible,
  setEcoAppsVisible,
}: DashboardOverviewProps) {
  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction(navigate);

  const [context, setContext] =
    useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] =
    useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [traceLogs, setTraceLogs] = useState<readonly string[]>([]);

  const addTraceLog = useCallback((message: string) => {
    setTraceLogs(prev => [message, ...prev].slice(0, 4));
  }, []);

  const { isRecording, recordingDuration, handleToggleRecording } =
    useAgentRecording(addTraceLog);

  useEffect(() => {
    setEcoAppsVisible(ECOSYSTEM.length > 0);
  }, [setEcoAppsVisible]);

  const health =
    appHealth === 'green' ? deriveHealth(context) : appHealth;
  const agentStatus = isRecording ? 'standby' : 'listening';

  const handleCleanSlate = useCallback(() => {
    setContext([]);
    setActiveInsight(null);
  }, []);

  const handleToggleInsight = useCallback((name: string) => {
    setActiveInsight(prev => (prev === name ? null : name));
  }, []);

  const handleToggleGlobalInsight = useCallback(() => {
    setActiveInsight(prev => (prev ? null : '__global__'));
  }, []);

  const handleCommandSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    if (demoMode) {
      setAppHealth('yellow');
      addTraceLog('SIM_MODE_BYPASS: live Edge Functions skipped.');
      setTimeout(() => {
        setAppHealth('green');
        addTraceLog('SIM_MODE_SUCCESS_TRACE: sync resolved in 2500ms.');
        setPrompt('');
      }, 2500);
      return;
    }
    
    addTraceLog(`QUEUED: ${prompt.trim()}`);
    setAppHealth('yellow');
    
    try {
      const response = await invokeMcpIntent({
        prompt: prompt.trim(),
        context: { items: context },
      });
      
      
      const reply = response.reply || 'Sync complete.';
      addTraceLog(`AGENT: ${reply}`);
      setAppHealth('green');
    } catch (err: unknown) {
      console.error('[OmniSlate] mcp-client invocation failed:', err);
      addTraceLog(`OFFLINE_FALLBACK: ${err instanceof Error ? err.message : 'Agent unreachable.'}`);
      setAppHealth('red');
    }
    
    setPrompt('');
  }, [addTraceLog, demoMode, prompt, setAppHealth, context]);

  const handleAppClick = useCallback(
    (app: AppEntry) => () => {
      const entry = EXTERNAL_INTEGRATIONS.find((e: ExternalIntegrationEntry) => e.label === app.name);
      if (!entry) return;
      const intent: OmniDashIntent = {
        source: 'integration',
        appKey: entry.key,
        provider: app.name,
        label: app.name,
        category: entry.category,
        routePath: '', // Integrations do not have internal routePath
        dashboardStatus: app.status as OmniDashConnectStatus,
        comingSoon: entry.comingSoon,
      };
      dispatch(intent);
    },
    [dispatch],
  );

  return (
    <div className="apex-canvas">
      <div className="apex-hero-row">
        <AgentPane agentStatus={agentStatus} />
        <OmniSlatePane
          context={context}
          health={health}
          activeInsight={activeInsight}
          prompt={prompt}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          traceLogs={traceLogs}
          onCleanSlate={handleCleanSlate}
          onToggleGlobalInsight={handleToggleGlobalInsight}
          onToggleInsight={handleToggleInsight}
          onPromptChange={setPrompt}
          onCommandSubmit={handleCommandSubmit}
          onToggleRecording={handleToggleRecording}
        />
        <EcosystemPane ecoAppsVisible={ecoAppsVisible} />
      </div>
      <AppsSection onAppClick={handleAppClick} />
    </div>
  );
});
