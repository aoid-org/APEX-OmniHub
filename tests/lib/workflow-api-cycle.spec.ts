import { describe, it, expect } from 'vitest';
import { detectCycle } from '@/lib/workflow-api';
import type { WorkflowNode, WorkflowEdge } from '@/lib/workflow-api';

function node(id: string): WorkflowNode {
  return { id, type: 'default', position: { x: 0, y: 0 }, data: {} };
}

function edge(source: string, target: string): WorkflowEdge {
  return { id: `${source}-${target}`, source, target };
}

describe('detectCycle (Kahn topological sort)', () => {
  it('should return false for a linear DAG', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    expect(detectCycle(nodes, edges)).toBe(false);
  });

  it('should return false for a diamond DAG (no cycle)', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')];
    expect(detectCycle(nodes, edges)).toBe(false);
  });

  it('should return true for a simple cycle A→B→A', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b'), edge('b', 'a')];
    expect(detectCycle(nodes, edges)).toBe(true);
  });

  it('should return true for a three-node cycle A→B→C→A', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')];
    expect(detectCycle(nodes, edges)).toBe(true);
  });

  it('should return true for a complex cycle with branches', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d'), node('e')];
    const edges = [
      edge('a', 'b'),
      edge('b', 'c'),
      edge('c', 'd'),
      edge('d', 'b'), // cycle: b→c→d→b
      edge('a', 'e'),
    ];
    expect(detectCycle(nodes, edges)).toBe(true);
  });

  it('should return false for a single node with no edges', () => {
    expect(detectCycle([node('a')], [])).toBe(false);
  });

  it('should return false for an empty graph', () => {
    expect(detectCycle([], [])).toBe(false);
  });

  it('should ignore edges referencing non-existent nodes', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b'), edge('b', 'z')]; // z does not exist
    expect(detectCycle(nodes, edges)).toBe(false);
  });

  it('should return true for a self-loop', () => {
    const nodes = [node('a')];
    const edges = [edge('a', 'a')];
    expect(detectCycle(nodes, edges)).toBe(true);
  });

  it('should return false for disconnected acyclic components', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const edges = [edge('a', 'b'), edge('c', 'd')];
    expect(detectCycle(nodes, edges)).toBe(false);
  });
});
