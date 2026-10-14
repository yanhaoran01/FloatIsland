/* FloatIsland contributors, GPL-3.0. */
/** @file avatarLook.test.ts @description Screen directions, static gaze and body stability regressions. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {avatarPointerLook} from './avatarLook';
import {BotEngine} from '../../vendor/bloub/engine';
describe('pointer gaze',()=>{
 const rect={left:100,top:100,width:200,height:200};
 it('keeps pointer feedback subtle instead of taking over the full gaze',()=>{
  const look=avatarPointerLook(250,200,rect)!;
  expect(look.mix).toBeLessThan(1);
  expect(look.wander).toBe(0);
 });
 it('keeps far-away cursor directions within a fully visible face',()=>{
  for(const x of [-10000,10000])for(const y of [-10000,10000]){
   const look=avatarPointerLook(x,y,rect)!;
   expect(Math.abs(look.yaw)).toBeLessThanOrEqual(24);
   expect(Math.abs(look.pitch)).toBeLessThanOrEqual(20);
  }
 });
 it('maps both horizontal directions and screen-down to negative pitch',()=>{
  expect(avatarPointerLook(400,200,rect)!.yaw).toBeGreaterThan(0);
  expect(avatarPointerLook(0,200,rect)!.yaw).toBeLessThan(0);
  expect(avatarPointerLook(200,400,rect)!.pitch).toBeLessThan(0);
  expect(avatarPointerLook(200,0,rect)!.pitch).toBeGreaterThan(0);
  expect(avatarPointerLook(NaN,0,rect)).toBeNull();
  expect(avatarPointerLook(0,0,{...rect,width:0})).toBeNull();
 });
 it('moves eyes instantly in reduced motion without nonfinite paths or body deformation',()=>{
  const engine=new BotEngine(100);engine.setStableBody(true);engine.reset('idle',0);
  const before=engine.sample(1);engine.setLook(avatarPointerLook(400,200,rect),1,0);const right=engine.sample(1);
  engine.setLook(avatarPointerLook(0,200,rect),1,0);const left=engine.sample(1);
  expect(right.eyes).not.toEqual(left.eyes);expect(right.bodyPath).toBe(before.bodyPath);
  expect(JSON.stringify(left)).not.toMatch(/NaN|Infinity/);
  expect(left.eyes.every(eye=>!eye.matrix.includes('NaN'))).toBe(true);
 });
});
