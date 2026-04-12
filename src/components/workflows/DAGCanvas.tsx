/**
 * DAGCanvas — SVG canvas for rendering workflow nodes and edges
 * Extracted from WorkflowBuilder.tsx to reduce component size.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkflowNode, WorkflowEdge } from '@/lib/workflow-api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NODE_W = 180;
export const NODE_H = 64;
export const CANVAS_W = 900;
export const CANVAS_H = 520;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function outputAnchor(node: WorkflowNode) {
  return { x: node.position.x + NODE_W, y: node.position.y + NODE_H / 2 };
}

function inputAnchor(node: WorkflowNode) {
  return { x: node.position.x, y: node.position.y + NODE_H / 2 };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DAGCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: string | null;
  connectingFrom: string | null;
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onNodeClick: (e: React.MouseEvent, nodeId: string) => void;
  onToggleConnect: (e: React.MouseEvent, nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  onCanvasClick: () => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseUp: () => void;
  onCanvasDragOver: (e: React.DragEvent) => void;
  onCanvasDrop: (e: React.DragEvent) => void;
  canvasRef: React.RefObject<SVGSVGElement>;
}

// ---------------------------------------------------------------------------
// DAGCanvas
// ---------------------------------------------------------------------------

export const DAGCanvas = memo(function DAGCanvas({
  nodes,
  edges,
  selectedNode,
  connectingFrom,
  onNodeMouseDown,
  onNodeClick,
  onToggleConnect,
  onRemoveNode,
  onRemoveEdge,
  onCanvasClick,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasDragOver,
  onCanvasDrop,
  canvasRef,
}: DAGCanvasProps) {
  const hasNodes = nodes.length > 0;

  // ⚡ Bolt: Memoize the node map creation to prevent O(N) iteration on every drag re-render
  // This significantly reduces main-thread blocking when dragging nodes around the canvas
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
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
          {/* Defs: arrowhead markers */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" opacity="0.8" />
            </marker>
            <marker id="arrowhead-muted" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" opacity="0.5" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;
            const out = outputAnchor(src);
            const inp = inputAnchor(tgt);
            return (
              <g key={edge.id}>
                <path d={bezierPath(out.x, out.y, inp.x, inp.y)} stroke="transparent" strokeWidth={14} fill="none" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onRemoveEdge(edge.id); }} />
                <path d={bezierPath(out.x, out.y, inp.x, inp.y)} stroke="hsl(var(--primary))" strokeWidth={2} strokeOpacity={0.75} fill="none" markerEnd="url(#arrowhead)" />
              </g>
            );
          })}

          {/* Empty canvas hint */}
          {!hasNodes && (
            <text x={CANVAS_W / 2} y={CANVAS_H / 2} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-sm" fontSize={14}>
              Drag skills from the palette or click + to add nodes
            </text>
          )}

          {/* Nodes */}
          {nodes.map((node) => (
            <WorkflowNodeSVG
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              isSource={connectingFrom === node.id}
              isConnectTarget={connectingFrom !== null && connectingFrom !== node.id}
              onMouseDown={onNodeMouseDown}
              onClick={onNodeClick}
              onToggleConnect={onToggleConnect}
              onRemove={onRemoveNode}
            />
          ))}
        </svg>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// WorkflowNodeSVG — Individual node rendering
// ---------------------------------------------------------------------------

interface WorkflowNodeSVGProps {
  node: WorkflowNode;
  isSelected: boolean;
  isSource: boolean;
  isConnectTarget: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onClick: (e: React.MouseEvent, nodeId: string) => void;
  onToggleConnect: (e: React.MouseEvent, nodeId: string) => void;
  onRemove: (nodeId: string) => void;
}

const WorkflowNodeSVG = memo(function WorkflowNodeSVG({
  node,
  isSelected,
  isSource,
  isConnectTarget,
  onMouseDown,
  onClick,
  onToggleConnect,
  onRemove,
}: WorkflowNodeSVGProps) {
  const label = (node.data as Record<string, string>).label ?? node.id;
  const intent = (node.data as Record<string, string>).triggerIntent ?? '';

  let strokeColor = 'hsl(var(--border))';
  if (isSource || isSelected) {
    strokeColor = 'hsl(var(--primary))';
  } else if (isConnectTarget) {
    strokeColor = 'hsl(var(--ring))';
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => onMouseDown(e, node.id), [node.id, onMouseDown]);
  const handleClick = useCallback((e: React.MouseEvent) => onClick(e, node.id), [node.id, onClick]);
  const handleToggle = useCallback((e: React.MouseEvent) => onToggleConnect(e, node.id), [node.id, onToggleConnect]);
  const handleRemove = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onRemove(node.id); }, [node.id, onRemove]);

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="cursor-pointer"
      style={{ userSelect: 'none' }}
    >
      {/* Node body */}
      <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={10} ry={10} fill="hsl(var(--card))" stroke={strokeColor} strokeWidth={isSelected || isSource ? 2 : 1.5} filter={isSelected ? 'drop-shadow(0 2px 8px hsl(var(--primary)/0.3))' : undefined} />

      {/* Input port (left) */}
      <circle cx={0} cy={NODE_H / 2} r={5} fill="hsl(var(--border))" stroke="hsl(var(--card))" strokeWidth={2} />

      {/* Output port (right) */}
      <circle cx={NODE_W} cy={NODE_H / 2} r={5} fill="hsl(var(--border))" stroke="hsl(var(--card))" strokeWidth={2} />

      {/* Label */}
      <text x={12} y={22} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
        {label.length > 20 ? `${label.slice(0, 19)}…` : label}
      </text>

      {/* Intent subtitle */}
      <text x={12} y={40} fontSize={10} fill="hsl(var(--muted-foreground))">
        {intent.length > 26 ? `${intent.slice(0, 25)}…` : intent}
      </text>

      {/* Actions (shown on selection) */}
      {isSelected && (
        <>
          {/* Connect button */}
          <g transform={`translate(${NODE_W - 46}, ${NODE_H + 4})`} onClick={handleToggle} className="cursor-pointer">
            <rect x={0} y={0} width={20} height={20} rx={4} fill="hsl(var(--primary))" opacity={0.9} />
            <line x1={4} y1={10} x2={16} y2={10} stroke="white" strokeWidth={2} />
            <polyline points="11,6 16,10 11,14" stroke="white" strokeWidth={1.5} fill="none" />
          </g>

          {/* Delete button */}
          <g transform={`translate(${NODE_W - 22}, ${NODE_H + 4})`} onClick={handleRemove} className="cursor-pointer">
            <rect x={0} y={0} width={20} height={20} rx={4} fill="hsl(var(--destructive))" opacity={0.9} />
            <line x1={5} y1={5} x2={15} y2={15} stroke="white" strokeWidth={1.8} />
            <line x1={15} y1={5} x2={5} y2={15} stroke="white" strokeWidth={1.8} />
          </g>
        </>
      )}
    </g>
  );
});
