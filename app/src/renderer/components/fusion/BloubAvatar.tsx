/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0.
 * Bloub SVG engine: jeremy-prt, MIT; see vendor/bloub/LICENSE. */
/** @file BloubAvatar.tsx @description 灰阶 Grok SVG 适配器，隐藏停止循环，减少动画采用静态表情。 @author 鸡哥 */
import { useEffect, useId, useRef, useState, type JSX } from 'react';
import { BotEngine, type BotFrame } from '../../vendor/bloub/engine';
import { EXPRESSION_BY_ID, type ExpressionId } from '../../vendor/bloub/expressions';
import { SHAPE_BY_ID, type ShapeId } from '../../vendor/bloub/skins';
import { POSES, type StateId } from '../../vendor/bloub/states';
import { Sound } from '../../vendor/coucou/core/sound';
import { useFusionPreferences } from './fusionPreferences';
import { useAvatarConfiguration } from './avatarConfiguration';
import { AvatarController } from './avatarController';
import type { FusionPetMood } from './FusionPet';
interface Props { mood:FusionPetMood; label:string; disabled?:boolean; dropActive?:boolean; state?:StateId; frozen?:boolean; shape?:ShapeId; expression?:ExpressionId; actionToken?:string|number; }
/** Renders every pinned action with a visible-only clock inside a fixed SVG viewport. */
export function BloubAvatar({mood,label,disabled=false,dropActive=false,state:preview,frozen=false,shape,expression,actionToken=0}:Props):JSX.Element {
  const reduced=useFusionPreferences(s=>s.value.reducedMotion),config=useAvatarConfiguration(s=>s.value);
  const uid=useId().replace(/:/g,''),button=useRef<HTMLButtonElement>(null);
  const engine=useRef(new BotEngine(100)),controller=useRef(new AvatarController()),clock=useRef(0),applied=useRef(-1),clickId=useRef(0);
  const [interaction,setInteraction]=useState<{state:StateId;nonce:number}>();
  const [pose,setPose]=useState<BotFrame>(()=>engine.current.sample(0));
  const [action,setAction]=useState(controller.current.action),refresh=useRef<()=>void>(()=>{});
  const effectiveMood=dropActive&&mood==='idle'&&!disabled?'surprised':mood;
  const effectivePreview=preview??interaction?.state;
  const chosenShape=shape??config.shape,chosenExpression=mood==='listening'?'attentif':expression??config.expression;
  const state=action.state,maskId=uid+'-eyes';
  useEffect(()=>{
    if(mood!=='idle')setInteraction(undefined);
    controller.current.sync(effectiveMood,effectivePreview,String(actionToken)+':'+(interaction?.nonce??0),clock.current);
    engine.current.setShape(SHAPE_BY_ID.get(chosenShape)!.radii,clock.current);
    engine.current.setExpression(EXPRESSION_BY_ID.get(chosenExpression)!,clock.current);
    refresh.current();
  },[effectiveMood,effectivePreview,actionToken,interaction?.nonce,chosenShape,chosenExpression]);
  useEffect(()=>{
    const element=button.current;if(!element)return;
    const media=matchMedia('(prefers-reduced-motion: reduce)');let inView=true,raf=0,last=performance.now();
    const visible=():boolean=>inView&&!document.hidden&&element.getClientRects().length>0;
    const draw=():void=>{
      const next=controller.current.sample(clock.current);
      if(applied.current!==next.id){applied.current=next.id;engine.current.setState(next.state,clock.current);setAction({...next});}
      if(frozen||reduced||media.matches){const still=new BotEngine(100);still.setShape(SHAPE_BY_ID.get(chosenShape)!.radii,-10);still.setExpression(EXPRESSION_BY_ID.get(chosenExpression)!,-10);still.reset(next.state,0);setPose(still.sample(POSES[next.state]));}
      else setPose(engine.current.sample(clock.current));
    };
    const tick=(now:number):void=>{raf=0;if(!visible()||frozen||reduced||media.matches)return;if(now-last>=1000/30){clock.current+=Math.min(.06,(now-last)/1000);last=now;draw();}raf=requestAnimationFrame(tick);};
    const resume=():void=>{cancelAnimationFrame(raf);raf=0;Sound.setActive(visible()&&!frozen,element);if(!visible())return;last=performance.now();draw();if(!frozen&&!reduced&&!media.matches)raf=requestAnimationFrame(tick);};
    refresh.current=resume;
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;resume();});observer.observe(element);
    const look=(event:PointerEvent):void=>{if(!visible()||disabled||frozen||reduced||media.matches||mood!=='idle')return;const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)return;engine.current.setLook({yaw:Math.max(-35,Math.min(35,(event.clientX-rect.x-rect.width/2)/12)),pitch:Math.max(-25,Math.min(25,(event.clientY-rect.y-rect.height/2)/12)),mix:1,spin:0,wander:0},clock.current);};
    const leave=():void=>engine.current.setLook({yaw:0,pitch:0,mix:0,spin:0,wander:1},clock.current);
    window.addEventListener('pointermove',look);document.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',resume);media.addEventListener('change',resume);resume();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('pointermove',look);document.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',resume);media.removeEventListener('change',resume);Sound.setActive(false,element);refresh.current=()=>{};};
  },[frozen,reduced,disabled,chosenShape,chosenExpression,mood]);
  const dots=pose.dots.map((dot,index)=>dot.d?<path key={index} d={dot.d} transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot??0}) scale(100)`} fill="#c8cdd5" opacity={dot.opacity}/>:<circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill="#c8cdd5" opacity={dot.opacity}/>);
  return <button ref={button} type="button" className={`fusion-pet fusion-pet--${mood}`} aria-label={label} title={label} disabled={disabled} data-avatar="bloub" data-pose={state} data-action-id={action.id} data-action-source={action.source} onClick={()=>{if(!disabled&&!frozen&&mood==='idle')setInteraction({state:'wink',nonce:++clickId.current});}}>
    <svg viewBox="-122 -122 244 244" aria-hidden="true" className="fusion-pet-svg">
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="-158" y="-158" width="316" height="316"><path d={pose.bodyPath} fill="white"/>{pose.eyes.map((eye,index)=><path key={index} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="black"/>)}{pose.notch&&<circle cx={pose.notch.x} cy={pose.notch.y} r={pose.notch.r} fill="black"/>}</mask></defs>
      <g fill="none" stroke="#969ba5" strokeLinecap="round">{pose.arcs.map(arc=><path key={arc.id} d={arc.back} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g>
      {pose.dotsBehind&&dots}
      <g opacity={pose.bodyAlpha}><path d={pose.bodyPath} fill="#1c1d20"/><g mask={`url(#${maskId})`}><rect x="-158" y="-158" width="316" height="316" fill="#c8cdd5"/></g></g>
      {!pose.dotsBehind&&dots}
      {pose.notif&&<circle cx={pose.notif.x} cy={pose.notif.y} r={pose.notif.r} fill="#e5e7eb"/>}
      <g fill="none" stroke="#969ba5" strokeLinecap="round">{pose.arcs.map(arc=><path key={arc.id} d={arc.front} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g>
    </svg>
  </button>;
}
