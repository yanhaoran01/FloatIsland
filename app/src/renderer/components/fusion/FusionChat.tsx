/*
 * FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors
 * Licensed under GPL-3.0. See LICENSE.
 */

/** @file FusionChat.tsx @description Shared compact and full conversation views. @author 鸡哥 */
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, FolderOpen, Maximize2, Mic, Minus, Paperclip, Plus, RefreshCw, Settings, SlidersHorizontal, Square, X } from 'lucide-react';
import type { AssistantConversation, FusionProvider, WorkspaceTarget } from '../../../preload/types/fusionWorkspace';
import type { FusionCodexMessage } from '../../../preload/types/fusion';
import { useFusionActivity } from './fusionActivity';
import { useFusionDraft } from './useFusionDraft';
import { useCompactChatSize } from './useCompactChatSize';
import { getAgentAdapter, type AgentSession } from './agentAdapters';
import { useFusionVoice } from './useFusionVoice';
import {useProductStore} from './productStore';
import { useFusionPreferences } from './fusionPreferences';
import { FusionPet, usePetCompletion } from './FusionPet';
import { usePetFeedback } from './usePetFeedback';
import { FusionShortRequest } from './FusionShortRequest';
import {FusionSettings} from './FusionSettings';
import { MediaBar } from './MediaBar';
import { useMediaState } from './mediaState';
import { TOOL_GROUPS, TOOL_REGISTRY,resolveToolTarget } from './tools/toolRegistry';
import { Search } from 'lucide-react';
import { FusionToolsTab } from './FusionToolsTab';
import { NavigationWheel, isIslandWheelContent } from './navigation';
import { AssistantMarkdown } from '../states/maxExpand/components/agent/components/AssistantMarkdown';
import useIslandStore from '../../store/slices';
import './fusionIsland.css';
import './fusionTheme.css';
import './fusionLayout.css';

const providers: FusionProvider[] = ['codex', 'dsh', 'openai', 'anthropic', 'ollama'];
const providerLabels = { codex: 'codex', dsh: 'dsh', openai: 'custom', anthropic: 'anthropic', ollama: 'ollama' };
const remembered = (provider: FusionProvider): string => localStorage.getItem('fusion.session.' + provider) ||
  (provider === 'codex' ? localStorage.getItem('fusion.codex-active-thread') : provider === 'dsh' ? localStorage.getItem('fusion.dsh-active-session') : null) || '';

/** Renders the same live conversation in either a small island or the full workbench. */
export function FusionChat({ compact = false, visible = true }: { compact?: boolean; visible?: boolean }): JSX.Element {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<FusionProvider>(() => {
    const saved = localStorage.getItem('fusion.provider') as FusionProvider;
    return providers.includes(saved) ? saved : 'codex';
  });
  const [sessionId, setSessionId] = useState(() => remembered(provider));
  const adapter = useMemo(() => getAgentAdapter(provider), [provider]);
  const [localSessions, setLocalSessions] = useState<AgentSession[]>([]);
  const key = provider + ':' + (sessionId || 'new');
  const draft = useFusionDraft(key);
  const { codex, dsh } = useFusionActivity();
  const [assistant, setAssistant] = useState<AssistantConversation | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<import('../../../preload/types/fusionWorkspace').FusionModel[]>([]);
  const [modelsBusy, setModelsBusy] = useState(false);
  const modelGeneration = useRef(0);
  useEffect(() => { modelGeneration.current++; setModels([]); setModelsBusy(false); }, [provider]);
  const loadModels = async (): Promise<void> => {
    const generation = ++modelGeneration.current;
    setModelsBusy(true); setError('');
    try { const available = await window.api.fusionModels(provider); if (generation === modelGeneration.current) setModels(available); }
    catch (reason) { if (generation === modelGeneration.current) setError(String(reason)); }
    finally { if (generation === modelGeneration.current) setModelsBusy(false); }
  };
  const modelKey = (model?: import('../../../preload/types/fusionWorkspace').FusionModel): string => model ? JSON.stringify([model.provider || '', model.id]) : '';
  const modelOptions = draft.value.model && !models.some(m => modelKey(m) === modelKey(draft.value.model)) ? [draft.value.model, ...models] : models;
  const [dragging, setDragging] = useState(false);
  const [islandView, setIslandView] = useState<'chat' | typeof TOOL_GROUPS[number]>(() => { const saved=localStorage.getItem('fusion.island-view'); return TOOL_GROUPS.includes(saved as typeof TOOL_GROUPS[number]) ? saved as typeof TOOL_GROUPS[number] : 'chat'; });
  const [toolRequest, setToolRequest] = useState<{id:string;nonce:number}|null>(null);
  const [toolsOpened, setToolsOpened] = useState(islandView !== 'chat');
  const [setupOpen, setSetupOpen] = useState(false);
  const setup = useRef<HTMLDivElement>(null);
  const media = useMediaState().find(item => item.active);
  const wheel = useRef(new NavigationWheel());
  const selectView = (view: 'chat' | typeof TOOL_GROUPS[number]): void => {
    if(compact)useIslandStore.getState().setMaxExpandTab('aiChat');
    setSetupOpen(false); setToolRequest(view === 'chat' ? null : { id: 'home', nonce: Date.now() });
    if (view !== 'chat') voice.cancel();
    if (view === 'chat') void window.api.fusionMediaCommand('pause').catch(reason => setError(String(reason)));
    setIslandView(view); localStorage.setItem('fusion.island-view', view);
    if (view !== 'chat') setToolsOpened(true);
  };
  const productNonce=useProductStore(s=>s.nonce);
  useEffect(()=>{const product=useProductStore.getState();if(!compact||!product.target)return;const tool=TOOL_REGISTRY.find(item=>item.id===product.target);if(tool){selectView(tool.group);setToolRequest({id:tool.id,nonce:product.nonce});}},[compact,productNonce]);
  useEffect(() => { if (!compact) return; const open = (event: Event): void => { const id=(event as CustomEvent<string>).detail,route=resolveToolTarget(id); const tool=TOOL_REGISTRY.find(item=>item.id===route.id); if(tool){const product=useProductStore.getState();product.set({target:route.id,tab:route.tab||(product.target===route.id?product.tab:''),nonce:Date.now()});selectView(tool.group);setToolRequest({id,nonce:product.nonce+1});} }; window.addEventListener('fusion-open-tool', open); return () => window.removeEventListener('fusion-open-tool', open); }, [compact, islandView]);
  useEffect(()=>{if(!compact)return;const navigate=(event:Event):void=>{const id=(event as CustomEvent<string>).detail;if(id==='chat'||TOOL_GROUPS.some(group=>group===id))selectView(id as 'chat'|typeof TOOL_GROUPS[number]);};window.addEventListener('fusion-navigate-peer',navigate);return()=>window.removeEventListener('fusion-navigate-peer',navigate);},[compact,islandView]);
  const preferences = useFusionPreferences(s => s.value);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  useCompactChatSize(root, compact && visible);
  const scroll = useRef(new Map<string, number>());
  const workspaceTab = useIslandStore(s => s.maxExpandTab);
  const islandSettings=compact&&workspaceTab==='settings';
  const voice = useFusionVoice(provider, key, visible && (compact ? islandView === 'chat'&&!islandSettings : workspaceTab === 'aiChat'), draft.value.text, draft.version, text => draft.update({ text }));
  const voiceFocused = voice.phase !== 'idle';
  const voicePage = compact && islandView === 'chat' && !islandSettings;
  useEffect(() => { if (visible && (voicePage || !compact && workspaceTab === 'aiChat')) void window.api.fusionMediaCommand('pause').catch(reason => setError(String(reason))); }, [visible, voicePage, compact, workspaceTab]);
  useEffect(() => { if (!setupOpen) return; const outside = (event: PointerEvent): void => { if (!setup.current?.contains(event.target as Node)) setSetupOpen(false); }; document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside); }, [setupOpen]);
  const voiceTime = Math.floor(voice.elapsed / 60).toString().padStart(2, '0') + ':' + (voice.elapsed % 60).toString().padStart(2, '0');
  const voiceStateKey = !voice.status ? 'checking' : voice.status.ready ? 'ready' :
    ({ 'dsh-disconnected': 'disconnected', 'dsh-voice-not-enabled': 'notEnabled', unprepared: 'modelMissing', preparing: 'preparing', failed: 'failed', cancelled: 'modelMissing' } as Record<string, string>)[voice.status.reason || ''] || 'unavailable';
  const agent = provider === 'codex' ? codex : provider === 'dsh' ? dsh : null;
  const state = agent?.sessionStates?.[sessionId];
  const messages: FusionCodexMessage[] = state?.messages || (assistant?.key === key ? assistant.messages : []);
  const working = state?.working || (assistant?.key === key && assistant.working) || false;
  const currentError = state?.error || (assistant?.key === key ? assistant.error : null);
  const hasSession = Boolean(sessionId);
  const sessions = provider === 'codex' ? codex?.threads.map(s => ({ id: s.id, title: s.name || s.preview || s.id })) :
    provider === 'dsh' ? dsh?.sessions.map(s => ({ id: s.id, title: s.title || s.cwd || s.id })) : localSessions;
  const pending = (codex?.pendingRequests.length || 0) + (dsh?.pendingRequests.length || 0);
  const completion = usePetCompletion(working, Boolean(currentError), preferences.muted || !visible, key, visible && (compact ? islandView === 'chat' : workspaceTab === 'aiChat'));
  const productJobs=useProductStore(s=>s.jobs);
  const productWaiting=Object.values(productJobs).some(job=>job.state==='waiting');
  const productWorking=Object.values(productJobs).some(job=>job.state==='running');
  const mood = pending||productWaiting ? 'waiting' : working||productWorking ? 'working' : currentError ? 'error' : completion.finished ? 'finished' : 'idle';
  const companionMood = voice.phase === 'recording' ? 'listening' : voice.phase === 'permission' || voice.phase === 'transcribing' ? 'thinking' : voice.error || error || currentError ? 'error' : working ? 'thinking' : mood;
  const latest = messages.filter(item => item.role !== 'tool').at(-1);
  const feedback = usePetFeedback({ session: key, message: messages.filter(item => item.role === 'assistant').at(-1), working, priority: companionMood, active: visible && (compact ? islandView === 'chat' : workspaceTab === 'aiChat') });
  const heroMood = ['idle', 'finished'].includes(companionMood) && feedback.reaction !== 'idle' ? feedback.reaction : companionMood;
  const displayed = compact ? (latest ? [latest] : []) : messages;
  const setSelection = (next: FusionProvider, id = remembered(next)): void => {
    voice.cancel(); setProvider(next); setSessionId(id); setError('');
    localStorage.setItem('fusion.provider', next);
    localStorage.setItem('fusion.session.' + next, id);
  };
  const route = (target: WorkspaceTarget): void => {
    if (!target.sessionKey) return;
    const colon = target.sessionKey.indexOf(':');
    const next = target.sessionKey.slice(0, colon) as FusionProvider;
    if (providers.includes(next)) setSelection(next, target.sessionKey.slice(colon + 1).replace(/^new$/, ''));
  };
  useEffect(() => {
    if (provider === 'codex' || provider === 'dsh') return;
    let active = true;
    void adapter.list().then(value => { if (active) setLocalSessions(value); }).catch(reason => { if (active) setError(String(reason)); });
    const stop = window.api.onFusionAssistantConversation(value => {
      if (!active || !value.key.startsWith(provider + ':')) return;
      const id = value.key.slice(provider.length + 1);
      const session: AgentSession = { id, key: value.key, project: '',
        title: value.messages.find(message => message.role === 'user')?.text.slice(0, 80) || id,
        messages: [], working: value.working };
      setLocalSessions(previous => [session, ...previous.filter(item => item.id !== id)]);
    });
    return () => { active = false; stop(); };
  }, [adapter, provider]);
  useEffect(() => {
    const stop = window.api.onWorkspaceTarget(route);
    const select = (event: Event): void => {
      const next = (event as CustomEvent).detail as FusionProvider;
      if (providers.includes(next)) setSelection(next);
    };
    window.addEventListener('fusion-select-provider', select);
    if (!compact) void window.api.workspaceTarget().then(route);
    return () => { stop(); window.removeEventListener('fusion-select-provider', select); };
  }, [compact]);
  useEffect(() => {
    if (provider === 'codex' || provider === 'dsh' || !sessionId) { setAssistant(null); return; }
    let active = true;
    const stop = window.api.onFusionAssistantConversation(value => { if (active && value.key === key) setAssistant(value); });
    void window.api.fusionAssistantConversation(key).then(value => { if (active) setAssistant(value); }).catch(reason => setError(String(reason)));
    return () => { active = false; stop(); };
  }, [key, provider, sessionId]);
  useEffect(() => {
    const element = feed.current; if (!element) return;
    element.scrollTop = scroll.current.get(key) || 0;
  }, [key]);
  useEffect(() => {
    const element = feed.current;
    if (visible && element && element.scrollHeight - element.scrollTop - element.clientHeight < 180) element.scrollTop = element.scrollHeight;
  }, [messages.at(-1)?.text, visible]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const createSession = (): Promise<void> => run(async () => {
    let cwd = draft.value.project;
    if (provider === 'codex' || provider === 'dsh') {
      if (!cwd) cwd = await window.api.fusionSelectProject() || '';
      if (!cwd) return;
    }
    const result = await adapter.create(cwd);
    const nextKey = provider + ':' + result.id;
    const initial = await window.api.fusionDraftGet(nextKey);
    await window.api.fusionDraftWrite(nextKey, initial.revision, { text: hasSession ? '' : draft.value.text, attachments: hasSession ? [] : draft.value.attachments, project: cwd, ...(draft.value.model ? { model: draft.value.model } : {}) });
    setSelection(provider, result.id);
  });
  const selectSession = (id: string): Promise<void> => run(async () => {
    if (!id) return;
    await adapter.resume(id);
    setSelection(provider, id);
  });
  const attach = async (files: FileList | File[]): Promise<void> => {
    const additions: import('../../../preload/types/fusionWorkspace').FusionAttachment[] = [];
    for (const file of Array.from(files).slice(0, 5 - draft.value.attachments.length)) {
      if (file.size > 400_000) { setError(t('fusion.attachments.fileTooLarge', { name: file.name })); continue; }
      const text = await file.text();
      if (text.includes('\0')) { setError(t('fusion.attachments.notText', { name: file.name })); continue; }
      additions.push({ id: crypto.randomUUID(), name: file.name, size: file.size, text });
    }
    draft.update({ attachments: [...draft.value.attachments, ...additions] });
  };
  const send = (): Promise<void> => run(async () => {
    if (!hasSession || working) return;
    const submission = await draft.consume();
    if (!submission) return;
    const sent = submission.value;
    const text = [...sent.attachments.map(a => '<attachment name="' + a.name.replace(/[<>"]/g, '_') + '">\n' + a.text + '\n</attachment>'), sent.text.trim()].filter(Boolean).join('\n\n');
    if (!text) return;
    try {
      await adapter.send(sessionId, text, sent.model);
    } catch (reason) {
      await submission.restore();
      throw reason;
    }
  });
  const stopTask = (): Promise<void> => run(async () => {
    feedback.cancel();
    completion.suppressNextFinish();
    await adapter.cancel(sessionId);
  });
  const openFull = (): Promise<void> => run(async () => {
    if (await draft.flush()) { voice.cancel(); await window.api.openWorkspace({ tab: 'aiChat', sessionKey: key }); }
  });

  return <section ref={root} className={'fusion-chat' + (compact ? ' fusion-chat--compact' : '') + (dragging ? ' is-file-drop-active' : '') + (voiceFocused ? ' is-voice-focused' : '')} data-voice-focused={voicePage} data-island-page={compact ? islandView : undefined}
    onWheel={event => {
      if (!compact || !preferences.wheelNavigation || event.ctrlKey || isIslandWheelContent(event.target)) return;
      event.stopPropagation();
      const tabs = ['chat', ...TOOL_GROUPS] as const;
      const index = tabs.indexOf(islandView);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.current?.clientHeight || 400 : 1);
      const next = wheel.current.move(index, tabs.length, delta, performance.now());
      if (next !== index) selectView(tabs[next]);
    }}
    onClick={event => event.stopPropagation()} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={event => { setDragging(false); if ((event.target as Element).closest('.fusion-tool-content')) return;
      // Shared product drop handling owns files outside a specific tool.
      return; }}>
    <header className="fusion-chat-header">
      <FusionPet mood={mood} label={t('fusion.pet.' + mood)} muted={preferences.muted} dropActive={dragging} attachmentCount={draft.value.attachments.length} />
      {compact ? <>
        <nav className="fusion-island-tabs" aria-label={t('fusion.island.navigation')}>
          {(['chat', ...TOOL_GROUPS] as const).map((view, index) => <button type="button" key={view} aria-pressed={islandView === view}
            onClick={() => selectView(view)} onKeyDown={event => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault(); const tabs = ['chat', ...TOOL_GROUPS] as const;
              const next = Math.max(0, Math.min(tabs.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1))); selectView(tabs[next]);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
            }}>{t(view === 'chat' ? 'fusion.island.chat' : 'fusion.toolbox.groups.' + view)}</button>)}
        </nav>
        <div className="fusion-session-menu" ref={setup}>
          <button type="button" className="fusion-icon-button" aria-label={t('fusion.focus.sessionMenu')} title={t('fusion.focus.sessionMenu')} aria-expanded={setupOpen} onClick={() => setSetupOpen(!setupOpen)}><SlidersHorizontal size={14} /></button>
          {setupOpen && <div className="fusion-session-popover" role="dialog" aria-label={t('fusion.focus.sessionMenu')} onKeyDown={event => { if (event.key === 'Escape') setSetupOpen(false); }}>
            <label>{t('fusion.provider.select')}<select disabled={voiceFocused} value={provider} onChange={event => setSelection(event.target.value as FusionProvider)}>{providers.map(id => <option key={id} value={id}>{t('fusion.provider.' + providerLabels[id])}</option>)}</select></label>
            <label>{t('fusion.sessions.label')}<select value={sessionId} disabled={busy} onChange={event => void selectSession(event.target.value)}><option value="">{t('fusion.sessions.chooseProvider', { provider: t('fusion.provider.' + providerLabels[provider]) })}</option>{sessionId && !sessions?.some(item => item.id === sessionId) && <option value={sessionId}>{sessionId}</option>}{sessions?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label>{t('fusion.models.label')}<select value={modelKey(draft.value.model)} disabled={working || busy} onFocus={() => { if (!models.length && !modelsBusy) void loadModels(); }} onChange={event => draft.update({ model: modelOptions.find(model => modelKey(model) === event.target.value) })}><option value="">{t('fusion.models.inherit')}</option>{modelOptions.map(model => <option key={modelKey(model)} value={modelKey(model)}>{model.name}</option>)}</select></label>
            <div className="fusion-tool-actions"><button disabled={busy} onClick={() => void createSession()}><Plus size={14} />{t('fusion.sessions.new')}</button><button onClick={() => void run(async () => { const project = await window.api.fusionSelectProject(); if (project) draft.update({ project }); })}><FolderOpen size={14} />{t('fusion.project.choose')}</button><button aria-label={t('fusion.navigation.settings')} onClick={() => {setSetupOpen(false);if(compact)useIslandStore.getState().setMaxExpandTab('settings');else void window.api.openWorkspace({ tab: 'settings', settingsSection: 'navigation' });}}><Settings size={14} /></button></div>
          </div>}
        </div>
        <button type="button" className="fusion-icon-button" aria-label={t("fusion.product.search")} title={t("fusion.product.search")} onClick={()=>window.dispatchEvent(new Event("fusion-product-search"))}><Search size={15}/></button>
        <button type="button" className="fusion-icon-button" title={t('fusion.entry.openFull')} aria-label={t('fusion.entry.openFull')} onClick={() => void openFull()}><Maximize2 size={14} /></button>
        <button type="button" className="fusion-icon-button" title={t('fusion.navigation.collapse')} aria-label={t('fusion.navigation.collapse')} onClick={() => { voice.cancel(); useIslandStore.getState().setIdle(true); }}><Minus size={15} /></button>
      </> : <><select aria-label={t('fusion.provider.select')} value={provider} onChange={event => setSelection(event.target.value as FusionProvider)}>{providers.map(id => <option key={id} value={id}>{t('fusion.provider.' + providerLabels[id])}</option>)}</select><span className="fusion-chat-status">{t(mood === 'idle' ? 'fusion.entry.idle' : 'fusion.status.' + mood)}</span></>}
    </header>
    {islandSettings&&<div className="fusion-island-settings"><FusionSettings/></div>}
    {(voicePage || voiceFocused) && <div className="fusion-voice-focus" role="region" aria-label={t('fusion.voice.start')} data-phase={voice.phase}>
      <div className="fusion-focus-companion" data-recording={voice.phase === 'recording'}>
        <FusionPet mood={heroMood} label={t('fusion.pet.' + heroMood)} muted={preferences.muted} disabled={voiceFocused} />
        <div className="fusion-companion-listening" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} style={{ height: `${5 + voice.level * (index % 2 ? 28 : 42)}px` }} />)}</div>
      </div>
      {latest && <div className="fusion-focus-reply" aria-live="off">{latest.role === 'assistant' ? <AssistantMarkdown content={latest.text} previewLinks={false} /> : <p>{latest.text}</p>}</div>}
      {voiceFocused && <span className="fusion-voice-time" aria-label={t('fusion.voice.elapsed')}>{voiceTime}</span>}
      {(error || currentError || draft.error || voice.error) && <p className="fusion-focus-error" role="alert">{error || currentError || draft.error || voice.error}</p>}
      {draft.conflict && <div className="fusion-tool-actions"><button onClick={() => draft.resolve(true)}>{t('fusion.entry.keepMine')}</button><button onClick={() => draft.resolve(false)}>{t('fusion.entry.useLatest')}</button></div>}
      {voice.pending && <div className="fusion-inline-notice"><p>{voice.pending}</p><div className="fusion-tool-actions"><button onClick={voice.insertPending}>{t('fusion.voice.insert')}</button><button onClick={voice.discardPending}>{t('fusion.voice.discard')}</button></div></div>}
      <div className="fusion-focus-input">
      <textarea className="fusion-voice-draft" rows={2} placeholder={t('fusion.composer.placeholder')} aria-label={t('fusion.composer.placeholder')} value={draft.value.text} onChange={event => draft.update({ text: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!voiceFocused && !voice.pending) void send(); } }} />
      <div className="fusion-voice-controls">
        {voiceFocused && <button type="button" className="fusion-icon-button" aria-label={t('fusion.voice.cancel')} title={t('fusion.voice.cancel')} onClick={voice.cancel}><X size={16} /></button>}
        <button type="button" className="fusion-focus-mic" disabled={voice.phase === 'permission' || voice.phase === 'transcribing'} aria-label={t(voice.phase === 'recording' ? 'fusion.voice.stop' : 'fusion.voice.start')} title={t(voice.phase === 'recording' ? 'fusion.voice.stop' : 'fusion.voice.start')} onClick={() => void (voice.phase === 'recording' ? voice.stop() : voice.start())}>{voice.phase === 'recording' ? <Square size={17} /> : <Mic size={19} />}</button>
        <span className="fusion-focus-control-space" />
        {working ? <button type="button" className="fusion-icon-button" aria-label={t('fusion.actions.stop')} title={t('fusion.actions.stop')} onClick={() => void stopTask()}><Square size={15} /></button> : <button type="button" className="fusion-icon-button" disabled={busy || voiceFocused || !draft.ready || draft.conflict || !hasSession || !draft.value.text.trim()} aria-label={t('fusion.actions.send')} title={t('fusion.actions.send')} onClick={() => void send()}><ArrowUp size={17} /></button>}
      </div>
      </div>
      <span className="fusion-screenreader" role="status">{voiceFocused ? t('fusion.voice.' + voice.phase) : ''}</span>
    </div>}
    <div className="fusion-chat-body" hidden={compact || voiceFocused}>

    <div className="fusion-chat-context">
      <select aria-label={t('fusion.sessions.label')} value={sessionId} disabled={busy}
        onChange={event => void selectSession(event.target.value)}>
        <option value="">{t('fusion.sessions.chooseProvider', { provider: t('fusion.provider.' + providerLabels[provider]) })}</option>
        {sessionId && !sessions?.some(s => s.id === sessionId) && <option value={sessionId}>{sessionId}</option>}
        {sessions?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>
      <button type="button" className="fusion-icon-button" aria-label={t('fusion.project.choose')} title={draft.value.project || t('fusion.project.choose')}
        onClick={() => void run(async () => { const project = await window.api.fusionSelectProject(); if (project) draft.update({ project }); })}><FolderOpen size={15} /></button>
      <button type="button" className="fusion-small-action" disabled={busy} onClick={() => void createSession()}><Plus size={14} />{t('fusion.sessions.new')}</button>
    </div>
    {compact && <FusionShortRequest />}
    <div className="fusion-chat-model">
      <label htmlFor="fusion-chat-model">{t('fusion.models.label')}</label>
      <select id="fusion-chat-model" value={modelKey(draft.value.model)} disabled={working || busy || !draft.ready}
        onFocus={() => { if (!models.length && !modelsBusy) void loadModels(); }}
        onChange={event => draft.update({ model: modelOptions.find(m => modelKey(m) === event.target.value) })}>
        <option value="">{t('fusion.models.inherit')}</option>
        {modelOptions.map(model => <option key={modelKey(model)} value={modelKey(model)}>{model.name}</option>)}
      </select>
      <button type="button" className="fusion-icon-button" disabled={modelsBusy || working} onClick={() => void loadModels()}
        aria-label={t('fusion.models.refresh')} title={t('fusion.models.refresh')}><RefreshCw size={14} /></button>
      {modelsBusy && <span role="status">{t('fusion.models.loading')}</span>}
    </div>
    <div className="fusion-chat-feed" ref={feed} onScroll={event => scroll.current.set(key, event.currentTarget.scrollTop)}>
      <div className="fusion-chat-feed-content">
      {!displayed.length && <div className="fusion-chat-empty">{t(hasSession ? 'fusion.entry.ready' : 'fusion.entry.createHint')}</div>}
      {displayed.map(message => <article key={message.id} className={'fusion-message fusion-message--' + message.role}>
        {message.role === 'assistant' ? <AssistantMarkdown content={message.text} previewLinks={false} /> : <p>{message.text}</p>}
      </article>)}
      {working && <p className="fusion-chat-progress" role="status">{messages.filter(m => m.role === 'tool').at(-1)?.text || t('fusion.status.working')}</p>}
      </div>
    </div>
    {(error || currentError || draft.error || voice.error) && <p className="fusion-chat-error" role="alert">{error || currentError || draft.error || voice.error}</p>}
    {draft.conflict && <div className="fusion-inline-notice">{t('fusion.entry.draftConflict')}
      <button onClick={() => draft.resolve(true)}>{t('fusion.entry.keepMine')}</button><button onClick={() => draft.resolve(false)}>{t('fusion.entry.useLatest')}</button></div>}
    {voice.pending && <div className="fusion-inline-notice"><p>{voice.pending}</p>
      <button onClick={voice.insertPending}>{t('fusion.voice.insert')}</button><button onClick={voice.discardPending}>{t('fusion.voice.discard')}</button></div>}
    <div className="fusion-chat-attachments">{draft.value.attachments.map(file => <button key={file.id} onClick={() => draft.update({ attachments: draft.value.attachments.filter(a => a.id !== file.id) })}>{file.name}<X size={12} /></button>)}</div>
    <div className="fusion-chat-composer">
      <textarea aria-label={t('fusion.composer.placeholder')} placeholder={t('fusion.composer.placeholder')} value={draft.value.text} rows={compact ? 2 : 3}
        onChange={event => draft.update({ text: event.target.value })} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy && !working && hasSession) void send(); }
        }} />
      <div className="fusion-chat-actions">
        <input hidden type="file" multiple ref={input} onChange={event => { if (event.target.files) void run(() => attach(event.target.files!)); event.target.value = ''; }} />
        <button type="button" className="fusion-icon-button" aria-label={t('fusion.attachments.add')} title={t('fusion.attachments.add')} onClick={() => input.current?.click()}><Paperclip size={16} /></button>
        <button type="button" className={'fusion-icon-button' + (voice.phase !== 'idle' ? ' is-recording' : '')}
          disabled={voice.phase === 'permission' || voice.phase === 'transcribing' || !voice.status?.ready}
          title={t(voice.phase === 'recording' ? 'fusion.voice.stop' : voice.status?.ready ? 'fusion.voice.start' : 'fusion.voice.unavailable')} aria-label={t(voice.phase === 'recording' ? 'fusion.voice.stop' : 'fusion.voice.start')}
          onClick={() => void (voice.phase === 'recording' ? voice.stop() : voice.start())}>
          {voice.phase === 'recording' ? <Square size={16} /> : <Mic size={16} />}
        </button>
        {voice.phase !== 'idle' ? <><span role="status">{t('fusion.voice.' + voice.phase)}</span><button onClick={voice.cancel}>{t('fusion.voice.cancel')}</button></> :
          provider === 'dsh' ? <span className="fusion-voice-state" role="status">{t('fusion.voice.' + voiceStateKey)}
            {!voice.status?.ready && <button className="fusion-voice-hint" title={voice.status?.reason}
              onClick={() => void run(() => window.api.fusionIntegrationOpen('dsh'))}>{t('fusion.voice.dshSetup')}</button>}</span> : null}
        <div className="fusion-chat-spacer" />
        {!compact && provider !== 'codex' && provider !== 'dsh' && <button onClick={() => {
          localStorage.setItem('fusion.settings-model', provider); useIslandStore.getState().setMaxExpandTab('settings');
          window.dispatchEvent(new CustomEvent('fusion-open-model-settings', { detail: provider }));
        }}>{t('fusion.navigation.settings')}</button>}
        {working ? <button className="fusion-send" onClick={() => void stopTask()} aria-label={t('fusion.actions.stop')}><Square size={16} /></button> :
          <button className="fusion-send" disabled={busy || !draft.ready || draft.conflict || !hasSession || (!draft.value.text.trim() && !draft.value.attachments.length)}
            onClick={() => void send()} aria-label={t('fusion.actions.send')}><ArrowUp size={17} /></button>}
      </div>
    </div>
    </div>
    {compact && !islandSettings && !voicePage && !voiceFocused && media && <MediaBar />}
    {compact && toolsOpened && <div className="fusion-island-tools" hidden={islandSettings || voiceFocused || islandView === 'chat'}><FusionToolsTab group={islandView === 'chat' ? 'common' : islandView} compact request={toolRequest} /></div>}
  </section>;
}
