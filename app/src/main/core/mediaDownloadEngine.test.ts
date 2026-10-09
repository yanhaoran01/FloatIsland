/* FloatIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file mediaDownloadEngine.test.ts @description Queue, cancellation, stage controls and exclusive output regression. @author 鸡哥 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DownloadTask } from '../../preload/types/download';
import { DEFAULT_MEDIA_OPTIONS, mediaEntries } from './mediaDownloadModel';
import { MediaDownloadEngine } from './mediaDownloadEngine';
vi.mock('electron', () => ({app: {isPackaged: false}}));
const roots: string[] = [];
const directory = (): string => {const root = mkdtempSync(join(tmpdir(), 'float-media-')); roots.push(root); return root;};
const tick = async (): Promise<void> => {for (let i = 0; i < 6; i++) await new Promise(resolve => setTimeout(resolve, 0));};
const entry = () => mediaEntries({title: '中文', formats: [{format_id: 'a', vcodec: 'h264', acodec: 'aac'}]}, 'https://example.com/v')[0];
afterEach(() => {for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});});

describe('media queue and outputs', () => {
  it('publishes files and captions without overwriting an existing result', async () => {
    const root = directory(); writeFileSync(join(root, '视频.mp4'), 'original');
    const updates: DownloadTask[] = [];
    const engine = new MediaDownloadEngine({capacity: () => 2, onUpdate: task => updates.push(task), run: async (args, _signal, line) => {
      const staging = args[args.indexOf('-P') + 1]; writeFileSync(join(staging, '视频.mp4'), 'new'); writeFileSync(join(staging, '视频.zh.srt'), '字幕');
      line?.('FI_PROGRESS:' + JSON.stringify({downloaded_bytes: 3, total_bytes: 3}));
      line?.('FI_POST:' + JSON.stringify({postprocessor: 'Merger'}));
      line?.('FI_FILE:' + JSON.stringify(join(staging, '视频.mp4'))); return '';
    }});
    engine.enqueue([entry()], DEFAULT_MEDIA_OPTIONS, root); await tick();
    expect(readFileSync(join(root, '视频.mp4'), 'utf8')).toBe('original');
    expect(readFileSync(join(root, '视频 (1).mp4'), 'utf8')).toBe('new');
    expect(updates.at(-1)?.outputs).toHaveLength(2); expect(updates.at(-1)?.status).toBe('completed');
    expect(updates.find(x => x.phase === 'merging')?.canPause).toBe(false);
    expect(readdirSync(root).some(x => x.startsWith('.float-'))).toBe(false);
  });
  it('limits running work and cancels queued tasks before they start', async () => {
    let starts = 0;
    const updates = new Map<string, DownloadTask>();
    const engine = new MediaDownloadEngine({capacity: () => 1, onUpdate: task => updates.set(task.id, task), run: async (_args, signal) => {
      starts++; await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), {once: true})); return '';
    }});
    const tasks = engine.enqueue([entry(), entry(), entry()], DEFAULT_MEDIA_OPTIONS, directory());
    expect(starts).toBe(1); expect(engine.stop(tasks[1].id, 'canceled')).toBe(true);
    expect(engine.stop(tasks[0].id, 'paused')).toBe(true); await tick();
    expect(starts).toBe(2); expect(updates.get(tasks[0].id)?.status).toBe('paused');
    engine.close(); await tick(); expect(engine.activeCount()).toBe(0);
  });
  it('disallows pause while processing, but cancellation releases owned staging', async () => {
    const root = directory(), updates: DownloadTask[] = [];
    const engine = new MediaDownloadEngine({capacity: () => 1, onUpdate: task => updates.push(task), run: async (args, signal, line) => {
      writeFileSync(join(args[args.indexOf('-P') + 1], 'unfinished.part'), 'partial');
      line?.('FI_POST:' + JSON.stringify({postprocessor: 'ExtractAudio'}));
      await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), {once: true})); return '';
    }});
    const [task] = engine.enqueue([entry()], DEFAULT_MEDIA_OPTIONS, root);
    expect(engine.stop(task.id, 'paused')).toBe(false); expect(engine.stop(task.id, 'canceled')).toBe(true); await tick();
    expect(updates.at(-1)?.status).toBe('canceled'); expect(readdirSync(root)).toEqual([]);
  });
  it('retains resumable files on close and restores task identity without auto-start', async () => {
    const root = directory(), updates: DownloadTask[] = [];
    const run = vi.fn(async (args: string[], signal: AbortSignal) => {
      writeFileSync(join(args[args.indexOf('-P') + 1], 'unfinished.part'), 'partial');
      await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), {once: true})); return '';
    });
    const engine = new MediaDownloadEngine({capacity: () => 1, onUpdate: task => updates.push(task), run});
    const [task] = engine.enqueue([entry()], DEFAULT_MEDIA_OPTIONS, root); engine.close(); await tick();
    expect(updates.at(-1)?.status).toBe('paused'); expect(readdirSync(root)).toHaveLength(1);
    const restoredRun = vi.fn(async () => {throw Error('offline');});
    const restored = new MediaDownloadEngine({capacity: () => 1, onUpdate: () => {}, run: restoredRun}, [updates.at(-1)!]);
    expect(restoredRun).not.toHaveBeenCalled(); expect(restored.resume(task.id).id).toBe(task.id); await tick();
    expect(restoredRun).toHaveBeenCalledOnce();
  });
  it('reports individual analysis failures and never starts a download', async () => {
    const engine = new MediaDownloadEngine({capacity: () => 2, onUpdate: () => {throw Error('unexpected download');}, run: async args => {
      if (args.at(-1)?.includes('bad')) throw Error('login required');
      return JSON.stringify({title: 'A', webpage_url: args.at(-1)});
    }});
    const result = await engine.analyze(['https://example.com/good', 'https://example.com/bad'], 'test');
    expect(result.entries).toHaveLength(1); expect(result.errors[0].message).toBe('media-site-login'); expect(engine.activeCount()).toBe(0);
  });
});
