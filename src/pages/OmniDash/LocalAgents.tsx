import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

type TimeRange = "24h" | "7d";
type SourceFilter = "all" | "lead-gen" | "apex-sales";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function LocalAgents() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ["omnilink-local-agent-events", timeRange, sourceFilter],
    queryFn: async () => {
      const hoursAgo = timeRange === "24h" ? 24 : 168;
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from("omnilink_events")
        .select("*")
        .gte("time", cutoff)
        .order("time", { ascending: false });

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const leadGenMetrics = events
    ?.filter((e) => e.source === "lead-gen")
    .reduce(
      (acc, e) => {
        if (e.type === "lead_ingested") acc.ingested++;
        if (e.type === "lead_qualified") acc.qualified++;
        if (e.type === "queue_seeded") acc.queueSize = (e.data as { queue_size?: number })?.queue_size ?? 0;
        return acc;
      },
      { ingested: 0, qualified: 0, queueSize: 0 }
    ) ?? { ingested: 0, qualified: 0, queueSize: 0 };

  const apexSalesMetrics = events
    ?.filter((e) => e.source === "apex-sales")
    .reduce(
      (acc, e) => {
        if (e.type === "call_attempted") acc.attempted++;
        if (e.type === "call_connected") acc.connected++;
        if (e.type === "meeting_booked") acc.booked++;
        if (e.type === "call_completed") acc.completed++;
        if (e.type === "error") acc.errors++;
        return acc;
      },
      { attempted: 0, connected: 0, booked: 0, completed: 0, errors: 0 }
    ) ?? { attempted: 0, connected: 0, booked: 0, completed: 0, errors: 0 };

  const qualificationRate = leadGenMetrics.ingested > 0
    ? ((leadGenMetrics.qualified / leadGenMetrics.ingested) * 100).toFixed(1)
    : "0.0";

  const connectionRate = apexSalesMetrics.attempted > 0
    ? ((apexSalesMetrics.connected / apexSalesMetrics.attempted) * 100).toFixed(1)
    : "0.0";

  const bookingRate = apexSalesMetrics.connected > 0
    ? ((apexSalesMetrics.booked / apexSalesMetrics.connected) * 100).toFixed(1)
    : "0.0";

  const leadGenChartData = [
    { name: "Ingested", value: leadGenMetrics.ingested },
    { name: "Qualified", value: leadGenMetrics.qualified },
  ];

  const salesChartData = [
    { name: "Attempted", value: apexSalesMetrics.attempted },
    { name: "Connected", value: apexSalesMetrics.connected },
    { name: "Booked", value: apexSalesMetrics.booked },
    { name: "Errors", value: apexSalesMetrics.errors },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Local Agents Analytics</h1>
          <p className="text-muted-foreground">Live telemetry from Lead-Gen and APEX-Sales machines</p>
        </div>
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="lead-gen">Lead-Gen</SelectItem>
              <SelectItem value="apex-sales">APEX-Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Lead-Gen Panel */}
          {(sourceFilter === "all" || sourceFilter === "lead-gen") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Lead-Gen Machine
                </CardTitle>
                <CardDescription>Lead ingestion and qualification metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Leads Ingested</p>
                    <p className="text-2xl font-bold">{leadGenMetrics.ingested}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Qualified</p>
                    <p className="text-2xl font-bold text-green-600">{leadGenMetrics.qualified}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Queue Size</p>
                    <p className="text-2xl font-bold">{leadGenMetrics.queueSize}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Qualification Rate</p>
                    <p className="text-2xl font-bold">{qualificationRate}%</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={leadGenChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {leadGenChartData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* APEX-Sales Panel */}
          {(sourceFilter === "all" || sourceFilter === "apex-sales") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  APEX-Sales Machine
                </CardTitle>
                <CardDescription>Outbound call and booking metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Calls Attempted</p>
                    <p className="text-2xl font-bold">{apexSalesMetrics.attempted}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <p className="text-2xl font-bold text-blue-600">{apexSalesMetrics.connected}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Meetings Booked</p>
                    <p className="text-2xl font-bold text-green-600">{apexSalesMetrics.booked}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Connection Rate</p>
                    <p className="text-2xl font-bold">{connectionRate}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Booking Rate</p>
                    <p className="text-2xl font-bold">{bookingRate}%</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                {apexSalesMetrics.errors > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{apexSalesMetrics.errors} errors detected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest telemetry from local agents ({events?.length ?? 0} events)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events?.slice(0, 50).map((event) => (
                  <div key={event.id} className="flex justify-between items-center p-2 border-b text-sm">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(event.time).toLocaleString()}
                      </span>
                      <span className="font-semibold">{event.source}</span>
                      <span className="text-muted-foreground">{event.type}</span>
                    </div>
                    <div className="text-xs text-muted-foreground max-w-md truncate">
                      {JSON.stringify(event.data)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
