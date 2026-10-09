/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file useFusionDock.ts @description 将主进程停靠状态连接到保留挂载的灵动岛视图。 @author 鸡哥 */
import { useProductStore } from './productStore';
import { useFusionActivity } from './fusionActivity';
import { useEffect, useRef, useState } from 'react';
import type { FusionDockState } from '../../../preload/types/fusionWorkspace';
import useIslandStore from '../../store/isLandStore';
/** Keeps only the edge handle interactive while the retained island is tucked away. */
export function useFusionDock(state: string) {
  const [dock,setDock]=useState<FusionDockState|null>(null);
  const record=useProductStore(s=>s.record),jobs=useProductStore(s=>s.jobs),activity=useFusionActivity();
  const keepVisible=Boolean(record&&['starting','recording','paused','finishing'].includes(record.state))||Object.values(jobs).some(job=>job.state==='waiting')||Boolean(activity.codex?.pendingRequests.length||activity.dsh?.pendingRequests.length||activity.echo?.pendingRequests?.length);
  const drag=useRef(false), origin=useRef({x:0,y:0}), moved=useRef(false);
  useEffect(()=>{let active=true;void window.api.fusionDockGet().then(s=>{if(active)setDock(s)});const off=window.api.onFusionDock(setDock);const reveal=window.api.onFusionReveal(()=>useIslandStore.getState().setMaxExpand());return()=>{active=false;off();reveal();};},[]);
  useEffect(()=>{void window.api.fusionDockActivity(state==='maxExpand'||state==='guide',keepVisible).catch(()=>{});},[state,keepVisible]);
  useEffect(()=>{document.documentElement.dataset.fusionDockStrip=String(Boolean(dock?.strip));return()=>{delete document.documentElement.dataset.fusionDockStrip;};},[dock?.strip]);
  return { dock,
    onPointerDown:(event:React.PointerEvent<HTMLDivElement>)=>{
      if(event.button!==0 || (event.target as Element).closest('button,select,input,textarea,a') || (state==='maxExpand' && !(event.target as Element).closest('.fusion-chat-header')))return;
      event.preventDefault();
      drag.current=true;moved.current=false;origin.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);void window.api.fusionDockDrag('start');
    },
    onPointerMove:(event:React.PointerEvent<HTMLDivElement>)=>{if(!drag.current)return;if(Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>6)moved.current=true;void window.api.fusionDockDrag('move');},
    onPointerUp:()=>{if(drag.current){drag.current=false;void window.api.fusionDockDrag('end');}},
    onClickCapture:(event:React.MouseEvent)=>{if(moved.current){event.stopPropagation();moved.current=false;}},
  };
}
