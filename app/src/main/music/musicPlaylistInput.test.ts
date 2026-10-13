/* FloatIsland contributors, GPL-3.0. */
/** @file musicPlaylistInput.test.ts @description Shared text recognizes domestic playlists and rejects deceptive hosts. @author 鸡哥 */
import {it,expect} from 'vitest';
import {playlistReference} from './musicPlaylistInput';
it('recognizes modern QQ and hash-routed NetEase playlist shares',()=>{
 expect(playlistReference('分享歌单 https://music.163.com/#/playlist?id=123 （来自音乐）')).toMatchObject({sourceId:'builtin:netease',id:'neplaylist_123'});
 expect(playlistReference('https://y.qq.com/n/ryqq/playlist/456')).toMatchObject({sourceId:'builtin:qq',id:'qqplaylist_456'});
 for(const value of ['https://music.163.com.evil.test/playlist?id=1','https://y.qq.com/song?id=1','https://user:secret@y.qq.com/playlist/1'])expect(playlistReference(value)).toBeNull();
});
