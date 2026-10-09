/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file downloadHandlers.test.ts
 * @description download IPC handlers 单元测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DownloadTask, MediaAnalysis } from '../../../../preload/types/download';
import { DEFAULT_MEDIA_OPTIONS } from '../../../core/mediaDownloadModel';
const state = vi.hoisted(() => ({root: '', handlers: new Map<string, (...args: unknown[]) => unknown>(), quit: () => {}, open: vi.fn(), trusted: true, updates: [] as unknown[]}));
vi.mock('electron', () => ({
 ipcMain: {handle: (channel: string, fn: (...args: unknown[]) => unknown) => state.handlers.set(channel, fn)},
 app: {getPath: (name: string) => name === 'userData' ? state.root : join(state.root, 'downloads'), once: (_name: string, fn: () => void) => {state.quit = fn;}},
 dialog: {showOpenDialog: state.open, showSaveDialog: vi.fn(async () => ({canceled: true}))},
 BrowserWindow: {fromWebContents: () => ({}), getFocusedWindow: () => ({})},
}));
vi.mock('../../../system/fusionWindows', () => ({isFusionView: () => state.trusted, broadcastFusion: (_channel: string, task: unknown) => state.updates.push(task)}));
vi.mock('../../../core/mediaPrograms', () => ({runMediaProgram: vi.fn(async (args: string[], _signal: AbortSignal, line?: (value: string) => void) => {
 if (!line) return JSON.stringify({title: 'Fixture', webpage_url: 'https://example.com/v', formats: [{format_id: 'a', vcodec: 'h264', acodec: 'aac'}]});
 const output = join(args[args.indexOf('-P') + 1], 'fixture.mp4'); writeFileSync(output, 'fixture'); line('FI_FILE:' + JSON.stringify(output)); return '';
})}));
const frame = {}, event = {sender: {mainFrame: frame, once: vi.fn()}, senderFrame: frame};
const call = (name: string, ...args: unknown[]): unknown => state.handlers.get('download:' + name)!(event, ...args);
const tick = async (): Promise<void> => {for (let i = 0; i < 8; i++) await new Promise(resolve => setTimeout(resolve, 0));};
const originalFetch = globalThis.fetch;
async function register(): Promise<void> {
 const {registerDownloadIpcHandlers} = await import('../download'); registerDownloadIpcHandlers({getDownloadsPath: () => join(state.root, 'downloads')});
}
beforeEach(async () => {
 vi.resetModules(); state.root = mkdtempSync(join(tmpdir(), 'float-download-ipc-')); state.handlers.clear(); state.updates = []; state.trusted = true;
 state.open.mockReset(); mkdirSync(join(state.root, 'downloads'), {recursive: true});
 globalThis.fetch = vi.fn(async (_url, init) => new Response(init?.method === 'HEAD' ? null : 'bytes', {headers: {'content-length': '5'}}));
});
afterEach(async () => {state.quit(); await tick(); globalThis.fetch = originalFetch; rmSync(state.root, {recursive: true, force: true});});
describe('unified download IPC', () => {
 it('rejects external views and subframes before invoking services', async () => {
  await register(); state.trusted = false; expect(() => call('list')).toThrow('untrusted-view'); state.trusted = true;
  expect(() => state.handlers.get('download:list')!({...event, senderFrame: {}})).toThrow('untrusted-view');
 });
 it('queues ordinary downloads and retains completion in common history', async () => {
  await register(); const result = await call('start', {url: 'https://example.com/a.txt'}) as {ok: boolean; task: DownloadTask};
  expect(result.ok).toBe(true); expect(result.task.status).toBe('queued'); await vi.waitFor(() => expect((call('list') as DownloadTask[])[0].status).toBe('completed'));
  const rows = call('list') as DownloadTask[]; expect(rows[0].status).toBe('completed'); expect(rows[0].id).toBe(result.task.id);
  expect(readFileSync(rows[0].savePath, 'utf8')).toBe('bytes'); expect(call('remove', rows[0].id)).toBe(true);
 });
 it('does not truncate legacy history and pauses interrupted media after restart', async () => {
  mkdirSync(join(state.root, 'eIsland_store')); const now = Date.now();
  const rows = Array.from({length: 2101}, (_, i) => ({id: 'old-' + i, url: 'https://example.com/v', savePath: join(state.root, 'v.mp4'), fileName: 'v', totalBytes: 1, downloadedBytes: 1,
    progress: 1, speedBytesPerSecond: 0, estimatedFinishAt: null, threads: 1, status: 'completed', createdAt: now - i, updatedAt: now}));
  const media = {...rows[0], id: 'media-restore', status: 'downloading', engine: 'yt-dlp', outputDir: join(state.root, 'downloads'), media: DEFAULT_MEDIA_OPTIONS};
  writeFileSync(join(state.root, 'eIsland_store', 'download-tasks.json'), JSON.stringify([...rows, media])); await register();
  const loaded = call('list') as DownloadTask[]; expect(loaded).toHaveLength(2102); expect(loaded.find(x => x.id === media.id)?.status).toBe('paused');
  state.quit(); const saved = JSON.parse(readFileSync(join(state.root, 'eIsland_store', 'download-tasks.json'), 'utf8'));
  expect(saved.version).toBe(2); expect(saved.tasks).toHaveLength(2102);
 });
 it('downloads only entries from an owned analysis and rejects forged directories', async () => {
  await register(); const analysis = await call('analyze', ['https://example.com/v'], 'analysis-1') as MediaAnalysis;
  expect(() => call('media-start', {analysisId: 'forged', entryIds: ['x'], options: DEFAULT_MEDIA_OPTIONS})).toThrow('media-invalid-request');
  expect(() => call('media-start', {analysisId: analysis.id, entryIds: [analysis.entries[0].id], options: DEFAULT_MEDIA_OPTIONS, directoryId: 'forged'})).toThrow('file-not-authorized');
  const tasks = call('media-start', {analysisId: analysis.id, entryIds: [analysis.entries[0].id], options: DEFAULT_MEDIA_OPTIONS}) as DownloadTask[]; await tick();
  const row = (call('list') as DownloadTask[]).find(x => x.id === tasks[0].id); expect(row?.status).toBe('completed'); expect(row?.outputs).toHaveLength(1);
 });
 it('round-trips structured presets and an explicitly selected directory', async () => {
  await register(); state.open.mockResolvedValue({canceled: false, filePaths: [join(state.root, 'selected')]}); mkdirSync(join(state.root, 'selected'));
  const directory = await call('pick-directory') as {id: string; path: string}; expect(directory.path).toBe(join(state.root, 'selected')); expect(directory.id).toBeTruthy();
  const saved = call('save-preferences', {version: 1, concurrency: 3, presets: [{id: 'a', name: 'Audio', options: {...DEFAULT_MEDIA_OPTIONS, mode: 'audio'}}]});
  expect(call('preferences')).toEqual(saved); expect(() => call('save-preferences', {version: 1, concurrency: 0, presets: []})).toThrow();
 });
 it('reports invalid inputs without creating HTTP jobs', async () => {
  await register(); expect(await call('start', {url: 'file:///secret'})).toMatchObject({ok: false}); expect(await call('start', {url: ''})).toMatchObject({ok: false});
  expect(call('cancel', 'missing')).toBe(false); expect(call('pause', 'missing')).toBe(false); expect(await call('resume', 'missing')).toMatchObject({ok: false});
  expect(await call('pick-save-path', 'a.txt')).toBeNull();
 });
});
