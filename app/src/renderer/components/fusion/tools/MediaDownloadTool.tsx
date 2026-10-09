/* FloatIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file MediaDownloadTool.tsx @description Anonymous media choices, presets and unified download history. @author 鸡哥 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useTranslation } from 'react-i18next';
import { Download, FolderOpen, Pause, Play, RotateCw, Search, Trash2, X, Info, ExternalLink } from 'lucide-react';
import type { MediaAnalysis, MediaDownloadOptions, DownloadPreferences, DownloadTask } from '../../../../preload/types/download';
import { useDownloadTasks } from '../../states/maxExpand/components/tools/hooks/useDownloadTasks';
import { formatBytes } from '../../states/maxExpand/components/tools/utils/downloadFormatters';
import { useProductStore, openProductTool } from '../productStore';
import { ToolBody, ToolError } from './ToolControls';

interface Draft {
  urls: string; analysis: MediaAnalysis | null; selected: string[]; request: string; options: MediaDownloadOptions;
  directory: {id: string; path: string} | null; set: (patch: Partial<Draft>) => void;
}
const useDraft = create<Draft>(set => ({urls: '', analysis: null, selected: [], request: '', directory: null,
  options: {mode: 'video', format: 'best', audioFormat: 'm4a', subtitles: [], automaticSubtitles: false, embedSubtitles: false, cover: false},
  set: patch => set(patch)}));

/** Keeps drafts on page switches while cancelling metadata work on unmount. @param onStarted - Open common history. @returns Media form. */
export function MediaDownloadTool({onStarted}: {onStarted: () => void}) {
  const {t} = useTranslation(), draft = useDraft(), product = useProductStore();
  const [preferences, setPreferences] = useState<DownloadPreferences>({version: 1, concurrency: 2, presets: []});
  const [error, setError] = useState(''), [starting, setStarting] = useState(false), [presetName, setPresetName] = useState(''), [advanced, setAdvanced] = useState(false), [inspecting, setInspecting] = useState('');
  useEffect(() => {
    let alive = true;
    void window.api.downloadPreferences().then(value => {if (alive) setPreferences(value);}).catch(reason => {if (alive) setError(String(reason));});
    return () => {alive = false; const request = useDraft.getState().request; if (request) {useDraft.getState().set({request: ''}); void window.api.downloadCancelAnalysis(request).catch(() => {});}};
  }, []);
  useEffect(() => {
    let alive = true;
    if (product.target === 'download' && product.inputs[0]?.kind === 'text') {
      void window.api.fusionProductRead(product.inputs[0].id).then(result => {
        if (alive) draft.set({urls: new TextDecoder().decode(result.bytes), analysis: null, selected: []});
      }).catch(reason => {if (alive) setError(String(reason));});
    }
    return () => {alive = false;};
  }, [product.nonce]);
  const patchOptions = (patch: Partial<MediaDownloadOptions>): void => draft.set({options: {...draft.options, ...patch}});
  const analyze = async (): Promise<void> => {
    const request = crypto.randomUUID(); draft.set({request, analysis: null, selected: []}); setError('');
    try {
      const result = await window.api.downloadAnalyze(draft.urls.split(/\r?\n/).map(x => x.trim()).filter(Boolean), request);
      if (useDraft.getState().request !== request) return;
      draft.set({analysis: result, selected: result.entries.length === 1 ? [result.entries[0].id] : [], request: ''});
      if (!result.entries.length && !result.errors.length) setError('media-no-results');
    } catch (reason) {if (useDraft.getState().request === request) {draft.set({request: ''}); setError(String(reason));}}
  };
  const cancel = (): void => {
    const request = draft.request; draft.set({request: ''}); void window.api.downloadCancelAnalysis(request).catch(reason => setError(String(reason)));
  };
  const inspect = async (id: string): Promise<void> => {
    if (!draft.analysis) return;
    const analysisId = draft.analysis.id; setInspecting(id); setError('');
    try {
      const entry = await window.api.downloadInspect(analysisId, id);
      const current = useDraft.getState().analysis;
      if (current?.id === analysisId) draft.set({analysis: {...current, entries: current.entries.map(x => x.id === id ? entry : x)}});
    } catch (reason) {setError(String(reason));}
    finally {setInspecting('');}
  };
  const selectedEntry = draft.selected.length === 1 ? draft.analysis?.entries.find(x => x.id === draft.selected[0]) : undefined;
  const formats = selectedEntry?.formats.filter(f => draft.options.mode === 'video' ? f.video !== 'none' : f.audio !== 'none') ?? [];
  const languages = [...new Set((draft.analysis?.entries.filter(x => draft.selected.includes(x.id)).flatMap(x => x.subtitles) ?? []).filter(x => !x.automatic || draft.options.automaticSubtitles).map(x => x.language))];
  const start = async (): Promise<void> => {
    if (!draft.analysis) return;
    setStarting(true); setError('');
    try {
      await window.api.downloadMediaStart({analysisId: draft.analysis.id, entryIds: draft.selected,
        options: {...draft.options, format: draft.selected.length === 1 ? draft.options.format : 'best'}, directoryId: draft.directory?.id});
      onStarted();
    } catch (reason) {setError(String(reason));}
    finally {setStarting(false);}
  };
  const savePreferences = async (next: DownloadPreferences): Promise<void> => {
    try {setPreferences(await window.api.downloadSavePreferences(next));} catch (reason) {setError(String(reason));}
  };
  return <ToolBody error={error}>
    <label className="fusion-download-source">{t('fusion.download.urls')}<textarea rows={3} aria-label={t('fusion.download.urls')} value={draft.urls}
      disabled={Boolean(draft.request)} placeholder={t('fusion.download.urlsPlaceholder')} onChange={event => draft.set({urls: event.target.value, analysis: null, selected: [], options: {...draft.options, format: 'best'}})}/></label>
    <div className="fusion-tool-actions">
      <button disabled={!draft.urls.trim() || Boolean(draft.request)} onClick={() => void analyze()}><Search size={15}/>{t('fusion.download.analyze')}</button>
      {draft.request && <button onClick={cancel}><X size={15}/>{t('fusion.toolbox.cancel')}</button>}
      <button onClick={() => {setError(''); void window.api.downloadPickDirectory().then(directory => {if (directory) draft.set({directory});}).catch(reason => setError(String(reason)));}}><FolderOpen size={15}/>{t('fusion.download.directory')}</button>
      {draft.directory && <span className="fusion-product-status" title={draft.directory.path}>{draft.directory.path}</span>}
      <button aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>{t('fusion.download.options')}</button>
    </div>
    {draft.request && <progress aria-label={t('fusion.download.analyzing')}/>}
    {draft.analysis?.errors.map((item, index) => <div key={index} className="fusion-download-error"><div><ToolError error={item.message}/>{item.detail && <details><summary>{t('fusion.download.diagnostics')}</summary><pre>{item.detail}</pre></details>}</div><button title={item.url} onClick={() => void window.api.clipboardOpenUrl(item.url).catch(reason => setError(String(reason)))}><ExternalLink size={14}/>{t('fusion.web.external')}</button></div>)}
    {draft.analysis && <>
      {draft.analysis.entries.length > 1 && <div className="fusion-tool-actions"><button onClick={() => draft.set({selected: draft.analysis!.entries.map(x => x.id), options: {...draft.options, format: 'best'}})}>{t('fusion.download.selectAll')}</button><button onClick={() => draft.set({selected: []})}>{t('fusion.download.selectNone')}</button><span>{t('fusion.download.selection', {selected: draft.selected.length, total: draft.analysis.entries.length})}</span></div>}
      <div className="fusion-download-entries">{draft.analysis.entries.map(entry => <div key={entry.id} className="fusion-download-entry">
        <label><input type="checkbox" checked={draft.selected.includes(entry.id)} onChange={event => draft.set({selected: event.target.checked ? [...draft.selected, entry.id] : draft.selected.filter(id => id !== entry.id), options: {...draft.options, format: 'best'}})}/><span title={entry.url}>{entry.title}</span></label>
        {entry.duration !== null && <small>{Math.floor(entry.duration / 60)}:{String(Math.floor(entry.duration % 60)).padStart(2, '0')}</small>}
        {!entry.formats.length && <button className="fusion-icon-button" disabled={Boolean(inspecting)} title={t('fusion.download.inspect')} aria-label={t('fusion.download.inspect')} onClick={() => void inspect(entry.id)}><Info size={15}/></button>}
      </div>)}</div>
      <div className="fusion-product-options">
        <label>{t('fusion.download.type')}<select aria-label={t('fusion.download.type')} value={draft.options.mode} onChange={event => patchOptions({mode: event.target.value as 'video' | 'audio', format: 'best'})}><option value="video">{t('fusion.download.video')}</option><option value="audio">{t('fusion.download.audio')}</option></select></label>
        <label>{t('fusion.download.quality')}<select aria-label={t('fusion.download.quality')} disabled={draft.selected.length !== 1} value={draft.options.format} onChange={event => patchOptions({format: event.target.value})}><option value="best">{t('fusion.download.best')}</option>{formats.map(f => <option key={f.id} value={f.id}>{f.height ? f.height + 'p · ' : ''}{f.ext} · {f.video !== 'none' ? f.video : f.audio}{f.language ? ' · ' + f.language : ''} · {f.size ? formatBytes(f.size) : t('fusion.download.unknownSize')}</option>)}</select></label>
        {draft.options.mode === 'audio' && <label>{t('fusion.download.audioFormat')}<select aria-label={t('fusion.download.audioFormat')} value={draft.options.audioFormat} onChange={event => patchOptions({audioFormat: event.target.value as MediaDownloadOptions['audioFormat']})}>{['m4a', 'mp3', 'opus'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>}
      </div>
      <div className="fusion-tool-actions"><button disabled={!draft.selected.length || starting || Boolean(inspecting)} onClick={() => void start()}><Download size={15}/>{t(starting ? 'fusion.toolbox.processing' : 'fusion.download.start')}</button></div>
    </>}
    {advanced && <div className="fusion-download-options">
      <div className="fusion-product-options"><label><input type="checkbox" checked={draft.options.cover} onChange={event => patchOptions({cover: event.target.checked})}/>{t('fusion.download.cover')}</label><label><input type="checkbox" checked={draft.options.automaticSubtitles} onChange={event => patchOptions({automaticSubtitles: event.target.checked, subtitles: []})}/>{t('fusion.download.autoSubtitles')}</label><label><input type="checkbox" checked={draft.options.embedSubtitles} onChange={event => patchOptions({embedSubtitles: event.target.checked})}/>{t('fusion.download.embedSubtitles')}</label></div>
      <fieldset className="fusion-download-subtitles"><legend>{t('fusion.download.subtitles')}</legend>{languages.length ? languages.map(language => <label key={language}><input type="checkbox" checked={draft.options.subtitles.includes(language)} onChange={event => patchOptions({subtitles: event.target.checked ? [...draft.options.subtitles, language] : draft.options.subtitles.filter(x => x !== language)})}/>{language}</label>) : <small>{t('fusion.download.noSubtitles')}</small>}</fieldset>
      <div className="fusion-product-options"><label>{t('fusion.download.maxHeight')}<select aria-label={t('fusion.download.maxHeight')} value={draft.options.maxHeight || 0} onChange={event => patchOptions({maxHeight: Number(event.target.value), format: 'best'})}><option value="0">{t('fusion.download.best')}</option>{[4320,2160,1440,1080,720,480,360].map(height => <option key={height} value={height}>{height}p</option>)}</select></label></div>
      <div className="fusion-product-options"><label>{t('fusion.download.concurrency')}<select aria-label={t('fusion.download.concurrency')} value={preferences.concurrency} onChange={event => void savePreferences({...preferences, concurrency: Number(event.target.value)})}>{[1, 2, 3, 4].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="fusion-tool-actions"><input aria-label={t('fusion.download.presetName')} placeholder={t('fusion.download.presetName')} value={presetName} onChange={event => setPresetName(event.target.value)}/><button disabled={!presetName.trim()} onClick={() => {void savePreferences({...preferences, presets: [...preferences.presets, {id: crypto.randomUUID(), name: presetName.trim(), options: {...draft.options, format: 'best', maxHeight: formats.find(x => x.id === draft.options.format)?.height || draft.options.maxHeight}}]}); setPresetName('');}}>{t('fusion.download.savePreset')}</button></div>
      {preferences.presets.map(preset => <div key={preset.id} className="fusion-tool-actions"><button onClick={() => draft.set({options: structuredClone(preset.options)})}>{preset.name}</button><button className="fusion-icon-button" aria-label={t('fusion.toolbox.delete') + ' ' + preset.name} onClick={() => void savePreferences({...preferences, presets: preferences.presets.filter(x => x.id !== preset.id)})}><Trash2 size={14}/></button></div>)}
    </div>}
  </ToolBody>;
}

/** Displays HTTP and media tasks together with actual stage controls. @returns Unified history. */
export function UnifiedDownloadHistory() {
  const {t} = useTranslation(), {tasks, setTasks} = useDownloadTasks(), [error, setError] = useState('');
  const action = async (task: DownloadTask, command: 'pause' | 'resume' | 'cancel' | 'remove'): Promise<void> => {
    setError('');
    try {
      if (command === 'resume') {const result = await window.api.downloadResume(task.id); if (!result.ok) throw Error(result.message || 'media-task-unavailable');}
      else {
        const accepted = await (command === 'pause' ? window.api.downloadPause(task.id) : command === 'cancel' ? window.api.downloadCancel(task.id) : window.api.downloadRemove(task.id));
        if (!accepted) throw Error('media-task-unavailable');
        if (command === 'remove') setTasks(old => old.filter(x => x.id !== task.id));
      }
    } catch (reason) {setError(String(reason));}
  };
  const preview = async (task: DownloadTask): Promise<void> => {
    try {openProductTool('preview', await window.api.downloadArtifacts(task.id));} catch (reason) {setError(String(reason));}
  };
  const groups = new Map<string, DownloadTask[]>();
  for (const task of tasks) {const id = task.batchId || task.id; groups.set(id, [...groups.get(id) ?? [], task]);}
  return <ToolBody error={error}>
    {!tasks.length && <span className="fusion-product-status">{t('maxExpand.toolbox.download.tasks.empty')}</span>}
    {[...groups].map(([id, rows]) => <section className="fusion-download-group" key={id}>
      {rows.length > 1 && <small>{rows[0].playlistTitle || t('fusion.download.batch')} · {t('fusion.download.batchProgress', {done: rows.filter(x => x.status === 'completed').length, total: rows.length})}</small>}
      {rows.map(task => <article className="fusion-download-task" key={task.id}>
        <div className="fusion-download-task-heading"><span title={task.url}>{task.fileName || task.url}</span><div className="fusion-tool-actions">
          {['queued', 'downloading'].includes(task.status) && task.canPause !== false && <button className="fusion-icon-button" aria-label={t('maxExpand.toolbox.download.tasks.pause')} onClick={() => void action(task, 'pause')}><Pause size={15}/></button>}
          {['paused', 'failed'].includes(task.status) && <button className="fusion-icon-button" aria-label={t(task.status === 'failed' ? 'fusion.download.retry' : 'maxExpand.toolbox.download.tasks.resume')} onClick={() => void action(task, 'resume')}>{task.status === 'failed' ? <RotateCw size={15}/> : <Play size={15}/>}</button>}
          {['queued', 'downloading', 'paused', 'failed'].includes(task.status) && <button className="fusion-icon-button" aria-label={t('fusion.toolbox.cancel')} onClick={() => void action(task, 'cancel')}><X size={15}/></button>}
          {task.status === 'completed' && <><button className="fusion-icon-button" aria-label={t('fusion.toolbox.items.preview')} onClick={() => void preview(task)}><Play size={15}/></button><button className="fusion-icon-button" aria-label={t('maxExpand.toolbox.download.tasks.openFolder')} onClick={() => void window.api.openInExplorer(task.savePath).then(ok => {if (!ok) setError('file-not-authorized');}).catch(reason => setError(String(reason)))}><FolderOpen size={15}/></button></>}
          {!['queued', 'downloading'].includes(task.status) && <button className="fusion-icon-button" aria-label={t('maxExpand.toolbox.download.tasks.delete')} onClick={() => void action(task, 'remove')}><Trash2 size={15}/></button>}
        </div></div>
        <div className="fusion-product-status">{t('fusion.download.status.' + task.status)}{task.status === 'downloading' && task.phase && task.phase !== 'downloading' ? ' · ' + t('fusion.download.phase.' + task.phase) : ''}
          {task.status === 'downloading' && (!task.phase || task.phase === 'downloading') && <> · {task.totalBytes > 0 ? (task.progress * 100).toFixed(1) + '%' : t('fusion.download.unknownSize')} · {formatBytes(task.downloadedBytes)}{task.speedBytesPerSecond > 0 ? ' · ' + formatBytes(task.speedBytesPerSecond) + '/s' : ''}</>}
        </div>
        {task.status === 'downloading' && <progress aria-label={t('fusion.download.status.downloading')} value={task.totalBytes > 0 && task.phase === 'downloading' ? task.progress : undefined} max={1}/>}
        {task.errorMessage && <div className="fusion-download-error"><div><ToolError error={task.errorMessage}/>{task.errorDetail && <details><summary>{t('fusion.download.diagnostics')}</summary><pre>{task.errorDetail}</pre></details>}</div><button onClick={() => void window.api.clipboardOpenUrl(task.url).catch(reason => setError(String(reason)))}><ExternalLink size={14}/>{t('fusion.web.external')}</button></div>}
      </article>)}
    </section>)}
  </ToolBody>;
}
