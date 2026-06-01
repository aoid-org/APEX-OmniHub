/**
 * DashboardOverview — OmniBoard Centre Content (thin orchestrator)
 */

import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOmniLinkIntegrations } from "@/omnidash/omnilink-api";


import { useNavigate } from "react-router-dom";
import {
  useOmniDashAction,
  type OmniDashIntent,
  type OmniDashConnectStatus,
} from "@/hooks/useOmniDashAction";
import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from "../../../../../packages/core/src/registry";
import { useOmniGateway } from "@/stores/omniGatewayStore";
import type { DashboardOverviewProps, AppEntry } from "./types";

import { INITIAL_CONTEXT, ECOSYSTEM, deriveHealth } from "./data";
import { useAgentRecording } from "./hooks/useAgentRecording";
import { AgentPane } from "./components/AgentPane";
import { OmniSlatePane } from "./components/OmniSlatePane";
import { EcosystemPane } from "./components/EcosystemPane";
import { AppsSection } from "./components/AppsSection";

import { useAppRegistryHealth } from "../../hooks/useAppRegistryHealth";
import { useOmniSlateStore } from "@/stores/omniSlateStore";

export const DashboardOverview = memo(function DashboardOverview({
  appHealth,
  ecoAppsVisible,
  setEcoAppsVisible,
}: DashboardOverviewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const registryApps = useAppRegistryHealth();

  const integrationsQuery = useQuery({
    queryKey: ["omnidash-integrations-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("User required");
      return fetchOmniLinkIntegrations(user.id);
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("integrations-overview-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "integrations",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["omnidash-integrations-overview", user.id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const liveApps = useMemo(() => {
    const defaultApps = registryApps.map(e => ({
      name: e.label,
      cat: e.category,
      logo: e.logoDomain ? `https://logo.clearbit.com/${e.logoDomain}` : '',
      synced: `${e._live?.syncedMinutesAgo ?? e.dashboard.syncedMinutesAgo}m`,
      status: e._live?.status ?? e.dashboard.status,
    })) as AppEntry[];

    if (!integrationsQuery.data) return defaultApps;

    const integrationsMap = new Map(
      integrationsQuery.data.map(i => [i.name.toLowerCase(), i])
    );

    return defaultApps.map((app) => {
      const integration = integrationsMap.get(app.name.toLowerCase());
      if (integration) {
        return {
          ...app,
          status: integration.status === "active" ? "Live" : "Partial",
        };
      }
      return app;
    });
  }, [integrationsQuery.data, registryApps]);

  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction(navigate);

  const context = useOmniSlateStore((s) => s.contextItems);
  const clearLocalContexts = useOmniSlateStore((s) => s.clearContexts);
  const addContext = useOmniSlateStore((s) => s.addContext);

  useEffect(() => {
    if (useOmniSlateStore.getState().contextItems.length === 0) {
      INITIAL_CONTEXT.forEach((c) => addContext(c));
    }
  }, [addContext]);

  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [traceLogs, setTraceLogs] = useState<readonly string[]>([]);
  const [lambdaDispatching, setLambdaDispatching] = useState(false);

  const workflowComplete = useOmniGateway((s) => s.workflowComplete);
  const prevWorkflowCompleteRef = useRef(workflowComplete);

  const addTraceLog = useCallback((message: string) => {
    setTraceLogs((prev) => [message, ...prev].slice(0, 4));
  }, []);

  const { isRecording, recordingDuration, handleToggleRecording } =
    useAgentRecording(addTraceLog);

  // Listen for SSE workflow_complete events and append to trace log
  useEffect(() => {
    if (
      workflowComplete &&
      workflowComplete !== prevWorkflowCompleteRef.current
    ) {
      prevWorkflowCompleteRef.current = workflowComplete;
      addTraceLog(
        `WORKFLOW_COMPLETE: ${workflowComplete.workflowId.slice(0, 20)}... | cost=$${workflowComplete.cost.toFixed(4)} | worker=${workflowComplete.worker}`,
      );
    }
  }, [workflowComplete, addTraceLog]);

  useEffect(() => {
    setEcoAppsVisible(ECOSYSTEM.length > 0);
  }, [setEcoAppsVisible]);

  const health = appHealth === "green" ? deriveHealth(context) : appHealth;
  const agentStatus = isRecording ? "standby" : "listening";

  const handleCleanSlate = useCallback(() => {
    clearLocalContexts();
    setActiveInsight(null);
  }, [clearLocalContexts]);

  const handleToggleInsight = useCallback((name: string) => {
    setActiveInsight((prev) => (prev === name ? null : name));
  }, []);

  const handleToggleGlobalInsight = useCallback(() => {
    setActiveInsight((prev) => (prev ? null : "__global__"));
  }, []);

  const handleCommandSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    addTraceLog(`QUEUED: ${prompt.trim()}`);
    setPrompt("");
  }, [addTraceLog, prompt]);

  const handleRunLambda = useCallback(async () => {
    if (lambdaDispatching) return;
    setLambdaDispatching(true);
    addTraceLog("DISPATCHING: Lambda async orchestration via Temporal...");
    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: {
          workflowType: 'lambda-dispatch',
          taskData: { source: 'dashboard-overview', triggeredAt: new Date().toISOString() },
        },
      });
      if (error) throw error;
      const workflowId = (data as { workflowId?: string })?.workflowId ?? 'dispatched';
      addTraceLog(`DISPATCHED: ${workflowId}`);
    } catch (err) {
      addTraceLog(
        `ERROR: ${err instanceof Error ? err.message : "Lambda dispatch failed"}`,
      );
    } finally {
      setLambdaDispatching(false);
    }
  }, [lambdaDispatching, addTraceLog]);

  const appsToUse = liveApps;
  const handleAppClick = useCallback(
    (app: AppEntry) => () => {
      const entry = APP_REGISTRY.find(
        (e: AppRegistryEntry) => e.label === app.name,
      );
      if (!entry) return;
      const intent: OmniDashIntent = {
        source: "module",
        appKey: entry.key,
        provider: app.name,
        label: app.name,
        category: entry.category,
        routePath: entry.routePath,
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
      <div
        style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}
      >
        <button
          type="button"
          onClick={handleRunLambda}
          disabled={lambdaDispatching}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            background: lambdaDispatching
              ? "rgba(194,80,31,0.15)"
              : "linear-gradient(135deg, #f97316, #c2501f)",
            border: "1px solid rgba(194,80,31,0.3)",
            color: lambdaDispatching ? "#94a3b8" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: lambdaDispatching ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.03em",
            boxShadow: lambdaDispatching
              ? "none"
              : "0 0 20px rgba(194,80,31,0.25)",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {lambdaDispatching ? "Dispatching..." : "Run Lambda Orchestrator"}
        </button>
      </div>
      <AppsSection apps={appsToUse} onAppClick={handleAppClick} />
    </div>
  );
});
