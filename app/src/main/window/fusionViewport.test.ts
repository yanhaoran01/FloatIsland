/** @file fusionViewport.test.ts @description Resize ownership, pinned edges, cancellation and persistence. @author 鸡哥 */
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {mkdtempSync,rmSync,readFileSync} from 'fs';import {tmpdir} from 'os';import {join} from 'path';
import type {ViewportState} from '../../preload/types/fusionWorkspace';
const env=vi.hoisted(()=>({root:'',handlers:new Map<string,(event:unknown,...values:string[])=>ViewportState>(),point:{x:0,y:0},bounds:{x:-1600,y:12,width:760,height:560},edge:'left' as 'left'|'right'|'top',dragging:false,expanded:true,sender:{},listeners:new Map<string,()=>void>()}));
vi.mock('electron',()=>({app:{getPath:()=>env.root},ipcMain:{handle:(key:string,callback:(event:unknown,...values:string[])=>ViewportState)=>env.handlers.set(key,callback)},screen:{getCursorScreenPoint:()=>env.point,getDisplayMatching:()=>({workArea:{x:-1600,y:0,width:1600,height:900}}),on:vi.fn()}}));
vi.mock('../system/fusionWindows',()=>({broadcastFusion:vi.fn()}));
beforeEach(()=>{vi.resetModules();env.root=mkdtempSync(join(tmpdir(),'float-viewport-'));env.handlers.clear();env.listeners.clear();env.edge='left';env.expanded=true;env.dragging=false;env.point={x:0,y:0};env.bounds={x:-1600,y:12,width:760,height:560};});
afterEach(()=>rmSync(env.root,{recursive:true,force:true}));
async function setup(){const viewport=await import('./fusionViewport');
 const window={webContents:env.sender,isDestroyed:()=>false,getBounds:()=>({...env.bounds}),on:(event:string,handler:()=>void)=>env.listeners.set(event,handler)};
 // Electron window methods outside the controlled contract are never touched by this test.
 viewport.registerFusionViewport({getWindow:()=>window,dock:()=>({edge:env.edge,expanded:env.expanded,dragging:env.dragging}),apply:bounds=>{env.bounds=bounds;}});
 return {viewport,control:(command:string,value='')=>env.handlers.get('fusion:viewport:control')!({sender:env.sender},command,value)};
}
describe('shared viewport owner',()=>{
 it('pins the attached edge, handles negative monitor coordinates and persists user dimensions',async()=>{const {control,viewport}=await setup();expect(()=>control('begin','w')).toThrow('resize-attached-edge');const initial=control('begin','se');env.point={x:100,y:80};const moved=control('move',initial.token!);expect(moved.actual).toMatchObject({width:860,height:640});expect(env.bounds.x).toBe(-1600);control('end',initial.token!);expect(viewport.workspaceViewportSize()).toEqual({width:860,height:640});expect(JSON.parse(readFileSync(join(env.root,'eIsland_store/fusion-viewport.json'),'utf8'))).toMatchObject({version:1,width:860,height:640});});
 it('restores the starting preference on cancel and rejects late updates',async()=>{const {control,viewport}=await setup();const initial=control('begin','s');env.point.y=100;control('move',initial.token!);control('cancel',initial.token!);expect(env.bounds.height).toBe(560);expect(viewport.workspaceViewportSize()).toEqual({width:760,height:560});expect(()=>control('move',initial.token!)).toThrow('stale-resize-session');});
 it('guards drag, collapse, overlapping gestures and untrusted callers',async()=>{const {control}=await setup();env.dragging=true;expect(()=>control('begin','s')).toThrow('resize-unavailable');env.dragging=false;env.expanded=false;expect(()=>control('begin','s')).toThrow('resize-unavailable');env.expanded=true;control('begin','s');expect(()=>control('begin','e')).toThrow('resize-unavailable');expect(()=>env.handlers.get('fusion:viewport:control')!({sender:{}},'reset')).toThrow('untrusted-view');});
 it('ends safely on blur, clips to work area, and resets saved size',async()=>{const {control,viewport}=await setup();const initial=control('begin','se');env.point={x:10000,y:10000};control('move',initial.token!);expect(env.bounds.x+env.bounds.width).toBeLessThanOrEqual(-12);expect(env.bounds.y+env.bounds.height).toBeLessThanOrEqual(888);env.listeners.get('blur')!();expect(viewport.viewportAdjusting()).toBe(false);control('reset');expect(viewport.workspaceViewportSize()).toEqual({width:760,height:560});});
});
