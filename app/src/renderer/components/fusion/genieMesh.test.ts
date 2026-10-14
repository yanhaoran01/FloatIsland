/* FloatIsland - https://github.com/yanhaoran01/FloatIsland. Copyright (C) 2026 contributors. GPL-3.0. */
/** @file genieMesh.test.ts @description Dock morph endpoints, bounds and silhouette continuity. @author 鸡哥 */
import { describe, expect, it } from 'vitest';
import { geniePoint } from './genieMesh';

describe('geniePoint', () => {
  const compact = { x: 20, y: 12, width: 260, height: 42 };

  it.each(['top', 'left', 'right'] as const)('preserves the full page at progress 0 for %s', edge => {
    expect(geniePoint(0.25, 0.75, 0, edge, 760, 560, compact)).toEqual([190, 420]);
  });

  it.each(['top', 'left', 'right'] as const)('converges to the compact rectangle at progress 1 for %s', edge => {
    const [x, y] = geniePoint(0.25, 0.75, 1, edge, 760, 560, compact);
    expect(x).toBeCloseTo(compact.x + compact.width * 0.25, 6);
    expect(y).toBeCloseTo(compact.y + compact.height * 0.75, 6);
  });

  it('keeps intermediate positions finite and clamps progress', () => {
    for (const progress of [-1, 0.2, 0.5, 0.8, 2]) {
      const point = geniePoint(0.4, 0.6, progress, 'right', 760, 560, compact);
      expect(point.every(Number.isFinite)).toBe(true);
    }
    expect(geniePoint(0.4, 0.6, -1, 'right', 760, 560, compact))
      .toEqual(geniePoint(0.4, 0.6, 0, 'right', 760, 560, compact));
    expect(geniePoint(0.4, 0.6, 2, 'right', 760, 560, compact))
      .toEqual(geniePoint(0.4, 0.6, 1, 'right', 760, 560, compact));
  });

  it.each(['top', 'left', 'right'] as const)('keeps a gentle silhouette without folded rows for %s', edge => {
    const dock = edge === 'top' ? {x:250,y:0,width:260,height:42} : {x:edge==='left'?0:712,y:150,width:48,height:260};
    for (let p = 0; p <= 1; p += .025) {
      let previous = -Infinity;
      const spans: number[] = [];
      for (let row = 0; row <= 32; row++) {
        const distance = row / 32;
        const start = edge === 'top' ? geniePoint(0,distance,p,edge,760,560,dock) : geniePoint(distance,0,p,edge,760,560,dock);
        const end = edge === 'top' ? geniePoint(1,distance,p,edge,760,560,dock) : geniePoint(distance,1,p,edge,760,560,dock);
        const along = edge === 'top' ? start[1] : start[0];
        expect(along).toBeGreaterThan(previous);
        previous = along;
        spans.push(edge === 'top' ? end[0]-start[0] : end[1]-start[1]);
      }
      expect(Math.min(...spans)).toBeGreaterThan(0);
      expect(Math.max(...spans)-Math.min(...spans)).toBeLessThanOrEqual((edge==='top'?760-260:560-260)*.12+1e-6);
    }
  });
});
