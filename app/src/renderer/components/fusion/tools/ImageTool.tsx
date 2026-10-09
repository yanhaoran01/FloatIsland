/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file ImageTool.tsx @description Local canvas crop, rotation and annotations with undo. @author 鸡哥 */
import { useEffect,useRef,useState,type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {useProductFiles} from '../productStore';
import { ToolBody } from './ToolControls';
import {useProductStore} from '../productStore';
interface Point {x:number;y:number;}
interface Rect {x:number;y:number;width:number;height:number;}
/** Constrains a crop to the image and the selected ratio without stretching it. */
export function cropRect(first:Point,last:Point,width:number,height:number,ratio=0):Rect {
 const dx=last.x-first.x,dy=last.y-first.y,sx=dx<0?-1:1,sy=dy<0?-1:1;
 const maxW=sx<0?first.x:width-first.x,maxH=sy<0?first.y:height-first.y;
 let w=Math.min(Math.abs(dx),maxW),h=Math.min(Math.abs(dy),maxH);
 if(ratio>0){w=Math.min(Math.max(w,h*ratio),maxW,maxH*ratio);h=w/ratio;}
 return {x:sx<0?first.x-w:first.x,y:sy<0?first.y-h:first.y,width:w,height:h};
}
/** Keeps edits inside the canvas; export always produces a new file. */
export function ImageTool():JSX.Element {
 const {t}=useTranslation(),canvas=useRef<HTMLCanvasElement>(null),generation=useRef(0),mounted=useRef(true);
 const [mode,setMode]=useState<'crop'|'arrow'|'rect'|'text'>('crop'),[ratio,setRatio]=useState(0),[text,setText]=useState(''),[color,setColor]=useState('#ffffff');
 const [selection,setSelection]=useState<Rect>(),[drag,setDrag]=useState<{first:Point;last:Point}>(),[history,setHistory]=useState<string[]>([]),[cursor,setCursor]=useState(-1),[error,setError]=useState(''),[busy,setBusy]=useState(false),[size,setSize]=useState({width:1,height:1});
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const remember=():void=>{const element=canvas.current;if(!element)return;const next=[...history.slice(0,cursor+1),element.toDataURL('image/png')].slice(-12);setHistory(next);setCursor(next.length-1);setSize({width:element.width,height:element.height});setSelection(undefined);setDrag(undefined);};
 const restore=(index:number):void=>{if(index<0||index>=history.length)return;const id=++generation.current,image=new Image();setBusy(true);image.onload=()=>{if(!mounted.current||generation.current!==id)return;const element=canvas.current!;element.width=image.width;element.height=image.height;element.getContext('2d')!.drawImage(image,0,0);setBusy(false);setCursor(index);setSize({width:image.width,height:image.height});setSelection(undefined);setDrag(undefined);};image.onerror=()=>{if(mounted.current&&generation.current===id){setBusy(false);setError('invalid-image');}};image.src=history[index];};
 const load=async(file:File):Promise<void>=>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20_000_000){setError('invalid-image');return;}
  const id=++generation.current;setBusy(true);setError('');
  try{const bitmap=await createImageBitmap(file);if(!mounted.current||generation.current!==id){bitmap.close();return;}if(bitmap.width*bitmap.height>16_000_000){bitmap.close();throw Error('image-too-large');}
   const element=canvas.current!;element.width=bitmap.width;element.height=bitmap.height;element.getContext('2d')!.drawImage(bitmap,0,0);bitmap.close();const uri=element.toDataURL('image/png');setHistory([uri]);setCursor(0);setSelection(undefined);setSize({width:element.width,height:element.height});
  }catch(reason){if(mounted.current&&generation.current===id)setError(reason instanceof Error?reason.message:String(reason));}finally{if(mounted.current&&generation.current===id)setBusy(false);}
 };
 const point=(event:React.PointerEvent<HTMLCanvasElement>):Point=>{const element=canvas.current!,rect=element.getBoundingClientRect();return {x:Math.max(0,Math.min(element.width,(event.clientX-rect.left)*element.width/rect.width)),y:Math.max(0,Math.min(element.height,(event.clientY-rect.top)*element.height/rect.height))};};
 useProductFiles('image',files=>{if(files[0])void load(files[0]);});
 const commit=(last:Point):void=>{
  const element=canvas.current;if(!element||!drag)return;const first=drag.first,context=element.getContext('2d')!,line=Math.max(2,element.width/400);context.strokeStyle=color;context.fillStyle=color;context.lineWidth=line;context.lineCap='round';
  if(mode==='crop'){setSelection(cropRect(first,last,element.width,element.height,ratio));setDrag(undefined);return;}
  if(mode==='text'){if(!text.trim()){setError('empty-text');setDrag(undefined);return;}context.font=Math.max(20,element.width/30)+'px "Microsoft YaHei",sans-serif';context.fillText(text,first.x,first.y);}
  else if(mode==='rect')context.strokeRect(first.x,first.y,last.x-first.x,last.y-first.y);
  else{context.beginPath();context.moveTo(first.x,first.y);context.lineTo(last.x,last.y);context.stroke();const angle=Math.atan2(last.y-first.y,last.x-first.x),length=line*6;context.beginPath();context.moveTo(last.x,last.y);context.lineTo(last.x-length*Math.cos(angle-.45),last.y-length*Math.sin(angle-.45));context.lineTo(last.x-length*Math.cos(angle+.45),last.y-length*Math.sin(angle+.45));context.closePath();context.fill();}
  remember();
 };
 const crop=():void=>{const element=canvas.current;if(!element||!selection||selection.width<1||selection.height<1)return;const temp=document.createElement('canvas');temp.width=Math.max(1,Math.round(selection.width));temp.height=Math.max(1,Math.round(selection.height));temp.getContext('2d')!.drawImage(element,selection.x,selection.y,selection.width,selection.height,0,0,temp.width,temp.height);element.width=temp.width;element.height=temp.height;element.getContext('2d')!.drawImage(temp,0,0);remember();};
 const rotate=():void=>{const element=canvas.current!;const temp=document.createElement('canvas');temp.width=element.height;temp.height=element.width;const context=temp.getContext('2d')!;context.translate(temp.width/2,temp.height/2);context.rotate(Math.PI/2);context.drawImage(element,-element.width/2,-element.height/2);element.width=temp.width;element.height=temp.height;element.getContext('2d')!.drawImage(temp,0,0);remember();};
 const exportImage=(jpeg:boolean):void=>{const element=canvas.current!;let output=element;if(jpeg){output=document.createElement('canvas');output.width=element.width;output.height=element.height;const context=output.getContext('2d')!;context.fillStyle='#ffffff';context.fillRect(0,0,output.width,output.height);context.drawImage(element,0,0);}output.toBlob(blob=>{if(blob)void blob.arrayBuffer().then(bytes=>window.api.fusionProductCreate(new Uint8Array(bytes),jpeg?'edited.jpg':'edited.png')).then(item=>{useProductStore.getState().set({inputs:[item]});return window.api.fusionProductSave(item.id);}).catch(reason=>setError(String(reason)));else setError('invalid-image');},jpeg?'image/jpeg':'image/png',.92);};
 const rect=drag&&mode==='crop'?cropRect(drag.first,drag.last,size.width,size.height,ratio):selection;
 return <ToolBody busy={busy} error={error}><div className="fusion-tool-actions"><label className="fusion-file-button">{t('fusion.utilities.import')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void load(file);e.target.value='';}}/></label>
 <button disabled={cursor<=0||busy} onClick={()=>restore(cursor-1)}>{t('fusion.utilities.undo')}</button><button disabled={cursor<0||cursor>=history.length-1||busy} onClick={()=>restore(cursor+1)}>{t('fusion.utilities.redo')}</button><button disabled={cursor<0||busy} onClick={rotate}>{t('fusion.utilities.rotate')}</button></div>
 <div className="fusion-tool-actions"><select aria-label={t('fusion.utilities.mode')} value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setSelection(undefined);}}>{(['crop','arrow','rect','text'] as const).map(id=><option key={id} value={id}>{t('fusion.utilities.'+id)}</option>)}</select>
 {mode==='crop'?<><select aria-label={t('fusion.utilities.ratio')} value={ratio} onChange={e=>setRatio(Number(e.target.value))}><option value={0}>{t('fusion.utilities.free')}</option><option value={1}>1:1</option><option value={16/9}>16:9</option><option value={4/3}>4:3</option></select><button disabled={!selection||busy} onClick={crop}>{t('fusion.utilities.applyCrop')}</button></>:<input type="color" aria-label={t('fusion.utilities.color')} value={color} onChange={e=>setColor(e.target.value)}/>}
 {mode==='text'&&<input aria-label={t('fusion.utilities.text')} value={text} onChange={e=>setText(e.target.value)}/>}</div>
 <div className="fusion-image-stage" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void load(file);}}><div className="fusion-image-canvas"><canvas ref={canvas} hidden={cursor<0} onPointerDown={e=>{if(cursor<0||busy)return;e.currentTarget.setPointerCapture(e.pointerId);const first=point(e);setDrag({first,last:first});setError('');}} onPointerMove={e=>{if(drag)setDrag({...drag,last:point(e)});}} onPointerUp={e=>{if(drag)commit(point(e));if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>setDrag(undefined)}/>
 {rect&&<svg className="fusion-image-overlay" viewBox={'0 0 '+size.width+' '+size.height}><rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} stroke="#e5e7eb" strokeWidth={Math.max(2,size.width/400)} strokeDasharray={size.width/100} fill="#ffffff08"/></svg>}</div>
 {cursor<0&&<span>{t('fusion.utilities.imageDrop')}</span>}</div>
 {cursor>=0&&<div className="fusion-tool-actions"><button disabled={busy} onClick={()=>exportImage(false)}>PNG</button><button disabled={busy} onClick={()=>exportImage(true)}>JPEG</button></div>}</ToolBody>;
}
