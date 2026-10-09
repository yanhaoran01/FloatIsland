/* FusionIsland - GPL-3.0. @file ProductCapture.tsx @description Unified screenshot, OCR, pin and scroll actions. @author 鸡哥 */
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useProductStore,openProductTool} from '../productStore';
import {ProductPreview} from './ProductPreview';
import {ToolBody} from './ToolControls';
/** Captures through the original native selector and shares its result. */
export function ProductCapture() {
 const {t}=useTranslation(),store=useProductStore(),[id,setId]=useState(''),[error,setError]=useState(''),[selecting,setSelecting]=useState(false);
 const job=store.jobs[id],busy=selecting||job?.state==='running';
 const perform=async(command:'region'|'screen'|'scroll'):Promise<void>=>{try{setError('');setSelecting(true);if(command==='scroll'){const task=await window.api.fusionProductScroll('start');store.job(task);setId(task.id);}else{const item=await window.api.fusionProductCapture({mode:command});store.set({inputs:[item]});}}catch(reason){setError(String(reason));}finally{setSelecting(false);}};
 const source=job?.state==='done'?job.result[0]:store.inputs.find(item=>item.kind==='image');
 return <ToolBody busy={busy} error={error||job?.error||''} cancel={()=>{void window.api.fusionProductScroll('cancel').catch(reason=>setError(String(reason)));}}>
  <div className="fusion-tool-actions">{(['region','screen','scroll'] as const).map(command=><button disabled={busy} key={command} onClick={()=>void perform(command)}>{t('fusion.product.capture.'+command)}</button>)}<button onClick={()=>void window.api.fusionProductPins('unlock')}>{t('fusion.product.pinUnlock')}</button><button onClick={()=>void window.api.fusionProductPins('close')}>{t('fusion.product.pinClose')}</button></div>
  {job?.state==='running'&&<div className="fusion-tool-actions"><button onClick={()=>void window.api.fusionProductScroll('frame').catch(reason=>setError(String(reason)))}>{t('fusion.product.capture.frame')}</button><button onClick={()=>void window.api.fusionProductScroll('finish').then(store.job).catch(reason=>setError(String(reason)))}>{t('fusion.product.capture.finish')}</button></div>}
  {source&&<><div className="fusion-tool-actions"><button onClick={()=>{const task=window.api.fusionProductRun('ocr',[source.id],{});void task.then(value=>{store.job(value);setId(value.id);}).catch(reason=>setError(String(reason)));}}>{t('fusion.product.action.ocr')}</button><button onClick={()=>openProductTool('image',[source])}>{t('fusion.toolbox.items.image')}</button></div><ProductPreview artifact={source}/></>}
  {job?.state==='done'&&job.result.filter(item=>item.kind==='text').map(item=><ProductPreview key={item.id} artifact={item}/>)}
 </ToolBody>;
}
