/* FloatIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file onboardingCompletion.test.ts @description First-run completion under OS shortcut conflicts and persistence failures. @author 鸡哥 */
import {describe,expect,it,vi} from 'vitest';
import {configureOnboarding} from './onboardingCompletion';
import type {OnboardingState} from '../../../shared/onboarding';

const state: OnboardingState = {version:1,status:'pending',step:2,edge:'left',searchShortcut:'Ctrl+Shift+K',recallShortcut:'Ctrl+Alt+Space'};
function fixture() {
  const data = {version:1,revision:4,hotkey:state.searchShortcut,flows:[],history:[]};
  const api = {fusionProductData:vi.fn().mockResolvedValue(data),fusionProductWrite:vi.fn().mockResolvedValue(data),fusionDockSave:vi.fn().mockResolvedValue({})};
  return {api:api as unknown as Parameters<typeof configureOnboarding>[0],mocks:api,data};
}
describe('optional first-run shortcuts',()=>{
  it('continues under both conflicts while saving the chosen edge and retaining failure state',async()=>{
    const {api,mocks}=fixture();mocks.fusionProductData.mockResolvedValue({version:1,revision:4,hotkey:state.searchShortcut,flows:[],history:[],hotkeyError:'hotkey-conflict'});
    mocks.fusionProductWrite.mockRejectedValue(Error('hotkey-conflict'));
    mocks.fusionDockSave.mockRejectedValueOnce(Error("Error invoking 'fusion:dock:save': shortcut-conflict")).mockResolvedValueOnce({});
    expect(await configureOnboarding(api,state)).toBe(true);
    expect(mocks.fusionDockSave).toHaveBeenLastCalledWith({edge:'left'});
  });
  it('does not retry a search shortcut that already works',async()=>{
    const {api,mocks}=fixture();expect(await configureOnboarding(api,state)).toBe(false);expect(mocks.fusionProductWrite).not.toHaveBeenCalled();
  });
  it('applies a changed search shortcut without losing the other product data',async()=>{
    const {api,mocks,data}=fixture();expect(await configureOnboarding(api,{...state,searchShortcut:'Ctrl+Alt+F9'})).toBe(false);
    expect(mocks.fusionProductWrite).toHaveBeenCalledWith({...data,hotkey:'Ctrl+Alt+F9'},true);
  });
  it('does not swallow product revision errors',async()=>{
    const {api,mocks}=fixture();mocks.fusionProductWrite.mockRejectedValue(Error('data-conflict'));
    await expect(configureOnboarding(api,{...state,searchShortcut:'Ctrl+Alt+F9'})).rejects.toThrow('data-conflict');expect(mocks.fusionDockSave).not.toHaveBeenCalled();
  });
  it('does not finish when fallback persistence fails',async()=>{
    const {api,mocks}=fixture();mocks.fusionDockSave.mockRejectedValueOnce(Error('shortcut-conflict')).mockRejectedValueOnce(Error('disk-full'));
    await expect(configureOnboarding(api,state)).rejects.toThrow('disk-full');
  });
  it('keeps invalid settings and unrelated errors fatal',async()=>{
    const {api,mocks}=fixture();mocks.fusionDockSave.mockRejectedValue(Error('invalid-dock-settings'));
    await expect(configureOnboarding(api,state)).rejects.toThrow('invalid-dock-settings');expect(mocks.fusionDockSave).toHaveBeenCalledTimes(1);
  });
});
