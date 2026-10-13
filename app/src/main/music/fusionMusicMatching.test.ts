/* FloatIsland contributors, GPL-3.0. */
/** @file fusionMusicMatching.test.ts @description Version integrity, bounded concurrency, partial errors and cancellation. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {identicalMusic,aggregateMusic,searchMusicSources} from './fusionMusicMatching';
import {lxMusicTrack} from './fusionMusicCatalog';
import type {MusicTrack} from '../../preload/types/fusionMusic';
const song:MusicTrack={id:'a',provider:'qq',title:'Song',artist:'Artist',album:'',cover:'',availability:'unknown',duration:200};
describe('strict music candidates',()=>{
 it('keeps versions and requires known durations within two seconds',()=>{
  expect(identicalMusic(song,{...song,id:'b',duration:202})).toBe(true);
  for(const change of [{title:'Song (Live)'},{title:'Song (Remix)'},{artist:'Cover Artist'},{duration:203},{duration:undefined}])expect(identicalMusic(song,{...song,...change})).toBe(false);
  expect(aggregateMusic([song,{...song,id:'b'}, {...song,id:'c',title:'Song (Live)'}]).map(t=>t.candidates)).toEqual([['a','b'],['c']]);
 });
 it('preserves QQ song identity and never mistakes Migu songmid for playback content_id',()=>{
  expect(lxMusicTrack('qq',{songmid:'song',strMediaMid:'media',name:'Song',singer:'Artist'})?.id).toBe('qqtrack_song');
  const track=lxMusicTrack('migu',{copyrightId:'copyright',songmid:'song',name:'Song',singer:'Artist',interval:'03:20'});
  expect(track?.id).toBe('mgtrack_copyright');expect(track?.extra?.contentId).toBe('');expect(track?.duration).toBe(200);
 });
 it('caps concurrency at three and publishes successful sources alongside failures',async()=>{
  let active=0,peak=0;const batches:number[]=[];
  const jobs=Array.from({length:6},(_,index)=>({id:String(index),run:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;if(index===1)throw Error('offline');return {tracks:[{...song,id:String(index),duration:200+index*10}],total:1};}}));
  const result=await searchMusicSources(jobs,new AbortController().signal,v=>batches.push(v.tracks.length));
  expect(peak).toBe(3);expect(result.tracks).toHaveLength(5);expect(result.errors).toEqual([{sourceId:'1',error:'offline'}]);expect(batches).toHaveLength(6);
 });
 it('rejects cancelled results without publishing late batches',async()=>{
  const controller=new AbortController(),batches:unknown[]=[];
  const pending=searchMusicSources([{id:'a',run:async()=>{controller.abort();return {tracks:[song],total:1};}}],controller.signal,v=>batches.push(v));
  await expect(pending).rejects.toThrow('music-cancelled');expect(batches).toHaveLength(0);
 });
});
