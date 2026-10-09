/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file WebTool.tsx @description 原生隔离网页视口、收藏和独立视频会话。 @author 鸡哥 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, RotateCw, Star, ExternalLink, FolderOpen, Play, X, Download } from 'lucide-react';
import type { WebKind } from '../../../../preload/types/fusionTools';
import { openProductTool } from '../productStore';
import { useMediaState } from '../mediaState';
import { useToolData } from './toolHooks';
import { ToolError } from './ToolControls';

/** WebContentsView 的位置仅由可信页面测量，外部站点没有应用接口。 */
export function WebTool({ kind }: { kind: WebKind }) {
  const { t } = useTranslation();
  const state = useMediaState().find(item => item.kind === kind);
  const { data, write, error: storeError } = useToolData();
  const [address, setAddress] = useState(kind === 'video' ? 'https://www.bilibili.com' : 'https://www.youtube.com');
  const [error, setError] = useState('');
  const slot = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => { if (state?.url && !state.url.startsWith('fusion-file:')) setAddress(state.url); }, [state?.url]);
  useLayoutEffect(() => {
    let frame = 0; let disposed = false; let previous = '';
    const attach = (): void => {
      frame = 0; if (disposed) return;
      const element = slot.current;
      const visible = Boolean(element?.getClientRects().length && state?.url && !state.error);
      const rect = visible ? element!.getBoundingClientRect() : null;
      const bounds = rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      const key = JSON.stringify(bounds);
      if (key === previous) return; previous = key;
      void window.api.fusionWebAttach(kind, bounds).catch(reason => { if (!disposed) setError(String(reason)); });
    };
    const schedule = (): void => { if (!frame) frame = requestAnimationFrame(attach); };
    const resize = new ResizeObserver(schedule); if (slot.current) resize.observe(slot.current);
    const mutation = new MutationObserver(schedule); mutation.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true); schedule();
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); void window.api.fusionWebAttach(kind, null).catch(() => {}); };
  }, [kind, Boolean(state?.url), Boolean(state?.error)]);
  const run = (action: () => Promise<unknown>): void => { setError(''); void action().catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); };
  const navigate = (url = address): void => run(() => window.api.fusionWebNavigate(kind, url));
  const local = (file?: File): void => run(() => window.api.fusionVideoFile(file));
  const isLocal = Boolean(state?.url.startsWith('fusion-file:'));
  const ratio = isLocal && state?.width && state.height ? state.width / state.height : 16 / 9;
  return <section ref={root} className="fusion-web-tool" data-layout={isLocal ? 'video' : 'web'} data-video-ratio={ratio}
    onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); if (kind === 'video') local(event.dataTransfer.files[0]); }}>
    <form hidden={isLocal} className="fusion-web-address" onSubmit={event => { event.preventDefault(); navigate(); }}>
      <button type="button" className="fusion-icon-button" disabled={!state?.back} aria-label={t('fusion.web.back')} onClick={() => run(() => window.api.fusionWebAction(kind, 'back'))}><ArrowLeft size={15} /></button>
      <button type="button" className="fusion-icon-button" disabled={!state?.forward} aria-label={t('fusion.web.forward')} onClick={() => run(() => window.api.fusionWebAction(kind, 'forward'))}><ArrowRight size={15} /></button>
      <button type="button" className="fusion-icon-button" disabled={!state?.url} aria-label={t('fusion.web.reload')} onClick={() => run(() => window.api.fusionWebAction(kind, 'reload'))}><RotateCw size={15} /></button>
      <input aria-label={t('fusion.web.address')} value={address} onChange={event => setAddress(event.target.value)} placeholder="https://" /><button>{t('fusion.web.go')}</button>
      <button type="button" className="fusion-icon-button" disabled={!state?.url || isLocal} aria-label={t('fusion.web.favorite')} onClick={() => { if (state) run(() => write('bookmark', { id: crypto.randomUUID(), title: state.title.slice(0, 200), url: state.url })); }}><Star size={15} /></button>
    </form>
    <div className="fusion-tool-actions fusion-web-actions">{!isLocal && <><button onClick={() => navigate('https://www.bilibili.com')}>{t('fusion.web.bilibili')}</button><button onClick={() => navigate('https://www.youtube.com')}>YouTube</button></>}
      {kind === 'video' && <button title={t('fusion.media.local')} aria-label={t('fusion.media.local')} onClick={() => local()}><FolderOpen size={14} /></button>}
      {isLocal && <button title={t('fusion.media.close')} aria-label={t('fusion.media.close')} onClick={() => run(() => window.api.fusionMediaCommand('close'))}><X size={14} /></button>}
      {kind === 'browser' && state?.url && <button onClick={() => { run(() => window.api.fusionWebNavigate('video', state.url)); window.dispatchEvent(new CustomEvent('fusion-open-tool', { detail: 'video' })); }}><Play size={14} />{t('fusion.media.independent')}</button>}
      {state?.url && !isLocal && <button className="fusion-icon-button" title={t('fusion.download.currentPage')} aria-label={t('fusion.download.currentPage')} onClick={() => run(async () => { const item = await window.api.fusionProductText(state.url); openProductTool('download', [item], 'media'); })}><Download size={15}/></button>}
      {state?.url && !isLocal && <button onClick={() => run(() => window.api.fusionWebAction(kind, 'external'))}><ExternalLink size={14} />{t('fusion.web.external')}</button>}
      {!isLocal && <button onClick={() => { if (confirm(t('fusion.web.clearConfirm'))) run(() => window.api.fusionWebAction(kind, 'clear')); }}>{t('fusion.web.clear')}</button>}
    </div>
    {!isLocal && !!data.bookmarks.length && <div className="fusion-bookmarks">{data.bookmarks.map(bookmark => <span key={bookmark.id}><button title={bookmark.url} onClick={() => navigate(bookmark.url)}>{bookmark.title}</button><button aria-label={`${t('fusion.toolbox.delete')} ${bookmark.title}`} onClick={() => run(() => write('deleteBookmark', bookmark.id))}>×</button></span>)}</div>}
    <ToolError error={error || storeError || state?.error || ''} />
    {state?.error && <div className="fusion-tool-actions"><button onClick={() => run(() => window.api.fusionWebAction(kind, 'reload'))}>{t('fusion.web.retry')}</button>{!isLocal && <button onClick={() => run(() => window.api.fusionWebAction(kind, 'external'))}>{t('fusion.web.external')}</button>}</div>}
    {state?.loading && <small role="status">{t('fusion.web.loading')}</small>}
    <div ref={slot} className="fusion-web-slot">{!state?.url && <div className="fusion-web-welcome">{kind === 'video' && <button aria-label={t('fusion.media.local')} onClick={() => local()}><FolderOpen size={20} /></button>}</div>}</div>
  </section>;
}
