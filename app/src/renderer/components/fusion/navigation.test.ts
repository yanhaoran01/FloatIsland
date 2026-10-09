/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file navigation.test.ts @description 岛内滚轮手势阈值、冷却与边界回归。 @author 鸡哥 */
import { describe, expect, it } from 'vitest';
import { NavigationWheel } from './navigation';

describe('island wheel gestures', () => {
  it('accumulates input and consumes only one page until 220ms of silence', () => {
    const wheel = new NavigationWheel();
    expect(wheel.move(0, 2, 30, 0)).toBe(0);
    expect(wheel.move(0, 2, 30, 10)).toBe(1);
    expect(wheel.move(1, 2, -100, 100)).toBe(1);
    expect(wheel.move(1, 2, -100, 319)).toBe(1);
    expect(wheel.move(1, 2, -100, 539)).toBe(0);
  });
  it('does not wrap at either end or combine opposite partial gestures', () => {
    const wheel = new NavigationWheel();
    expect(wheel.move(0, 2, -100, 0)).toBe(0);
    expect(wheel.move(1, 2, 100, 300)).toBe(1);
    expect(wheel.move(0, 2, 30, 600)).toBe(0);
    expect(wheel.move(0, 2, -30, 620)).toBe(0);
    expect(wheel.move(0, 2, 30, 640)).toBe(0);
    expect(wheel.move(0, 2, 30, 660)).toBe(1);
  });
});
