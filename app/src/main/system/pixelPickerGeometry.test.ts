/* FloatIsland - GPL-3.0. */
/** @file pixelPickerGeometry.test.ts @description Real-channel and fractional-scale sampling boundary regression. @author 鸡哥 */
import { describe, it, expect } from 'vitest';
import { sampledHex } from './pixelPickerGeometry';
describe('desktop pixel sampling', () => {
  const rgb = process.platform === 'win32' ? [0x34,0xab,0x12,255] : [0x12,0xab,0x34,255];
  const pixels = new Uint8Array(6 * 6 * 4); pixels.set(rgb, (4 * 6 + 3) * 4);
  it('maps fractional DIP positions to the actual pixel at 150% scale', () => {
    expect(sampledHex(pixels,{width:6,height:6},{width:4,height:4},2.1,2.8)).toBe('#12ab34');
  });
  it('rejects outside coordinates, NaN and corrupt bitmap sizes', () => {
    for (const [x,y] of [[-1,0],[0,-1],[4,0],[0,4],[NaN,0],[0,Infinity]]) expect(()=>sampledHex(pixels,{width:6,height:6},{width:4,height:4},x,y)).toThrow('invalid-color-position');
    expect(()=>sampledHex(new Uint8Array(3),{width:6,height:6},{width:4,height:4},0,0)).toThrow('invalid-color-position');
  });
});
