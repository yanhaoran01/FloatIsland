/* FloatIsland - https://github.com/JNTMTMTM/eIsland. Copyright (C) 2026 contributors. GPL-3.0. */
/** @file onboarding.test.ts @description First-run recovery, legacy completion and IPC input boundaries. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {onboardingPatch,restoreOnboarding} from './onboarding';
describe('versioned onboarding',()=>{
  it('starts new profiles and suppresses guides for older completed profiles',()=>{expect(restoreOnboarding(undefined,false).status).toBe('pending');expect(restoreOnboarding(undefined,true).status).toBe('completed');});
  it('resumes explicit drafts even when a previous guide was completed',()=>{expect(restoreOnboarding({version:1,status:'pending',step:2,edge:'left'},true)).toEqual({version:1,status:'pending',step:2,edge:'left'});});
  it('keeps skipped and completed guides closed after restarting',()=>{for(const status of ['completed','skipped'])expect(restoreOnboarding({version:1,status,step:2},false).status).toBe(status);});
  it('recovers malformed and unknown versions without losing legacy completion',()=>{expect(restoreOnboarding({version:5,status:'pending'},true).status).toBe('completed');expect(restoreOnboarding({version:1,status:'pending',step:9},false).step).toBe(0);});
  it('rejects arbitrary settings, paths and invalid steps',()=>{for(const value of [{userData:'x'},{status:'completed'},{step:-1},{edge:'bottom'},{searchShortcut:'a'.repeat(101)},[],null])expect(()=>onboardingPatch(value)).toThrow('invalid-onboarding');});
  it('retains valid shortcuts and chosen edge',()=>{expect(onboardingPatch({step:1,edge:'right',searchShortcut:'Ctrl+Alt+K',recallShortcut:''})).toEqual({step:1,edge:'right',searchShortcut:'Ctrl+Alt+K',recallShortcut:''});});
});
