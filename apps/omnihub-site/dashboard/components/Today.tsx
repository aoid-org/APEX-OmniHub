import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Clock,
  Activity,
  Shield,
  Database,
  LineChart,
  Cpu,
  Network,
  Users,
  GitMerge,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTodayItems, upsertTodayItem } from "@/omnidash/api";
import { useOmniDashSettings } from "@/omnidash/hooks";
import { redactTodayItems } from "@/omnidash/redaction";
import { TodayItem } from "@/omnidash/types";
import { useToast } from "@/components/ui/use-toast";
import { useExecute } from "@/hooks/useExecute";
import { useDemoStore } from "@/stores/demoStore";
import { OmniTraceFeed } from "@/dashboard/components/OmniTraceFeed";
import { HiddenMetric } from "./HiddenMetric";

const ApexAgentAvatar = React.lazy(() => import("./ApexAgentAvatar"));

interface WidgetCardProps {
  id: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  contentClass?: string;
}

const WidgetCard = ({
  id,
  bgClass,
  borderClass,
  textClass,
  icon: Icon,
  title,
  children,
  contentClass = "p-2 space-y-1",
}: WidgetCardProps) => (
  <div key={id}>
    <Card className={`glass-card hover-lift ${bgClass} ${borderClass} rounded-2xl h-full relative`}>
      <CardHeader className="py-3">
        <CardTitle className={`flex items-center gap-2 text-sm ${textClass}`}>
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClass}>
        {children}
      </CardContent>
    </Card>
  </div>
);

interface ProgressRowProps {
  colorClass: string;
  widthPercent: string;
}

const ProgressRow = ({ colorClass, widthPercent }: ProgressRowProps) => (
  <div className="px-2 pb-2">
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: widthPercent }}></div>
    </div>
  </div>
);
type ItemCategory = "outcome" | "outreach" | "metric";

const getBadgeStyles = (category: string) => {
  if (category === "outcome")
    return "border-emerald-500/50 text-emerald-600 dark:text-emerald-400";
  if (category === "outreach")
    return "border-sky-500/50 text-sky-600 dark:text-sky-400";
  return "border-amber-500/50 text-amber-600 dark:text-amber-400";
};

function useOmniDashTelemetry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const settings = useOmniDashSettings();
  const queryClient = useQueryClient();
  const { isDemo, execute } = useExecute();
  const demoStore = useDemoStore();
  const [newTitle, setNewTitle] = useState("");
  const [category] = useState<ItemCategory>("outcome");

  const itemsQuery = useQuery({
    queryKey: ["omnidash-today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (isDemo) {
        return demoStore.tasks.slice(0, 3).map(
          (t, i): TodayItem => ({
            id: t.id,
            user_id: "demo",
            title: t.title,
            next_action: null,
            category: ["outcome", "outreach", "metric"][i % 3] as ItemCategory,
            order_index: i,
            is_active: true,
            power_block_started_at: null,
            power_block_duration_minutes: 90,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        );
      }
      if (!user) throw new Error("User required");
      const data = await fetchTodayItems(user.id);
      return settings.data?.demo_mode ? redactTodayItems(data) : data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error("Title required");
      if (isDemo) {
        await execute("task.create", {
          title: newTitle.trim(),
          priority: "medium",
          status: "pending",
        });
        return;
      }
      if (!user) throw new Error("User missing");
      const payload: Partial<TodayItem> & { user_id: string; title: string } = {
        user_id: user.id,
        title: newTitle.trim(),
        category,
        order_index: (itemsQuery.data?.length || 0) + 1,
      };
      await upsertTodayItem(payload);
    },
    onSuccess: () => {
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ["omnidash-today", user?.id] });
    },
  });

  const handleNextAction = async (item: TodayItem) => {
    if (!user) return;
    await upsertTodayItem({
      ...item,
      user_id: user.id,
      next_action: `Next action triggered at ${new Date().toLocaleTimeString()}`,
    });
    queryClient.invalidateQueries({ queryKey: ["omnidash-today", user.id] });
    toast({ title: "Next action captured", description: item.title });
  };

  return { itemsQuery, addMutation, handleNextAction, newTitle, setNewTitle };
}

export const Today = () => {
  const { itemsQuery, addMutation, handleNextAction, newTitle, setNewTitle } = useOmniDashTelemetry();

  return (
    <div className="py-2 w-full max-w-7xl mx-auto overflow-x-hidden">
      <div data-testid="global-canvas-flow" className="flex flex-col gap-6">
        {/* APEX AGENT Unified Hero Section */}
        <section>
          <Card className="glass-card animate-in border-[hsl(var(--accent))]/30 rounded-3xl h-full flex flex-col relative overflow-hidden bg-[#0A0D14]/90 shadow-2xl">
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left Column: Top 3 Outcomes */}
              <div className="flex-[0.8] p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col min-w-0 bg-white/[0.02]">
                <div className="pb-3">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Top 3 Outcomes
                  </h2>
                  <p className="text-sm text-muted-foreground">Today's Focus</p>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  {itemsQuery.data?.slice(0, 3).map((item, idx) => {
                    const handleItemNextActionClick = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleNextAction(item);
                    };
                    return (
                      <div
                        key={item.id}
                        className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-2 hover:bg-white/5 transition-colors duration-200 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-sm truncate flex-1 text-gray-200">
                            {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`capitalize shrink-0 text-[10px] px-2 py-0 h-5 ${getBadgeStyles(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </Badge>
                        </div>
                        {item.next_action ? (
                          <div className="flex flex-col pl-9">
                            <span className="text-[10px] uppercase text-[hsl(var(--accent))] tracking-wider font-bold mb-0.5">
                              Next Action
                            </span>
                            <p className="text-xs text-gray-400 truncate w-full">
                              {item.next_action}
                            </p>
                          </div>
                        ) : (
                          <div className="flex justify-start pl-9 mt-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleItemNextActionClick}
                              className="shrink-0 text-xs h-6 px-0 text-gray-500 hover:text-white hover:bg-transparent"
                            >
                              Set Target →
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                  </div>
                  <Input
                    placeholder="Ask APEX Agent"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !addMutation.isPending)
                        addMutation.mutate();
                    }}
                    className="flex-1 h-10 bg-black/40 border-white/10 rounded-full pl-9 focus-visible:ring-accent text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      addMutation.mutate();
                    }}
                    disabled={addMutation.isPending || !newTitle.trim()}
                    className="btn-accent-gradient h-10 w-10 rounded-full p-0 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Center Column: APEX AGENT Core Orbital */}
              <div className="flex-[1.2] p-6 flex flex-col items-center justify-center relative min-w-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/10 via-[#0A0D14] to-[#0A0D14] overflow-hidden">
                <div className="absolute top-6 flex items-center gap-3 w-full justify-center z-20">
                  <h1 className="text-2xl font-bold tracking-[0.2em] text-white">
                    APEX{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">
                      AGENT
                    </span>
                  </h1>
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite]" />
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">
                      Active
                    </span>
                  </div>
                </div>

                {/* Agent Core Visual Effect */}
                <div className="relative mt-8 mb-6 h-48 w-48 sm:h-56 sm:w-56 mx-auto flex items-center justify-center">
                  {/* Orbitals */}
                  <div className="absolute inset-0 rounded-full border border-[hsl(var(--accent))]/30 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-t border-b border-sky-400/40 animate-[spin_8s_linear_infinite_reverse]" />
                  <div className="absolute inset-6 rounded-full border-r border-l border-indigo-500/30 animate-[spin_20s_linear_infinite]" />
                  <div className="absolute inset-[-20%] rounded-full bg-[hsl(var(--accent))]/10 blur-3xl pointer-events-none" />
                  <div className="absolute inset-[-40%] rounded-full bg-orange-500/5 blur-[80px] pointer-events-none" />

                  {/* Simulated Agent Avatar/Core */}
                  <React.Suspense
                    fallback={
                      <div className="w-32 h-32 rounded-full bg-black/50 border border-white/10 animate-pulse" />
                    }
                  >
                    <ApexAgentAvatar />
                  </React.Suspense>
                </div>

                <div className="flex items-center justify-center gap-2 text-[hsl(var(--accent))] absolute bottom-6 z-20">
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-current rounded-full animate-pulse" />
                    <div className="w-1 h-2 bg-current rounded-full animate-pulse delay-75" />
                    <div className="w-1 h-4 bg-current rounded-full animate-pulse delay-150" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">
                    Listening...
                  </span>
                </div>
              </div>

              {/* Right Column: OmniSlate Metrics & Action Center */}
              <div className="flex-1 p-5 lg:p-6 flex flex-col min-w-0 bg-white/[0.01]">
                {/* Action Center (Placeholder mapping to image) */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <span className="text-[hsl(var(--accent))]">›</span> Action
                    Center
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        • Process Payroll
                      </span>
                      <div className="flex gap-2 items-center">
                        <span className="text-orange-400 font-medium">
                          High
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] bg-white/5 border-white/10 hover:bg-white/10"
                        >
                          Run
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        • Approve Expenses
                      </span>
                      <div className="flex gap-2 items-center">
                        <span className="text-amber-500 font-medium">
                          Pending
                        </span>
                        <span className="text-gray-500 hover:text-white mr-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          ?
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        • Sync QuickBooks
                      </span>
                      <div className="flex gap-2 items-center">
                        <span className="text-emerald-400 font-medium">
                          Ready
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/20"
                        >
                          Sync
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OmniSlate Sub-widget (Info Minimization UX) */}
                <div className="mt-auto bg-[#0a0d14]/80 backdrop-blur-md rounded-2xl p-4 border border-[hsl(var(--accent))]/20 shadow-[0_0_20px_rgba(56,189,248,0.05)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent))]/5 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      Live Telemetry
                    </span>
                  </div>

                  {/* Phase A.5 - Icon Only until Hover */}
                  <div className="flex items-center justify-between gap-1 mt-auto relative z-10">
                    <HiddenMetric
                      icon={Network}
                      label="Tasks Today"
                      value="27 / 50"
                      valueClass="text-white"
                    />
                    <HiddenMetric
                      icon={Activity}
                      label="Success Rate"
                      value="demo score sample"
                      valueClass="text-emerald-400"
                    />
                    <HiddenMetric
                      icon={Cpu}
                      label="Avg. Latency"
                      value="842ms"
                      valueClass="text-[hsl(var(--accent))]"
                    />
                    <HiddenMetric
                      icon={LineChart}
                      label="Cost Saved"
                      value="$3,240"
                      valueClass="text-green-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* OmniTrace Event Log */}
        <section>
          <Card className="glass-card hover-lift h-full overflow-hidden relative border border-white/5">
            <div className="h-full overflow-hidden pt-2 pl-2">
              <OmniTraceFeed />
            </div>
          </Card>
        </section>

        <WidgetCard
          id="analytics"
          bgClass="bg-[#120D1A]/90"
          borderClass="border-purple-900/30"
          textClass="text-purple-400"
          icon={LineChart}
          title="Analytics Metrics"
        >
          <HiddenMetric icon={Users} label="Daily Active Users" value="1,248" />
          <ProgressRow colorClass="bg-purple-500" widthPercent="74%" />
          <HiddenMetric icon={GitMerge} label="Workflow Execution" value="8.4k" />
          <ProgressRow colorClass="bg-blue-500" widthPercent="92%" />
        </WidgetCard>

        <WidgetCard
          id="security"
          bgClass="bg-[#0A141A]/90"
          borderClass="border-cyan-900/30"
          textClass="text-cyan-400"
          icon={Shield}
          title="Security Audit"
          contentClass="p-3"
        >
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="h-8 w-8 rounded-full bg-cyan-950/50 border border-cyan-900/50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Zero Trust Active</p>
              <p className="text-[10px] text-gray-500">All gateways secured</p>
            </div>
          </div>
          <div className="space-y-1">
            <HiddenMetric icon={Lock} label="Threats" value="0 Blocked" valueClass="text-emerald-500 font-bold" />
            <HiddenMetric icon={Clock} label="Auth Fixes" value="Last 24h" />
          </div>
        </WidgetCard>

        <WidgetCard
          id="knowledge"
          bgClass="bg-[#1A100A]/90"
          borderClass="border-orange-900/30"
          textClass="text-orange-400"
          icon={Database}
          title="Knowledge Graph"
        >
          <HiddenMetric icon={Database} label="Vector Store" value="14.2 GB" valueClass="text-orange-200" />
          <HiddenMetric icon={Database} label="SQL Relational" value="2.1 GB" valueClass="text-rose-200" />
        </WidgetCard>
      </div>
    </div>
  );
};

export default Today;
