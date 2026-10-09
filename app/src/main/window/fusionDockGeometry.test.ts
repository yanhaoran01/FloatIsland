/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file fusionDockGeometry.test.ts @description 停靠工作区、缩放和小条边界回归。 @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {dockRect} from './fusionDockGeometry';
describe('dock geometry',()=>{
 const area={x:-1920,y:40,width:1920,height:1040};
 it('is flush on the selected edge and leaves room on every other edge',()=>{for(const edge of ['top','left','right'] as const)for(const position of [0,.5,1]){const r=dockRect(area,{width:760,height:560},edge,position);expect(r.x).toBeGreaterThanOrEqual(area.x+(edge==='left'?0:12));expect(r.y).toBeGreaterThanOrEqual(area.y+(edge==='top'?0:12));expect(r.x+r.width).toBeLessThanOrEqual(area.x+area.width-(edge==='right'?0:12));expect(r.y+r.height).toBeLessThanOrEqual(area.y+area.height-12);if(edge==='top')expect(r.y).toBe(area.y);else if(edge==='left')expect(r.x).toBe(area.x);else expect(r.x+r.width).toBe(area.x+area.width);}});
 it('caps large replies to the available work area',()=>{expect(dockRect({x:0,y:0,width:360,height:240},{width:720,height:1000},'right',1)).toEqual({x:12,y:12,width:348,height:216});});
 it('keeps the edge handle flush and only 5 DIP thick',()=>{expect(dockRect(area,{width:48,height:5},'top',.5,true)).toEqual({x:-984,y:40,width:48,height:5});expect(dockRect(area,{width:5,height:48},'right',1,true)).toEqual({x:-5,y:1032,width:5,height:48});});
});
