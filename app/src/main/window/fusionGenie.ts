/* FloatIsland contributors. GPL-3.0. Snapshots live in memory only. */
import {ipcMain,screen,type BrowserWindow} from 'electron';
import {captureFusionGuestViews} from '../system/fusionBrowserService';
import {dockRect} from './fusionDockGeometry';
import type {GenieSnapshot} from '../../preload/types/genie';
let active=false,revision=0,timer:ReturnType<typeof setTimeout>|undefined;
export const genieTransitionActive=():boolean=>active;
export function registerFusionGenie(getWindow:()=>BrowserWindow|null,getDock:()=>{edge:'top'|'left'|'right';position:number}):void {
 const finish=()=>{clearTimeout(timer);active=false;const win=getWindow();if(win&&!win.isDestroyed())win.setOpacity(1);};
 const cancel=()=>{if(!active)return;const old=revision;revision++;finish();const win=getWindow();if(win&&!win.isDestroyed())win.webContents.send('fusion:genie:cancelled',old);};
 ipcMain.handle('fusion:genie',async(event,command:string,value:{direction?:string;revision?:number}):Promise<GenieSnapshot|null>=>{
  const win=getWindow();if(!win||win.isDestroyed()||event.sender!==win.webContents||event.senderFrame!==event.sender.mainFrame)throw Error('untrusted-view');
  if(command==='begin'){if(!value||!['expand','collapse'].includes(value.direction||''))throw Error('invalid-transition');active=true;revision++;clearTimeout(timer);timer=setTimeout(cancel,5000);if(value.direction==='expand')win.setOpacity(0);}
  else if(!active||value?.revision!==revision)throw Error('stale-transition');
  if(command==='finish'){finish();return null;}if(command==='show'){win.setOpacity(1);return null;}
  if(command!=='begin'&&command!=='capture')throw Error('invalid-transition');
  const version=revision,bounds=win.getContentBounds(),dock=getDock(),area=screen.getDisplayMatching(bounds).workArea,size=dock.edge==='top'?{width:260,height:42}:{width:48,height:260},compact=dockRect(area,size,dock.edge,dock.position,false);
  const result:GenieSnapshot={revision:version,edge:dock.edge,width:bounds.width,height:bounds.height,compact:{...compact,x:compact.x-bounds.x,y:compact.y-bounds.y},frames:[]};
  if(command==='capture'){
   const image=await win.webContents.capturePage();if(image.isEmpty())throw Error('capture-unavailable');result.frames.push({image:image.toDataURL(),rect:{x:0,y:0,width:bounds.width,height:bounds.height}});result.frames.push(...await captureFusionGuestViews(win));const current=win.getContentBounds();if(!active||version!==revision||current.width!==bounds.width||current.height!==bounds.height)throw Error('stale-transition');
  }return result;
 });
 getWindow()?.on('closed',cancel);screen.on('display-metrics-changed',cancel);screen.on('display-removed',cancel);
}
