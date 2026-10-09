/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file DailyTools.tsx @description Offline stopwatch, unbiased random selection and URL tools. @author 鸡哥 */
import { useEffect,useState,type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StopwatchState } from '../../../../preload/types/fusionFileTools';
import { ToolBody,ToolResult } from './ToolControls';
/** Uniform bounded integer using rejection sampling. */
export function randomBelow(bound:number):number {
 if(!Number.isSafeInteger(bound)||bound<1||bound>0x100000000)throw Error('invalid-number');
 const ceiling=Math.floor(0x100000000/bound)*bound;let value:number;
 do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=ceiling);
 return value%bound;
}
/** Samples distinct nonempty names without persisting results. */
export function drawNames(text:string,count:number):string[] {
 const names=[...new Set(text.split(/\r?\n/).map(name=>name.trim()).filter(Boolean))];
 if(!Number.isInteger(count)||count<1||count>names.length||names.length>10000)throw Error('invalid-number');
 for(let index=0;index<count;index++){const other=index+randomBelow(names.length-index);[names[index],names[other]]=[names[other],names[index]];}
 return names.slice(0,count);
}
/** Shares the main-owned stopwatch across pages and native windows. */
export function StopwatchTool():JSX.Element {
 const {t}=useTranslation(),[value,setValue]=useState<StopwatchState>({version:1,elapsedMs:0,startedAt:null,laps:[]}),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;const update=(state:StopwatchState):void=>{if(mounted){setValue(state);setNow(Date.now());}};const off=window.api.onFusionStopwatch(update);void window.api.fusionStopwatchGet().then(update).catch(reason=>setError(String(reason)));const tick=setInterval(()=>{if(!document.hidden)setNow(Date.now());},100);return()=>{mounted=false;off();clearInterval(tick);};},[]);
 const format=(ms:number):string=>{const total=Math.floor(ms/10);return [Math.floor(total/360000),Math.floor(total/6000)%60,Math.floor(total/100)%60].map(n=>String(n).padStart(2,'0')).join(':')+'.'+String(total%100).padStart(2,'0');};
 const elapsed=value.elapsedMs+(value.startedAt===null?0:Math.max(0,now-value.startedAt));
 const command=(action:'start'|'pause'|'lap'|'reset'):void=>{setError('');void window.api.fusionStopwatchControl(action).then(setValue).catch(reason=>setError(String(reason)));};
 return <ToolBody error={error}><output className="fusion-stopwatch">{format(elapsed)}</output><div className="fusion-tool-actions">
 <button onClick={()=>command(value.startedAt===null?'start':'pause')}>{t('fusion.utilities.'+(value.startedAt===null?'start':'pause'))}</button>
 <button disabled={value.startedAt===null} onClick={()=>command('lap')}>{t('fusion.utilities.lap')}</button><button onClick={()=>command('reset')}>{t('fusion.utilities.reset')}</button></div>
 {!!value.laps.length&&<ToolResult text={value.laps.map((lap,index)=>String(index+1)+'. '+format(lap)).join('\n')}/>}</ToolBody>;
}
/** Draws names or inclusive integers from local input only. */
export function RandomTool():JSX.Element {
 const {t}=useTranslation(),[mode,setMode]=useState('names'),[text,setText]=useState(''),[count,setCount]=useState(1),[minimum,setMinimum]=useState(1),[maximum,setMaximum]=useState(100),[result,setResult]=useState(''),[error,setError]=useState('');
 const run=():void=>{setError('');try{if(mode==='names')setResult(drawNames(text,count).join('\n'));else{if(!Number.isSafeInteger(minimum)||!Number.isSafeInteger(maximum)||maximum<minimum)throw Error('invalid-number');setResult(String(minimum+randomBelow(maximum-minimum+1)));}}catch(reason){setError(reason instanceof Error?reason.message:String(reason));}};
 return <ToolBody error={error}><select aria-label={t('fusion.utilities.mode')} value={mode} onChange={e=>{setMode(e.target.value);setResult('');}}><option value="names">{t('fusion.utilities.names')}</option><option value="integer">{t('fusion.utilities.integer')}</option></select>
 {mode==='names'?<><textarea aria-label={t('fusion.utilities.names')} value={text} onChange={e=>setText(e.target.value)}/><label>{t('fusion.utilities.quantity')}<input type="number" min={1} max={10000} value={count} onChange={e=>setCount(Number(e.target.value))}/></label></>:<div className="fusion-tool-columns"><label>{t('fusion.utilities.minimum')}<input type="number" value={minimum} onChange={e=>setMinimum(Number(e.target.value))}/></label><label>{t('fusion.utilities.maximum')}<input type="number" value={maximum} onChange={e=>setMaximum(Number(e.target.value))}/></label></div>}
 <div className="fusion-tool-actions"><button onClick={run}>{t('fusion.utilities.draw')}</button></div>{result&&<ToolResult text={result}/>}</ToolBody>;
}
/** Parses and edits query parameters without navigating to the address. */
export function UrlTool():JSX.Element {
 const {t}=useTranslation(),[text,setText]=useState(''),[component,setComponent]=useState(true),[result,setResult]=useState(''),[base,setBase]=useState(''),[params,setParams]=useState<Array<[string,string]>>([]),[error,setError]=useState('');
 const run=(action:'encode'|'decode'|'parse'):void=>{setError('');try{if(action==='parse'){const url=new URL(text);if(!['http:','https:'].includes(url.protocol))throw Error('invalid-url');setParams([...url.searchParams.entries()]);url.search='';setBase(url.href);setResult(text);}else setResult(action==='encode'?(component?encodeURIComponent:encodeURI)(text):(component?decodeURIComponent:decodeURI)(text));}catch(reason){setError(reason instanceof URIError?'invalid-url-encoding':reason instanceof Error?reason.message:String(reason));}};
 const change=(next:Array<[string,string]>):void=>{setParams(next);const url=new URL(base);for(const [key,value] of next)url.searchParams.append(key,value);setResult(url.href);};
 return <ToolBody error={error}><textarea aria-label={t('fusion.utilities.urlInput')} value={text} onChange={e=>setText(e.target.value)}/><label><input type="checkbox" checked={component} onChange={e=>setComponent(e.target.checked)}/>{t('fusion.utilities.urlComponent')}</label>
 <div className="fusion-tool-actions">{(['encode','decode','parse'] as const).map(action=><button key={action} onClick={()=>run(action)}>{t('fusion.utilities.'+action)}</button>)}</div>
 {base&&<div className="fusion-url-params">{params.map((pair,index)=><div key={index}><input aria-label={t('fusion.utilities.parameter')} value={pair[0]} onChange={e=>change(params.map((p,i)=>i===index?[e.target.value,p[1]]:p))}/><input aria-label={t('fusion.utilities.value')} value={pair[1]} onChange={e=>change(params.map((p,i)=>i===index?[p[0],e.target.value]:p))}/><button aria-label={t('fusion.utilities.remove')} onClick={()=>change(params.filter((_,i)=>i!==index))}>×</button></div>)}<button onClick={()=>change([...params,['','']])}>{t('fusion.utilities.addParameter')}</button></div>}
 {result&&<ToolResult text={result}/>}</ToolBody>;
}
