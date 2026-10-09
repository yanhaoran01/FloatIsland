/*
 * FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors
 * Licensed under GPL-3.0. See LICENSE.
 */

/**
 * @file FusionCompact.tsx
 * @description Shared companion status for the capsule and hover overview.
 * @author 鸡哥
 */
import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {useProductStore} from './productStore';
import { Square,ArrowUpRight,MessageSquare,Grid2X2,Search,Settings } from 'lucide-react';
import {SidebarHeader,SidebarMenu,SidebarMenuButton} from '../../vendor/shadcn/Sidebar';
import {useEffect,useState} from 'react';
import './floatIsland.css';
import useIslandStore from '../../store/slices';
import { FusionPet, type FusionPetMood } from './FusionPet';
import { useFusionActivity } from './fusionActivity';
import { useFusionPreferences } from './fusionPreferences';

/** Summarizes current activity without activating or resuming a session. */
export function FusionCompact({ overview = false }: { overview?: boolean }): JSX.Element {
  const { t } = useTranslation();
  const [edge,setEdge]=useState<'top'|'left'|'right'>('top');
  useEffect(()=>{let active=true;void window.api.fusionDockGet().then(value=>{if(active)setEdge(value.config.edge);});const off=window.api.onFusionDock(value=>setEdge(value.config.edge));return()=>{active=false;off();};},[]);
  const { codex, dsh, echo, assistants } = useFusionActivity();
  const record=useProductStore(s=>s.record);
  const recording=record&&["starting","recording","paused","finishing"].includes(record.state);
  const muted = useFusionPreferences((s) => s.value.muted);
  const productJobs=useProductStore(s=>s.jobs);
  const pendingJobs=Object.values(productJobs).filter(job=>job.state==='waiting').length;
  const workingJobs=Object.values(productJobs).filter(job=>job.state==='running').length;
  const pending =pendingJobs+ (codex?.pendingRequests.length ?? 0) + (dsh?.pendingRequests.length ?? 0) + (echo?.pendingRequests?.length ?? 0);
  const running = new Set<string>();
  for (const [id, value] of Object.entries(codex?.sessionStates || {})) if (value.working) running.add('codex:' + id);
  for (const [id, value] of Object.entries(dsh?.sessionStates || {})) if (value.working) running.add('dsh:' + id);
  for (const value of Object.values(assistants)) if (value.working) running.add(value.key);
  if (echo?.state === 'ready') for (const value of echo.sessions) if (['Running', 'Processing'].includes(value.status)) running.add(value.source + ':' + value.sessionId);
  const active = running.size+workingJobs;
  const mood: FusionPetMood = pending > 0 ? 'waiting' : active > 0 ? 'working' : 'idle';
  const latest = echo?.sessions[0];
  const summary = codex?.pendingRequests[0]?.command || dsh?.pendingRequests[0]?.description ||
    echo?.pendingRequests?.[0]?.text || latest?.lastAssistantMessage || latest?.lastUserPrompt || t('fusion.compact.open');
  const open=(view:'chat'|'tools'|'search'|'settings'):void=>{
    localStorage.setItem('fusion.island-view',view==='tools'?'common':'chat');
    useProductStore.getState().set({target:'',searchOpen:view==='search',dropOpen:false});
    useIslandStore.getState().setMaxExpandTab(view==='settings'?'settings':view==='tools'?'toolbox':'aiChat');
    useIslandStore.getState().setMaxExpand();
    if(view==='chat'||view==='tools')window.dispatchEvent(new CustomEvent('fusion-navigate-peer',{detail:view==='chat'?'chat':'common'}));
  };
  if(edge!=='top')return <div className="fusion-compact float-side-dock" data-side={edge}>
    <SidebarHeader><FusionPet mood={mood} muted={muted} label={t('fusion.pet.'+mood)}/></SidebarHeader>
    <SidebarMenu>{([{id:'chat',icon:MessageSquare,key:'fusion.navigation.aiChat'},{id:'tools',icon:Grid2X2,key:'fusion.navigation.toolbox'},{id:'search',icon:Search,key:'fusion.product.search'},{id:'settings',icon:Settings,key:'fusion.navigation.settings'}] as const).map(item=><li key={item.id}><SidebarMenuButton title={t(item.key)} aria-label={t(item.key)} onClick={event=>{event.stopPropagation();open(item.id);}}><item.icon size={20} strokeWidth={1.6}/></SidebarMenuButton></li>)}</SidebarMenu>
    {recording?<div className="float-side-record"><button type="button" className="fusion-icon-button" aria-label={t('fusion.product.record.stop')} onClick={event=>{event.stopPropagation();void window.api.fusionProductRecordControl('stop').then(value=>useProductStore.getState().set({record:value}));}}><span>{Math.floor(record.elapsed/60).toString().padStart(2,'0')+':'+Math.floor(record.elapsed%60).toString().padStart(2,'0')}</span><Square size={10}/></button></div>:<span className="float-side-state" data-active={pending>0||active>0}/>}
  </div>;
  return <div className={'fusion-compact' + (overview ? ' fusion-compact--overview' : '')}>
    <FusionPet mood={mood} muted={muted} label={t('fusion.pet.' + mood)} />
    <div className="fusion-compact-copy"><strong>{recording?Math.floor(record.elapsed/60).toString().padStart(2,'0')+':'+Math.floor(record.elapsed%60).toString().padStart(2,'0'):pending ? t('fusion.compact.pending', { count: pending }) : active ? t('fusion.compact.active', { count: active }) : t('fusion.compact.idle')}</strong>
      {overview && <p title={summary}>{summary}</p>}
    </div>
    {recording&&<button type="button" className="fusion-icon-button" aria-label={t("fusion.product.record.stop")} onClick={event=>{event.stopPropagation();void window.api.fusionProductRecordControl("stop").then(value=>useProductStore.getState().set({record:value}));}}><Square size={13}/></button>}
    {overview && <button type="button" className="fusion-compact-open" aria-label={t('fusion.compact.open')} title={t('fusion.compact.open')}
      onClick={event => { event.stopPropagation(); useIslandStore.getState().setMaxExpand(); }}><ArrowUpRight size={18} /></button>}
  </div>;
}
