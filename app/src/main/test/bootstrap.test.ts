/*
 * FusionIsland - derived from eIsland (https://github.com/JNTMTMTM/eIsland).
 * Copyright (C) 2026 JNTMTMTM and FusionIsland contributors.
 * Licensed under the GNU General Public License, version 3 or later.
 */
/**
 * @file bootstrap.test.ts
 * @description 验证启动入口在依赖加载之前记录日志并处理失败和重复实例。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  lock: vi.fn(() => true), quit: vi.fn(), exit: vi.fn(), showError: vi.fn(), append: vi.fn(), runtime: vi.fn(), setName: vi.fn(), setPath: vi.fn(),
}));
vi.mock('electron', () => ({
  app: { setName: mocks.setName, setPath: mocks.setPath, getPath: () => 'C:/test/profile', getVersion: () => '1.0.2', getLocale: () => 'zh-CN',
    whenReady: () => Promise.resolve(), requestSingleInstanceLock: mocks.lock, quit: mocks.quit, exit: mocks.exit },
  dialog: { showErrorBox: mocks.showError }, BrowserWindow: { getAllWindows: () => [] },
}));
vi.mock('node:fs', () => ({ mkdirSync: vi.fn(), appendFileSync: mocks.append }));

describe('startup bootstrap', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); mocks.lock.mockReturnValue(true);
    vi.spyOn(process, 'on').mockReturnValue(process);
    vi.doMock('../index', () => { mocks.runtime(); return {}; });
  });
  afterEach(() => vi.restoreAllMocks());
  it('writes a startup log before loading the runtime', async () => {
    await import('../bootstrap');
    await vi.waitFor(() => expect(mocks.runtime).toHaveBeenCalledOnce());
    expect(mocks.append.mock.invocationCallOrder[0]).toBeLessThan(mocks.runtime.mock.invocationCallOrder[0]);
    expect(mocks.setName.mock.calls).toEqual([['FusionIsland'],['FloatIsland']]);
    expect(mocks.setPath).toHaveBeenCalledWith('userData','C:/test/profile');
  });
  it('exits a second instance without loading native dependencies', async () => {
    mocks.lock.mockReturnValue(false);
    await import('../bootstrap');
    expect(mocks.quit).toHaveBeenCalledOnce();
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('logs and shows an import failure before exiting', async () => {
    vi.doMock('../index', () => { throw new Error('Missing native dependency'); });
    await import('../bootstrap');
    await vi.waitFor(() => expect(mocks.showError).toHaveBeenCalledOnce());
    expect(mocks.showError.mock.calls[0][1]).toContain('startup.log');
    expect(mocks.showError.mock.calls[0][1]).toContain('Missing native dependency');
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });
});
