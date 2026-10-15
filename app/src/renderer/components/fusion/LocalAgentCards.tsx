/* FloatIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file LocalAgentCards.tsx @description Local Agent availability and observed sessions. */
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { AppWindow, Bot, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { FusionEchoCodexSession, FusionEchoCodexSessionsSnapshot, FusionLocalAgent } from '../../../preload/types/fusion';
import { FusionProviderIcon } from './FusionResourceIcon';
import './localAgentCards.css';

const NAMES: Record<string, string> = { claude: 'Claude Code', 'claude-code': 'Claude Code', workbuddy: 'WorkBuddy', kimi: 'Kimi Code', gemini: 'Gemini CLI', glm: 'GLM CLI', openclaw: 'OpenClaw', cursor: 'Cursor', vscode: 'VS Code', trae: 'Trae' };
const canonical = (source: string): string => source === 'claude-code' ? 'claude' : source;

/** Program presence and restored history never imply a running Agent turn. */
export function LocalAgentCards({ snapshot, onError }: { snapshot: FusionEchoCodexSessionsSnapshot | null; onError: (error: string) => void }): JSX.Element {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [focusing, setFocusing] = useState('');
  const agents = new Map<string, FusionLocalAgent>((snapshot?.agents || []).map(agent => [canonical(agent.source), agent]));
  for (const source of ['claude', 'workbuddy', 'kimi']) if (!agents.has(source)) agents.set(source, { source, name: NAMES[source], installed: false, configured: false });
  const groups = new Map<string, FusionEchoCodexSession[]>();
  for (const session of snapshot?.sessions || []) {
    const source = canonical(session.source);
    if (['codex', 'codex-cli', 'dsh'].includes(source)) continue;
    if (!agents.has(source)) agents.set(source, { source, name: NAMES[source] || source, installed: false, configured: false });
    const values = groups.get(source) || [];
    if (!values.some(value => value.sessionId === session.sessionId)) values.push(session);
    groups.set(source, values);
  }
  const label = (status: string): string => t('fusion.localAgents.status.' + status, { defaultValue: ({ Processing: '正在工作', Running: '正在工作', WaitingApproval: '等待确认', WaitingInput: '等待输入', Completed: '已完成', Error: '出错', Restored: '历史会话', ApplicationOpen: '程序已运行', Idle: '空闲', Disconnected: '已断开' } as Record<string, string>)[status] || status });
  const focus = async (session: FusionEchoCodexSession): Promise<void> => {
    const key = session.source + ':' + session.sessionId; setFocusing(key);
    try { if (!await window.api.fusionFocusSession(session.source, session.sessionId)) throw new Error(t('fusion.localAgents.focusFailed', { defaultValue: '未找到可切换的窗口，请在本机打开对应 Agent。' })); }
    catch (error) { onError(error instanceof Error ? error.message : String(error)); }
    finally { setFocusing(''); }
  };
  const visibleAgents = [...agents.values()].filter(agent => agent.installed || agent.configured || groups.has(canonical(agent.source)));
  return <>{visibleAgents.map(agent => {
    const sessions = [...(groups.get(canonical(agent.source)) || [])].sort((a, b) => Number(a.status === 'Restored') - Number(b.status === 'Restored') || (b.lastActivity || '').localeCompare(a.lastActivity || ''));
    const live = sessions.filter(session => snapshot?.state === 'ready' && !['Restored', 'Disconnected'].includes(session.status));
    const working = live.filter(session => ['Processing', 'Running'].includes(session.status)).length;
    const waiting = live.filter(session => /Waiting|Approval|Permission/.test(session.status)).length;
    const summary = waiting ? t('fusion.localAgents.waiting', { defaultValue: '{{count}} 个待处理', count: waiting }) : working ? t('fusion.localAgents.working', { defaultValue: '{{count}} 个正在工作', count: working }) : live.length ? t('fusion.localAgents.running', { defaultValue: '已发现活动会话' }) : agent.installed ? t('fusion.localAgents.installed', { defaultValue: '已检测到本机程序' }) : agent.configured ? t('fusion.localAgents.configured', { defaultValue: '已发现本地配置' }) : sessions.length ? t('fusion.localAgents.history', { defaultValue: '已发现历史会话' }) : t('fusion.localAgents.notFound', { defaultValue: snapshot?.agents ? '未检测到本机程序' : '正在检测本机程序…' });
    return <article className="fusion-agent-card fusion-local-agent-card" key={agent.source} data-agent={agent.source}>
      <div className="fusion-agent-card-heading">
        <div className="fusion-agent-name"><span className="fusion-agent-icon">{agent.source === 'claude' ? <FusionProviderIcon provider="anthropic" /> : <Bot size={20} />}</span><div><strong>{agent.name}</strong><small>{summary}</small></div></div>
        <span className="fusion-local-capability">{t('fusion.localAgents.observe', { defaultValue: '本地状态' })}</span>
      </div>
      {!sessions.length ? <p className="fusion-overview-empty">{t('fusion.localAgents.noSessions', { defaultValue: '尚未发现会话。在本机 Agent 中开始使用后，这里会自动更新。' })}</p> : <div className="fusion-session-list">
        {(expanded[agent.source] ? sessions : sessions.slice(0, 4)).map(session => {
          const restored = snapshot?.state !== 'ready' || session.status === 'Restored';
          const status = restored ? 'Restored' : session.status;
          const key = session.source + ':' + session.sessionId;
          return <div className="fusion-session-card fusion-local-session" key={key}>
            <span className="fusion-session-card-copy"><strong title={session.projectName || session.windowTitle || agent.name}>{session.projectName || session.windowTitle || agent.name}</strong><small title={session.cwd || ''}>{session.currentTool || session.lastAssistantMessage || session.lastUserPrompt || session.cwd || (status === 'ApplicationOpen' ? t('fusion.localAgents.processOnly', { defaultValue: '已检测到进程，任务状态暂不可用' }) : t('fusion.localAgents.external', { defaultValue: '在本机 Agent 中继续对话' }))}</small><span className="fusion-local-status" data-status={status}>{status === 'ApplicationOpen' ? <AppWindow size={11} /> : null}{label(status)}</span></span>
            {session.capabilities?.focus && <button className="fusion-icon-button" type="button" title={t('fusion.localAgents.focus', { defaultValue: '切回 {{agent}}', agent: agent.name })} aria-label={t('fusion.localAgents.focus', { defaultValue: '切回 {{agent}}', agent: agent.name })} disabled={focusing === key} onClick={() => void focus(session)}><ExternalLink size={15} /></button>}
          </div>;
        })}
        {sessions.length > 4 && <button type="button" className="fusion-local-more" aria-expanded={Boolean(expanded[agent.source])} onClick={() => setExpanded(value => ({ ...value, [agent.source]: !value[agent.source] }))}>{expanded[agent.source] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{expanded[agent.source] ? t('fusion.localAgents.less', { defaultValue: '收起' }) : t('fusion.localAgents.more', { defaultValue: '查看全部 {{count}} 个会话', count: sessions.length })}</button>}
      </div>}
    </article>;
  })}</>;
}
