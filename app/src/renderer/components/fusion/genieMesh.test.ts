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
});
