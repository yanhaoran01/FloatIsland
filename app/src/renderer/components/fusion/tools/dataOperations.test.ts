/** @file dataOperations.test.ts @description CSV fidelity, regex boundaries, random and crop rules. @author 鸡哥 */
import { describe,it,expect } from 'vitest';
import { executeDataJob } from './dataOperations';
import { drawNames,randomBelow } from './DailyTools';
import { cropRect } from './ImageTool';
describe('eight offline additions',()=>{
 it('queries JSON data without evaluating expressions or traversing prototypes',()=>{
  const text=JSON.stringify({items:[{name:'中文'},{name:'第二本'}]});expect(JSON.parse(executeDataJob({kind:'json',mode:'query',text,path:'$.items[*].name'}).text)).toEqual(['中文','第二本']);
  for(const path of ['$.__proto__','$[constructor]','$.items[?(@.name)]'])expect(()=>executeDataJob({kind:'json',mode:'query',text,path})).toThrow();
  expect(()=>executeDataJob({kind:'json',mode:'format',text:'{"broken":}',path:'$'})).toThrow();
 });
 it.each([',',';','\t'])('roundtrips CSV with delimiter %s, leading zeros, Chinese, quotes and newlines',delimiter=>{
  const records=[{id:'0012',name:'中文',value:'a"b\nc'},{id:'0001',name:'另一行',value:'a,b;\tc'}];
  const csv=executeDataJob({kind:'csv',mode:'json-csv',text:JSON.stringify(records),delimiter});const decoded=executeDataJob({kind:'csv',mode:'csv-json',text:csv.text,delimiter});expect(JSON.parse(decoded.text)).toEqual(records);
 });
 it('rejects malformed tables and preserves dangerous-looking column keys as data',()=>{
  for(const text of ['a,a\n1,2','a,b\n1','a,b\n"broken'])expect(()=>executeDataJob({kind:'csv',mode:'csv-json',text,delimiter:','})).toThrow();
  const result=executeDataJob({kind:'csv',mode:'csv-json',text:'__proto__,id\nliteral,001',delimiter:','});expect(JSON.parse(result.text)[0].__proto__).toBe('literal');
 });
 it('reports positions, captures and replacement and advances empty Unicode matches',()=>{
  expect(executeDataJob({kind:'regex',pattern:'(\\d+)',flags:'g',text:'a12 b3',replacement:'[$1]'})).toEqual({text:'a[12] b[3]',rows:[['1','12','12'],['5','3','3']]});
  expect(executeDataJob({kind:'regex',pattern:'(?=)',flags:'gu',text:'😀a',replacement:'|'}).rows.map(row=>row[0])).toEqual(['0','2','3']);
  expect(()=>executeDataJob({kind:'regex',pattern:'[',flags:'g',text:'a',replacement:''})).toThrow();
 });
 it('draws distinct trimmed names without replacement and rejects impossible quantities',()=>{
  for(let i=0;i<20;i++)expect(new Set(drawNames(' a\n\nb\na\n c ',3))).toEqual(new Set(['a','b','c']));expect(()=>drawNames('a\nb',3)).toThrow();expect(randomBelow(1)).toBe(0);expect(()=>randomBelow(0)).toThrow();
 });
 it('constrains crops in all drag directions while preserving ratios',()=>{
  for(const last of [{x:500,y:500},{x:0,y:0},{x:500,y:0},{x:0,y:500}]){const rect=cropRect({x:100,y:100},last,320,240,16/9);expect(rect.width/rect.height).toBeCloseTo(16/9);expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(320);expect(rect.y+rect.height).toBeLessThanOrEqual(240);}
 });
});
