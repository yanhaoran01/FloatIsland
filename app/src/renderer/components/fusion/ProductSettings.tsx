/* FusionIsland - GPL-3.0. @file ProductSettings.tsx @description Persisted unified search shortcut. @author 鸡哥 */
import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ToolError} from './tools/ToolControls';
/** Saves a shortcut only after successful native registration. */
export function ProductSettings(){
 const {t}=useTranslation(),[key,setKey]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{void window.api.fusionProductData().then(data=>{setKey(data.hotkey);setError(data.hotkeyError??'');}).catch(reason=>setError(String(reason)));},[]);
 return <div className="fusion-settings-card"><label className="fusion-setting-row">{t('fusion.product.hotkey')}<input value={key} onChange={event=>{setKey(event.target.value);setSaved(false);}}/></label><button onClick={()=>{void window.api.fusionProductData().then(data=>window.api.fusionProductWrite({...data,hotkey:key},true)).then(()=>{setError('');setSaved(true);}).catch(reason=>setError(String(reason)));}}>{t('fusion.product.hotkeySave')}</button>{saved&&<p role="status">{t('fusion.product.hotkeySaved')}</p>}<ToolError error={error}/></div>;
}
