/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file torrentModel.test.ts @description Rejects malformed links and unsafe torrent paths before filesystem operations. @author 鸡哥 */
import {test,expect} from 'vitest';
import {join,resolve} from 'node:path';
import {magnetUrl,torrentRelativePath} from './torrentModel';
test('extracts a real magnet from share text and retains trackers',()=>{const link='magnet:?xt=urn:btih:'+'a'.repeat(40)+'&tr=https%3A%2F%2Ftracker.example%2Fannounce';expect(magnetUrl('分享 '+link+' 文本')).toBe(link);expect(()=>magnetUrl('magnet:?xt=wrong')).toThrow();});
test('allows nested owned files and rejects traversal, siblings and invalid names',()=>{const root=resolve('owned');expect(torrentRelativePath(root,join(root,'目录','书.txt'))).toBe(join('目录','书.txt'));for(const path of [join(root,'..','outside.txt'),root,join(root,'..','owned-other','book.txt'),join(root,'bad:name.txt')])expect(()=>torrentRelativePath(root,path)).toThrow();});
