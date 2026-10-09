/* FloatIsland - GPL-3.0. */
/** @file fusionColorPicker.test.ts @description Desktop picker ownership, cancellation and resource cleanup regression. @author 鸡哥 */
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ trusted: true, captureFails: false }));
class Contents extends EventEmitter {
  session = { setPermissionRequestHandler: vi.fn() };
  isDestroyed = (): boolean => false;
  setWindowOpenHandler = vi.fn();
}
class Window extends EventEmitter {
  static instances: Window[] = [];
  static host: Window;
  static fromWebContents = (): Window => Window.host;
  webContents = new Contents();
  destroyed = false;
  visible = true;
  focus = vi.fn();
  setBounds = vi.fn();
  setAlwaysOnTop = vi.fn();
  loadURL = vi.fn(async (): Promise<void> => {});
  constructor(_options?: unknown) { super(); Window.instances.push(this); }
  isDestroyed = (): boolean => this.destroyed;
  isVisible = (): boolean => this.visible;
  hide = (): void => { this.visible = false; };
  show = (): void => { this.visible = true; };
  destroy = (): void => { this.destroyed = true; this.emit('closed'); };
  getContentBounds = (): { width: number; height: number } => ({ width: 2, height: 2 });
  getBounds = (): { x: number; y: number; width: number; height: number } => ({ x: 0, y: 0, width: 2, height: 2 });
}
const environment = vi.hoisted(() => ({ handlers: new Map<string, (...args: unknown[]) => unknown>(), listeners: new Map<string, (...args: unknown[]) => unknown>() }));
const screen = new EventEmitter();
const application = new EventEmitter();
vi.mock('electron', () => ({
  app: application, BrowserWindow: Window,
  ipcMain: { handle: (name: string, fn: (...args: unknown[]) => unknown) => environment.handlers.set(name, fn), on: (name: string, fn: (...args: unknown[]) => unknown) => environment.listeners.set(name, fn) },
  screen: Object.assign(screen, { getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 2, height: 2 }, scaleFactor: 1 }], getCursorScreenPoint: () => ({ x: 0, y: 0 }), getDisplayNearestPoint: () => ({ id: 1 }), getDisplayMatching: () => ({ id: 1 }) }),
}));
vi.mock('./fusionWindows', () => ({ isFusionView: () => state.trusted }));
vi.mock('./productCapture', () => ({ captureProductImage: async () => {
  if (state.captureFails) throw Error('capture-failed');
  return { isEmpty: () => false, getSize: () => ({ width: 2, height: 2 }), toBitmap: () => Buffer.from([52,171,18,255,52,171,18,255,52,171,18,255,52,171,18,255]), toDataURL: () => 'data:image/png;base64,fixture' };
} }));

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); state.trusted = true; state.captureFails = false;
  environment.handlers.clear(); environment.listeners.clear(); screen.removeAllListeners(); application.removeAllListeners();
  Window.instances = []; Window.host = new Window();
  (await import('./fusionColorPicker')).registerFusionColorPicker();
});
afterEach(() => { application.emit('before-quit'); vi.clearAllTimers(); vi.useRealTimers(); });
const start = (): Promise<unknown> => Promise.resolve(environment.handlers.get('fusion:color:pick')!({ sender: Window.host.webContents }, 'start'));
const cancel = (sender: Contents): unknown => environment.handlers.get('fusion:color:pick')!({ sender }, 'cancel');

it('rejects untrusted callers and unknown commands', async () => {
  state.trusted = false; await expect(start()).rejects.toThrow('untrusted-view');
  state.trusted = true; await expect(environment.handlers.get('fusion:color:pick')!({ sender: Window.host.webContents }, 'script')).rejects.toThrow('invalid-command');
});
it('samples only owned overlays and restores the host after a real selection', async () => {
  const result = start(); expect(Window.host.visible).toBe(false); await vi.advanceTimersByTimeAsync(120);
  const overlay = Window.instances[1];
  expect(() => environment.handlers.get('fusion:color:init')!({ sender: new Contents() })).toThrow('untrusted-picker');
  environment.listeners.get('fusion:color:selected')!({ sender: new Contents() }, [0,0,2,2]);
  expect(overlay.destroyed).toBe(false);
  environment.listeners.get('fusion:color:selected')!({ sender: overlay.webContents }, [0,0,2,2]);
  await expect(result).resolves.toBe('#12ab34'); expect(overlay.destroyed).toBe(true); expect(Window.host.visible).toBe(true);
  expect(screen.listenerCount('display-removed')).toBe(0); expect(Window.host.webContents.listenerCount('destroyed')).toBe(0);
});
it('rejects concurrent starts and permits only the owner to cancel', async () => {
  const result = start(); await expect(start()).rejects.toThrow('eyedropper-in-use'); await vi.advanceTimersByTimeAsync(120);
  await cancel(new Contents()); expect(Window.instances[1].destroyed).toBe(false);
  await cancel(Window.host.webContents); await expect(result).resolves.toBeNull(); expect(Window.instances[1].destroyed).toBe(true);
});
it('restores the host on capture failure and allows a subsequent pick', async () => {
  state.captureFails = true; const result = start(); const rejected = expect(result).rejects.toThrow('capture-failed');
  await vi.advanceTimersByTimeAsync(120); await rejected; expect(Window.host.visible).toBe(true);
  state.captureFails = false; const next = start(); await cancel(Window.host.webContents); await expect(next).resolves.toBeNull();
});
it('discards cancelled capture callbacks without creating windows', async () => {
  const result = start(); await cancel(Window.host.webContents); await vi.advanceTimersByTimeAsync(1000);
  await expect(result).resolves.toBeNull(); expect(Window.instances).toHaveLength(1);
});
it('rejects invalid viewport coordinates and cleans up after display changes', async () => {
  const result = start(); const rejected = expect(result).rejects.toThrow('invalid-color-position'); await vi.advanceTimersByTimeAsync(120);
  environment.listeners.get('fusion:color:selected')!({ sender: Window.instances[1].webContents }, [0,0,999,2]); await rejected;
  const next = start(); const changed = expect(next).rejects.toThrow('eyedropper-display-changed'); await vi.advanceTimersByTimeAsync(120);
  screen.emit('display-removed'); await changed; expect(Window.host.visible).toBe(true); expect(Window.instances.slice(1).every(w => w.destroyed)).toBe(true);
});
