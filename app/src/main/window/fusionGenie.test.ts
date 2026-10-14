/* FloatIsland - https://github.com/yanhaoran01/FloatIsland. Copyright (C) 2026 contributors. GPL-3.0. */
/** @file fusionGenie.test.ts @description Capsule capture freshness and transition recovery. @author 鸡哥 */
import {afterEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({handle:vi.fn(),captureGuests:vi.fn(),screenOn:vi.fn(),coverShow:vi.fn(),coverDestroy:vi.fn(),coverCapture:vi.fn().mockResolvedValue({})}));
vi.mock('electron',()=>({BrowserWindow:class {
  webContents={capturePage:mocks.coverCapture};
  isDestroyed=()=>false;
  destroy=mocks.coverDestroy;
  showInactive=mocks.coverShow;
  setIgnoreMouseEvents=vi.fn();
  setAlwaysOnTop=vi.fn();
  loadURL=vi.fn().mockResolvedValue(undefined);
 },ipcMain:{handle:mocks.handle},screen:{on:mocks.screenOn,getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}})}}));
vi.mock('../system/fusionBrowserService',()=>({captureFusionGuestViews:mocks.captureGuests}));

afterEach(()=>vi.useRealTimers());

describe('dock transition snapshots',()=>{
 it('captures current capsule before hiding and resizing instead of replaying the idle cache',async()=>{
  vi.resetModules();vi.useFakeTimers();
  const {registerFusionGenie,genieTransitionActive}=await import('./fusionGenie');
  const image=(value:string)=>({isEmpty:()=>false,resize:()=>({toDataURL:()=>value})});
  const frame={},webContents={mainFrame:frame,capturePage:vi.fn().mockResolvedValueOnce(image('old')).mockResolvedValueOnce(image('current')),send:vi.fn()};
  const win={isDestroyed:()=>false,getContentBounds:()=>({x:830,y:0,width:260,height:42}),webContents,setOpacity:vi.fn(),on:vi.fn()};
  registerFusionGenie(()=>win as never,()=>({edge:'top',position:.5}));
  const invoke=mocks.handle.mock.calls.find(call=>call[0]==='fusion:genie')![1];
  const event={sender:webContents,senderFrame:frame};
  await invoke(event,'prepare',{});
  const snapshot=await invoke(event,'begin',{direction:'expand'});
  expect(snapshot.compactImage).toBe('current');
  expect(webContents.capturePage).toHaveBeenCalledTimes(2);
  expect(webContents.capturePage.mock.invocationCallOrder[1]).toBeLessThan(win.setOpacity.mock.invocationCallOrder[0]);
  expect(win.setOpacity).toHaveBeenLastCalledWith(0);
  expect(mocks.coverShow.mock.invocationCallOrder[0]).toBeLessThan(win.setOpacity.mock.invocationCallOrder[0]);
  expect(mocks.coverDestroy).not.toHaveBeenCalled();
  await expect(invoke(event,'begin',{direction:'expand'})).rejects.toThrow('transition-active');
  await invoke(event,'finish',{revision:snapshot.revision});
  expect(genieTransitionActive()).toBe(false);
  expect(win.setOpacity).toHaveBeenLastCalledWith(1);
  expect(mocks.coverDestroy).toHaveBeenCalled();
 });

 it('releases the transition and restores visibility if the initial capture fails',async()=>{
  vi.resetModules();vi.useFakeTimers();
  const {registerFusionGenie,genieTransitionActive}=await import('./fusionGenie');
  const frame={},webContents={mainFrame:frame,capturePage:vi.fn().mockRejectedValue(Error('capture-failed')),send:vi.fn()};
  const win={isDestroyed:()=>false,getContentBounds:()=>({x:0,y:150,width:48,height:260}),webContents,setOpacity:vi.fn(),on:vi.fn()};
  registerFusionGenie(()=>win as never,()=>({edge:'left',position:.5}));
  const invoke=mocks.handle.mock.calls.find(call=>call[0]==='fusion:genie')![1];
  await expect(invoke({sender:webContents,senderFrame:frame},'begin',{direction:'expand'})).rejects.toThrow('capture-failed');
  expect(genieTransitionActive()).toBe(false);
  expect(win.setOpacity).toHaveBeenLastCalledWith(1);
 });

 it('keeps the compact cover until the resized live capsule has painted',async()=>{
  vi.resetModules();vi.useFakeTimers();
  const {registerFusionGenie}=await import('./fusionGenie');
  let painted:()=>void=()=>{};
  const frame={},webContents={mainFrame:frame,capturePage:vi.fn(()=>new Promise<void>(resolve=>{painted=resolve;})),send:vi.fn()};
  const win={isDestroyed:()=>false,getContentBounds:()=>({x:580,y:0,width:760,height:560}),webContents,setOpacity:vi.fn(),on:vi.fn()};
  registerFusionGenie(()=>win as never,()=>({edge:'top',position:.5}));
  const invoke=mocks.handle.mock.calls.find(call=>call[0]==='fusion:genie')![1],event={sender:webContents,senderFrame:frame};
  const snapshot=await invoke(event,'begin',{direction:'collapse'});
  await expect(invoke(event,'handoff',{revision:snapshot.revision,image:'https://example.com/image.png'})).rejects.toThrow('invalid-transition-image');
  await invoke(event,'handoff',{revision:snapshot.revision,image:'data:image/png;base64,AA=='});
  expect(mocks.coverShow).toHaveBeenCalled();expect(win.setOpacity).toHaveBeenLastCalledWith(0);
  const finished=invoke(event,'finish',{revision:snapshot.revision});
  expect(win.setOpacity).toHaveBeenLastCalledWith(1);expect(mocks.coverDestroy).not.toHaveBeenCalled();
  painted();await finished;expect(mocks.coverDestroy).toHaveBeenCalledTimes(1);
 });
});
