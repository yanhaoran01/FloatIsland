/* FloatIsland - https://github.com/yanhaoran01/FloatIsland; Copyright (C) 2026 contributors. GPL-3.0. */
/** @file useContentWidth.ts @description Measures the real content box rather than monitor or viewport guesses. @author 鸡哥 */
import {useCallback,useEffect,useState} from 'react';
/** Shares a stable container observer and cleans up hidden/unmounted pages. */
export function useContentWidth<T extends HTMLElement>(){
  const [node,setNode]=useState<T|null>(null),[width,setWidth]=useState(0);
  const ref=useCallback((element:T|null)=>setNode(element),[]);
  useEffect(()=>{
    if(!node)return;
    const observer=new ResizeObserver(([entry])=>{if(entry.contentRect.width>0)setWidth(entry.contentRect.width);});
    observer.observe(node);
    return()=>observer.disconnect();
  },[node]);
  return {ref,width,narrow:width>0&&width<640};
}
