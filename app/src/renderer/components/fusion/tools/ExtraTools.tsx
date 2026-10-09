/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file ExtraTools.tsx @description 离线便签、日期、配色和随机凭据工具。 @author 鸡哥 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useToolData } from './toolHooks';
import { ToolBody, ToolError, ToolResult } from './ToolControls';
import { colorFormats, dateMilliseconds, downloadToolFile, generatePassword } from './toolHelpers';
import type { ToolNote } from '../../../../preload/types/fusionTools';

/** 自动保存的 Markdown 便签，不修改既有设置。 */
export function NoteTool() {
  const { t } = useTranslation();
  const { data, error, write } = useToolData();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ToolNote | null>(null);
  const [preview, setPreview] = useState(false);
  const pending = useRef<ToolNote | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = (note: ToolNote): void => { void write('note', note).catch(() => {}); };
  const flush = (): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) { persist(pending.current); pending.current = null; }
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (pending.current) void window.api.fusionToolWrite('note', pending.current).catch(() => {}); }, []);
  const change = (patch: Partial<ToolNote>): void => {
    if (!draft) return;
    const next = { ...draft, ...patch, updated: Date.now() };
    setDraft(next); pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  };
  const create = (): void => {
    flush();
    setPreview(false);
    const note = { id: crypto.randomUUID(), title: t('fusion.toolbox.notes.untitled'), text: '', updated: Date.now() };
    setDraft(note); persist(note);
  };
  return <ToolBody error={error}>
    <div className="fusion-tool-actions"><input aria-label={t('fusion.toolbox.search')} placeholder={t('fusion.toolbox.search')} value={query} onChange={event => setQuery(event.target.value)} /><button onClick={create}>{t('fusion.toolbox.notes.new')}</button></div>
    <div className="fusion-note-layout"><nav aria-label={t('fusion.toolbox.notes.list')}>
      {data.notes.filter(note => `${note.title} ${note.text}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updated - a.updated).map(note => <button key={note.id} aria-pressed={draft?.id === note.id} onClick={() => { flush(); setDraft(note); }}>{note.title || t('fusion.toolbox.notes.untitled')}</button>)}
    </nav><div className="fusion-note-editor">{draft ? <>
      <input maxLength={200} aria-label={t('fusion.toolbox.notes.title')} value={draft.title} onChange={event => change({ title: event.target.value })} />
      <div className="fusion-tool-actions"><button aria-pressed={preview} onClick={() => setPreview(!preview)}>{t('fusion.toolbox.notes.preview')}</button>{(['md', 'txt'] as const).map(format => <button key={format} onClick={() => { flush(); downloadToolFile(`note.${format}`, draft.text); }}>{t('fusion.toolbox.export')} {format.toUpperCase()}</button>)}<button onClick={() => { if (!confirm(t('fusion.toolbox.notes.deleteConfirm'))) return; if (timer.current) clearTimeout(timer.current); pending.current = null; void write('deleteNote', draft.id).then(() => setDraft(null)).catch(() => {}); }}>{t('fusion.toolbox.delete')}</button></div>
      {preview ? <div className="fusion-markdown-preview"><ReactMarkdown>{draft.text}</ReactMarkdown></div> : <textarea aria-label={t('fusion.toolbox.notes.content')} value={draft.text} onChange={event => change({ text: event.target.value })} />}
    </> : null}</div></div>
  </ToolBody>;
}

/** 公历天数计算、明确单位的时间戳和实时城市时钟。 */
export function DateTool() {
  const { t, i18n } = useTranslation();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [days, setDays] = useState(1);
  const [stamp, setStamp] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateTime, setDateTime] = useState(new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace(' ', 'T'));
  const [unit, setUnit] = useState('seconds');
  const [city, setCity] = useState('America/New_York');
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { const clock = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(clock); }, []);
  const calculate = (operation: string): void => {
    try {
      setError('');
      if (operation === 'difference') setResult(`${(dateMilliseconds(end) - dateMilliseconds(start)) / 86400000} ${t('fusion.toolbox.dates.days')}`);
      else if (operation === 'add') { if (!Number.isInteger(days) || Math.abs(days) > 100000) throw new Error('invalid-date'); setResult(new Date(dateMilliseconds(start) + days * 86400000).toISOString().slice(0, 10)); }
      else if (operation === 'fromDate') { const value = Date.parse(dateTime + '+08:00'); if (!Number.isFinite(value)) throw new Error('invalid-date'); setResult(String(unit === 'seconds' ? Math.floor(value / 1000) : value)); }
      else { const value = Number(stamp) * (unit === 'seconds' ? 1000 : 1); if (!stamp.trim() || !Number.isFinite(value)) throw new Error('invalid-date'); setResult(`${new Date(value).toISOString()}\n${new Date(value).toLocaleString(i18n.language, { timeZone: 'Asia/Shanghai' })}`); }
    } catch { setError('invalid-date'); }
  };
  return <ToolBody error={error}>
    <div className="fusion-clock-grid">{['Asia/Shanghai', 'UTC', city].map((zone, index) => <div key={`${zone}-${index}`}><small>{index === 0 ? t('fusion.toolbox.dates.local') : zone}</small><strong>{new Date(now).toLocaleString(i18n.language, { timeZone: zone, hour12: false })}</strong></div>)}</div>
    <label>{t('fusion.toolbox.dates.city')}<select value={city} onChange={event => setCity(event.target.value)}>{['America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Australia/Sydney', 'America/Los_Angeles', 'Asia/Singapore'].map(zone => <option key={zone}>{zone}</option>)}</select></label>
    <div className="fusion-tool-columns"><label>{t('fusion.toolbox.dates.start')}<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label>{t('fusion.toolbox.dates.end')}<input type="date" value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    <div className="fusion-tool-actions"><button onClick={() => calculate('difference')}>{t('fusion.toolbox.dates.difference')}</button><input type="number" aria-label={t('fusion.toolbox.dates.days')} value={days} onChange={event => setDays(Number(event.target.value))} /><button onClick={() => calculate('add')}>{t('fusion.toolbox.dates.add')}</button></div>
    <div className="fusion-tool-actions"><input aria-label={t('fusion.toolbox.dates.timestamp')} value={stamp} onChange={event => setStamp(event.target.value)} /><select aria-label={t('fusion.toolbox.dates.unit')} value={unit} onChange={event => setUnit(event.target.value)}>{['seconds', 'milliseconds'].map(id => <option key={id} value={id}>{t(`fusion.toolbox.dates.${id}`)}</option>)}</select><button onClick={() => calculate('timestamp')}>{t('fusion.toolbox.convert')}</button><button onClick={() => setResult(`${Math.floor(now / 1000)}\n${now}`)}>{t('fusion.toolbox.dates.now')}</button></div>
    <label>{t('fusion.toolbox.dates.dateTime')}<input type="datetime-local" value={dateTime} onChange={event => setDateTime(event.target.value)} /></label><button onClick={() => calculate('fromDate')}>{t('fusion.toolbox.dates.toTimestamp')}</button>
    {result && <ToolResult text={result} />}
  </ToolBody>;
}

/** 原生屏幕取色，取消不报错；色板保存到应用数据目录。 */
export function ColorTool() {
  const { t } = useTranslation();
  const { data, write, error: storeError } = useToolData();
  const [color, setColor] = useState('#87a6ff');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const pickActive = useRef(false), pickGeneration = useRef(0);
  useEffect(() => () => { pickGeneration.current++; if (pickActive.current) void window.api.fusionColorPick('cancel').catch(() => {}); }, []);
  let formats: ReturnType<typeof colorFormats> | null = null;
  try { formats = colorFormats(color); } catch { /* Allow incomplete manual input. */ }
  const pick = async (): Promise<void> => {
    if (pickActive.current) return;
    const generation = ++pickGeneration.current;
    pickActive.current = true; setPicking(true);
    setError('');
    try { const hex = await window.api.fusionColorPick('start'); if (generation === pickGeneration.current && hex) setColor(hex); }
    catch (reason) { if (generation === pickGeneration.current) setError(String(reason)); }
    finally { if (generation === pickGeneration.current) { pickActive.current = false; setPicking(false); } }
  };
  return <ToolBody error={error || storeError}>
    <div className="fusion-tool-actions"><input type="color" aria-label={t('fusion.toolbox.colors.choose')} value={formats?.hex || '#000000'} onChange={event => setColor(event.target.value)} /><input aria-label="HEX / RGB / HSL" placeholder="HEX / RGB / HSL" value={color} onChange={event => setColor(event.target.value)} /><button disabled={picking} onClick={() => void pick()}>{t(picking ? 'fusion.toolbox.colors.picking' : 'fusion.toolbox.colors.pick')}</button><button disabled={!formats} onClick={() => { if (formats) void write('colors', [...data.colors, formats.hex]).catch(() => {}); }}>{t('fusion.toolbox.colors.save')}</button></div>
    {!formats && <ToolError error="invalid-color" />}
    {formats && <><div className="fusion-color-preview" style={{ backgroundColor: formats.hex }} />{Object.values(formats).map(value => <ToolResult key={value} text={value} />)}</>}
    <h3>{t('fusion.toolbox.colors.palette')}</h3><div className="fusion-palette">{data.colors.map(value => <div key={value}><button style={{ backgroundColor: value }} aria-label={value} onClick={() => setColor(value)} /><small>{value}</small><button aria-label={`${t('fusion.toolbox.delete')} ${value}`} onClick={() => void write('colors', data.colors.filter(item => item !== value)).catch(() => {})}>×</button></div>)}</div>
  </ToolBody>;
}

/** 密码和 UUID 由系统随机源生成，不写入历史。 */
export function PasswordTool() {
  const { t } = useTranslation();
  const [length, setLength] = useState(20);
  const [enabled, setEnabled] = useState([true, true, true, true]);
  const [password, setPassword] = useState('');
  const [uuid, setUuid] = useState('');
  const [error, setError] = useState('');
  const groups = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!@#$%^&*()-_=+[]{}:,.?'];
  return <ToolBody error={error}>
    <label>{t('fusion.toolbox.password.length')}<input type="number" min="4" max="128" value={length} onChange={event => setLength(Number(event.target.value))} /></label>
    <div className="fusion-tool-actions">{['upper', 'lower', 'numbers', 'symbols'].map((id, index) => <label key={id}><input type="checkbox" checked={enabled[index]} onChange={event => setEnabled(old => old.map((value, offset) => offset === index ? event.target.checked : value))} />{t(`fusion.toolbox.password.${id}`)}</label>)}</div>
    <button onClick={() => { try { setError(''); setPassword(generatePassword(length, groups.filter((_, index) => enabled[index]))); } catch { setError('invalid-password-options'); } }}>{t('fusion.toolbox.password.generate')}</button>{password && <ToolResult text={password} />}
    <button onClick={() => setUuid(crypto.randomUUID())}>{t('fusion.toolbox.password.uuid')}</button>{uuid && <ToolResult text={uuid} />}<small>{t('fusion.toolbox.password.private')}</small>
  </ToolBody>;
}
