/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file ProductHub.tsx @description Shared native drop entry and accessible command search. @author 鸡哥 */
import { useEffect,useState,type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Command } from 'cmdk';
import { X,Search,Eye,Image,Files,Archive,Clipboard,Globe,Share2,Download } from 'lucide-react';
import { useProductStore,openProductTool } from './productStore';
import { TOOL_REGISTRY,resolveToolTarget } from './tools/toolRegistry';
import type { ProductArtifact } from '../../../preload/types/fusionProduct';
import useIslandStore from '../../store/slices';
import './product.css';
/** Keeps drop and search available independently of the active page. @param children - Existing window content. @returns Window content with lightweight overlays. */
export function ProductHub({children}:{children:ReactNode}) {
 const {t}=useTranslation(),state=useProductStore(),[error,setError]=useState(''),[apps,setApps]=useState<Array<{id:string;name:string;path:string}>>([]);
 const ready=(inputs:ProductArtifact[]):void=>{if(!inputs.length)return;state.set({inputs,dropOpen:true});useIslandStore.getState().setMaxExpand();};
 const zone=useDropzone({noClick:true,noKeyboard:true,onDrop:async(files,_rejected,event)=>{
  try{setError('');if(files.length){ready(await window.api.fusionProductImport(files));return;}const value='dataTransfer' in event?event.dataTransfer?.getData('text/plain'):'';if(value)ready([await window.api.fusionProductText(value)]);}
  catch(reason){setError(String(reason));}
 }});
 useEffect(()=>{
  if(!location.pathname.endsWith('/DynamicIslandIndex.html'))return;
  let active=true;
  const receive=(value:import('../../../shared/onboarding').OnboardingState):void=>{if(active&&value.status==='pending')useIslandStore.getState().setGuide();};
  void window.api.fusionOnboardingGet().then(receive).catch(reason=>setError(String(reason)));
  const off=window.api.onFusionOnboarding(receive);return()=>{active=false;off();};
 },[]);
 useEffect(()=>{
  const stopJob=window.api.onFusionProductJob(job=>useProductStore.getState().job(job));
  const stopRecord=window.api.onFusionProductRecord(record=>useProductStore.getState().set({record}));
  const search=():void=>{useIslandStore.getState().setMaxExpand();useProductStore.getState().set({searchOpen:true});};
  const stopSearch=window.api.onFusionProductSearch(search);window.addEventListener('fusion-product-search',search);
  void window.api.fusionProductData().then(data=>useProductStore.getState().set({data})).catch(reason=>setError(String(reason)));
  void window.api.fusionProductRecordState().then(record=>useProductStore.getState().set({record})).catch(()=>undefined);
  return ()=>{stopJob();stopRecord();stopSearch();window.removeEventListener('fusion-product-search',search);};
 },[]);
 useEffect(()=>{if(state.searchOpen)void Promise.all([window.api.fusionProductSearchApps(),window.api.fusionProductData()]).then(([items,data])=>{setApps(items);state.set({data});}).catch(reason=>setError(String(reason)));},[state.searchOpen]);
 const query=state.query,setQuery=(query:string):void=>state.set({query});
 const close=():void=>state.set({dropOpen:false,searchOpen:false});
 const actions=[{id:'preview',icon:Eye},{id:state.inputs[0]?.kind==='pdf'?'pdf':'image',icon:state.inputs[0]?.kind==='pdf'?Files:Image},{id:'zip',icon:Archive},{id:'sharing',icon:Share2},{id:'clipboard',icon:Clipboard},{id:'qr',icon:Globe}];
 return <div {...zone.getRootProps({className:'fusion-product-root',onDrop:event=>{if((event.target as Element).closest('input,textarea,[contenteditable=true]')){event.stopPropagation();return;}if(!event.dataTransfer.files.length){const value=event.dataTransfer.getData('text/plain')||event.dataTransfer.getData('text/uri-list').split('\n').find(line=>!line.startsWith('#'))||'';if(value){event.preventDefault();event.stopPropagation();void window.api.fusionProductText(value).then(item=>ready([item])).catch(reason=>setError(String(reason)));}}}})}>
  <input {...zone.getInputProps()} />
  {children}
  {zone.isDragActive&&<div className="fusion-product-drag" aria-label={t('fusion.product.drop')}><Clipboard size={30}/></div>}
  {(state.dropOpen||state.searchOpen)&&<div className="fusion-product-overlay" onClick={close} onWheel={event=>event.stopPropagation()} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape')close();}}>
   <section className="fusion-product-dialog" role="dialog" aria-modal="true" aria-label={t(state.searchOpen?'fusion.product.search':'fusion.product.drop')} onClick={event=>event.stopPropagation()}>
    <button className="fusion-product-close fusion-icon-button" aria-label={t('fusion.product.close')} onClick={close}><X size={16}/></button>
    {state.dropOpen?<><div className="fusion-product-inputs">{state.inputs.map(item=><span key={item.id}>{item.name}</span>)}</div><div className="fusion-product-drop-actions">
     {actions.filter(item=>item.id!=='image'||state.inputs[0]?.kind==='image').map(item=><button key={item.id} onClick={()=>{if(item.id==='clipboard'){void window.api.fusionProductRun('copy',state.inputs.map(input=>input.id),{}).then(job=>{state.job(job);close();}).catch(reason=>setError(String(reason)));}else openProductTool(item.id);}}><item.icon size={20} strokeWidth={1.6}/>{t('fusion.toolbox.items.'+item.id)}</button>)}
     {state.inputs[0]?.kind==='text'&&<button onClick={()=>openProductTool('download',state.inputs,'media')}><Download size={20} strokeWidth={1.6}/>{t('fusion.toolbox.items.download')}</button>}
     {state.inputs[0]?.kind==='text'&&<button onClick={async()=>{try{const result=await window.api.fusionProductRead(state.inputs[0].id),value=new TextDecoder().decode(result.bytes);if(/^https?:\/\//i.test(value.trim())){await window.api.fusionWebNavigate('browser',value.trim());openProductTool('browser');}else openProductTool('text');}catch(reason){setError(String(reason));}}}><Globe size={20}/>{t('fusion.product.openText')}</button>}
    </div></>:<Command label={t('fusion.product.search')} shouldFilter={false}>
     <div className="fusion-product-search"><Search size={16}/><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder={t('fusion.product.search')}/></div>
     <Command.List><Command.Empty>{t('fusion.toolbox.noResults')}</Command.Empty>
      <Command.Group heading={t('fusion.product.tools')}>{TOOL_REGISTRY.filter(item=>[t(item.label),item.keywords].join(' ').toLowerCase().includes(query.toLowerCase())).map(item=><Command.Item key={item.id} value={item.id} onSelect={()=>openProductTool(resolveToolTarget(item.id).id)}><item.icon size={18}/>{t(item.label)}</Command.Item>)}</Command.Group>
      <Command.Group heading={t('fusion.product.apps')}>{apps.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).map(item=><Command.Item key={item.id} value={'app-'+item.id} onSelect={()=>{setError('');void window.api.fusionProductLaunch(item.path).then(close).catch(reason=>setError(String(reason)));}}>{item.name}</Command.Item>)}</Command.Group>
      <Command.Group heading={t('fusion.product.flows')}>{state.data?.flows.filter(item=>(item.name.startsWith('@')?t('fusion.product.preset.'+item.name.slice(1)):item.name).toLowerCase().includes(query.toLowerCase())).map(item=><Command.Item key={item.id} value={item.id} onSelect={()=>openProductTool('workflows',state.inputs,item.id)}>{item.name.startsWith('@')?t('fusion.product.preset.'+item.name.slice(1)):item.name}</Command.Item>)}</Command.Group>
     </Command.List>
    </Command>}
    {error&&<p role="alert" className="fusion-inline-error">{error}</p>}
   </section>
  </div>}
 </div>;
}
