/* FloatIsland contributors. GPL-3.0. */
/** @file textTranslationService.test.ts @description Anonymous requests, limits and cancellation regression. */
import {beforeEach,describe,it,expect,vi} from 'vitest';
const network=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../music/fusionMusicPluginHost',()=>({publicMusicRequest:network.request,musicResponseText:(response:Response)=>response.text()}));
import {translateText,translationSegments} from './textTranslationService';
beforeEach(()=>network.request.mockReset());
const signal=()=>new AbortController().signal;
describe('free text translation',()=>{
 it('uses anonymous automatic detection and a fixed public endpoint',async()=>{
  network.request.mockResolvedValue(new Response(JSON.stringify({responseStatus:200,responseData:{translatedText:'Hello world'}})));
  expect(await translateText('你好世界','auto','en',signal())).toMatchObject({targetText:'Hello world',source:'auto',target:'en'});
  const [address,options]=network.request.mock.calls[0];const url=new URL(address);
  expect(url.origin).toBe('https://api.mymemory.translated.net');expect(url.searchParams.get('langpair')).toBe('Autodetect|en');expect(url.searchParams.get('q')).toBe('你好世界');expect(options.headers).not.toHaveProperty('Authorization');
 });
 it('keeps UTF-8 segments bounded and preserves every code point',()=>{
  const text='hello 中文😀\n'.repeat(200),chunks=translationSegments(text);
  expect(chunks.join('')).toBe(text);expect(chunks.every(chunk=>Buffer.byteLength(chunk)<=480&&!chunk.includes('\ufffd'))).toBe(true);
 });
 it('reports quota, HTTP errors and malformed results instead of returning them as translations',async()=>{
  network.request.mockResolvedValueOnce(new Response(JSON.stringify({responseStatus:403,responseDetails:'quota'})));
  await expect(translateText('hello','en','zh',signal())).rejects.toThrow('translation-quota-or-service');
  network.request.mockResolvedValueOnce(new Response('',{status:503}));await expect(translateText('hello','en','zh',signal())).rejects.toThrow('translation-http-503');
  network.request.mockResolvedValueOnce(new Response(JSON.stringify({responseStatus:200,responseData:{}})));await expect(translateText('hello','en','zh',signal())).rejects.toThrow('translation-invalid-response');
 });
 it('does not call the network for invalid inputs or already cancelled work',async()=>{
  await expect(translateText('','auto','en',signal())).rejects.toThrow('translation-invalid-text');
  await expect(translateText('a'.repeat(5001),'auto','en',signal())).rejects.toThrow('translation-invalid-text');
  await expect(translateText('hello','auto','auto',signal())).rejects.toThrow('translation-invalid-language');
  const controller=new AbortController();controller.abort();await expect(translateText('hello','auto','en',controller.signal)).rejects.toThrow();expect(network.request).not.toHaveBeenCalled();
 });
 it('stops before the next segment after cancellation, keeping partial output private',async()=>{
  const controller=new AbortController();network.request.mockImplementation(async()=>{controller.abort();return new Response(JSON.stringify({responseStatus:200,responseData:{translatedText:'partial'}}));});
  await expect(translateText('中文'.repeat(300),'zh','en',controller.signal)).rejects.toThrow();expect(network.request).toHaveBeenCalledTimes(1);
 });
});
