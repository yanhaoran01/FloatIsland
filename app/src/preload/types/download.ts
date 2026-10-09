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
 * @description 下载任务相关类型定义
 * @author 鸡哥
 */

/** 下载任务 */
export type DownloadTaskStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled';
export type DownloadPhase = 'queued' | 'resolving' | 'downloading' | 'merging' | 'converting' | 'completed';
export interface DownloadTask {
  id: string;
  url: string;
  savePath: string;
  fileName: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number;
  speedBytesPerSecond: number;
  estimatedFinishAt: number | null;
  threads: number;
  status: DownloadTaskStatus;
  engine?: 'http' | 'yt-dlp';
  phase?: DownloadPhase;
  batchId?: string;
  playlistTitle?: string;
  canPause?: boolean;
  outputs?: string[];
  media?: MediaDownloadOptions;
  outputDir?: string;
  mediaEntryIndex?: number;
  errorMessage?: string;
  errorDetail?: string;
  createdAt: number;
  updatedAt: number;
}

/** 下载启动载荷 */
export interface DownloadStartPayload {
  url: string;
  savePath?: string;
  threads?: number;
}

/** 下载启动结果 */
export interface DownloadStartResult {
  ok: boolean;
  task?: DownloadTask;
  message?: string;
}

/** Public media metadata excludes direct signed stream URLs and extractor scripts. */
export interface MediaFormat {
  id: string; ext: string; height: number; fps: number; video: string; audio: string;
  size: number | null; language: string; note: string;
}
export interface MediaSubtitle { language: string; automatic: boolean; }
export interface MediaEntry {
  id: string; url: string; title: string; duration: number | null;
  playlistTitle?: string; playlistIndex?: number; formats: MediaFormat[]; subtitles: MediaSubtitle[];
}
export interface MediaAnalysis {
  id: string; entries: MediaEntry[]; errors: Array<{url: string; message: string; detail?: string}>;
}
/** Structured options only; never accepts arbitrary yt-dlp flags. */
export interface MediaDownloadOptions {
  mode: 'video' | 'audio';
  format: string;
  maxHeight?: number;
  audioFormat: 'm4a' | 'mp3' | 'opus';
  subtitles: string[];
  automaticSubtitles: boolean;
  embedSubtitles: boolean;
  cover: boolean;
}
export interface MediaDownloadPreset { id: string; name: string; options: MediaDownloadOptions; }
export interface DownloadPreferences { version: 1; concurrency: number; presets: MediaDownloadPreset[]; }
export interface MediaDownloadStart {
  analysisId: string; entryIds: string[]; options: MediaDownloadOptions; directoryId?: string;
}
export interface MediaDownloadApi {
  downloadAnalyze: (urls: string[], requestId: string) => Promise<MediaAnalysis>;
  downloadInspect: (analysisId: string, entryId: string) => Promise<MediaEntry>;
  downloadCancelAnalysis: (requestId: string) => Promise<boolean>;
  downloadMediaStart: (payload: MediaDownloadStart) => Promise<DownloadTask[]>;
  downloadPreferences: () => Promise<DownloadPreferences>;
  downloadSavePreferences: (preferences: DownloadPreferences) => Promise<DownloadPreferences>;
  downloadPickDirectory: () => Promise<{id: string; path: string} | null>;
  downloadArtifacts: (taskId: string) => Promise<import('./fusionProduct').ProductArtifact[]>;
}
