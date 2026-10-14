"""Integrate the approved edge rail and bilingual onboarding without moving existing data."""
from pathlib import Path
import json, re
app=Path(__file__).resolve().parent.parent
def edit(name, fn):
    p=app/name;p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8')

def dock(s):
    s=s.replace('let preview: DockEdge | null = null;','let preview: DockEdge | null = null;\nlet protectedActivity = false;\nlet positions: Record<DockEdge, number> = {top:.5,left:.5,right:.5};')
    s=s.replace('JSON.stringify(config)', 'JSON.stringify({...config, positions})')
    s=s.replace('  const size = strip ?', "  const compact = lastSize.width === 260 && lastSize.height === 42;\n  const retained = compact && config.edge !== 'top' ? {width:48,height:260} : lastSize;\n  const size = strip ?")
    s=s.replace(': lastSize;\n  return dockRect', ': retained;\n  return dockRect')
    s=s.replace("config={...config,...JSON.parse(readFileSync(file(),'utf8'))};", "const saved=JSON.parse(readFileSync(file(),'utf8'));\n    if(saved.positions && typeof saved.positions==='object')for(const edge of ['top','left','right'] as const){const value=saved.positions[edge];if(Number.isFinite(value)&&value>=0&&value<=1)positions[edge]=value;}\n    const {positions:_positions,...settings}=saved;config={...config,...settings};positions[config.edge]=config.position;")
    s=s.replace('trusted(event);const next={...config,...patch};','trusted(event);const next={...config,...patch};\n    if(patch?.edge && patch.edge!==config.edge && patch.position===undefined){positions[config.edge]=config.position;next.position=positions[patch.edge];}')
    s=s.replace('config=next;strip=false;', 'config=next;positions[config.edge]=config.position;strip=false;')
    s=s.replace("(event,isExpanded:boolean)=>{trusted(event);", "(event,isExpanded:boolean,keepVisible=false)=>{trusted(event);if(typeof isExpanded!=='boolean'||typeof keepVisible!=='boolean')throw Error('invalid-dock-activity');")
    s=s.replace('expanded=Boolean(isExpanded);if(expanded)strip=false;', 'expanded=isExpanded;protectedActivity=keepVisible;if(expanded||protectedActivity)strip=false;')
    s=s.replace('config.position=Math.max(0,Math.min(1,config.edge===', 'config.position=Math.max(0,Math.min(1,config.edge===')
    s=s.replace("(point.y-area.y)/area.height));persist();", "(point.y-area.y)/area.height));positions[config.edge]=config.position;persist();")
    s=s.replace('if(expanded || hasFusionMedia() || !config.autoHide)', 'if(expanded || protectedActivity || hasFusionMedia() || !config.autoHide)')
    s=s.replace('if(inside){lastOutside=Date.now();if(strip){if(!entered)entered=Date.now();if(Date.now()-entered>=250){strip=false;place();publish();entered=0;}}}', 'if(inside){lastOutside=Date.now();}')
    # Snap dragging onto the configured edge while moving along its axis.
    s=s.replace('win.setPosition(Math.round(x),Math.round(y));', "win.setPosition(config.edge==='left'?area.x:config.edge==='right'?area.x+area.width-lastSize.width:Math.round(x),config.edge==='top'?area.y:Math.round(y));")
    return s
edit('src/main/window/fusionDock.ts',dock)
edit('src/preload/types/fusionWorkspace.ts',lambda s:s.replace('fusionDockActivity: (expanded: boolean)', 'fusionDockActivity: (expanded: boolean, keepVisible?: boolean)'))
edit('src/preload/fusionWorkspace.ts',lambda s:s.replace("fusionDockActivity: expanded => ipcRenderer.invoke('fusion:dock:activity',expanded)","fusionDockActivity: (expanded, keepVisible) => ipcRenderer.invoke('fusion:dock:activity',expanded,keepVisible)"))
edit('src/renderer/components/fusion/useFusionDock.ts',lambda s:s.replace("import { useEffect", "import { useProductStore } from './productStore';\nimport { useFusionActivity } from './fusionActivity';\nimport { useEffect",1).replace("  const drag=", "  const record=useProductStore(s=>s.record),jobs=useProductStore(s=>s.jobs),activity=useFusionActivity();\n  const keepVisible=Boolean(record&&['starting','recording','paused','finishing'].includes(record.state))||Object.values(jobs).some(job=>job.state==='waiting')||Boolean(activity.codex?.pendingRequests.length||activity.dsh?.pendingRequests.length||activity.echo?.pendingRequests?.length);\n  const drag=",1).replace("window.api.fusionDockActivity(state==='maxExpand')", "window.api.fusionDockActivity(state==='maxExpand'||state==='guide',keepVisible)").replace('},[state]);','},[state,keepVisible]);',1))

def compact(s):
    s=s.replace('Square,ArrowUpRight','Square,ArrowUpRight,MessageSquare,Grid2X2,Search,Settings')
    s=s.replace("import useIslandStore", "import {SidebarHeader,SidebarMenu,SidebarMenuButton} from '../../vendor/shadcn/Sidebar';\nimport {useEffect,useState} from 'react';\nimport './floatIsland.css';\nimport useIslandStore",1)
    s=s.replace('  const { t } = useTranslation();', "  const { t } = useTranslation();\n  const [edge,setEdge]=useState<'top'|'left'|'right'>('top');\n  useEffect(()=>{let active=true;void window.api.fusionDockGet().then(value=>{if(active)setEdge(value.config.edge);});const off=window.api.onFusionDock(value=>setEdge(value.config.edge));return()=>{active=false;off();};},[]);",1)
    token="  return <div className={'fusion-compact'"
    insert='''  const open=(view:'chat'|'tools'|'search'|'settings'):void=>{
    localStorage.setItem('fusion.island-view',view==='tools'?'common':'chat');
    useProductStore.getState().set({target:'',searchOpen:view==='search',dropOpen:false});
    useIslandStore.getState().setMaxExpandTab(view==='settings'?'settings':view==='tools'?'toolbox':'aiChat');
    useIslandStore.getState().setMaxExpand();
    if(view==='chat'||view==='tools')window.dispatchEvent(new CustomEvent('fusion-navigate-peer',{detail:view==='chat'?'chat':'common'}));
  };
  if(edge!=='top')return <div className="fusion-compact float-side-dock" data-side={edge}>
    <SidebarHeader><FusionPet mood={mood} muted={muted} label={t('fusion.pet.'+mood)}/></SidebarHeader>
    <SidebarMenu>{([{id:'chat',icon:MessageSquare,key:'fusion.navigation.aiChat'},{id:'tools',icon:Grid2X2,key:'fusion.navigation.toolbox'},{id:'search',icon:Search,key:'fusion.product.search'},{id:'settings',icon:Settings,key:'fusion.navigation.settings'}] as const).map(item=><li key={item.id}><SidebarMenuButton title={t(item.key)} aria-label={t(item.key)} onClick={event=>{event.stopPropagation();open(item.id);}}><item.icon size={20} strokeWidth={1.6}/></SidebarMenuButton></li>)}</SidebarMenu>
    {recording?<div className="float-side-record"><span>{Math.floor(record.elapsed/60).toString().padStart(2,'0')+':'+Math.floor(record.elapsed%60).toString().padStart(2,'0')}</span><button type="button" className="fusion-icon-button" aria-label={t('fusion.product.record.stop')} onClick={event=>{event.stopPropagation();void window.api.fusionProductRecordControl('stop').then(value=>useProductStore.getState().set({record:value}));}}><Square size={10}/></button></div>:<span className="float-side-state" data-active={pending>0||active>0}/>}
  </div>;
'''
    return s.replace(token,insert+token,1)
edit('src/renderer/components/fusion/FusionCompact.tsx',compact)
edit('src/renderer/components/fusion/FusionChat.tsx',lambda s:s.replace("const saved=localStorage.getItem('fusion.island-view');", "const saved=localStorage.getItem('fusion.island-view');"))
edit('src/renderer/store/constants/islandTransition.ts',lambda s:s.replace('guide: 860 * 400','guide: 760 * 560'))

zh={'title':'首次使用','welcome':'欢迎来到浮屿','intro':'在桌面边缘，留一处对话、工具与灵感的空间。','skip':'稍后设置','back':'返回','next':'继续','start':'开始使用','progress':'第 {{current}} 步，共 {{total}} 步','dockTitle':'放在顺手的位置','dockHint':'选择停靠位置，设置随时唤出的快捷键。','ready':'随时开始','optional':'Agent 和语音可以稍后在设置中配置。','chat':'对话','chatHint':'打字或语音，草稿确认后发送','tools':'工具','toolsHint':'搜索入口，拖入文件继续处理','settings':'按你习惯','settingsHint':'角色、停靠与快捷键自由调整','saveError':'保存未成功，请重试。','reopen':'重新查看使用引导'}
en={'title':'Getting started','welcome':'Welcome to FloatIsland','intro':'A quiet place at the edge of your desktop for conversations, tools and ideas.','skip':'Set up later','back':'Back','next':'Continue','start':'Get started','progress':'Step {{current}} of {{total}}','dockTitle':'Keep it within reach','dockHint':'Choose an edge and shortcuts to bring your workspace back.','ready':'Make yourself at home','optional':'You can configure Agents and voice later in Settings.','chat':'Conversations','chatHint':'Type or speak; send when your draft is ready','tools':'Tools','toolsHint':'Search tools or drop files to continue','settings':'Your preferences','settingsHint':'Adjust your character, docking and shortcuts','saveError':'Could not save. Please try again.','reopen':'Show getting-started guide'}
for language,values,brand in [('zh-CN',zh,'浮屿'),('en-US',en,'FloatIsland')]:
    p=app/f'i18n/{language}.json';data=json.loads(p.read_text(encoding='utf-8'));data['fusion']['brand']=brand;data['fusion']['onboarding']=values
    data['fusion']['tray']={'show':'显示浮屿','hide':'隐藏浮屿','settings':'打开设置','top':'窗口置顶','logs':'打开日志文件夹','restart':'重启浮屿','quit':'退出'} if language=='zh-CN' else {'show':'Show FloatIsland','hide':'Hide FloatIsland','settings':'Open settings','top':'Always on top','logs':'Open logs folder','restart':'Restart FloatIsland','quit':'Quit'}
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def tray(s):
    s=s.replace('BrowserWindow, app, shell','BrowserWindow, app, shell, nativeTheme')
    s=s.replace("import { join }", "import {BRAND,brandName} from '../shared/brand';\nimport zh from '../../i18n/zh-CN.json';\nimport en from '../../i18n/en-US.json';\nimport { join }",1)
    s=re.sub(r"const TRAY_ICON_PATH = is.dev.*?;", "const trayIconPath = ():string => join(is.dev ? join(__dirname,'../../resources') : process.resourcesPath,nativeTheme.shouldUseDarkColors ? BRAND.trayLight : BRAND.trayDark);\nconst trayLanguage = ():string => {try {return String(JSON.parse(readFileSync(join(app.getPath('userData'),'eIsland_store','i18n-language.json'),'utf8')));}catch{return app.getLocale();}};\nconst t = (key:keyof typeof zh.fusion.tray):string => (trayLanguage().startsWith('zh')?zh:en).fusion.tray[key];\nconst updateTrayIcon = ():void => {tray?.setImage(nativeImage.createFromPath(trayIconPath()));tray?.setToolTip(brandName(trayLanguage()));};",s,count=1,flags=re.S)
    s=s.replace('nativeImage.createFromPath(TRAY_ICON_PATH)','nativeImage.createFromPath(trayIconPath())')
    for name,key in [('显示灵动岛','show'),('隐藏灵动岛','hide'),('打开配置界面','settings'),('窗口置顶','top'),('打开日志文件夹','logs'),('重启灵动岛','restart'),('退出','quit')]:s=s.replace("label: '"+name+"'","label: t('"+key+"')")
    s=s.replace("tray.setToolTip('FusionIsland');", "updateTrayIcon();\n  nativeTheme.removeListener('updated',updateTrayIcon);\n  nativeTheme.on('updated',updateTrayIcon);")
    s=s.replace('function destroyTray(): void {', "function destroyTray(): void {\n  nativeTheme.removeListener('updated',updateTrayIcon);")
    return s
edit('src/main/tray.ts',tray)

# Hook operation requires the GUI event loop; keep dependency load checks in Node mode.
edit('scripts/verify-packaged-runtime.cjs',lambda s:s.replace("const hook=load('uiohook-napi').uIOhook;hook.start();hook.stop();results.push({name:'uiohook native capture start/stop',loaded:true});", "const hook=load('uiohook-napi').uIOhook;if(typeof hook.start!=='function'||typeof hook.stop!=='function')throw Error('invalid-hook-addon');results.push({name:'uiohook addon exports',loaded:true});").replace("name:'uiohook native capture start/stop',loaded:false", "name:'uiohook addon exports',loaded:false"))
print('Mirrored side dock, guide translations and native tray integrated')
