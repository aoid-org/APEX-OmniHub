
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Server } from 'lucide-react';
import { getOmniPortMetrics, getOmniPortStatus, OmniPortMetrics, OmniPortStatus } from '@/omniconnect/ingress/omniport-metrics';

export const OmniPortMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<OmniPortMetrics | null>(null);
  const [status, setStatus] = useState<OmniPortStatus | null>(null);

  useEffect(() => {
    const update = () => {
      setMetrics(getOmniPortMetrics());
      setStatus(getOmniPortStatus());
    };

    update(); // Initial
    const interval = setInterval(update, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  if (!metrics || !status) return <div className="p-4 text-center">Loading Ingress Metrics...</div>;

  const getHealthColor = (h: string) => {
    switch (h) {
      case 'healthy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'degraded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            OmniPort Ingress Engine
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time fortified input telemetry
          </p>
        </div>
        <Badge variant="outline" className={`${getHealthColor(status.health)} px-3 py-1 text-sm capitalize`}>
          <Activity className="w-3 h-3 mr-2" />
          {status.health}
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalIngestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {status.eventsPerSecond.toFixed(1)} events/sec
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latency (P95)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.p95LatencyMs > 500 ? 'text-yellow-500' : ''}`}>
              {metrics.p95LatencyMs.toFixed(0)} ms
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {metrics.avgLatencyMs.toFixed(1)} ms
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zero-Trust Blocks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{metrics.blocked}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.blocked / (metrics.totalIngestions || 1)) * 100).toFixed(1)}% rejection rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MAN Mode Triggers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{metrics.manModeTriggered}</div>
            <p className="text-xs text-muted-foreground">
              Requiring human approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Splits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader>
            <CardTitle>Ingestion Sources</CardTitle>
            <CardDescription>Traffic breakdown by input channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"/>Text</span>
                 <span className="font-mono">{metrics.bySourceType.text}</span>
               </div>
               <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(metrics.bySourceType.text / (metrics.totalIngestions || 1)) * 100}%` }} />
               </div>
             </div>

             <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"/>Voice</span>
                 <span className="font-mono">{metrics.bySourceType.voice}</span>
               </div>
               <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                 <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(metrics.bySourceType.voice / (metrics.totalIngestions || 1)) * 100}%` }} />
               </div>
             </div>

             <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-500 mr-2"/>Webhook</span>
                 <span className="font-mono">{metrics.bySourceType.webhook}</span>
               </div>
               <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                 <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(metrics.bySourceType.webhook / (metrics.totalIngestions || 1)) * 100}%` }} />
               </div>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Operational integrity & queues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
               <span className="text-sm">DLQ Depth</span>
               <div className="flex items-center space-x-2">
                 <span className={`font-mono font-bold ${status.dlqDepth > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                   {status.dlqDepth}
                 </span>
                 <span className="text-xs text-muted-foreground">msgs</span>
               </div>
             </div>
             
             <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
               <span className="text-sm">Last Successful Ingest</span>
               <span className="text-xs font-mono text-muted-foreground">
                 {status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleTimeString() : 'Never'}
               </span>
             </div>

             <div className="flex items-center justify-between p-3 rounded bg-secondary/30">
               <span className="text-sm">RED Lane Traffic</span>
               <div className="flex items-center space-x-2">
                 <span className={`font-mono font-bold ${metrics.redLaneEvents > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                   {metrics.redLaneEvents}
                 </span>
                 <span className="text-xs text-muted-foreground">events</span>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
