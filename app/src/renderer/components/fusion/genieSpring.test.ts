import {describe,it,expect} from 'vitest';
import {stepGenieSpring} from './genieSpring';
describe('reversible island motion',()=>{
 it('arrives at the same point on 60 Hz and 120 Hz displays',()=>{
  const advance=(hz:number)=>{let state={position:0,velocity:0};for(let i=0;i<hz/2;i++)state=stepGenieSpring(state.position,state.velocity,1,1/hz);return state;};
  expect(advance(60).position).toBeCloseTo(advance(120).position,8);expect(advance(60).position).toBeGreaterThan(.999);
 });
 it('reverses without a position jump and settles at the latest target',()=>{
  let state={position:0,velocity:0};for(let i=0;i<6;i++)state=stepGenieSpring(state.position,state.velocity,1,1/60);
  const before=state.position;state=stepGenieSpring(state.position,state.velocity,0,1/120);expect(Math.abs(state.position-before)).toBeLessThan(.06);
  for(let i=0;i<90;i++)state=stepGenieSpring(state.position,state.velocity,0,1/60);expect(state.position).toBeLessThan(.001);expect(Math.abs(state.velocity)).toBeLessThan(.001);
 });
});
