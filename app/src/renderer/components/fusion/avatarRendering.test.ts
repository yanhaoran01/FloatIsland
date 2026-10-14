/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file avatarRendering.test.ts @description Shape stability, palette migration and preview regression. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {BotEngine} from '../../vendor/bloub/engine';
import {SHAPES,COLORS} from '../../vendor/bloub/skins';
import {STATES,POSES} from '../../vendor/bloub/states';
import {normalizeAvatar,DEFAULT_AVATAR,validAvatar} from '../../../shared/avatarConfig';
describe('stable daily actor and complete preview',()=>{
 it('acknowledges clicks with original eyelids without changing the eye path or body',()=>{
  const engine=new BotEngine(100);engine.setStableBody(true);engine.reset('idle',0);
  const before=engine.sample(.5);engine.blink(.5);const closed=engine.sample(.6);const opened=engine.sample(.8);
  expect(closed.bodyPath).toBe(before.bodyPath);expect(closed.eyes.map(e=>e.d)).toEqual(before.eyes.map(e=>e.d));
  expect(closed.eyes.every(e=>Math.abs(Number(e.matrix.slice(7,-1).split(',')[3]))<.2)).toBe(true);
  expect(opened.eyes.some(e=>Math.abs(Number(e.matrix.slice(7,-1).split(',')[3]))>.5)).toBe(true);
 });
 it('preserves v1 choices, adds cream, and round-trips every original color',()=>{
  expect(normalizeAvatar({version:1,shape:'nuage',expression:'curieux'})).toEqual({...DEFAULT_AVATAR,shape:'nuage',expression:'curieux'});
  expect(COLORS).toHaveLength(12);
  for(const color of COLORS){const value={...DEFAULT_AVATAR,color:color.id};expect(validAvatar(value)).toBe(true);expect(normalizeAvatar(value)).toEqual(value);}
  expect(normalizeAvatar({...DEFAULT_AVATAR,color:'invalid'})).toEqual(DEFAULT_AVATAR);
 });
 it('never changes body geometry across daily states and elapsed times',()=>{
  for(const shape of SHAPES){
   const engine=new BotEngine(100);engine.setStableBody(true);engine.setShape(shape.radii,-10);const expected=engine.sample(0).bodyPath;
   for(const state of STATES){engine.reset(state.id,0);for(const time of [0,.15,POSES[state.id],state.duration]){const frame=engine.sample(time);expect(frame.bodyPath,shape.id+':'+state.id).toBe(expected);expect(frame.bodyAlpha).toBe(1);expect(frame.bodyPath).not.toMatch(/NaN|Infinity/);}}
  }
 });
 it('retains original morphs, gradients and notification color data in explicit previews',()=>{
  const engine=new BotEngine(100);engine.reset('idle',0);const body=engine.sample(1).bodyPath;engine.reset('egg',0);expect(engine.sample(POSES.egg).bodyPath).not.toBe(body);
  engine.reset('orbit',0);const arcs=engine.sample(POSES.orbit).arcs;expect(arcs.length).toBeGreaterThan(0);expect(new Set(arcs.flatMap(arc=>arc.grad.stops)).size).toBeGreaterThan(2);
  engine.reset('notify',0);expect(engine.sample(POSES.notify).notif).not.toBeNull();
 });
});

