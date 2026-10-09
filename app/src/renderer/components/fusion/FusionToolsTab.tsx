/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file FusionToolsTab.tsx @description 小图标分页、跨组搜索与保留状态的直达工具。 @author 鸡哥 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavigationWheel } from './navigation';
import { TOOL_GROUPS, TOOL_REGISTRY, resolveToolTarget } from './tools/toolRegistry';
import { useProductStore } from './productStore';
import './product.css';
type Group = typeof TOOL_GROUPS[number];
/** 所有入口共享注册表；隐藏的工具保留草稿和处理中任务。 */
export function FusionToolsTab({ group: externalGroup, compact = false, request }: { group?: Group; compact?: boolean; request?: { id: string; nonce: number } | null } = {}) {
  const { t } = useTranslation();
  const [view, setView] = useState('home');
  const query=useProductStore(s=>s.query),setQuery=(query:string):void=>useProductStore.getState().set({query});
  const [visited, setVisited] = useState<string[]>([]);
  const product=useProductStore();
  useEffect(()=>{if(!product.target)return;const target=resolveToolTarget(product.target);if(TOOL_REGISTRY.some(tool=>tool.id===target.id))setView(target.id);},[product.nonce]);
  const [group, setGroup] = useState<Group>(() => { const saved=localStorage.getItem('fusion.workbench-group'); return TOOL_GROUPS.includes(saved as Group) ? saved as Group : 'common'; });
  const [pageByGroup,setPageByGroup]=useState<Record<string,number>>({});
  const wheel = useRef(new NavigationWheel());
  useEffect(() => { if (view !== 'home') setVisited(old => old.includes(view) ? old : [...old, view]); }, [view]);
  useEffect(() => { if (externalGroup) { setGroup(externalGroup); setView('home'); } }, [externalGroup]);
  useEffect(() => { if (request && (request.id === 'home' || TOOL_REGISTRY.some(tool => tool.id === resolveToolTarget(request.id).id))) { setView(resolveToolTarget(request.id).id); if (request.id === 'home') setQuery(''); } }, [request, externalGroup]);
  useEffect(() => {
    if (compact) return;
    const open = (event: Event): void => { const id = (event as CustomEvent<string>).detail; const target=resolveToolTarget(id);if (TOOL_REGISTRY.some(tool => tool.id === target.id)) {product.set({target:target.id,tab:target.tab,nonce:Date.now()});setView(target.id);} };
    window.addEventListener('fusion-open-tool', open); return () => window.removeEventListener('fusion-open-tool', open);
  }, [compact]);
  useEffect(() => {
    if (compact) return;
    const selectGroup = (event: Event): void => { const id=(event as CustomEvent<Group>).detail; if (TOOL_GROUPS.includes(id)) { setGroup(id); setView('home'); setQuery(''); } };
    window.addEventListener('fusion-select-tool-group', selectGroup); return () => window.removeEventListener('fusion-select-tool-group', selectGroup);
  }, [compact]);
  const tool = TOOL_REGISTRY.find(item => item.id === view);
  const pages = view !== 'home' && !visited.includes(view) ? [...visited, view] : visited;
  const select=(id:string):void=>{setView(id);product.set({target:id,tab:'',nonce:Date.now()});};
  const filtering = query.trim().toLowerCase();
  const matches=TOOL_REGISTRY.filter(item=>(Boolean(filtering)||item.group===group)&&[t(item.label),item.description?t(item.description):'',item.keywords].join(' ').toLowerCase().includes(filtering));
  const pageKey=filtering?'search':group,count=Math.max(1,Math.ceil(matches.length/8)),page=Math.min(pageByGroup[pageKey]??0,count-1);
  const changePage=(next:number):void=>setPageByGroup(old=>({...old,[pageKey]:Math.max(0,Math.min(count-1,next))}));
  const turn=(direction:number):void=>{
    if(page+direction>=0&&page+direction<count){changePage(page+direction);return;}
    if(filtering)return;
    const peers=['chat',...TOOL_GROUPS],next=peers[peers.indexOf(group)+direction];
    if(next)window.dispatchEvent(new CustomEvent('fusion-navigate-peer',{detail:next}));
  };
  return <section className={'fusion-tools-panel' + (compact ? ' is-minimal' : '')} data-tool-id={view === 'home' ? 'home-' + group : view} data-layout={tool?.layout || 'adaptive'} data-tool-width={view === 'home' ? 560 : tool?.width || 560} aria-label={t('fusion.tools.title')}>
    <header className="fusion-tools-heading">
      {view !== 'home' && <button className="fusion-icon-button" type="button" onClick={() => setView('home')} aria-label={t('fusion.tools.back')} title={t('fusion.tools.back')}><ArrowLeft size={14} /></button>}
      {view === 'home' && <label className="fusion-tool-search"><button className="fusion-icon-button" type="button" aria-label={t("fusion.product.search")} onClick={()=>window.dispatchEvent(new Event("fusion-product-search"))}><Search size={13} /></button><input aria-label={t('fusion.toolbox.search')} placeholder={t('fusion.toolbox.search')} value={query} onChange={event => {setQuery(event.target.value);setPageByGroup(old=>({...old,search:0}));}} /></label>}
    </header>
    {view === 'home' && <div className="fusion-tools-home fusion-natural-content" onWheel={event=>{
      if(event.ctrlKey||(event.target as Element).closest('input,textarea,select,[contenteditable=true]'))return;
      event.stopPropagation();const next=wheel.current.move(1,3,event.deltaY*(event.deltaMode===1?16:1),performance.now());
      if(next!==1)turn(next-1);
    }} onKeyDown={event=>{if((event.target as Element).closest('input,textarea,select'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();turn(event.key==='ArrowLeft'?-1:1);}}}>
      <section className="fusion-tool-group"><div className="fusion-tool-grid">
        {matches.slice(page*8,page*8+8).map(item=><button className="fusion-tool-card" key={item.id} data-tool={item.id} onClick={()=>select(item.id)}><span><item.icon size={20} strokeWidth={1.6}/></span><strong>{t(item.label)}</strong></button>)}
      </div></section>
      {count>1&&<nav className="fusion-tool-pagination" aria-label={t('fusion.toolbox.pages')}>
        <button className="fusion-icon-button" disabled={page===0} aria-label={t('fusion.toolbox.previousPage')} onClick={()=>changePage(page-1)}><ChevronLeft size={14}/></button>
        {Array.from({length:count},(_,index)=><button className="fusion-tool-page-dot" key={index} aria-current={page===index?'page':undefined} aria-label={t('fusion.toolbox.page',{page:index+1})} onClick={()=>changePage(index)}/>)}
        <button className="fusion-icon-button" disabled={page===count-1} aria-label={t('fusion.toolbox.nextPage')} onClick={()=>changePage(page+1)}><ChevronRight size={14}/></button>
      </nav>}
      {!matches.length&&<p className="fusion-tool-empty">{t('fusion.toolbox.noResults')}</p>}
    </div>}
    {pages.map(id => { const Component = TOOL_REGISTRY.find(item => item.id === id)?.component; return <div key={id} className="fusion-tool-content fusion-page" hidden={id !== view}><div className="fusion-natural-content"><Suspense fallback={<div className="fusion-tool-loading" role="status" aria-label={t('maxExpand.loading')} />}>{Component && <Component />}</Suspense></div></div>; })}
  </section>;
}
