/* FloatIsland contributors. GPL-3.0. */
export interface GenieFrame {image:string;rect:{x:number;y:number;width:number;height:number};}
export interface GenieSnapshot {revision:number;edge:'top'|'left'|'right';width:number;height:number;compact:{x:number;y:number;width:number;height:number};frames:GenieFrame[];}
export interface GenieApi {onFusionGenieCancelled:(callback:(revision:number)=>void)=>()=>void;fusionGenie:(command:'begin'|'capture'|'show'|'finish',value:{direction?:'expand'|'collapse';revision?:number})=>Promise<GenieSnapshot|null>;}
