/* FloatIsland contributors. GPL-3.0. */
import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ExternalLink,Maximize2,Minimize2} from 'lucide-react';
import type {ProductArtifact} from '../../../../preload/types/fusionProduct';
import type {ReaderState} from '../../../../preload/types/managedLibrary';
import {ToolCommands,ToolError} from './ToolControls';
export const isDocument=(name:string)=>/\.(pdf|docx|xlsx|xls|epub|mobi|azw3|fb2|cbz|txt)$/i.test(name);
export function DocumentReader({artifact}:{artifact:ProductArtifact}){
 const frame=useRef<HTMLIFrameElement>(null),{t,i18n}=useTranslation(),[error,setError]=useState(''),[focus,setFocus]=useState(false);
 useEffect(()=>{let alive=true,ready=false,sent=false;const token=crypto.randomUUID();let latest:ReaderState|undefined,payload:{bytes:ArrayBuffer;state:ReaderState}|undefined;
  const post=()=>{if(alive&&ready&&payload&&!sent){sent=true;frame.current?.contentWindow?.postMessage({type:'open',token,name:artifact.name,...payload,labels:Object.fromEntries(['theme','dark','warm','light','settings','lineHeight','margin','font','find','original','pages','remove','note','page','chapters','zoom','fit','matches','noMatches','searching','bookmark'].map(key=>[key,t('fusion.reader.'+key)]))},'float-reader://local');}};
  const receive=(event:MessageEvent)=>{if(!alive||event.source!==frame.current?.contentWindow||event.origin!=='float-reader://local')return;if(event.data?.type==='reader-ready'){ready=true;post();}else if(event.data?.token===token){if(event.data.type==='state'){latest=event.data.value;void window.api.fusionLibraryReader(artifact.id,event.data.value).catch(reason=>{if(alive)setError(String(reason));});}else if(event.data.type==='metadata')void window.api.fusionLibraryReaderMetadata(artifact.id,event.data.value).catch(reason=>{if(alive)setError(String(reason));});else if(event.data.type==='copy'&&typeof event.data.value==='string')void navigator.clipboard.writeText(event.data.value).catch(reason=>setError(String(reason)));else if(event.data.type==='error')setError(String(event.data.value));}};
  window.addEventListener('message',receive);void Promise.all([window.api.fusionProductRead(artifact.id),window.api.fusionLibraryReader(artifact.id)]).then(([file,state])=>{if(alive){payload={bytes:new Uint8Array(file.bytes).buffer,state};post();}}).catch(reason=>{if(alive)setError(String(reason));});return()=>{alive=false;if(latest)void window.api.fusionLibraryReader(artifact.id,latest).catch(()=>{});window.removeEventListener('message',receive);};
 },[artifact.id,t]);
 return <div className="float-document-reader" data-focus={focus}><ToolCommands><button className="fusion-icon-button" aria-label={t('fusion.reader.focus')} title={t('fusion.reader.focus')} onClick={()=>setFocus(!focus)}>{focus?<Minimize2 size={20}/>:<Maximize2 size={20}/>}</button><button className="fusion-icon-button" aria-label={t('fusion.product.external')} title={t('fusion.product.external')} onClick={()=>void window.api.fusionProductOpen(artifact.id).catch(reason=>setError(String(reason)))}><ExternalLink size={20}/></button></ToolCommands><ToolError error={error}/><iframe key={artifact.id+':'+i18n.language} ref={frame} title={t('fusion.reader.document')} sandbox="allow-scripts allow-same-origin" src="float-reader://local/DocumentReader.html"/></div>;
}
