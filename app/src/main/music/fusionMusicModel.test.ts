/** @file fusionMusicModel.test.ts @description Library persistence, queue rules and validation regression. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {emptyMusicLibrary,normalizeMusicLibrary,editMusicLibrary,adjacentMusic} from './fusionMusicModel';
const track=(id:string)=>({id,provider:'local' as const,title:id,artist:'',album:'',cover:'',availability:'unknown' as const});
describe('music library',()=>{
  it('restores metadata without stale playback links or credentials',()=>{
    const value=normalizeMusicLibrary({version:1,tracks:[{...track('a'),url:'https://private.invalid',cookies:'secret'},track('a'),{},track('b')],queue:['a','bad','a','b'],current:'a',favorites:['b'],playlists:[{id:'p',name:'中文歌单',tracks:['b','bad']}],volume:.3,shuffle:true,repeat:'one'});
    expect(value.queue).toEqual(['a','b']);expect(value.tracks).toHaveLength(2);expect(value.tracks[0]).not.toHaveProperty('url');expect(value.tracks[0]).not.toHaveProperty('cookies');
    expect(value).toMatchObject({current:'a',volume:.3,shuffle:true,repeat:'one',playlists:[{name:'中文歌单',tracks:['b']}]});
  });
  it('preserves favorite and playlist edits across a restart',()=>{
    const value=emptyMusicLibrary();value.tracks=[track('a')];
    editMusicLibrary(value,'favorite',{id:'a'});editMusicLibrary(value,'playlist-create',{name:' 夜间 '});
    const playlist=value.playlists[0].id;editMusicLibrary(value,'playlist-add',{playlist,id:'a'});editMusicLibrary(value,'playlist-add',{playlist,id:'a'});
    expect(normalizeMusicLibrary(JSON.parse(JSON.stringify(value)))).toMatchObject({favorites:['a'],playlists:[{name:'夜间',tracks:['a']}]});
    editMusicLibrary(value,'favorite',{id:'a'});editMusicLibrary(value,'playlist-remove',{playlist,id:'a'});expect(value.favorites).toEqual([]);expect(value.playlists[0].tracks).toEqual([]);
  });
  it('reorders queue entries without duplicating and rejects invalid edits',()=>{
    const value=emptyMusicLibrary();value.tracks=['a','b','c'].map(track);value.queue=['a','b','c'];value.current='c';
    editMusicLibrary(value,'queue-move',{id:'c',number:0});expect(value.queue).toEqual(['c','a','b']);
    editMusicLibrary(value,'queue-add',{id:'c'});expect(value.queue).toHaveLength(3);
    expect(()=>editMusicLibrary(value,'queue-add',{id:'unapproved'})).toThrow('music-track-missing');
    expect(()=>editMusicLibrary(value,'volume',{number:NaN})).toThrow();expect(()=>editMusicLibrary(value,'playlist-create',{name:' '})).toThrow();
  });
  it('distinguishes natural single repeat, manual skipping, all repeat and shuffle',()=>{
    const value=emptyMusicLibrary();value.queue=['a','b','c'];value.current='c';
    expect(adjacentMusic(value,1)).toBeNull();value.repeat='all';expect(adjacentMusic(value,1)).toBe('a');
    value.repeat='one';expect(adjacentMusic(value,1,true)).toBe('c');expect(adjacentMusic(value,-1)).toBe('b');
    value.shuffle=true;expect(adjacentMusic(value,1,false,()=>0)).toBe('a');expect(adjacentMusic(value,1,false,()=>.99)).toBe('b');
  });
});
