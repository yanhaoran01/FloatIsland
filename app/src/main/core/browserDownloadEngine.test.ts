/* FloatIsland contributors. GPL-3.0. */
import {EventEmitter} from 'node:events';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {DownloadItem,WebContents,Session} from 'electron';
import {describe,it,expect,vi} from 'vitest';
import {BrowserDownloadEngine,bindBrowserDownloads,browserDownloadName,setBrowserDownloadEngine} from './browserDownloadEngine';
import type {DownloadTask} from '../../preload/types/download';
class Item extends EventEmitter {
 path='';paused=false;canceled=false;received=0;
 getFilename(){return '中文.epub';} getURL(){return 'https://example.com/private';}
 getTotalBytes(){return 4;}getReceivedBytes(){return this.received;}getCurrentBytesPerSecond(){return 2;}
 setSavePath(path:string){this.path=path;}getSavePath(){return this.path;}
 pause(){this.paused=true;}isPaused(){return this.paused;}canResume(){return this.paused&&!this.canceled;}
 resume(){this.paused=false;}cancel(){this.canceled=true;this.emit('done',{},'cancelled');}
}
const native=(item:Item)=>item as unknown as DownloadItem;
const contents={id:713} as WebContents;
describe('session-preserving website download tasks',()=>{
 it('registers once and never prevents the native download',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'float-download-'));
  try{const session=new EventEmitter(),item=new Item(),updates:DownloadTask[]=[];setBrowserDownloadEngine(new BrowserDownloadEngine(()=>folder,t=>updates.push(t)));bindBrowserDownloads(session as Session);bindBrowserDownloads(session as Session);const preventDefault=vi.fn();session.emit('will-download',{preventDefault},native(item),contents);expect(session.listenerCount('will-download')).toBe(1);expect(preventDefault).not.toHaveBeenCalled();expect(updates).toHaveLength(1);item.cancel();await vi.waitFor(()=>expect(updates.at(-1)?.status).toBe('canceled'));}finally{await rm(folder,{recursive:true,force:true});}
 });
 it('publishes only a verified complete file and does not overwrite an existing name',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'float-download-'));
  try{await writeFile(join(folder,'中文.epub'),'old');const updates:DownloadTask[]=[],item=new Item(),engine=new BrowserDownloadEngine(()=>folder,t=>updates.push(t));const task=engine.accept(native(item),contents);await writeFile(item.path,'book');item.received=2;item.emit('updated',{},'progressing');expect(updates.at(-1)?.progress).toBe(.5);expect(engine.control(task.id,'pause')).toMatchObject({status:'paused',canResume:true});expect(engine.control(task.id,'resume')).toMatchObject({status:'downloading'});item.emit('done',{},'completed');await vi.waitFor(()=>expect(updates.at(-1)?.status).toBe('completed'));expect(await readFile(join(folder,'中文.epub'),'utf8')).toBe('old');expect(await readFile(updates.at(-1)!.savePath,'utf8')).toBe('book');expect(updates.at(-1)?.progress).toBe(1);expect(engine.control(task.id,'resume')).toBe(false);}finally{await rm(folder,{recursive:true,force:true});}
 });
 it('does not publish mismatched output as a completed task',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'float-download-'));
  try{const updates:DownloadTask[]=[],item=new Item(),engine=new BrowserDownloadEngine(()=>folder,t=>updates.push(t));engine.accept(native(item),contents);await writeFile(item.path,'bad');item.emit('done',{},'completed');await vi.waitFor(()=>expect(updates.at(-1)?.status).toBe('failed'));expect(updates.at(-1)?.outputs).toBeUndefined();expect(updates.at(-1)?.errorMessage).toContain('download-size-mismatch');}finally{await rm(folder,{recursive:true,force:true});}
 });
 it('sanitizes reserved names and never accepts a path as a filename',()=>{expect(browserDownloadName('../CON.txt')).toBe('download-CON.txt');expect(browserDownloadName('C:\\temp\\hello.epub')).toBe('hello.epub');});
 it('restores interrupted native requests as failed without claiming resume and cancels only its owned files',async()=>{const folder=await mkdtemp(join(tmpdir(),'float-download-'));try{const journal=join(folder,'journal'),item=new Item(),engine=new BrowserDownloadEngine(()=>folder,()=>{},journal),task=engine.accept(native(item),contents);await writeFile(item.path,'part');await writeFile(join(folder,'keep.txt'),'keep');const recovered=new BrowserDownloadEngine(()=>folder,()=>{},journal);expect(recovered.restoredTasks()).toEqual([expect.objectContaining({id:task.id,status:'failed',canResume:false,requiresSourceRefresh:true})]);expect(recovered.control(task.id,'resume')).toBe(false);expect(recovered.control(task.id,'cancel')).toMatchObject({status:'canceled'});await vi.waitFor(async()=>expect(await readFile(join(folder,'keep.txt'),'utf8')).toBe('keep'));}finally{await rm(folder,{recursive:true,force:true});}});

});
