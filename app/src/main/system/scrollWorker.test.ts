/* FusionIsland GPL-3.0. @file scrollWorker.test.ts @description Real worker stitching with a fixed header and failure cases. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {buildSync} from 'esbuild';
const code=buildSync({entryPoints:[resolve('src/main/system/scrollWorker.ts')],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
const frame=(shift:number):{width:number;height:number;pixels:Uint8Array}=>{
 const width=160,height=300,pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=(y*width+x)*4,row=y<40?y:y+shift;let hash=(row*73856093^x*19349663)>>>0;hash=(hash^(hash>>>13))*1274126177;pixels[offset]=hash&255;pixels[offset+1]=hash>>>8&255;pixels[offset+2]=hash>>>16&255;pixels[offset+3]=255;}
 return {width,height,pixels};
};
const run=(frames:ReturnType<typeof frame>[]):Promise<{error?:string;width:number;height:number;pixels:Uint8Array}>=>new Promise((done,fail)=>{const worker=new Worker(code,{eval:true,workerData:frames});worker.once('message',value=>{void worker.terminate();done(value);});worker.once('error',fail);});
describe('scroll worker',()=>{
 it('stitches scrolling content and ignores unchanged frames',async()=>{
  const result=await run([frame(0),frame(52),frame(52),frame(100)]);expect(result.error).toBeUndefined();expect(result.height).toBe(400);expect(result.pixels.length).toBe(160*400*4);
 });
 it('rejects changed viewport dimensions rather than stretching',async()=>{
  const second=frame(20);second.width=159;expect((await run([frame(0),second])).error).toBe('capture-size-changed');
 });
 it('matches a forty-percent scroll step without stretching the overlap',async()=>{
  const result=await run([frame(0),frame(120)]);
  expect(result.error).toBeUndefined();expect(result.height).toBe(420);
  const expected=frame(120);
  // The newly exposed bottom rows must exactly match the captured pixels.
  expect(result.pixels.slice(400*160*4)).toEqual(expected.pixels.slice(280*160*4));
 });
});
