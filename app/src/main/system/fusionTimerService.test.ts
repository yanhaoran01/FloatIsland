/* FloatIsland contributors. GPL-3.0. */
/** @file fusionTimerService.test.ts @description Background focus, stage boundaries and paused restart regression. */
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
const mock=vi.hoisted(()=>({directory:'',handlers:new Map<string,(...args:never[])=>unknown>(),quit:[]as Array<()=>void>,notices:[]as string[]}));
vi.mock('electron',()=>({app:{getPath:()=>mock.directory,once:(_name:string,callback:()=>void)=>mock.quit.push(callback)},ipcMain:{handle:(name:string,callback:(...args:never[])=>unknown)=>mock.handlers.set(name,callback)},Notification:class{static isSupported(){return true;}constructor(value:{body:string}){mock.notices.push(value.body);}show(){}}}));
vi.mock('./fusionWindows',()=>({isFusionView:(sender:{trusted:boolean})=>sender.trusted,broadcastFusion:vi.fn()}));
import {registerFusionTimer} from './fusionTimerService';
const invoke=(name:string,...args:unknown[]):unknown=>Reflect.apply(mock.handlers.get('fusion:timer:'+name)!,undefined,[{sender:{trusted:true}},...args]);
beforeEach(()=>{mock.directory=mkdtempSync(join(tmpdir(),'float-focus-test-'));mock.handlers.clear();mock.quit=[];mock.notices=[];vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-10T08:00:00Z'));});
afterEach(()=>{mock.quit.forEach(callback=>callback());vi.useRealTimers();rmSync(mock.directory,{recursive:true,force:true});});
describe('main-owned focus timer',()=>{
 it('finishes in the background, notifies once, and waits for an explicit next phase',()=>{registerFusionTimer();invoke('focus',{work:2,rest:1,phase:'work',todoId:7});vi.advanceTimersByTime(3000);expect(invoke('get')).toMatchObject({state:'finished',remaining:0,focus:{phase:'work',todoId:7}});vi.advanceTimersByTime(20000);expect(mock.notices).toHaveLength(1);expect(invoke('get')).toMatchObject({state:'finished'});invoke('focus',{work:2,rest:1,phase:'rest'});expect(invoke('get')).toMatchObject({state:'running',remaining:1,focus:{phase:'rest'}});});
 it('restores an interrupted focus session paused without restarting or notifying',()=>{mkdirSync(join(mock.directory,'fusion-workspace'));writeFileSync(join(mock.directory,'fusion-workspace','timer.json'),JSON.stringify({state:'running',duration:1500,remaining:1500,deadline:Date.now()+100000,focus:{work:1500,rest:300,phase:'work'}}));registerFusionTimer();expect(invoke('get')).toMatchObject({state:'paused',remaining:100,deadline:null});vi.advanceTimersByTime(200000);expect(invoke('get')).toMatchObject({state:'paused',remaining:100});expect(mock.notices).toHaveLength(0);mock.quit.forEach(callback=>callback());expect(JSON.parse(readFileSync(join(mock.directory,'fusion-workspace','timer.json'),'utf8'))).toMatchObject({state:'paused'});});
 it('preserves an existing countdown and rejects untrusted callers',()=>{registerFusionTimer();invoke('control','start',30);expect(()=>invoke('focus',{work:1500,rest:300,phase:'work'})).toThrow('timer-in-use');expect(invoke('get')).toMatchObject({remaining:30});expect(()=>Reflect.apply(mock.handlers.get('fusion:timer:get')!,undefined,[{sender:{trusted:false}}])).toThrow('untrusted-view');});
});
