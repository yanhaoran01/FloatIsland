/* FloatIsland - https://github.com/JNTMTMTM/eIsland. Copyright (C) 2026 contributors. GPL-3.0. */
/** @file FusionGuide.tsx @description Three-step optional guide in the retained main viewport. @author 鸡哥 */
import {useEffect, useRef, useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {ArrowLeft, ArrowRight, MessageSquare, Search, SlidersHorizontal} from 'lucide-react';
import mark from '../../assets/float-island.svg';
import type {OnboardingPatch, OnboardingState} from '../../../shared/onboarding';
import useIslandStore from '../../store/slices';
import {FusionPet} from './FusionPet';
import {useAdaptiveView} from './useCompactChatSize';
import './floatIsland.css';

/** Keeps permissions and Agent setup optional. @returns Guide content. */
export function FusionGuide(): JSX.Element {
  const {t, i18n} = useTranslation();
  const root = useRef<HTMLElement>(null);
  useAdaptiveView(root, true, 'guide');
  const [state, setState] = useState<OnboardingState | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saves = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void Promise.all([window.api.fusionOnboardingGet(), window.api.fusionDockGet(), window.api.fusionProductData()]).then(([saved, dock, data]) => {
      if(active&&(dock.shortcutError||data.hotkeyError))setError(t('fusion.dock.shortcutConflict'));
      if (active) setState({...saved, edge: saved.edge ?? dock.config.edge, recallShortcut: saved.recallShortcut ?? dock.config.shortcut, searchShortcut: saved.searchShortcut ?? data.hotkey});
    }).catch(() => {if (active) setError(t('fusion.onboarding.saveError'));});
    const off=window.api.onFusionOnboarding(value=>{if(active&&value.status==='pending'&&value.step===0)setState(old=>old?{...old,...value}:value);});
    return () => {active = false;off();};
  }, [t]);
  const update = (patch: OnboardingPatch): void => {
    setState(old => old ? {...old, ...patch} : old);
    saves.current = saves.current.then(async () => {await window.api.fusionOnboardingSave(patch);}).catch(() => setError(t('fusion.onboarding.saveError')));
  };
  const finish = async (status: 'completed' | 'skipped'): Promise<void> => {
    if (!state || busy) return;
    setBusy(true); setError('');
    try {
      await saves.current;
      if (status === 'completed') {
        const data = await window.api.fusionProductData();
        if (state.searchShortcut !== data.hotkey || data.hotkeyError) await window.api.fusionProductWrite({...data, hotkey: state.searchShortcut || ''},true);
        await window.api.fusionDockSave({edge: state.edge, shortcut: state.recallShortcut});
      }
      await window.api.fusionOnboardingFinish(status);
      localStorage.setItem('fusion.island-view', 'chat');
      useIslandStore.getState().setMaxExpandTab('aiChat');
      useIslandStore.getState().setMaxExpand();
    } catch (reason) {
      setError(String(reason).includes('shortcut') || String(reason).includes('hotkey') ? t('fusion.dock.shortcutConflict') : t('fusion.onboarding.saveError'));
      if (String(reason).includes('shortcut') || String(reason).includes('hotkey')) update({step: 1});
    } finally {setBusy(false);}
  };
  const step = state?.step ?? 0;
  return <section ref={root} className="float-guide" onClick={event => event.stopPropagation()} aria-label={t('fusion.onboarding.title')}>
    <header><span><img src={mark} alt=""/>{t('fusion.brand')}</span><button type="button" disabled={!state || busy} onClick={() => void finish('skipped')}>{t('fusion.onboarding.skip')}</button></header>
    <main className="float-guide-stage">
      {step === 0 && <><img className="float-guide-mark" src={mark} alt=""/><h1>{t('fusion.onboarding.welcome')}</h1><p>{t('fusion.onboarding.intro')}</p>
        <div className="float-guide-languages" role="group" aria-label={t('fusion.settings.language')}>{(['zh-CN', 'en-US'] as const).map(language => <button key={language} type="button" aria-pressed={i18n.language.startsWith(language.slice(0,2))} onClick={() => {void i18n.changeLanguage(language); void window.api.storeWrite('i18n-language', language);}}>{t(language === 'zh-CN' ? 'guide.language.zhCN' : 'guide.language.enUS')}</button>)}</div></>}
      {step === 1 && <><h1>{t('fusion.onboarding.dockTitle')}</h1><p>{t('fusion.onboarding.dockHint')}</p>
        <div className="float-guide-desktop" data-edge={state?.edge || 'top'} aria-hidden="true"><div className="float-guide-dock-preview"><span/><span/><span/></div></div>
        <div className="float-guide-edges" role="group" aria-label={t('fusion.dock.edge')}>{(['top','left','right'] as const).map(edge => <button key={edge} type="button" aria-pressed={state?.edge === edge} onClick={() => update({edge})}>{t('fusion.dock.' + edge)}</button>)}</div>
        <div className="float-guide-shortcuts"><label>{t('fusion.dock.shortcut')}<input disabled={!state || busy} value={state?.recallShortcut ?? ''} onChange={event => update({recallShortcut:event.target.value})}/></label><label>{t('fusion.product.hotkey')}<input disabled={!state || busy} value={state?.searchShortcut ?? ''} onChange={event => update({searchShortcut:event.target.value})}/></label></div></>}
      {step === 2 && <><div className="float-guide-companion"><FusionPet mood="idle" muted label={t('fusion.pet.idle')}/></div><h1>{t('fusion.onboarding.ready')}</h1><p>{t('fusion.onboarding.optional')}</p><div className="float-guide-capabilities">{[{key:'chat',icon:MessageSquare},{key:'tools',icon:Search},{key:'settings',icon:SlidersHorizontal}].map(item => <div key={item.key}><item.icon size={20} strokeWidth={1.6}/><strong>{t('fusion.onboarding.' + item.key)}</strong><small>{t('fusion.onboarding.' + item.key + 'Hint')}</small></div>)}</div></>}
    </main>
    {error && <p className="float-guide-error" role="alert">{error}</p>}
    <footer><button type="button" disabled={busy || !state || step === 0} aria-label={t('fusion.onboarding.back')} onClick={() => update({step:step === 2 ? 1 : 0})}><ArrowLeft size={16}/>{t('fusion.onboarding.back')}</button><div className="float-guide-dots" aria-label={t('fusion.onboarding.progress',{current:step + 1,total:3})}>{[0,1,2].map(index => <span key={index} data-active={index === step}/>)}</div><button type="button" className="float-guide-next" disabled={!state || busy} onClick={() => step === 2 ? void finish('completed') : update({step:step === 0 ? 1 : 2})}>{t(step === 2 ? 'fusion.onboarding.start' : 'fusion.onboarding.next')}<ArrowRight size={16}/></button></footer>
  </section>;
}
