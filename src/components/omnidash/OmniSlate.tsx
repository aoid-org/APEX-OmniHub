import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Database,
  Cpu,
  HardDrive,
  Network,
  Users,
  GitMerge,
  Lock,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Unified Telemetry Data
const SLATE_METRICS = [
  {
    id: "cpu",
    icon: Cpu,
    label: "CPU Usage",
    value: "12.4%",
    metricClass: "text-blue-400",
    details:
      "System core execution is running optimally with plenty of headroom for Maestro intents.",
  },
  {
    id: "mem",
    icon: HardDrive,
    label: "Memory (Heap)",
    value: "842 MB",
    metricClass: "text-purple-400",
    details:
      "Heap usage is well within the 4GB allocation. Garbage collection cycle normal.",
  },
  {
    id: "net",
    icon: Network,
    label: "Active Connects",
    value: "14,204",
    metricClass: "text-[hsl(var(--accent))] font-semibold",
    details:
      "Global inbound WebSockets. Traffic is heavy but latency remains low.",
  },
  {
    id: "db",
    icon: Database,
    label: "DB Latency",
    value: "8ms",
    metricClass: "text-emerald-400",
    details: "Vector and relation queries responding rapidly at edge nodes.",
  },
  {
    id: "users",
    icon: Users,
    label: "Daily Active",
    value: "1,248",
    metricClass: "text-orange-400",
    details: "Peak concurrency achieved. 18% lift from previous cycle.",
  },
  {
    id: "workflows",
    icon: GitMerge,
    label: "Executions",
    value: "8.4k",
    metricClass: "text-blue-500",
    details: "Zero-Drift workflow completion rate is at 99.8%.",
  },
  {
    id: "threats",
    icon: Lock,
    label: "Threats Blocked",
    value: "0",
    metricClass: "text-emerald-500 font-bold",
    details: "Zero Trust architecture active. No hostile spoofing detected.",
  },
];

export const OmniSlate = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapse on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If expanding is active and click is outside the Card container, collapse it.
      if (
        expandedId &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpandedId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedId]);

  return (
    <Card
      ref={containerRef}
      className="glass-card hover-lift h-full flex flex-col relative overflow-hidden bg-[#0A0D14]/90 border-[hsl(var(--accent))]/20"
    >
      <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors z-20">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      <CardHeader className="p-4 pb-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[hsl(var(--accent))]" />
          <CardTitle className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
            OmniSLATE Telemetry
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-end z-10">
        <AnimatePresence mode="popLayout">
          {expandedId && (
            <motion.div
              layoutId={`slate-container-${expandedId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="absolute inset-0 bg-[#120D1A]/95 backdrop-blur-2xl z-20 p-6 flex flex-col shadow-2xl overflow-y-auto"
            >
              {(() => {
                const metric = SLATE_METRICS.find((m) => m.id === expandedId);
                if (!metric) return null;
                const Icon = metric.icon;
                return (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <motion.div
                          layoutId={`slate-icon-${metric.id}`}
                          className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg"
                        >
                          <Icon className={`h-7 w-7 ${metric.metricClass}`} />
                        </motion.div>
                        <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">
                            {metric.label}
                          </h3>
                          <p
                            className={`text-2xl font-mono mt-1 ${metric.metricClass}`}
                          >
                            {metric.value}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(null);
                        }}
                        className="p-2 hover:bg-white/10 hover:text-white rounded-full transition-colors text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-8 flex-1 flex flex-col">
                      <p className="text-gray-300 text-sm leading-relaxed max-w-lg">
                        {metric.details}
                      </p>

                      {/* Mock Data Visualization Area */}
                      <div className="mt-auto h-32 w-full rounded-xl bg-white/5 border border-white/10 flex items-end p-4 gap-2 shadow-inner">
                        {[40, 70, 45, 90, 65, 80, 55, 100]
                          .map((h, i) => ({ id: `bar-${i}`, h }))
                          .map((item, i) => (
                            <motion.div
                              key={item.id}
                              initial={{ height: 0 }}
                              animate={{ height: `${item.h}%` }}
                              transition={{ delay: i * 0.05, type: "spring" }}
                              className="flex-1 bg-gradient-to-t from-[hsl(var(--accent))]/20 to-[hsl(var(--accent))]/80 rounded-sm"
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Idle Row */}
        <div className="flex flex-wrap items-center gap-2 mt-auto relative z-10 w-full justify-between sm:justify-start">
          <TooltipProvider delayDuration={0}>
            {SLATE_METRICS.map((metric) => {
              const Icon = metric.icon;
              const isSelected = expandedId === metric.id;
              return (
                <Tooltip key={metric.id}>
                  <TooltipTrigger asChild>
                    <motion.button
                      layoutId={
                        isSelected ? undefined : `slate-icon-${metric.id}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(metric.id);
                      }}
                      onPanEnd={(_, info) => {
                        // Swipe up detection
                        if (info.offset.y < -30) {
                          setExpandedId(metric.id);
                        }
                      }}
                      className={`group relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-accent ${
                        isSelected
                          ? "opacity-0 scale-50"
                          : "bg-white/5 hover:bg-white/15 border border-white/5 opacity-100 scale-100 shadow-sm"
                      }`}
                      data-testid={`telemetry-${metric.id}`}
                      aria-label={`View details for ${metric.label}`}
                    >
                      <Icon
                        className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300 ${
                          isSelected
                            ? metric.metricClass
                            : "text-gray-400 group-hover:text-white group-hover:scale-110"
                        }`}
                      />
                      <span className="sr-only">{metric.label}</span>
                    </motion.button>
                  </TooltipTrigger>
                  {!expandedId && (
                    <TooltipContent
                      side="top"
                      className="flex items-center gap-2 px-3 py-2 bg-[#120D1A]/95 border-[hsl(var(--accent))]/50 backdrop-blur-md z-50 shadow-2xl"
                      data-testid={`telemetry-tooltip-${metric.id}`}
                    >
                      <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        {metric.label}
                      </span>
                      <span
                        className={`font-mono text-sm ${metric.metricClass}`}
                      >
                        {metric.value}
                      </span>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};
