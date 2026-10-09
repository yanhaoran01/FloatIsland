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
 * @file download.ts
 * @description 下载相关主进程 IPC 处理器注册。
 * @author 鸡哥
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { randomUUID } from 'node:crypto';
import { isFusionView, broadcastFusion } from '../../system/fusionWindows';
import { grantArtifact } from '../../system/productArtifacts';
import { MediaDownloadEngine } from '../../core/mediaDownloadEngine';
import { downloadPreferences, mediaOptions, mediaSourceUrl } from '../../core/mediaDownloadModel';
import type { MediaAnalysis, MediaDownloadStart, DownloadPreferences } from '../../../preload/types/download';
import { dirname, join } from 'path';
import { MultiThreadDownloadEngine, type DownloadTaskSnapshot } from '../../core/downloadEngine';
import type { RegisterDownloadIpcHandlersOptions, DownloadStartPayload } from './types';
import { PERSIST_DEBOUNCE_MS } from './config/download';

let registered = false;

function isDownloadTaskStatus(value: unknown): value is DownloadTaskSnapshot['status'] {
  return value === 'queued' || value === 'downloading' || value === 'paused' || value === 'completed' || value === 'failed' || value === 'canceled';
}

function toPersistableTask(raw: unknown): DownloadTaskSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== 'string'
    || typeof row.url !== 'string'
    || typeof row.savePath !== 'string'
    || typeof row.fileName !== 'string'
    || typeof row.totalBytes !== 'number'
    || typeof row.downloadedBytes !== 'number'
    || typeof row.progress !== 'number'
    || typeof row.speedBytesPerSecond !== 'number'
    || (row.estimatedFinishAt !== null && typeof row.estimatedFinishAt !== 'number')
    || typeof row.threads !== 'number'
    || !isDownloadTaskStatus(row.status)
    || typeof row.createdAt !== 'number'
    || typeof row.updatedAt !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    engine: row.engine === 'yt-dlp' ? 'yt-dlp' : 'http',
    phase: ['queued','resolving','downloading','merging','converting','completed'].includes(String(row.phase)) ? row.phase as DownloadTaskSnapshot['phase'] : undefined,
    batchId: typeof row.batchId === 'string' ? row.batchId : undefined,
    playlistTitle: typeof row.playlistTitle === 'string' ? row.playlistTitle : undefined,
    outputDir: typeof row.outputDir === 'string' ? row.outputDir : undefined,
    mediaEntryIndex: typeof row.mediaEntryIndex === 'number' && Number.isInteger(row.mediaEntryIndex) && row.mediaEntryIndex > 0 ? row.mediaEntryIndex : undefined,
    media: row.engine === 'yt-dlp' ? mediaOptions(row.media) : undefined,
    outputs: Array.isArray(row.outputs) && row.outputs.every(x => typeof x === 'string') ? row.outputs : undefined,
    canPause: row.status === 'queued' || row.status === 'downloading',
    url: row.url,
    savePath: row.savePath,
    fileName: row.fileName,
    totalBytes: row.totalBytes,
    downloadedBytes: row.downloadedBytes,
    progress: row.progress,
    speedBytesPerSecond: row.speedBytesPerSecond,
    estimatedFinishAt: row.estimatedFinishAt,
    threads: row.threads,
    status: row.status,
    errorDetail: typeof row.errorDetail === 'string' ? row.errorDetail : undefined,
    errorMessage: typeof row.errorMessage === 'string' ? row.errorMessage : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortTasks(tasks: DownloadTaskSnapshot[]): DownloadTaskSnapshot[] {
  return tasks.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeLoadedTasks(raw: unknown): DownloadTaskSnapshot[] {
  if (raw && typeof raw === 'object' && 'version' in raw && 'tasks' in raw) raw = raw.tasks;
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  const list: DownloadTaskSnapshot[] = [];
  const seen = new Set<string>();
  raw.forEach((item) => {
    let task: DownloadTaskSnapshot | null;
    try { task = toPersistableTask(item); } catch { return; }
    if (!task) return;
    if (seen.has(task.id)) return;
    seen.add(task.id);
    if (task.status === 'downloading' || task.status === 'queued') {
      task.status = task.engine === 'yt-dlp' ? 'paused' : 'failed';
      task.speedBytesPerSecond = 0;
      task.estimatedFinishAt = null;
      task.errorMessage = task.errorMessage || '应用重启后任务中断';
      task.updatedAt = now;
    }
    list.push(task);
  });
  return sortTasks(list);
}

function loadPersistedTasks(storePath: string): DownloadTaskSnapshot[] {
  try {
    if (!existsSync(storePath)) return [];
    const content = readFileSync(storePath, 'utf-8');
    if (!content.trim()) return [];
    const parsed = JSON.parse(content);
    return normalizeLoadedTasks(parsed);
  } catch (error) {
    console.error('[Download] load persisted tasks error:', error);
    return [];
  }
}

function savePersistedTasks(storePath: string, tasks: DownloadTaskSnapshot[]): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath + '.tmp', JSON.stringify({version: 2, tasks: sortTasks(tasks)}, null, 2), 'utf-8');
    renameSync(storePath + '.tmp', storePath);
  } catch (error) {
    console.error('[Download] save persisted tasks error:', error);
  }
}

function sanitizeThreads(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 8;
  return Math.max(1, Math.min(16, Math.floor(value)));
}

function sanitizeSuggestedName(input: unknown): string {
  if (typeof input !== 'string') return `download-${Date.now()}.bin`;
  const safe = input.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return safe || `download-${Date.now()}.bin`;
}

function normalizeStartPayload(payload: unknown): { url: string; savePath?: string; threads: number } {
  const row = (payload ?? {}) as DownloadStartPayload;
  const url = typeof row.url === 'string' ? row.url.trim() : '';
  const savePath = typeof row.savePath === 'string' ? row.savePath.trim() : '';
  const threads = sanitizeThreads(row.threads);
  return {
    url,
    savePath: savePath || undefined,
    threads,
  };
}

/**
 * 注册下载模块相关的 IPC 处理器。
 * @param options - IPC 注册配置项。
 */
export function registerDownloadIpcHandlers(options: RegisterDownloadIpcHandlersOptions): void {
  if (registered) return;
  registered = true;

  const handle = (channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown): void => {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!isFusionView(event.sender) || event.senderFrame !== event.sender.mainFrame) throw Error('untrusted-view');
      return listener(event, ...args);
    });
  };

  const taskStorePath = join(app.getPath('userData'), 'eIsland_store', 'download-tasks.json');
  const taskSnapshotMap = new Map<string, DownloadTaskSnapshot>();
  loadPersistedTasks(taskStorePath).forEach((task) => {
    taskSnapshotMap.set(task.id, task);
  });

  let persistTimer: NodeJS.Timeout | null = null;
  const persistSnapshots = (): void => {
    const tasks = Array.from(taskSnapshotMap.values());
    savePersistedTasks(taskStorePath, tasks);
  };
  const schedulePersist = (): void => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistSnapshots();
    }, PERSIST_DEBOUNCE_MS);
  };

  const upsertTaskSnapshot = (task: DownloadTaskSnapshot): void => {
    taskSnapshotMap.set(task.id, task);

  };

  const emitToRenderer = (task: DownloadTaskSnapshot): void => {
    upsertTaskSnapshot(task);
    schedulePersist();
    broadcastFusion('download:task-updated', task);
    queueMicrotask(() => { if (!closing) { pumpHttp(); media.pump(); } });
  };

  const engine = new MultiThreadDownloadEngine({
    onTaskUpdated: emitToRenderer,
  });

  const preferencesPath = join(dirname(taskStorePath), 'download-preferences.json');
  let preferences: DownloadPreferences = {version: 1, concurrency: 2, presets: []};
  try { preferences = downloadPreferences(JSON.parse(readFileSync(preferencesPath, 'utf8'))); } catch {}
  let closing = false;
  const pendingHttp = new Map<string, {value: DownloadTaskSnapshot; resume: boolean}>();
  const launchingHttp = new Map<string, AbortController>();
  const httpCount = (): number => new Set([...engine.listTasks().filter(x => x.status === 'downloading').map(x => x.id), ...launchingHttp.keys()]).size;
  const media = new MediaDownloadEngine({onUpdate: emitToRenderer, capacity: () => preferences.concurrency - httpCount()}, Array.from(taskSnapshotMap.values()));
  const pumpHttp = (): void => {
    if (closing) return;
    let capacity = preferences.concurrency - httpCount() - media.activeCount();
    for (const [id, queued] of pendingHttp) {
      if (capacity-- <= 0) break;
      pendingHttp.delete(id);
      const controller = new AbortController(); launchingHttp.set(id, controller);
      const work = queued.resume && engine.getTask(id)
        ? engine.resumeDownload(id, controller.signal)
        : engine.startDownload({id, url: queued.value.url, savePath: queued.value.savePath || undefined, threads: queued.value.threads, defaultDir: options.getDownloadsPath(), signal: controller.signal});
      void work.catch(reason => {
        if (!controller.signal.aborted) emitToRenderer({...queued.value, status: 'failed', canPause: false, errorMessage: reason instanceof Error ? reason.message : String(reason), updatedAt: Date.now()});
      }).finally(() => {launchingHttp.delete(id); pumpHttp(); media.pump();});
    }
  };
  const stopHttp = (id: string, command: 'paused' | 'canceled'): boolean => {
    const value = taskSnapshotMap.get(id); if (!value || !['queued', 'downloading', 'paused', 'failed'].includes(value.status)) return false;
    if (pendingHttp.has(id) || launchingHttp.has(id)) {
      pendingHttp.delete(id); launchingHttp.get(id)?.abort();
      emitToRenderer({...value, status: command, canPause: false, updatedAt: Date.now()}); return true;
    }
    return command === 'paused' ? engine.pauseDownload(id) : engine.cancelDownload(id);
  };
  const analyses = new WeakMap<Electron.WebContents, Map<string, MediaAnalysis>>();
  const requests = new WeakMap<Electron.WebContents, Set<string>>();
  const directories = new WeakMap<Electron.WebContents, Map<string, string>>();
  const requestOwners = new Map<string, Electron.WebContents>();
  const ownedRequest = (sender: Electron.WebContents, id: string): Set<string> => {
    if (requestOwners.has(id)) throw Error('media-invalid-request');
    let owned = requests.get(sender);
    if (!owned) {
      owned = new Set<string>(); requests.set(sender, owned);
      sender.once('destroyed', () => {
        for (const request of owned!) {media.cancelAnalysis(request); requestOwners.delete(request);}
        owned!.clear();
      });
    }
    owned.add(id); requestOwners.set(id, sender); return owned;
  };
  handle('download:analyze', async (event, rawUrls, requestId) => {
    if (!Array.isArray(rawUrls) || rawUrls.some(x => typeof x !== 'string') || typeof requestId !== 'string') throw Error('media-invalid-request');
    const owned = ownedRequest(event.sender, requestId);
    try {
      const result = await media.analyze(rawUrls, requestId);
      const cache = analyses.get(event.sender) ?? new Map<string, MediaAnalysis>(); analyses.set(event.sender, cache);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(result.id, result); return result;
    } finally { owned.delete(requestId); requestOwners.delete(requestId); }
  });
  handle('download:inspect', async (event, analysisId, entryId) => {
    const analysis = typeof analysisId === 'string' ? analyses.get(event.sender)?.get(analysisId) : undefined;
    const item = analysis?.entries.find(x => x.id === entryId); if (!item) throw Error('media-invalid-request');
    const request = randomUUID(), owned = ownedRequest(event.sender, request);
    try {
      const result = await media.analyze([item.url], request), detail = item.playlistIndex ? result.entries.find(x => x.playlistIndex === item.playlistIndex) : result.entries[0];
      if (!detail) throw Error(result.errors[0]?.message || 'media-no-results');
      const value = {...detail, id: item.id, playlistTitle: item.playlistTitle};
      analysis!.entries = analysis!.entries.map(x => x.id === entryId ? value : x); return value;
    } finally { owned.delete(request); requestOwners.delete(request); }
  });
  handle('download:cancel-analysis', (event, id) => typeof id === 'string' && requests.get(event.sender)?.has(id) ? media.cancelAnalysis(id) : false);
  handle('download:media-start', (event, raw) => {
    if (!raw || typeof raw !== 'object') throw Error('media-invalid-request');
    const value = raw as MediaDownloadStart, result = analyses.get(event.sender)?.get(value.analysisId);
    if (!result || !Array.isArray(value.entryIds) || !value.entryIds.length || value.entryIds.some(id => typeof id !== 'string')) throw Error('media-invalid-request');
    const selected = [...new Set(value.entryIds)].map(id => { const item = result.entries.find(x => x.id === id); if (!item) throw Error('media-invalid-request'); return item; });
    const directory = value.directoryId ? directories.get(event.sender)?.get(value.directoryId) : options.getDownloadsPath();
    if (!directory) throw Error('file-not-authorized');
    return media.enqueue(selected, mediaOptions(value.options), directory);
  });
  handle('download:preferences', () => structuredClone(preferences));
  handle('download:save-preferences', (_event, raw) => {
    const next = downloadPreferences(raw); mkdirSync(dirname(preferencesPath), {recursive: true});
    writeFileSync(preferencesPath + '.tmp', JSON.stringify(next), 'utf8'); renameSync(preferencesPath + '.tmp', preferencesPath);
    preferences = next; pumpHttp(); media.pump(); return structuredClone(preferences);
  });
  handle('download:pick-directory', async event => {
    const window = BrowserWindow.fromWebContents(event.sender); if (!window) throw Error('untrusted-view');
    const selection = await dialog.showOpenDialog(window, {defaultPath: options.getDownloadsPath(), properties: ['openDirectory', 'createDirectory']});
    if (selection.canceled || !selection.filePaths[0]) return null;
    const id = randomUUID(), path = selection.filePaths[0], grants = directories.get(event.sender) ?? new Map<string, string>();
    grants.set(id, path); directories.set(event.sender, grants); return {id, path};
  });
  handle('download:artifacts', (event, id) => {
    const value = typeof id === 'string' ? taskSnapshotMap.get(id) : undefined;
    if (!value || value.status !== 'completed') throw Error('media-task-unavailable');
    return (value.outputs?.length ? value.outputs : [value.savePath]).map(path => grantArtifact(event.sender, path));
  });
  app.once('before-quit', () => { closing = true; for (const controller of launchingHttp.values()) controller.abort(); for (const queued of pendingHttp.values()) emitToRenderer({...queued.value, status: 'paused', canPause: false}); pendingHttp.clear(); media.close(); for (const task of engine.listTasks()) if (task.status === 'downloading') engine.pauseDownload(task.id); if (persistTimer) clearTimeout(persistTimer); persistSnapshots(); });

  handle('download:start', async (_event, payload: unknown) => {
    try {
      const normalized = normalizeStartPayload(payload);
      if (!normalized.url) {
        return { ok: false, message: '下载地址不能为空' } as const;
      }
      const url = mediaSourceUrl(normalized.url), now = Date.now();
      const fileName = sanitizeSuggestedName(new URL(url).pathname.split('/').at(-1) || 'download.bin');
      const task: DownloadTaskSnapshot = {id: randomUUID(), url, savePath: normalized.savePath || join(options.getDownloadsPath(), fileName), fileName,
        totalBytes: 0, downloadedBytes: 0, progress: 0, speedBytesPerSecond: 0, estimatedFinishAt: null, threads: normalized.threads,
        engine: 'http', phase: 'queued', status: 'queued', canPause: true, createdAt: now, updatedAt: now};
      pendingHttp.set(task.id, {value: task, resume: false}); emitToRenderer(task); pumpHttp();

      return { ok: true, task } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message } as const;
    }
  });

  handle('download:cancel', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    return taskSnapshotMap.get(id)?.engine === 'yt-dlp' ? media.stop(id, 'canceled') : stopHttp(id, 'canceled');
  });

  handle('download:pause', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    return taskSnapshotMap.get(id)?.engine === 'yt-dlp' ? media.stop(id, 'paused') : stopHttp(id, 'paused');
  });

  handle('download:resume', async (_event, taskId: unknown) => {
    try {
      const id = typeof taskId === 'string' ? taskId.trim() : '';
      if (!id) return { ok: false, message: '任务标识不能为空' } as const;
      const previous = taskSnapshotMap.get(id);
      if (!previous) throw Error('media-task-unavailable');
      let task: DownloadTaskSnapshot;
      if (previous.engine === 'yt-dlp') task = media.resume(id);
      else {
        if (!['paused', 'failed'].includes(previous.status) || launchingHttp.has(id)) throw Error('media-task-unavailable');
        task = {...previous, status: 'queued', phase: 'queued', canPause: true, errorMessage: undefined};
        pendingHttp.set(id, {value: task, resume: true}); emitToRenderer(task); pumpHttp();
      }
      upsertTaskSnapshot(task);
      schedulePersist();
      return { ok: true, task } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message } as const;
    }
  });

  handle('download:remove', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return false;
    const snapshot = taskSnapshotMap.get(id);
    if (!snapshot) return false;

    const removedFromEngine = snapshot.engine === 'yt-dlp' ? media.remove(id) : engine.removeTask(id);
    if (!removedFromEngine && ['downloading', 'queued'].includes(snapshot.status)) {
      return false;
    }

    taskSnapshotMap.delete(id);
    schedulePersist();
    return true;
  });

  handle('download:list', () => {
    return sortTasks(Array.from(taskSnapshotMap.values()));
  });

  handle('download:get', (_event, taskId: unknown) => {
    const id = typeof taskId === 'string' ? taskId.trim() : '';
    if (!id) return null;
    return taskSnapshotMap.get(id) ?? null;
  });

  handle('download:pick-save-path', async (event, suggestedName: unknown) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const fileName = sanitizeSuggestedName(suggestedName);
      const result = await dialog.showSaveDialog(win, {
        title: '选择保存位置',
        defaultPath: join(options.getDownloadsPath(), fileName),
      });
      if (result.canceled) return null;
      return result.filePath ?? null;
    } catch (error) {
      console.error('[Download] pick save path error:', error);
      return null;
    }
  });

  handle('download:get-default-dir', () => {
    return options.getDownloadsPath() || app.getPath('downloads');
  });
}
