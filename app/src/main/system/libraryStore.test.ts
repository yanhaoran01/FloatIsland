/* FloatIsland contributors. GPL-3.0. */
/** @file libraryStore.test.ts @description Migration, isolation and rollback regression checks. */
import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LibraryStore} from './libraryStore';
const roots:string[]=[];const root=()=>{const path=mkdtempSync(join(tmpdir(),'float-library-test-'));roots.push(path);return path;};
afterEach(()=>{for(const path of roots.splice(0))rmSync(path,{recursive:true,force:true});});
describe('collection persistence and legacy migration',()=>{
 it('preserves unreadable data and allows the app to start with a recoverable store',()=>{const directory=root(),path=join(directory,'library-v1.json');writeFileSync(path,'{unfinished');const store=new LibraryStore(directory);expect(store.data.recoveryBackup).toBeTruthy();expect(readFileSync(store.data.recoveryBackup!,'utf8')).toBe('{unfinished');store.write({type:'url',url:'https://example.com'});store.save();expect(new LibraryStore(directory).data.items).toHaveLength(1);});
 it('links notes to existing task IDs independently from original note content',()=>{const directory=root(),store=new LibraryStore(directory);store.write({type:'noteLink',noteId:'note-a',todoId:123});store.save();expect(new LibraryStore(directory).data.noteTodos).toEqual({'note-a':123});store.write({type:'noteLink',noteId:'note-a'});expect(store.data.noteTodos).toEqual({});});
 it('merges both stores once, keeps metadata, backs up original and survives restart',()=>{
  const directory=root();mkdirSync(join(directory,'eIsland_store'));mkdirSync(join(directory,'fusion-workspace'));const path=join(directory,'eIsland_store','url-favorites.json');
  const legacy=[{id:17,url:'HTTPS://Example.COM/a?q=1#part',title:'Article',folder:'Reading',note:'Old note'}];writeFileSync(path,JSON.stringify(legacy));writeFileSync(join(directory,'fusion-workspace','tools-v1.json'),JSON.stringify({bookmarks:[{id:'new',url:'https://example.com/a?q=1#part',title:'Bookmark'}]}));
  const store=new LibraryStore(join(directory,'fusion-library'));store.migrateDisk(directory);expect(store.snapshot().items).toHaveLength(1);expect(store.snapshot().items[0]).toMatchObject({title:'Article',group:'Reading',note:'Old note'});expect(store.data.legacyIds['17']).toBe(store.data.legacyIds.new);expect(JSON.parse(readFileSync(path+'.before-library.bak','utf8'))).toEqual(legacy);
  const id=store.data.items[0].id;store.migrateDisk(directory);store.save();const restarted=new LibraryStore(store.directory);expect(restarted.data.items[0].id).toBe(id);expect(restarted.data.items).toHaveLength(1);
 });
 it('preserves different queries, anchors, groups, notes and imported tags',()=>{
  const store=new LibraryStore(root());store.migrate([{url:'https://example.com?q=1#one',folder:'A',note:'First'},{url:'https://example.com?q=1#one',folder:'B',note:'Second',tags:['tag']},{url:'https://example.com?q=2#one'},{url:'https://example.com?q=1#two'}]);expect(store.data.items).toHaveLength(3);expect(store.data.items[0].tags).toEqual(['B','tag']);expect(store.data.items[0].note).toBe('First\n\nSecond');
 });
 it('rejects partial invalid mutations without changing any data',()=>{
  const store=new LibraryStore(root());store.write({type:'url',url:'example.com'});const before=store.snapshot();expect(()=>store.write({type:'item',id:store.data.items[0].id,patch:{title:'Changed',tags:[123]as unknown as string[]}})).toThrow();expect(store.snapshot()).toEqual(before);expect(()=>store.write({type:'url',url:'javascript:alert(1)'})).toThrow();expect(store.data.items).toHaveLength(1);
 });
 it('removes references only, leaves original files and templates independent',()=>{
  const directory=root(),file=join(directory,'original.txt');writeFileSync(file,'keep');const store=new LibraryStore(join(directory,'data'));store.data.items.push({id:'file',kind:'file',path:file,title:'original',tags:[],group:'',note:'',pinned:false,createdAt:1,openedAt:0});store.write({type:'template',value:{id:'text',title:'Reply',group:'',text:'Hello'}});store.write({type:'remove',id:'file'});expect(readFileSync(file,'utf8')).toBe('keep');expect(store.data.templates).toHaveLength(1);
 });
 it('does not rearm unchanged reminders, but rearms an edited due date',()=>{
  const store=new LibraryStore(root());const reminder={id:'r',title:'Task',due:123,enabled:true,notified:false,todoId:1};store.write({type:'reminder',value:reminder});store.data.reminders[0].notified=true;store.write({type:'reminder',value:reminder});expect(store.data.reminders[0].notified).toBe(true);store.write({type:'reminder',value:{...reminder,due:456}});expect(store.data.reminders[0].notified).toBe(false);
 });
 it('retains article excerpts and reading position across restart',()=>{
  const store=new LibraryStore(root());store.write({type:'url',url:'https://example.com'});const id=store.data.items[0].id;store.saveArticle({id,title:'Read',url:'https://example.com',html:'<p>Body</p>',excerpt:'Body',progress:0,highlights:[],savedAt:1});store.write({type:'article',id,progress:.5,highlights:['Body']});store.save();expect(new LibraryStore(store.directory).article(id)).toMatchObject({progress:.5,highlights:['Body']});expect(()=>store.article('../outside')).toThrow();
 });
});
