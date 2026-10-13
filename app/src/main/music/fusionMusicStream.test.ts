/** @file fusionMusicStream.test.ts @description Cancel retains ownership beyond headers and releases on completion/error. @author 鸡哥 */
import {describe,it,expect,vi} from 'vitest';
import {retainMusicStream} from './fusionMusicStream';
describe('owned music streams',()=>{
 it('keeps a streaming request owned until consumed',async()=>{
  const release=vi.fn();const response=retainMusicStream(new Response('audio',{headers:{'content-type':'audio/mpeg'}}),release);
  expect(release).not.toHaveBeenCalled();expect(await response.text()).toBe('audio');expect(release).toHaveBeenCalledTimes(1);expect(response.headers.get('content-type')).toBe('audio/mpeg');
 });
 it('propagates cancellation and releases exactly once',async()=>{
  const cancel=vi.fn(),release=vi.fn(),response=retainMusicStream(new Response(new ReadableStream({cancel})),release);
  await response.body!.cancel('stopped');expect(cancel).toHaveBeenCalledWith('stopped');expect(release).toHaveBeenCalledTimes(1);
 });
 it('releases failed reads without hiding their error',async()=>{
  const release=vi.fn();const response=retainMusicStream(new Response(new ReadableStream({pull(){throw Error('offline');}})),release);
  await expect(response.text()).rejects.toThrow('offline');expect(release).toHaveBeenCalledTimes(1);
 });
});
