/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file UnifiedTools.tsx @description Canonical tool pages share processing and retain their original histories. @author 鸡哥 */
import { useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductAction,ProductOptions } from '../../../../preload/types/fusionProduct';
import { useProductStore } from '../productStore';
import { ImageTool } from './ImageTool';
import { PdfTool } from './TextPdfTools';
import { ProductPreview } from './ProductPreview';
import { ToolBody } from './ToolControls';
import { FileCompressionToolSection } from '../../states/maxExpand/components/tools/components/FileCompressionToolSection';
import { MediaDownloadTool, UnifiedDownloadHistory } from './MediaDownloadTool';
import { DownloadToolSection } from '../../states/maxExpand/components/tools/components/DownloadToolSection';
import { SoftwareToolSection } from '../../states/maxExpand/components/tools/components/SoftwareToolSection';
import { ToolsTab } from '../../states/expand/components/ToolsTab';
import { ProductFlows } from './ProductFlows';
/** Invokes shared main-process processors and shows actual results. @param action - Capability. @param defaults - Options. @returns Tool panel. */
export function ProductActionPanel({action,defaults}:{action:ProductAction;defaults:ProductOptions}) {
 const {t}=useTranslation(),store=useProductStore(),[options,setOptions]=useState(defaults),[id,setId]=useState(''),[error,setError]=useState('');
 const job=store.jobs[id],busy=job?.state==='running'||job?.state==='waiting';
 const run=async():Promise<void>=>{try{setError('');const task=await window.api.fusionProductRun(action,store.inputs.map(x=>x.id),options);store.job(task);setId(task.id);}catch(reason){setError(String(reason));}};
 return <ToolBody busy={busy} error={error||job?.error||''} cancel={()=>{if(id)void window.api.fusionProductJob(id,'cancel').catch(reason=>setError(String(reason)));}}>
  <div className="fusion-tool-row"><button onClick={()=>void window.api.fusionProductPick().then(inputs=>store.set({inputs})).catch(reason=>setError(String(reason)))}>{t('fusion.toolbox.chooseFiles')}</button><span>{store.inputs.map(x=>x.name).join(', ')}</span></div>
  <div className="fusion-product-options">{Object.entries(options).map(([key,value])=><label key={key}>{t('fusion.product.options.'+key)}{typeof value==='boolean'?<input type="checkbox" checked={value} onChange={event=>setOptions(old=>({...old,[key]:event.target.checked}))}/>:<input type={typeof value==='number'?'number':'text'} value={String(value)} onChange={event=>setOptions(old=>({...old,[key]:typeof value==='number'?Number(event.target.value):event.target.value}))}/>}</label>)}</div>
  <button disabled={busy||!store.inputs.length} onClick={()=>void run()}>{t('fusion.toolbox.run')}</button>
  {job&&<progress value={job.progress} max={1}/>}
  {job?.state==='waiting'&&<><div className="fusion-product-text">{job.preview?.map(row=><div key={row.before}>{row.before} → {row.after}{row.error&&<span role="alert">{row.error}</span>}</div>)}</div><button disabled={job.preview?.some(x=>x.error)} onClick={()=>void window.api.fusionProductJob(job.id,'confirm').catch(reason=>setError(String(reason)))}>{t('fusion.product.execute')}</button></>}
  {job?.state==='done'&&job.result.map(item=><ProductPreview key={item.id} artifact={item}/>)}
 </ToolBody>;
}
/** Consolidates canvas editing, conversion, compression and their own history. @returns Image workspace. */
export function ImageUnified() {
 const {t}=useTranslation(),store=useProductStore(),[tab,setTab]=useState('edit');
 useEffect(()=>{if(store.target==='image')setTab(store.tab||'edit');},[store.nonce]);
 return <><div className="fusion-product-tabs">{['edit','convert','compress','history','preview'].map(key=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{t('fusion.product.tabs.'+key)}</button>)}</div>
  {tab==='edit'?<ImageTool/>:tab==='preview'?<ProductPreview/>:tab==='history'?<><FileCompressionToolSection fileCompressionPage="history" setFileCompressionPage={()=>setTab('compress')}/><ProductHistory kind="image-convert"/></>:<ProductActionPanel key={tab} action="image-convert" defaults={tab==='compress'?{format:'jpg',width:1600,quality:75}:{format:'png',width:1600,quality:90}}/>}
 </>;
}
/** Shares PDF preview and existing page operations. @returns PDF workspace. */
export function PdfUnified() {
 const {t}=useTranslation(),store=useProductStore(),[tab,setTab]=useState('preview');useEffect(()=>{if(store.target==='pdf'&&store.tab)setTab(store.tab);},[store.nonce]);
 return <><div className="fusion-product-tabs">{['preview','organize'].map(key=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{t('fusion.product.tabs.'+key)}</button>)}</div>{tab==='preview'?<ProductPreview/>:<PdfTool/>}</>;
}
/** Preserves download creation and its existing history in one entry. @returns Download workspace. */
export function DownloadUnified() {
 const {t}=useTranslation(),store=useProductStore(),[page,setPage]=useState<'file'|'media'|'history'>('file');
 useEffect(()=>{if(store.target==='download')setPage(store.tab==='history'?'history':store.tab==='media'?'media':'file');},[store.nonce]);
 return <><div className="fusion-product-tabs">{(['file','media','history'] as const).map(tab=><button key={tab} aria-pressed={page===tab} onClick={()=>setPage(tab)}>{t('fusion.download.tabs.'+tab)}</button>)}</div>
 {page==='media'?<MediaDownloadTool onStarted={()=>setPage('history')}/>:page==='history'?<UnifiedDownloadHistory/>:<DownloadToolSection hideNavigation downloadPage="create" setDownloadPage={next=>{if(next==='history')setPage('history');}}/>}</>;
}
/** Preserves saved launch shortcuts and the existing software catalog. @returns Launcher workspace. */
export function LauncherUnified() {
 const {t}=useTranslation(),store=useProductStore(),[tab,setTab]=useState('favorites');useEffect(()=>{if(store.target==='launcher')setTab(store.tab||'favorites');},[store.nonce]);
 return <><div className="fusion-product-tabs">{['favorites','catalog'].map(key=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{t('fusion.product.tabs.'+key)}</button>)}<button onClick={()=>window.dispatchEvent(new Event('fusion-product-search'))}>{t('fusion.product.search')}</button></div>{tab==='favorites'?<ToolsTab/>:<SoftwareToolSection onFeedbackNavigate={()=>void window.api.openWorkspace({tab:'settings'})}/>}</>;
}
/** Shows only the corresponding new operation records. @param kind - Action category. @returns History list. */
export function ProductHistory({kind}:{kind:string}) {
 const {t}=useTranslation(),[rows,setRows]=useState<import('../../../../preload/types/fusionProduct').ProductData['history']>([]),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setError('');void window.api.fusionProductData().then(data=>{if(alive)setRows(data.history.filter(row=>row.kind===kind));}).catch(reason=>{if(alive)setError(String(reason));});return ()=>{alive=false;};},[kind]);
 return <ToolBody error={error}><div className="fusion-product-history">{rows.length?rows.map(row=><div key={row.id}>{new Date(row.time).toLocaleString()} · {row.name} · {t('fusion.product.state.'+row.state)}</div>):<span>{t('fusion.product.empty')}</span>}</div></ToolBody>;
}
export { ProductFlows };
