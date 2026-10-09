/** @file fileToolOperations.test.ts @description Archive path and size limits plus literal rename rules. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {zipSync,strToU8,unzipSync} from 'fflate';
import {inspectZip,renamedFile,validFileName} from './fileToolOperations';
const options={prefix:'pre-',suffix:'-done',find:'.',replace:'$',numbered:true,start:7,digits:3};
describe('file operation safety',()=>{
 it('preserves extension and treats replacement text literally',()=>{expect(renamedFile('a.b.png',1,options)).toBe('pre-a$b008-done.png');expect(renamedFile('a.txt',0,{...options,numbered:false})).toBe('pre-a-done.txt');});
 it.each(['../a','a/b','a\\b','CON.txt','NUL','x:stream','x.','x ','','..'])('rejects invalid filename %s',name=>expect(validFileName(name)).toBe(false));
 it('packs and inspects a UTF8 ZIP without modifying bytes',()=>{const archive=Buffer.from(zipSync({'文件.txt':strToU8('你好'),'dir/001.txt':strToU8('001')}));expect(inspectZip(archive)).toEqual([{name:'文件.txt',size:6,directory:false},{name:'dir/001.txt',size:3,directory:false}]);expect(unzipSync(archive)['dir/001.txt']).toEqual(strToU8('001'));});
 it.each(['../evil','/absolute','C:/evil','dir/../../evil','dir\\..\\evil','NUL.txt'])('rejects archive traversal or alias %s',name=>expect(()=>inspectZip(Buffer.from(zipSync({[name]:strToU8('x')})))).toThrow());
 it('rejects symlinks, duplicate case names and forged size limits before decompression',()=>{
  const archive=Buffer.from(zipSync({'a.txt':strToU8('x')}));const central=archive.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));const link=Buffer.from(archive);link.writeUInt32LE(0xa1ff0000,central+38);expect(()=>inspectZip(link)).toThrow('unsafe-archive-path');const bomb=Buffer.from(archive);bomb.writeUInt32LE(536870913,central+24);expect(()=>inspectZip(bomb)).toThrow('archive-limit');expect(()=>inspectZip(Buffer.from(zipSync({'a.txt':strToU8('a'),'A.txt':strToU8('b')})))).toThrow();
 });
});
