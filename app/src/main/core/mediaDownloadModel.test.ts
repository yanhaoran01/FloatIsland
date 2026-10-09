/* FloatIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file mediaDownloadModel.test.ts @description Protocol, format, preset and anonymous argv boundaries. @author 鸡哥 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_MEDIA_OPTIONS, mediaSourceUrl, mediaEntries, mediaOptions, mediaDownloadArgs, downloadPreferences } from './mediaDownloadModel';

describe('media metadata and choices', () => {
  it('rejects credential URLs, local paths and malformed sources', () => {
    for (const source of ['file:///C:/secret.txt', 'https://u:p@example.com', 'javascript:alert(1)', '--exec=cmd'])
      expect(() => mediaSourceUrl(source)).toThrow();
    expect(mediaSourceUrl(' https://example.com/v ')).toBe('https://example.com/v');
  });
  it('keeps available tracks, subtitles and playlist selection without exposing stream URLs', () => {
    const entries = mediaEntries({title: '列表', entries: [null, {webpage_url: 'https://example.com/v', title: '视频', duration: 60,
      formats: [{format_id: '137', ext: 'mp4', height: 1080, vcodec: 'h264', acodec: 'none', url: 'https://signed/secret', filesize_approx: 123}],
      subtitles: {zh: []}, automatic_captions: {en: []}}]}, 'https://example.com/list');
    expect(entries).toHaveLength(1); expect(entries[0].playlistTitle).toBe('列表');
    expect(entries[0].formats[0].size).toBe(123);
    expect(entries[0].subtitles).toEqual([{language: 'zh', automatic: false}, {language: 'en', automatic: true}]);
    expect(JSON.stringify(entries)).not.toContain('signed/secret');
  });
  it('rejects raw flags and unknown format IDs instead of silently downgrading', () => {
    expect(() => mediaOptions({...DEFAULT_MEDIA_OPTIONS, format: '--exec=cmd'})).toThrow();
    const entry = mediaEntries({title: 'A'}, 'https://example.com/a')[0];
    expect(() => mediaDownloadArgs(entry, {...DEFAULT_MEDIA_OPTIONS, format: '137'}, '/output')).toThrow('media-format-unavailable');
  });
  it('requests selected video plus audio, retains quality and never imports accounts', () => {
    const entry = mediaEntries({formats: [{format_id: '137', vcodec: 'h264', acodec: 'none'}]}, 'https://example.com/a')[0];
    const args = mediaDownloadArgs(entry, {...DEFAULT_MEDIA_OPTIONS, format: '137', subtitles: ['zh'], embedSubtitles: true, cover: true}, '/output');
    expect(args[args.indexOf('-f') + 1]).toBe('137+ba');
    expect(args).toContain('--embed-subs'); expect(args).toContain('--write-thumbnail');
    expect(args.join(' ')).not.toMatch(/cookies|username|password|exec|allow-unplayable|recode/);
    expect(args).not.toContain('no-keep-subs');
  });
  it('builds extraction and output format choices without scripts', () => {
    const entry = mediaEntries({}, 'https://example.com/a')[0];
    for (const audioFormat of ['m4a', 'mp3', 'opus'] as const) {
      const args = mediaDownloadArgs(entry, {...DEFAULT_MEDIA_OPTIONS, mode: 'audio', audioFormat}, '/output');
      expect(args).toContain('-x'); expect(args[args.indexOf('--audio-format') + 1]).toBe(audioFormat);
    }
  });
  it('keeps same-page playlist indices so selecting the second item cannot download the first', () => {
    const entries = mediaEntries({entries: [{webpage_url: 'https://example.com/list'}, {webpage_url: 'https://example.com/list'}]}, 'https://example.com/list');
    expect(entries.map(x => x.playlistIndex)).toEqual([1, 2]);
    const args = mediaDownloadArgs(entries[1], DEFAULT_MEDIA_OPTIONS, 'C:/output');
    expect(args[args.indexOf('--playlist-items') + 1]).toBe('2'); expect(args).not.toContain('--no-playlist');
  });
  it('preserves resolution preferences without adding a transcoding downgrade', () => {
    const options = mediaOptions({...DEFAULT_MEDIA_OPTIONS, maxHeight: 1080});
    expect(options.maxHeight).toBe(1080);
    const args = mediaDownloadArgs(mediaEntries({}, 'https://example.com/v')[0], options, 'C:/output');
    expect(args[args.indexOf('-f') + 1]).toContain('height<=1080'); expect(args).not.toContain('--recode-video');
  });
  it('validates preferences, duplicate identifiers and concurrency', () => {
    expect(downloadPreferences({version: 1, concurrency: 2, presets: [{id: 'a', name: '默认', options: DEFAULT_MEDIA_OPTIONS}]}).presets[0].name).toBe('默认');
    expect(() => downloadPreferences({version: 1, concurrency: 0, presets: []})).toThrow();
    expect(() => downloadPreferences({version: 1, concurrency: 2, presets: [{id: 'a', name: 'A', options: DEFAULT_MEDIA_OPTIONS}, {id: 'a', name: 'B', options: DEFAULT_MEDIA_OPTIONS}]})).toThrow();
  });
});
