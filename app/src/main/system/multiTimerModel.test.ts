/* FloatIsland contributors. GPL-3.0. */
/** @file multiTimerModel.test.ts @description Concurrent deadline, pause and restart recovery regression. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {commandTimer,restoreTimers,tickTimers} from './multiTimerModel';
import type {IndependentTimer} from '../../preload/types/fusionWorkspace';
describe('independent countdowns',()=>{
 it('keeps independent deadlines and recovers a paused timer without resuming it',()=>{
  const timers:IndependentTimer[]=[];commandTimer(timers,{type:'create',name:'Tea',seconds:30},0,'a');commandTimer(timers,{type:'create',name:'Laundry',seconds:60},0,'b');commandTimer(timers,{type:'start',id:'a'},0,'');commandTimer(timers,{type:'start',id:'b'},0,'');tickTimers(timers,10000);commandTimer(timers,{type:'pause',id:'b'},10000,'');const restored=restoreTimers(timers);expect(tickTimers(restored,40000).map(timer=>timer.id)).toEqual(['a']);expect(restored[1]).toMatchObject({state:'paused',remaining:50,deadline:null});commandTimer(restored,{type:'resume',id:'b'},50000,'');expect(tickTimers(restored,100000).map(timer=>timer.id)).toEqual(['b']);expect(tickTimers(restored,101000)).toEqual([]);
 });
 it('rejects duplicate ids and invalid durations before creating a timer',()=>{const timers:IndependentTimer[]=[];expect(()=>commandTimer(timers,{type:'create',name:'bad',seconds:NaN},0,'a')).toThrow();expect(timers).toEqual([]);commandTimer(timers,{type:'create',name:'ok',seconds:1},0,'a');expect(()=>restoreTimers([...timers,...timers])).toThrow();});
});
