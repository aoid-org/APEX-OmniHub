/**
 * WorkflowBuilder — Visual DAG orchestration canvas.
 *
 * Features:
 * - Skill palette sourced from user_generated_skills
 * - Drag-and-drop skill nodes onto an SVG canvas
 * - Node repositioning via HTML5 drag (canvas-relative coordinates)
 * - SVG arrows for directed edges with port anchors
 * - Click-to-connect: select source node → click "→" on target
 * - Cycle detection blocks save (Kahn's topological sort)
 * - Save / load / schedule / run controls persisted to Supabase
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  saveWorkflow,
  createWorkflowRun,
  fetchWorkflows,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowEdge,
} from '@/lib/workflow-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkillForgeWidget } from '@/components/skills/SkillForgeWidget';
import {
  Save,
  Play,
  Plus,
  Trash2,
  Loader2,
  GitBranch,
  Sparkles,
  Link,
  Unlink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_W = 180;
const NODE_H = 64;
const CANVAS_W = 900;
const CANVAS_H = 520;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillRecord {
  id: string;
  name: string;
  trigger_intent: string;
  is_active: boolean;
}

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the output port anchor (right-centre) for a node */
function outputAnchor(node: WorkflowNode) {
  return {
    x: node.position.x + NODE_W,
    y: node.position.y + NODE_H / 2,
  };
}

/** Compute the input port anchor (left-centre) for a node */
function inputAnchor(node: WorkflowNode) {
  return {
    x: node.position.x,
    y: node.position.y + NODE_H / 2,
  };
}

/** Cubic bezier path between two points */
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// WorkflowBuilder Component
// ---------------------------------------------------------------------------

export function WorkflowBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [schedule, setSchedule] = useState('');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────

  const skills = useQuery<SkillRecord[]>({
    queryKey: ['user-skills', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_generated_skills')
        .select('id, name, trigger_intent, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as SkillRecord[];
    },
  });

  const workflows = useQuery({
    queryKey: ['workflows', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      return fetchWorkflows(user.id);
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const definition: WorkflowDefinition = { nodes, edges };
      return saveWorkflow(user.id, { name: workflowName, definition, schedule: schedule || null });
    },
    onSuccess: () => {
      toast({ title: 'Workflow Saved', description: 'DAG saved and validated.' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] }).catch(console.error);
    },
    onError: (error: Error) => {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const wf = await saveWorkflow(user.id, {
        name: workflowName,
        definition: { nodes, edges },
        schedule: schedule || null,
      });
      return createWorkflowRun(wf.id, user.id);
    },
    onSuccess: () => {
      toast({ title: 'Workflow Queued', description: 'Execution started.' });
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] }).catch(console.error);
    },
    onError: (error: Error) => {
      toast({ title: 'Run Failed', description: error.message, variant: 'destructive' });
    },
  });

  // ── Canvas node drag handlers ────────────────────────────────────────────

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const onNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      // If we're in connect-mode, handle connection instead
      if (connectingFrom !== null) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragRef.current = {
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        originX: node.position.x,
        originY: node.position.y,
      };
      setSelectedNode(nodeId);
    },
    [nodes, connectingFrom],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const { nodeId, startX, startY, originX, originY } = dragRef.current;
      const svg = canvasRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const scale = ctm.a; // uniform scale
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: {
                  x: Math.max(0, Math.min(CANVAS_W - NODE_W, originX + dx)),
                  y: Math.max(0, Math.min(CANVAS_H - NODE_H, originY + dy)),
                },
              }
            : n,
        ),
      );
    },
    [],
  );

  const onCanvasMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Canvas click (deselect / complete connection) ────────────────────────

  const onCanvasClick = useCallback(() => {
    if (connectingFrom) {
      setConnectingFrom(null);
    } else {
      setSelectedNode(null);
    }
  }, [connectingFrom]);

  // ── Node actions ─────────────────────────────────────────────────────────

  const addSkillNode = useCallback((skill: SkillRecord) => {
    const col = Math.floor(Math.random() * 3);
    const row = Math.floor(Math.random() * 4);
    const newNode: WorkflowNode = {
      id: `skill-${skill.id}-${Date.now()}`,
      type: 'skill',
      position: {
        x: 60 + col * (NODE_W + 60),
        y: 40 + row * (NODE_H + 40),
      },
      data: { label: skill.name, skillId: skill.id, triggerIntent: skill.trigger_intent },
    };
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode((s) => (s === nodeId ? null : s));
    setConnectingFrom((c) => (c === nodeId ? null : c));
  }, []);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (connectingFrom === null) {
        setSelectedNode(nodeId);
        return;
      }
      // Complete the connection
      if (connectingFrom === nodeId) {
        setConnectingFrom(null);
        return;
      }
      const edgeId = `edge-${connectingFrom}-${nodeId}`;
      if (!edges.some((edge) => edge.id === edgeId)) {
        setEdges((prev) => [
          ...prev,
          { id: edgeId, source: connectingFrom, target: nodeId },
        ]);
      }
      setConnectingFrom(null);
    },
    [connectingFrom, edges],
  );

  const toggleConnect = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setConnectingFrom((prev) => (prev === nodeId ? null : nodeId));
      setSelectedNode(nodeId);
    },
    [],
  );

  const removeEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // ── Palette drag-to-canvas ───────────────────────────────────────────────

  const onPaletteDragStart = useCallback(
    (e: React.DragEvent, skill: SkillRecord) => {
      e.dataTransfer.setData('application/skill-id', skill.id);
      e.dataTransfer.setData('application/skill-name', skill.name);
      e.dataTransfer.setData('application/skill-intent', skill.trigger_intent);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const skillId = e.dataTransfer.getData('application/skill-id');
      const skillName = e.dataTransfer.getData('application/skill-name');
      const triggerIntent = e.dataTransfer.getData('application/skill-intent');
      if (!skillId) return;
      const { x, y } = getSVGPoint(e.clientX, e.clientY);
      const newNode: WorkflowNode = {
        id: `skill-${skillId}-${Date.now()}`,
        type: 'skill',
        position: {
          x: Math.max(0, Math.min(CANVAS_W - NODE_W, x - NODE_W / 2)),
          y: Math.max(0, Math.min(CANVAS_H - NODE_H, y - NODE_H / 2)),
        },
        data: { label: skillName, skillId, triggerIntent },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [getSVGPoint],
  );

  // ── Derived ──────────────────────────────────────────────────────────────

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const hasNodes = nodeCount > 0;

  // Build a node lookup for edge rendering
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header Controls ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold w-64"
            placeholder="Workflow name"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <SkillForgeWidget />
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasNodes}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || !hasNodes}
          >
            {runMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      {/* ── Schedule + Stats ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="Cron schedule (optional, e.g. 0 9 * * 1-5)"
          className="max-w-sm text-sm"
        />
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          {nodeCount} nodes · {edgeCount} edges
        </Badge>
        {connectingFrom && (
          <Badge variant="default" className="text-xs animate-pulse whitespace-nowrap">
            Click a target node to connect
          </Badge>
        )}
      </div>

      {/* ── Main editor (palette + canvas) ── */}
      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        {/* ── Skill Palette ── */}
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Skill Palette
            </CardTitle>
            <CardDescription className="text-xs">
              Drag skills onto the canvas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px] px-3 pb-3">
              {skills.data?.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No skills yet. Forge one first.
                </p>
              )}
              {skills.data?.map((skill) => (
                <button
                  type="button"
                  key={skill.id}
                  draggable
                  onDragStart={(e) => onPaletteDragStart(e, skill)}
                  onClick={() => addSkillNode(skill)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      addSkillNode(skill);
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-2 group cursor-grab active:cursor-grabbing mb-1 border border-transparent hover:border-border bg-transparent"
                >
                  <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{skill.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {skill.trigger_intent}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-muted-foreground group-hover:text-primary">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── DAG Canvas ── */}
        <Card className="glass-card rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <svg
              ref={canvasRef}
              width="100%"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className={`w-full bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] bg-[length:24px_24px] select-none ${connectingFrom ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ minHeight: 420 }}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
              onClick={onCanvasClick}
              onDragOver={onCanvasDragOver}
              onDrop={onCanvasDrop}
            >
              {/* ── Defs: arrowhead marker ── */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="hsl(var(--primary))"
                    opacity="0.8"
                  />
                </marker>
                <marker
                  id="arrowhead-muted"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="hsl(var(--muted-foreground))"
                    opacity="0.5"
                  />
                </marker>
              </defs>

              {/* ── Edges ── */}
              {edges.map((edge) => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;
                const out = outputAnchor(src);
                const inp = inputAnchor(tgt);
                return (
                  <g key={edge.id}>
                    {/* Hit-area (wider invisible stroke for easier clicking) */}
                    <path
                      d={bezierPath(out.x, out.y, inp.x, inp.y)}
                      stroke="transparent"
                      strokeWidth={14}
                      fill="none"
                      className="cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                    />
                    <path
                      d={bezierPath(out.x, out.y, inp.x, inp.y)}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeOpacity={0.75}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}

              {/* ── Empty canvas hint ── */}
              {!hasNodes && (
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-sm"
                  fontSize={14}
                >
                  Drag skills from the palette or click + to add nodes
                </text>
              )}

              {/* ── Nodes ── */}
              {nodes.map((node) => {
                const label = (node.data as Record<string, string>).label ?? node.id;
                const intent = (node.data as Record<string, string>).triggerIntent ?? '';
                const isSelected = selectedNode === node.id;
                const isSource = connectingFrom === node.id;
                const isConnectTarget = connectingFrom !== null && connectingFrom !== node.id;
                let strokeColor = 'hsl(var(--border))';
                if (isSource || isSelected) {
                  strokeColor = 'hsl(var(--primary))';
                } else if (isConnectTarget) {
                  strokeColor = 'hsl(var(--ring))';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                    onClick={(e) => handleNodeClick(e, node.id)}
                    className="cursor-pointer"
                    style={{ userSelect: 'none' }}
                  >
                    {/* Node body */}
                    <rect
                      x={0}
                      y={0}
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      ry={10}
                      fill="hsl(var(--card))"
                      stroke={strokeColor}
                      strokeWidth={isSelected || isSource ? 2 : 1.5}
                      filter={isSelected ? 'drop-shadow(0 2px 8px hsl(var(--primary)/0.3))' : undefined}
                    />

                    {/* Input port (left) */}
                    <circle cx={0} cy={NODE_H / 2} r={5} fill="hsl(var(--border))" stroke="hsl(var(--card))" strokeWidth={2} />

                    {/* Output port (right) */}
                    <circle cx={NODE_W} cy={NODE_H / 2} r={5} fill="hsl(var(--border))" stroke="hsl(var(--card))" strokeWidth={2} />

                    {/* Label */}
                    <text
                      x={12}
                      y={22}
                      fontSize={12}
                      fontWeight={600}
                      fill="hsl(var(--foreground))"
                    >
                      {label.length > 20 ? `${label.slice(0, 19)}…` : label}
                    </text>

                    {/* Intent subtitle */}
                    <text
                      x={12}
                      y={40}
                      fontSize={10}
                      fill="hsl(var(--muted-foreground))"
                    >
                      {intent.length > 26 ? `${intent.slice(0, 25)}…` : intent}
                    </text>

                    {/* Actions (shown on selection) */}
                    {isSelected && (
                      <>
                        {/* Connect button */}
                        <g
                          transform={`translate(${NODE_W - 46}, ${NODE_H + 4})`}
                          onClick={(e) => toggleConnect(e, node.id)}
                          className="cursor-pointer"
                        >
                          <rect x={0} y={0} width={20} height={20} rx={4} fill="hsl(var(--primary))" opacity={0.9} />
                          {/* Link icon — drawn as simple SVG since Lucide can't render inside <svg> foreign objects */}
                          <line x1={4} y1={10} x2={16} y2={10} stroke="white" strokeWidth={2} />
                          <polyline points="11,6 16,10 11,14" stroke="white" strokeWidth={1.5} fill="none" />
                        </g>

                        {/* Delete button */}
                        <g
                          transform={`translate(${NODE_W - 22}, ${NODE_H + 4})`}
                          onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                          className="cursor-pointer"
                        >
                          <rect x={0} y={0} width={20} height={20} rx={4} fill="hsl(var(--destructive))" opacity={0.9} />
                          <line x1={5} y1={5} x2={15} y2={15} stroke="white" strokeWidth={1.8} />
                          <line x1={15} y1={5} x2={5} y2={15} stroke="white" strokeWidth={1.8} />
                        </g>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Link className="h-3 w-3" /> Select a node, then click arrow icon to start connecting</span>
        <span className="flex items-center gap-1"><Unlink className="h-3 w-3" /> Click an edge to remove it</span>
        <span className="flex items-center gap-1"><Trash2 className="h-3 w-3" /> Select + X to delete a node</span>
      </div>

      {/* ── Saved Workflows ── */}
      {workflows.data && workflows.data.length > 0 && (
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Saved Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workflows.data.slice(0, 5).map((wf) => (
                <button
                  key={wf.id}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors flex items-center justify-between"
                  onClick={() => {
                    setWorkflowName(wf.name);
                    setNodes(wf.definition.nodes);
                    setEdges(wf.definition.edges);
                    setSchedule(wf.schedule ?? '');
                    setSelectedNode(null);
                    setConnectingFrom(null);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wf.definition.nodes.length} nodes · {wf.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Badge variant={wf.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {wf.schedule ?? 'Manual'}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
