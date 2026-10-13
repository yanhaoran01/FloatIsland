/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file torrentDownloadEngine.test.ts @description Real controlled web-seed transfer, selection and exclusive commit. @author 鸡哥 */
import {it,expect} from 'vitest';
import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {Aria2Rpc} from './aria2Rpc';
import {TorrentDownloadEngine} from './torrentDownloadEngine';
import type {DownloadTask} from '../../preload/types/download';
function encode(value:unknown):Buffer {if(Buffer.isBuffer(value))return Buffer.concat([Buffer.from(value.length+':'),value]);if(typeof value==='string')return encode(Buffer.from(value));if(typeof value==='number')return Buffer.from('i'+value+'e');if(Array.isArray(value))return Buffer.concat([Buffer.from('l'),...value.map(encode),Buffer.from('e')]);return Buffer.concat([Buffer.from('d'),...Object.keys(value as object).sort().flatMap(key=>[encode(key),encode((value as Record<string,unknown>)[key])]),Buffer.from('e')]);}
it('downloads a controlled torrent and commits verified output without replacing an existing file',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'float-bt-')),data=Buffer.from('中文内容 / controlled test '.repeat(30000));let requests=0;
 const server=createServer((request,response)=>{requests++;const match=request.headers.range?.match(/bytes=(\d+)-(\d*)/);const first=match?Number(match[1]):0,last=match&&match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;response.writeHead(match?206:200,{'Content-Length':last-first+1,'Accept-Ranges':'bytes',...(match?{'Content-Range':`bytes ${first}-${last}/${data.length}`}:{})});response.end(data.subarray(first,last+1));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('server');
 const rpc=new Aria2Rpc(join(process.cwd(),'resources/download-runtime/aria2c.exe'));let current:DownloadTask|undefined;
 const engine=new TorrentDownloadEngine({rpc,root:join(root,'staging'),preferences:()=>({version:1,concurrency:1,presets:[]}),capacity:()=>1,updated:task=>{current=task;}});
 try{const output=join(root,'out');await fs.mkdir(output);await fs.writeFile(join(output,'测试.txt'),'keep original');const piece=16384,hashes:Buffer[]=[];for(let offset=0;offset<data.length;offset+=piece)hashes.push(createHash('sha1').update(data.subarray(offset,offset+piece)).digest());
  const bytes=encode({'url-list':`http://127.0.0.1:${address.port}/test.txt`,info:{name:'测试.txt',length:data.length,'piece length':piece,pieces:Buffer.concat(hashes),private:1}});
  const draft=await engine.inspect('controlled-test',{bytes});expect(draft.files).toHaveLength(1);expect(draft.files[0].size).toBe(data.length);expect(current).toBeUndefined();
  await expect(engine.start(draft.id,[999],output)).rejects.toThrow('bt-invalid-selection');await engine.start(draft.id,[1],output);
  const deadline=Date.now()+45000;while(current?.status!=='completed'&&current?.status!=='failed'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
  expect(current?.errorMessage).toBeUndefined();expect(current?.status).toBe('completed');expect(requests).toBeGreaterThan(0);expect(await fs.readFile(join(output,'测试.txt'),'utf8')).toBe('keep original');expect(await fs.readFile(current!.outputs![0])).toEqual(data);expect(current!.outputs![0]).not.toBe(join(output,'测试.txt'));
 }finally{engine.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(root,{recursive:true,force:true});}
},60000);
