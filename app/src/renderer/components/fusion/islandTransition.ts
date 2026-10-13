/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0. */
/** @file islandTransition.ts @description Reversible snapshot transition with native cancellation and fade fallback. @author 鸡哥 */
import {createGenieMesh} from './genieMesh';
import type {GenieSnapshot} from '../../../preload/types/genie';
let running:{target:number;commit:()=>void;cancelled:boolean}|null=null;
let lastFocus:HTMLElement|null=null;
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
/** Reports whether a snapshot transition still owns the latest target.
 * @returns True until the running transition has released its snapshot.
 */
export function islandTransitionActive():boolean {return running!==null;}
/** Uses the current texture/progress for opposite requests. @param direction - Target state. @param commit - Native/state commit. */
export function transitionIsland(direction:'expand'|'collapse',commit:()=>void):void {
 if(typeof window.api?.fusionGenie!=='function'){commit();return;}
 const target=direction==='expand'?0:1;
 if(running){if(running.target===target)return;running.target=target;running.commit=commit;return;}
 const operation={target,commit,cancelled:false};running=operation;
 void (async()=>{
  let snapshot:GenieSnapshot|null=null,canvas:HTMLCanvasElement|undefined,committed=false,dispose:(()=>void)|undefined;
  const root=document.querySelector<HTMLElement>('.island-shell'),oldVisibility=root?.style.visibility||'';
  const focus=document.activeElement as HTMLElement|null;if(direction==='collapse'&&focus&&focus!==document.body)lastFocus=focus;
  const off=window.api.onFusionGenieCancelled?.(revision=>{if(!snapshot||revision===snapshot.revision)operation.cancelled=true;});
  document.documentElement.dataset.floatGesture='transition';window.dispatchEvent(new Event('float-tool-panel'));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.fiReducedMotion==='true';
  try{
   snapshot=await window.api.fusionGenie('begin',{direction});if(!snapshot)throw Error('transition-unavailable');
   if(direction==='expand'){commit();committed=true;await nextFrame();await nextFrame();await new Promise(resolve=>setTimeout(resolve,35));}
   if(operation.cancelled)throw Error('transition-cancelled');
   if(reduced)throw Error('reduced-motion');
   snapshot=await window.api.fusionGenie('capture',{revision:snapshot.revision});if(!snapshot||operation.cancelled)throw Error('capture-unavailable');
   const texture=document.createElement('canvas');texture.width=snapshot.width;texture.height=snapshot.height;
   const context=texture.getContext('2d');if(!context)throw Error('capture-unavailable');
   for(const frame of snapshot.frames){const image=new Image();image.src=frame.image;await image.decode();context.drawImage(image,frame.rect.x,frame.rect.y,frame.rect.width,frame.rect.height);}
   canvas=document.createElement('canvas');canvas.width=texture.width;canvas.height=texture.height;Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'2147483647',pointerEvents:'none'});document.body.append(canvas);
   const draw=createGenieMesh(canvas,texture,snapshot.edge,snapshot.compact);dispose=()=>canvas?.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
   if(root)root.style.visibility='hidden';window.dispatchEvent(new Event('float-tool-panel'));
   let progress=direction==='expand'?1:0;draw(progress);await window.api.fusionGenie('show',{revision:snapshot.revision});
   await new Promise<void>(resolve=>{let previous=performance.now();const tick=(now:number)=>{if(operation.cancelled){resolve();return;}const duration=operation.target===0?360:320,delta=Math.min(50,now-previous)/duration;previous=now;progress=operation.target===0?Math.max(0,progress-delta):Math.min(1,progress+delta);draw(progress);if(progress===operation.target)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  }catch{
   canvas?.remove();dispose?.();dispose=undefined;
   if(root)root.style.visibility=oldVisibility;
   if(snapshot)await window.api.fusionGenie('show',{revision:snapshot.revision}).catch(()=>{});
   // Opacity is the fallback; live content proportions and window dimensions remain unchanged.
   if(root&&!operation.cancelled){if(operation.target===0&&!committed){operation.commit();committed=true;await nextFrame();}const animation=root.animate?.([{opacity:operation.target===0?0:1},{opacity:operation.target===0?1:0}],{duration:120,easing:'linear'});if(animation)await animation.finished.catch(()=>{});else await new Promise(resolve=>setTimeout(resolve,120));}
  }finally{
   if(operation.target===1||!committed)operation.commit();
   if(root)root.style.visibility=oldVisibility;
   if(snapshot)await window.api.fusionGenie('finish',{revision:snapshot.revision}).catch(()=>{});
   dispose?.();canvas?.remove();off?.();delete document.documentElement.dataset.floatGesture;window.dispatchEvent(new Event('float-tool-panel'));running=null;
   const restore=lastFocus?.isConnected?lastFocus:focus;
   if(operation.target===0&&restore?.isConnected)requestAnimationFrame(()=>restore.focus({preventScroll:true}));
  }
 })();
}
