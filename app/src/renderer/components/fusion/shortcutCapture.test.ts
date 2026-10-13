/* FloatIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file shortcutCapture.test.ts @description Realistic accelerator recording, navigation and IME boundaries. @author 鸡哥 */
import {describe,expect,it} from 'vitest';
import {shortcutFromKey,type ShortcutKey} from './shortcutCapture';
const key=(value:Partial<ShortcutKey>):ShortcutKey=>({key:'k',code:'KeyK',ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,...value});
describe('recorded shortcuts',()=>{
  it('records a combination independently of the current keyboard language',()=>expect(shortcutFromKey(key({key:'л',ctrlKey:true,altKey:true}))).toBe('CommandOrControl+Alt+K'));
  it('supports function keys, space and arrow aliases',()=>{expect(shortcutFromKey(key({key:'F9',code:'F9',altKey:true}))).toBe('Alt+F9');expect(shortcutFromKey(key({key:' ',code:'Space',ctrlKey:true}))).toBe('CommandOrControl+Space');expect(shortcutFromKey(key({key:'ArrowLeft',code:'ArrowLeft',shiftKey:true}))).toBe('Shift+Left');});
  it('ignores modifier-only, Escape and composition events',()=>{for(const name of ['Control','Alt','Shift','Meta','Escape','Dead'])expect(shortcutFromKey(key({key:name}))).toBeNull();expect(shortcutFromKey(key({isComposing:true}))).toBeNull();});
  it('leaves plain Tab available for focus navigation',()=>{expect(shortcutFromKey(key({key:'Tab',code:'Tab'}))).toBeNull();expect(shortcutFromKey(key({key:'Tab',code:'Tab',ctrlKey:true}))).toBe('CommandOrControl+Tab');});
});
