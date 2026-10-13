/** @file fusionMusicProviders.test.ts @description Exercises pinned adapter source through bounded anonymous compatibility APIs. @author 鸡哥 */
import {describe,it,expect,vi} from 'vitest';
import {join} from 'path';
import {MusicProviders,musicRemoteUrl} from './fusionMusicProviders';
const directory=join(process.cwd(),'resources/music/listen1');
describe('pinned music providers',()=>{
 it('discovers a real-shaped HTML playlist catalog and loads NetEase tracks through async.concat',async()=>{
  const request=async(url:string)=>url.includes('/discover/playlist')?new Response('<ul class="m-cvrlst"><li><img src="https://p1.music.126.net/cover"><div><a href="/playlist?id=123" title="中文歌单"></a></div></li></ul>'):url.includes('/playlist/detail')?Response.json({code:200,playlist:{name:'中文歌单',coverImgUrl:'https://p1.music.126.net/cover',trackIds:[{id:1}]}}):Response.json({code:200,songs:[{id:1,name:'歌曲',ar:[{id:1,name:'歌手'}],al:{id:1,name:'专辑',picUrl:'https://p1.music.126.net/cover'},fee:0}]});
  const provider=new MusicProviders(directory,request),signal=new AbortController().signal;
  const catalog=await provider.discover('netease','',1,signal);expect(catalog.playlists[0]).toMatchObject({id:'neplaylist_123',name:'中文歌单'});
  const preview=await provider.playlist('netease','https://music.163.com/playlist?id=123',signal);expect(preview.tracks).toHaveLength(1);expect(preview.tracks[0]).toMatchObject({title:'歌曲',artist:'歌手'});expect(preview.invalid).toBe(0);
 });

 it('passes authorized lyric links through Migu parallel callbacks',async()=>{
  const providers=new MusicProviders(directory,async()=>new Response('[00:01.00]test lyrics'));
  await expect(providers.lyrics({id:'mgtrack_a',provider:'migu',title:'a',artist:'',album:'',cover:'',availability:'unknown',extra:{lyricUrl:'https://cdn.migu.cn/test.lrc'}},new AbortController().signal)).resolves.toContain('test lyrics');
 });
 it('handles the real HTTP-200 phone-binding response without a songs exception',async()=>{
  const providers=new MusicProviders(directory,async()=>Response.json({code:-462,message:'phone binding required',data:{}}));
  await expect(providers.search('netease','test',1,new AbortController().signal)).rejects.toThrow('music-login-required');
 });
 it('rejects malformed search envelopes and accepts a genuine empty catalog',async()=>{
  const providers=new MusicProviders(directory,async()=>Response.json({code:200,result:{songCount:0}}));
  await expect(providers.search('netease','test',1,new AbortController().signal)).resolves.toEqual({tracks:[],total:0});
  await expect(new MusicProviders(directory,async()=>Response.json({code:200})).search('netease','test',1,new AbortController().signal)).rejects.toThrow('music-invalid-response');
 });
 it('rejects local network and credential destinations',()=>{
  for(const url of ['file:///C:/secret','http://127.0.0.1/music','https://qq.com.evil.test/x','https://user:password@music.163.com/x','https://qq.com:123/x'])expect(()=>musicRemoteUrl(url)).toThrow();
  expect(musicRemoteUrl('//music.163.com/x')).toBe('https://music.163.com/x');
 });
 it('uses actual NetEase search metadata and marks known restricted songs',async()=>{
  const request=vi.fn(async(_url:string,options:RequestInit)=>{expect(options.credentials).toBe('omit');expect(String(options.body)).toContain('s=%E4%B8%AD%E6%96%87');return Response.json({result:{songCount:2,songs:[{id:1,name:'歌曲',fee:0,artists:[{id:1,name:'歌手'}],album:{id:1,name:'专辑',picUrl:'https://p1.music.126.net/x'}},{id:2,name:'会员',fee:1,artists:[{name:'歌手'}],album:{}}]}});});
  const found=await new MusicProviders(directory,request).search('netease','中文',1,new AbortController().signal);
  expect(found.tracks.map(t=>t.availability)).toEqual(['unknown','restricted']);expect(found.total).toBe(2);
 });
 it('reports upstream errors rather than returning fake empty results',async()=>{
  const providers=new MusicProviders(directory,async()=>new Response('denied',{status:403}));
  await expect(providers.search('netease','test',1,new AbortController().signal)).rejects.toThrow('music-http-403');
 });
 it('cancels a pending request and aborts its HTTP operation',async()=>{
  const controller=new AbortController();let httpSignal:AbortSignal|undefined;
  const providers=new MusicProviders(directory,async(_url,options)=>{httpSignal=options.signal??undefined;return new Promise(()=>{});});
  const pending=providers.search('netease','test',1,controller.signal),rejected=expect(pending).rejects.toThrow('music-cancelled');
  controller.abort();await rejected;expect(httpSignal?.aborted).toBe(true);
 });
});
