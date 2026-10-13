/** @file torrentPending.test.ts @description Crash cleanup respects recorded identity and completed output stays intact. @author 鸡哥 */
import {it,expect} from 'vitest';
import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {stageTorrentFile,cleanupTorrentPending} from './torrentPending';
it('cleans its staged hardlink while retaining the completed file and unrelated files',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'float-bt-pending-'));try{const output=join(root,'output'),stage=join(root,'stage');await fs.mkdir(output);await fs.mkdir(stage);const source=join(stage,'source'),data=Buffer.from('中文内容'),id=randomUUID();await fs.writeFile(source,data);
  const pending=await stageTorrentFile(stage,output,id,source,createHash('sha256').update(data).digest('hex'));const complete=join(output,'完成.txt');await fs.link(pending,complete);await fs.writeFile(join(output,'keep.part'),'keep');await cleanupTorrentPending(stage,output,id);
  expect(await fs.readFile(complete)).toEqual(data);expect(await fs.readFile(join(output,'keep.part'),'utf8')).toBe('keep');await expect(fs.stat(pending)).rejects.toThrow();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it('does not remove a file which replaced the recorded pending identity',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'float-bt-pending-'));try{const source=join(root,'source'),id=randomUUID();await fs.writeFile(source,'verified');const pending=await stageTorrentFile(root,root,id,source,createHash('sha256').update('verified').digest('hex'));await fs.rename(pending,pending+'.original');await fs.writeFile(pending,'replacement');await cleanupTorrentPending(root,root,id);expect(await fs.readFile(pending,'utf8')).toBe('replacement');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
