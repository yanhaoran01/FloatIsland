/*
 * FusionIsland - derived from eIsland (https://github.com/JNTMTMTM/eIsland).
 * Copyright (C) 2026 JNTMTMTM and FusionIsland contributors.
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file appLifecycle.test.ts
 * @description 验证双击已运行应用时恢复隐藏窗口。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const callbacks = vi.hoisted(() => new Map<string, () => void>());
vi.mock('electron', () => ({ app: { on: (event: string, fn: () => void) => callbacks.set(event, fn) } }));
import { registerAppLifecycleHandlers } from '../appLifecycle';

describe('second instance', () => {
  beforeEach(() => callbacks.clear());
  it('shows a hidden window before focusing it', () => {
    const window = { isDestroyed: () => false, isMinimized: () => false, show: vi.fn(), focus: vi.fn(), restore: vi.fn() };
    registerAppLifecycleHandlers({ getMainWindow: () => window as never, onWillQuit: vi.fn(), onWindowAllClosed: vi.fn() });
    callbacks.get('second-instance')!();
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(window.show.mock.invocationCallOrder[0]).toBeLessThan(window.focus.mock.invocationCallOrder[0]);
  });
  it('restores a minimized window', () => {
    const window = { isDestroyed: () => false, isMinimized: () => true, show: vi.fn(), focus: vi.fn(), restore: vi.fn() };
    registerAppLifecycleHandlers({ getMainWindow: () => window as never, onWillQuit: vi.fn(), onWindowAllClosed: vi.fn() });
    callbacks.get('second-instance')!();
    expect(window.restore).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledOnce();
  });
  it('ignores a missing window', () => {
    registerAppLifecycleHandlers({ getMainWindow: () => null, onWillQuit: vi.fn(), onWindowAllClosed: vi.fn() });
    expect(() => callbacks.get('second-instance')!()).not.toThrow();
  });
});
