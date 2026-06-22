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
 *
 * v2.0.0 — Decomposed into WorkflowHeader, WorkflowMetadata, SkillPalette,
 *           DAGCanvas, and SavedWorkflowsList sub-components.
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
import { Link, Unlink, Trash2 } from 'lucide-react';

import { WorkflowHeader } from './WorkflowHeader';
import { WorkflowMetadata } from './WorkflowMetadata';
import { SkillPalette, type SkillRecord } from './SkillPalette';
import { DAGCanvas, NODE_W, NODE_H, CANVAS_W, CANVAS_H } from './DAGCanvas';
import { SavedWorkflowsList } from './SavedWorkflowsList';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
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
  const rafRef = useRef<number | null>(null);
  const latestPosRef = useRef<{ clientX: number; clientY: number } | null>(null);

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
      return (data ?? []).map((skill) => skill);
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

  const applyDragOffset = useCallback((nodeId: string, originX: number, originY: number, dx: number, dy: number) => {
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
          : n
      )
    );
  }, []);

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;

      // ⚡ Bolt: Store latest coordinates to ensure we never process stale positions
      latestPosRef.current = { clientX: e.clientX, clientY: e.clientY };

      // ⚡ Bolt: Throttle React state updates to screen refresh rate (~60fps)
      // High-polling mice (1000Hz) can cause massive React re-render queue flooding otherwise.
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!dragRef.current || !latestPosRef.current) return;

        const { nodeId, startX, startY, originX, originY } = dragRef.current;
        const { clientX, clientY } = latestPosRef.current;

        const svg = canvasRef.current;
        if (!svg) return;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const scale = ctm.a;
        const dx = (clientX - startX) / scale;
        const dy = (clientY - startY) / scale;

        applyDragOffset(nodeId, originX, originY, dx, dy);
      });
    },
    [applyDragOffset],
  );

  const onCanvasMouseUp = useCallback(() => {
    dragRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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

  // ── Load workflow handler ────────────────────────────────────────────────

  const loadWorkflow = useCallback((wf: { name: string; definition: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }; schedule: string | null }) => {
    setWorkflowName(wf.name);
    setNodes(wf.definition.nodes);
    setEdges(wf.definition.edges);
    setSchedule(wf.schedule ?? '');
    setSelectedNode(null);
    setConnectingFrom(null);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasNodes = nodes.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <WorkflowHeader
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        onSave={() => saveMutation.mutate()}
        onRun={() => runMutation.mutate()}
        savePending={saveMutation.isPending}
        runPending={runMutation.isPending}
        hasNodes={hasNodes}
      />

      <WorkflowMetadata
        schedule={schedule}
        onScheduleChange={setSchedule}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        connectingFrom={connectingFrom}
      />

      {/* Main editor (palette + canvas) */}
      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <SkillPalette
          skills={skills.data}
          onAddSkill={addSkillNode}
          onDragStart={onPaletteDragStart}
        />

        <DAGCanvas
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          connectingFrom={connectingFrom}
          onNodeMouseDown={onNodeMouseDown}
          onNodeClick={handleNodeClick}
          onToggleConnect={toggleConnect}
          onRemoveNode={removeNode}
          onRemoveEdge={removeEdge}
          onCanvasClick={onCanvasClick}
          onCanvasMouseMove={onCanvasMouseMove}
          onCanvasMouseUp={onCanvasMouseUp}
          onCanvasDragOver={onCanvasDragOver}
          onCanvasDrop={onCanvasDrop}
          canvasRef={canvasRef}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Link className="h-3 w-3" /> Select a node, then click arrow icon to start connecting</span>
        <span className="flex items-center gap-1"><Unlink className="h-3 w-3" /> Click an edge to remove it</span>
        <span className="flex items-center gap-1"><Trash2 className="h-3 w-3" /> Select + X to delete a node</span>
      </div>

      {/* Saved Workflows */}
      {workflows.data && (
        <SavedWorkflowsList
          workflows={workflows.data}
          onLoad={loadWorkflow}
        />
      )}
    </div>
  );
}
