/** @file fusionIntegrationService.test.ts @description Owned WorkBuddy hook merging preserves third-party entries. @author 鸡哥 */
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'fs';import {tmpdir} from 'os';import {join} from 'path';
const env=vi.hoisted(()=>({root:'',handlers:new Map<string,Function>()}));
vi.mock('electron',()=>({app:{getPath:()=>env.root,getAppPath:()=>env.root,isPackaged:false},ipcMain:{handle:(name:string,handler:Function)=>env.handlers.set(name,handler)},shell:{openPath:vi.fn(async()=> '')}}));
vi.mock('./fusionWindows',()=>({isFusionView:()=>true}));
vi.mock('./workBuddyConfig',()=>({registerWorkBuddyConfig:vi.fn(),discoverWorkBuddy:vi.fn(async()=>({})),workBuddyRoot:()=>join(env.root,'buddy')}));
beforeEach(()=>{vi.resetModules();env.root=mkdtempSync(join(tmpdir(),'float-hook-config-'));env.handlers.clear();mkdirSync(join(env.root,'resources/echoisland'),{recursive:true});writeFileSync(join(env.root,'resources/echoisland/fusion-hook.exe'),'test-only fixture');mkdirSync(join(env.root,'buddy'),{recursive:true});});
afterEach(()=>rmSync(env.root,{recursive:true,force:true}));
it('installs once, returns immediately, and removes only FloatIsland commands',async()=>{const file=join(env.root,'buddy/settings.json');const foreign={type:'command',command:'other-observer',timeout:5};writeFileSync(file,'\uFEFF'+JSON.stringify({theme:'dark',hooks:{PreToolUse:[{matcher:'*',hooks:[foreign]}]}}));const {registerFusionIntegrations}=await import('./fusionIntegrationService');registerFusionIntegrations();const change=env.handlers.get('fusion:integrations:change')!;
 const first=change({},'workbuddy',false);expect(readFileSync(join(first.backup,'config.backup'),'utf8')).toContain('other-observer');change({},'workbuddy',false);
 const installed=JSON.parse(readFileSync(file,'utf8'));expect(installed.theme).toBe('dark');expect(installed.hooks.PreToolUse).toHaveLength(2);expect(installed.hooks.PermissionRequest[0].hooks[0].timeout).toBe(5);expect(installed.hooks.Notification[0].hooks[0].timeout).toBe(5);
 const wrapper=readFileSync(join(env.root,'integrations/workbuddy/fusion-island-workbuddy-hook.cmd'),'utf8');expect(wrapper).toContain('--source workbuddy');expect(wrapper).toContain('exit /b 0');change({},'workbuddy',true);const removed=JSON.parse(readFileSync(file,'utf8'));expect(removed.hooks.PreToolUse).toEqual([{matcher:'*',hooks:[foreign]}]);expect(JSON.stringify(removed)).not.toContain('fusion-island-workbuddy-hook.cmd');});
