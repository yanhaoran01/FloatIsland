/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file localImportScan.test.ts @description Verifies recursive references, identity dedupe and cancellation without source movement. @author 鸡哥 */
import {test,expect} from 'vitest';
import {promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scanReferences} from './localImportScan';
test('references supported nested files once and leaves all originals intact',async()=>{const root=await fs.mkdtemp(join(tmpdir(),'float-import-'));try{await fs.mkdir(join(root,'章节'));await fs.writeFile(join(root,'章节','书.epub'),'ebook');await fs.writeFile(join(root,'song.flac'),'audio');await fs.writeFile(join(root,'skip.exe'),'binary');const result=await scanReferences([root,join(root,'章节','书.epub')],'reading',new AbortController().signal);expect(result.files.map(f=>f.relativePath)).toEqual(['章节'+(process.platform==='win32'?'\\':'/')+'书.epub']);expect(result.roots).toHaveLength(1);expect(result.errors).toEqual([]);expect(await fs.readFile(result.files[0].path,'utf8')).toBe('ebook');}finally{await fs.rm(root,{recursive:true,force:true});}});
test('honors cancellation before returning import candidates',async()=>{const controller=new AbortController();controller.abort();await expect(scanReferences([tmpdir()],'music',controller.signal)).rejects.toThrow();});
