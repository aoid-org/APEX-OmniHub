import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSpatialEngine, type SpatialEntity } from '@/lib/spatial/useSpatialEngine';

const entity = (id: string, x: number, y: number): SpatialEntity => ({
  x,
  y,
  data: { id },
});

describe('useSpatialEngine', () => {
  it('removes entities by id using the inserted point', () => {
    const { result } = renderHook(() => useSpatialEngine());

    act(() => {
      result.current.registerEntity(entity('entity-1', 10, 10));
    });

    expect(result.current.queryViewport(100, 100).map((point) => point.data.id)).toContain('entity-1');

    act(() => {
      result.current.removeEntity('entity-1');
    });

    expect(result.current.queryViewport(100, 100).map((point) => point.data.id)).not.toContain('entity-1');
  });

  it('replaces stale points when an entity is updated', () => {
    const { result } = renderHook(() => useSpatialEngine());

    act(() => {
      result.current.registerEntity(entity('entity-1', 10, 10));
      result.current.registerEntity(entity('entity-1', 200, 200));
    });

    expect(result.current.queryViewport(100, 100).map((point) => point.data.id)).not.toContain('entity-1');

    act(() => {
      result.current.setTransform({ tx: -150, ty: -150 });
    });

    expect(result.current.queryViewport(100, 100).map((point) => point.data.id)).toEqual(['entity-1']);

    act(() => {
      result.current.removeEntity('missing-entity');
    });

    expect(result.current.queryViewport(100, 100).map((point) => point.data.id)).toEqual(['entity-1']);
  });
});
