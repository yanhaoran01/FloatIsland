/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file toolCatalog.test.ts @description Every directory entry keeps a distinct icon. @author 鸡哥 */
import {describe,expect,it} from 'vitest';
import {TOOL_CATALOG} from './toolCatalog';
import {TOOL_REGISTRY} from './toolRegistry';

describe('tool catalog icons', () => {
  it('has one card per canonical workspace, with media libraries separate',()=>{
    expect(new Set(TOOL_CATALOG.map(entry=>entry.target)).size).toBe(TOOL_CATALOG.length);
    expect(TOOL_CATALOG.map(entry=>entry.target)).toEqual(TOOL_REGISTRY.filter(tool=>!['music','download'].includes(tool.id)).map(tool=>tool.id));
  });
  it('retains named subfunctions and legacy search names after grouping',()=>{
    for(const [target,tab] of [['screenshot','ocr'],['notes','todo'],['encoding','csv'],['collections','workspaces']]){
      const entry=TOOL_CATALOG.find(item=>item.target===target);
      expect(entry?.functions.some(item=>item.id===tab)).toBe(true);
      expect(entry?.aliases).toContain(target+'-'+tab);
    }
  });
  it('assigns a different icon to every entry', () => {
    const owners = new Map<unknown, string>();
    const duplicates = TOOL_CATALOG.flatMap(entry => {
      const owner = owners.get(entry.icon);
      owners.set(entry.icon, entry.id);
      return owner ? [owner + ' / ' + entry.id] : [];
    });
    expect(duplicates).toEqual([]);
  });
});
