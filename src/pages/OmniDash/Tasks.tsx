import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Play, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useExecute } from "@/hooks/useExecute";
import { useDemoStore } from "@/stores/demoStore";
import { useAccess } from "@/contexts/AccessContext";

type TaskStatus = "queued" | "waiting_approval" | "approved" | "running" | "succeeded" | "failed" | "denied";
type TaskTarget = "apex-sales" | "lead-gen";

interface Task {
  id: string;
  type: string;
  params: { target?: string; action?: string; payload?: unknown };
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  worker_id?: string;
  claimed_at?: string;
  output?: unknown;
  error_message?: string;
  policy?: { require_approval?: boolean };
}

const getStatusBadgeVariant = (status: TaskStatus): "default" | "destructive" | "secondary" => {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  queued: <Clock className="h-4 w-4" />,
  waiting_approval: <AlertCircle className="h-4 w-4 text-amber-500" />,
  approved: <Clock className="h-4 w-4 text-blue-500" />,
  running: <Play className="h-4 w-4 text-blue-500 animate-pulse" />,
  succeeded: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  denied: <XCircle className="h-4 w-4 text-gray-500" />,
};

export default function Tasks() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTaskTarget, setNewTaskTarget] = useState<TaskTarget>("apex-sales");
  const [newTaskAction, setNewTaskAction] = useState("");
  const [newTaskPayload, setNewTaskPayload] = useState("{}");
  const [requireApproval, setRequireApproval] = useState(true);

  const { isDemo, execute } = useExecute();
  const demoStore = useDemoStore();
  const { isAdmin } = useAccess();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["omnilink-tasks"],
    queryKey: ["omnilink-tasks", isDemo],
    queryFn: async () => {
      if (isDemo) {
        return demoStore.tasks.map(t => ({
          id: t.id,
          type: 'apex.task',
          params: { action: t.title, target: 'apex-sales' },
          status: t.status === 'in_progress' ? 'running' : t.status === 'completed' ? 'succeeded' : t.status as TaskStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          policy: { require_approval: true }
        })) as Task[];
      }
      const { data, error } = await supabase
        .from("omnilink_orchestration_requests")
        .select("*")
        .eq("request_type", "task")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 5000,
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        await execute('task.create', {
          title: newTaskAction,
          priority: 'high',
          status: requireApproval ? 'pending' : 'queued'
        });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(newTaskPayload);
      } catch {
        throw new Error("Invalid JSON payload");
      }

      // Get integration ID (first active integration for demo)
      const { data: integrations } = await supabase
        .from("integrations")
        .select("id")
        .eq("status", "active")
        .limit(1);

      if (!integrations?.[0]) throw new Error("No active integration found");

      // Get API key
      const { data: apiKeys } = await supabase
        .from("omnilink_api_keys")
        .select("id")
        .eq("integration_id", integrations[0].id)
        .is("revoked_at", null)
        .limit(1);

      if (!apiKeys?.[0]) throw new Error("No API key found");

      // Create task directly in DB (simulating OmniLink Port call)
      const taskId = crypto.randomUUID();
      const { error } = await supabase
        .from("omnilink_orchestration_requests")
        .insert({
          integration_id: integrations[0].id,
          api_key_id: apiKeys[0].id,
          tenant_id: session?.user.id,
          request_type: "task",
          envelope_id: taskId,
          idempotency_key: `task-${Date.now()}`,
          source: "omnidash",
          type: "apex.task",
          time: new Date().toISOString(),
          params: {
            target: newTaskTarget,
            action: newTaskAction,
            payload,
          },
          policy: { require_approval: requireApproval },
          status: requireApproval ? "waiting_approval" : "queued",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omnilink-tasks"] });
      setCreateDialogOpen(false);
      setNewTaskAction("");
      setNewTaskPayload("{}");
      toast.success("Task created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ taskId, decision }: { taskId: string; decision: "approved" | "denied" }) => {
      if (isDemo) {
        await execute(decision === 'approved' ? 'approval.approve' : 'approval.reject', { id: taskId });
        return;
      }
      const { error } = await supabase.rpc("omnilink_set_approval", {
        p_request_id: taskId,
        p_user_id: session?.user.id,
        p_decision: decision,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omnilink-tasks"] });
      toast.success("Task approval updated");
    },
    onError: (error) => {
      toast.error(`Failed to update approval: ${error.message}`);
    },
  });

  const statusCounts = tasks?.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Dispatch</h1>
          <p className="text-muted-foreground">Create and manage tasks for local agents</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Dispatch a task to a local agent machine</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Target Machine</Label>
                <Select value={newTaskTarget} onValueChange={(v) => setNewTaskTarget(v as TaskTarget)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apex-sales">APEX-Sales</SelectItem>
                    <SelectItem value="lead-gen">Lead-Gen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Input
                  value={newTaskAction}
                  onChange={(e) => setNewTaskAction(e.target.value)}
                  placeholder="e.g., echo, refresh_queue, call_lead"
                />
              </div>
              <div>
                <Label>Payload (JSON)</Label>
                <Textarea
                  value={newTaskPayload}
                  onChange={(e) => setNewTaskPayload(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="require-approval"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="require-approval" className="cursor-pointer">
                  Require approval before execution
                </Label>
              </div>
              <Button onClick={() => createTaskMutation.mutate()} disabled={!newTaskAction || createTaskMutation.isPending} className="w-full">
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statusCounts?.queued ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{statusCounts?.waiting_approval ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{statusCounts?.running ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{statusCounts?.succeeded ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>{tasks?.length ?? 0} total tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              {tasks?.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {STATUS_ICONS[task.status]}
                      <div>
                        <p className="font-semibold">{task.params.action ?? "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          Target: {task.params.target} • {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status}
                      </Badge>
                      {task.status === "waiting_approval" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => approveMutation.mutate({ taskId: task.id, decision: "approved" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ taskId: task.id, decision: "denied" })}>
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {task.worker_id && (
                    <p className="text-xs text-muted-foreground">Worker: {task.worker_id}</p>
                  )}
                  {task.output && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Output</summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">{JSON.stringify(task.output, null, 2)}</pre>
                    </details>
                  )}
                  {task.error_message && (
                    <p className="text-xs text-red-500">Error: {task.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
