/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file utilityOperations.test.ts @description 离线功能与异常输入验收。 @author 鸡哥 */
import {describe,it,expect,beforeAll} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {executeUtilityJob,parsePdfPages} from './utilityOperations';
import {colorFormats,dateMilliseconds,generatePassword,transformText} from './toolHelpers';
describe('offline utilities',()=>{
 it('roundtrips binary Base64 and preserves NUL and non-UTF8 bytes',async()=>{
  const bytes=new Uint8Array([0,255,192,128,13,10]);const encoded=await executeUtilityJob({kind:'base64',action:'encode',bytes,text:''});expect(await executeUtilityJob({kind:'base64',action:'decode',text:String(encoded)})).toEqual(bytes);
  await expect(executeUtilityJob({kind:'base64',action:'decode',text:'%%%'})).rejects.toThrow();
 });
 beforeAll(async()=>{await import('mathjs');},30000);
 it('evaluates scientific math and rejects assignment and imports',async()=>{
  expect(await executeUtilityJob({kind:'calculate',expression:'sqrt(3^2+4^2)'})).toBe('5');
  for(const expression of ['x=1','import("fs")','[1,2]','1/0']) await expect(executeUtilityJob({kind:'calculate',expression})).rejects.toThrow();
 });
 it('converts all six unit categories including offsets and binary storage',async()=>{
  for(const [value,from,to,result] of [[2,'km','m',2000],[1,'m^2','cm^2',10000],[2,'kg','g',2000],[0,'degC','degF',32],[2,'hour','min',120],[1,'GiB','MiB',1024]] as const) expect(Number(await executeUtilityJob({kind:'convert',value,from,to}))).toBeCloseTo(result);
 });
 it('compares additions and removals and handles Unicode plain text',async()=>{
  const parts=await executeUtilityJob({kind:'diff',before:'a\nb\n',after:'a\nc\n'});expect(parts).toEqual(expect.arrayContaining([expect.objectContaining({removed:true,value:'b\n'}),expect.objectContaining({added:true,value:'c\n'})]));
  expect(transformText('你好\n你好\n\na','dedupe')).toBe('你好\n\na');expect(transformText('a\n  \nb','empty')).toBe('a\nb');expect(transformText('a.b a.b','replace','a.b','$&')).toBe('$& $&');
 });
 it('exports the requested PDF page order and rotation without modifying the source',async()=>{
  const source=await PDFDocument.create();[200,300,400].forEach(width=>source.addPage([width,500]));const bytes=await source.save();const files=[{name:'a.pdf',mime:'application/pdf',bytes}];
  const extracted=await PDFDocument.load(await executeUtilityJob({kind:'pdf',mode:'extract',files,pages:'3,1-2',rotation:0}) as Uint8Array);expect(extracted.getPages().map(p=>p.getWidth())).toEqual([400,200,300]);
  const rotated=await PDFDocument.load(await executeUtilityJob({kind:'pdf',mode:'rotate',files,pages:'2',rotation:90}) as Uint8Array);expect(rotated.getPage(0).getRotation().angle).toBe(90);
  const merged=await PDFDocument.load(await executeUtilityJob({kind:'pdf',mode:'merge',files:[...files,...files],pages:'',rotation:0}) as Uint8Array);expect(merged.getPageCount()).toBe(6);expect(source.getPage(1).getRotation().angle).toBe(0);
  expect(()=>parsePdfPages('0,4',3)).toThrow();expect(()=>parsePdfPages('2-1',3)).toThrow();
 });
 it('embeds a PNG into a new PDF',async()=>{
  const bytes=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8l8AAAAASUVORK5CYII=','base64'));
  const pdf=await PDFDocument.load(await executeUtilityJob({kind:'pdf',mode:'images',files:[{bytes,name:'test.png',mime:'image/png'}],pages:'',rotation:0}) as Uint8Array);expect(pdf.getPageCount()).toBe(1);
 });
 it('handles leap years and colors',()=>{expect((dateMilliseconds('2024-03-01')-dateMilliseconds('2024-02-28'))/86400000).toBe(2);expect(()=>dateMilliseconds('2025-02-29')).toThrow();expect(colorFormats('rgb(255, 0, 0)').hex).toBe('#ff0000');expect(colorFormats('hsl(0, 100%, 50%)').hex).toBe('#ff0000');expect(colorFormats('#f00')).toEqual({hex:'#ff0000',rgb:'rgb(255, 0, 0)',hsl:'hsl(0, 100%, 50%)'});});
 it('uses every selected password category with the requested length',()=>{for(let i=0;i<100;i++){const password=generatePassword(20,['ABC','abc','123','!@#']);expect(password).toHaveLength(20);for(const group of ['[ABC]','[abc]','[123]','[!@#]'])expect(password).toMatch(new RegExp(group));}expect(()=>generatePassword(20,[])).toThrow();expect(()=>generatePassword(4,['x'.repeat(257)])).toThrow();});
});
