import { describe, expect, it } from 'vitest';
import {
  buildPositionCache,
  deterministicNodePosition,
  mergeTopologyPositions,
  topologyShapeSignature,
} from './topologyContinuity';

describe('topologyContinuity', () => {
  it('builds an isolated cache and preserves cached coordinates during merges', () => {
    const sourcePosition: [number, number, number] = [1, 2, 3];
    const cache = buildPositionCache([{ id: 'alpha', position: sourcePosition }]);
    sourcePosition[0] = 999;

    const merged = mergeTopologyPositions(
      {
        nodes: [
          { id: 'alpha', name: 'Alpha', type: 'task', position: [10, 20, 30] },
          { id: 'beta', name: 'Beta', type: 'event' },
        ],
        links: [{ from: 'alpha', to: 'beta' }],
      },
      cache
    );

    expect(cache.get('alpha')).toEqual([1, 2, 3]);
    expect(merged.nodes[0]?.position).toEqual([1, 2, 3]);
    expect(merged.nodes[1]?.position).toEqual(
      deterministicNodePosition('beta', 1, 2)
    );
  });

  it('generates deterministic fallback coordinates', () => {
    const first = deterministicNodePosition('stable-node', 2, 7, 24);
    const second = deterministicNodePosition('stable-node', 2, 7, 24);

    expect(second).toEqual(first);
    expect(first).toHaveLength(3);
    expect(first.some((value) => value !== 0)).toBe(true);
  });

  it('keeps the topology signature stable when only link order changes', () => {
    const first = topologyShapeSignature(
      [{ id: 'alpha' }, { id: 'beta' }],
      [
        { from: 'beta', to: 'alpha' },
        { from: 'alpha', to: 'beta' },
      ]
    );
    const second = topologyShapeSignature(
      [{ id: 'alpha' }, { id: 'beta' }],
      [
        { from: 'alpha', to: 'beta' },
        { from: 'beta', to: 'alpha' },
      ]
    );

    expect(second).toBe(first);
  });
});
