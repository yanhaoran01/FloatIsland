/* FloatIsland contributors, GPL-3.0. */
/** @file musicQuality.test.ts @description Quality preferences cannot turn labels or MP3 transcodes into Hi-Res claims. @author 鸡哥 */
import {it,expect} from 'vitest';
import {musicQualityTiers,measuredMusicFallback,musicDownloadOptions} from './musicQuality';
it('starts at the chosen tier and recognizes measured fallback independently',()=>{
 expect(musicQualityTiers('high','musicfree')).toEqual(['high','standard','low']);expect(musicQualityTiers('standard','lx')).toEqual(['128k']);
 expect(measuredMusicFallback('hires','FLAC',44100,16,1000000)).toBe(true);expect(measuredMusicFallback('hires','FLAC',96000,24,3000000)).toBe(false);expect(measuredMusicFallback('lossless','MP3',96000,24,320000)).toBe(true);
 expect(()=>musicDownloadOptions({quality:'auto',format:'--exec',lyrics:true,cover:true})).toThrow();
});
