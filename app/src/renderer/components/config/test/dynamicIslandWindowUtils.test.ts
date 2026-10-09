/** @file dynamicIslandWindowUtils.test.ts @description Window coordinate regression tests. @author 鸡哥 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
const { getMousePositionMock, getWindowBoundsMock } = vi.hoisted(() => ({ getMousePositionMock: vi.fn(), getWindowBoundsMock: vi.fn() }));

beforeEach(() => {
  // Set up window.api in the node test environment
  vi.stubGlobal('window', { api: { getMousePosition: getMousePositionMock, getWindowBounds: getWindowBoundsMock } });
});

describe('isMouseInWindow', () => {
  let isMouseInWindow: () => Promise<boolean>;

  beforeEach(async () => {
    const mod = await import('../dynamicIslandWindowUtils');
    isMouseInWindow = mod.isMouseInWindow;
  });

  describe('mouse inside window', () => {
    it('should return true when mouse is at the center of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the top-left corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 100, y: 100 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the bottom-right corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 300, y: 300 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the top-right corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 300, y: 100 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the bottom-left corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 100, y: 300 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when window is at origin (0,0)', async () => {
      getMousePositionMock.mockResolvedValue({ x: 50, y: 50 });
      getWindowBoundsMock.mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });
  });

  describe('mouse outside window', () => {
    it('should return false when mouse is to the left of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 90, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is to the right of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 301, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is above the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 99 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is below the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 301 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is far away from the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 9999, y: 9999 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('null / undefined API responses', () => {
    it('should return false when getMousePosition returns null', async () => {
      getMousePositionMock.mockResolvedValue(null);
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds returns null', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue(null);

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getMousePosition returns undefined', async () => {
      getMousePositionMock.mockResolvedValue(undefined);
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds returns undefined', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue(undefined);

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when both return null', async () => {
      getMousePositionMock.mockResolvedValue(null);
      getWindowBoundsMock.mockResolvedValue(null);

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('window.api is undefined', () => {
    it('should return false when window.api is undefined', async () => {
      (globalThis as unknown as { window: { api?: unknown } }).window.api = undefined;

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('API throws errors', () => {
    it('should return false when getMousePosition rejects', async () => {
      getMousePositionMock.mockRejectedValue(new Error('IPC failed'));
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds rejects', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockRejectedValue(new Error('IPC failed'));

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when both APIs reject', async () => {
      getMousePositionMock.mockRejectedValue(new Error('getMousePosition failed'));
      getWindowBoundsMock.mockRejectedValue(new Error('getWindowBounds failed'));

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true for a zero-width window where mouse x equals bounds x', async () => {
      // width=0 means bounds.x + width = bounds.x, so x >= bounds.x && x <= bounds.x is true when x === bounds.x
      getMousePositionMock.mockResolvedValue({ x: 100, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 0, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return false for a zero-width window where mouse x differs from bounds x', async () => {
      getMousePositionMock.mockResolvedValue({ x: 101, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 0, height: 100 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should handle negative window coordinates', async () => {
      getMousePositionMock.mockResolvedValue({ x: -50, y: -50 });
      getWindowBoundsMock.mockResolvedValue({ x: -100, y: -100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return false when mouse is at negative coordinates outside a positive window', async () => {
      getMousePositionMock.mockResolvedValue({ x: -1, y: 50 });
      getWindowBoundsMock.mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(false);
    });
  });
});
