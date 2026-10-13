/** @file musicPlaylistFile.test.ts @description Imported playlists cannot grant local access or restore ephemeral credentials. @author 鸡哥 */
import {it,expect} from 'vitest';
import {playlistFilePreview,playlistFileExport} from './musicPlaylistFile';
import {emptyMusicLibrary,editMusicLibrary,normalizeMusicLibrary} from './fusionMusicModel';
const track=(id:string,provider:'local'|'netease'='netease')=>({id,provider,title:'歌曲 '+id,artist:'作者',album:'',cover:'',availability:'unknown' as const});
it('previews real counts, rejects unapproved local IDs and strips URLs and credentials',()=>{
 const text=JSON.stringify({version:1,name:'中文歌单',tracks:[{...track('ne1'),url:'https://signed.invalid',extra:{data:{token:'secret',id:123}}},track('ne1'),track('local-1','local'),track('local-2','local'),{},null]});
 const result=playlistFilePreview(text,new Set(['local-1']));expect(result.tracks.map(track=>track.id)).toEqual(['ne1','local-1']);expect(result.invalid).toBe(3);expect(JSON.stringify(result)).not.toContain('secret');expect(JSON.stringify(result)).not.toContain('signed.invalid');
 expect(playlistFilePreview(playlistFileExport('中文歌单',result.tracks),new Set(['local-1'])).tracks).toHaveLength(2);
});
it('preserves song order and playlist favorite across restart, refusing invalid moves',()=>{
 const library=emptyMusicLibrary();library.tracks=[track('a'),track('b'),track('c')];library.playlists=[{id:'p',name:'排序',tracks:['c','a','b']}];
 editMusicLibrary(library,'playlist-move',{playlist:'p',id:'b',number:0});editMusicLibrary(library,'playlist-favorite',{playlist:'p'});
 expect(normalizeMusicLibrary(library).playlists[0]).toMatchObject({tracks:['b','c','a'],favorite:true});
 expect(()=>editMusicLibrary(library,'playlist-move',{playlist:'p',id:'a',number:99})).toThrow('music-invalid-value');
});
