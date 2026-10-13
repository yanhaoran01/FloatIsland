/** @file fusionMediaCoordinator.test.ts @description Actual mute/pause results and activation races across sources. @author 鸡哥 */
import {afterEach,describe,it,expect} from 'vitest';
import {registerMediaParticipant,acquireFusionMedia,pauseAllFusionMedia,hasRegisteredFusionMedia} from './fusionMediaCoordinator';
const clean:(()=>void)[]=[];afterEach(()=>clean.splice(0).forEach(fn=>fn()));
describe('media ownership',()=>{
 it('requires other sources to really pause or mute',async()=>{
  clean.push(registerMediaParticipant('web',{pause:async()=>({paused:false,muted:false,controllable:false})}));
  await expect(acquireFusionMedia('music')).rejects.toThrow('media-not-quiet');
 });
 it('reports unpausable but muted web content honestly before recording',async()=>{
  clean.push(registerMediaParticipant('web',{pause:async()=>({paused:false,muted:true,controllable:false})}));
  clean.push(registerMediaParticipant('music',{pause:async()=>({paused:true,muted:true,controllable:true}),active:()=>true}));
  expect(hasRegisteredFusionMedia()).toBe(true);await expect(pauseAllFusionMedia()).resolves.toEqual({paused:false,muted:true,controllable:false});
 });
 it('rejects late activation after microphone silence',async()=>{
  let finish!:(value:{paused:boolean;muted:boolean;controllable:boolean})=>void;
  clean.push(registerMediaParticipant('web',{pause:()=>new Promise(resolve=>{finish=resolve;})}));
  const activation=acquireFusionMedia('music');const rejection=expect(activation).rejects.toThrow('media-activation-cancelled');
  clean.pop()!();await pauseAllFusionMedia();finish({paused:true,muted:true,controllable:true});await rejection;
 });
});
