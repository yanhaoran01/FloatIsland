/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file MediaBar.tsx @description 灵动岛内保留的实际媒体控制和进度。 @author 鸡哥 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import useIslandStore from '../../store/slices';
import { openMedia, useMediaState } from './mediaState';
import type { MediaCommand } from '../../../preload/types/fusionTools';
/** 收起时保留声音与控制；关闭才销毁媒体实例。 */
export function MediaBar({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const media = useMediaState().find(item => item.active);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!collapsed || !media) return;
    const shell = root.current?.closest<HTMLElement>('.island-shell');
    shell?.classList.add('fusion-media-capsule');
    let alive = true;
    void window.api.fusionFitView({ mode: 'strip', width: 360, height: 72, page: 'media-strip' }).then(size => { if (alive && size) shell?.style.setProperty('--fusion-chat-width', `${size.width}px`); }).catch(reason => setError(String(reason)));
    return () => { alive = false; shell?.classList.remove('fusion-media-capsule'); };
  }, [collapsed, Boolean(media)]);
  if (!media) return null;
  const command = (name: MediaCommand, value?: number): void => { setError(''); void window.api.fusionMediaCommand(name, value).then(() => { if (name === 'close' && collapsed) window.api.collapseWindow(); }).catch(reason => setError(String(reason))); };
  const expand = (): void => { if (collapsed) useIslandStore.getState().setMaxExpand(); openMedia(); };
  return <div ref={root} className={`fusion-media-bar${collapsed ? ' is-collapsed' : ''}`} onClick={event => event.stopPropagation()}>
    <div className="fusion-media-row"><span className="fusion-media-indicator" aria-hidden="true" data-playing={media.playing} />
      <button className="fusion-icon-button" disabled={!media.controllable} aria-label={t(`fusion.media.${media.playing ? 'pause' : 'play'}`)} onClick={() => command('toggle')}>{media.playing ? <Pause size={15} /> : <Play size={15} />}</button>
      <button className="fusion-icon-button" aria-label={t('fusion.media.mute')} aria-pressed={media.muted} onClick={() => command('mute')}>{media.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
      <button className="fusion-icon-button" aria-label={t('fusion.media.expand')} onClick={expand}><Maximize2 size={15} /></button>
      <button className="fusion-icon-button" aria-label={t('fusion.media.close')} onClick={() => command('close')}><X size={15} /></button>
    </div>
    {media.controllable ? <input type="range" min={0} max={media.duration || 1} step="0.1" value={Math.min(media.time, media.duration || 1)} disabled={!media.duration} aria-label={t('fusion.media.progress')} onChange={event => command('seek', Number(event.target.value))} /> : <button className="fusion-media-fallback" title={t('fusion.media.return')} aria-label={t('fusion.media.return')} onClick={expand}><Maximize2 size={13} /></button>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
