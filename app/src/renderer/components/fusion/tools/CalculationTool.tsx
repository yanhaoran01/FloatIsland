/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file CalculationTool.tsx @description 工作线程计算器与常用单位换算。 @author 鸡哥 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToolJob } from './toolHooks';
import { ToolBody, ToolResult } from './ToolControls';
const UNITS = {
  length: ['mm', 'cm', 'm', 'km', 'inch', 'ft', 'mile'],
  area: ['mm^2', 'cm^2', 'm^2', 'km^2', 'ha', 'acre'],
  weight: ['mg', 'g', 'kg', 'lb', 'oz'],
  temperature: ['degC', 'degF', 'K'],
  time: ['ms', 's', 'min', 'hour', 'day'],
  storage: ['bit', 'byte', 'kB', 'MB', 'GB', 'KiB', 'MiB', 'GiB'],
};
/** 计算结果由隔离线程返回。
 * @returns 计算及换算面板。
 */
export function CalculationTool() {
  const { t } = useTranslation();
  const [expression, setExpression] = useState('');
  const [category, setCategory] = useState<keyof typeof UNITS>('length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('cm');
  const job = useToolJob();
  return (
    <ToolBody busy={job.busy} error={job.error} cancel={job.cancel}>
      <form className="fusion-tool-row" onSubmit={event => { event.preventDefault(); job.run({ kind: 'calculate', expression }); }}>
        <label className="grow">{t('fusion.toolbox.expression')}<input value={expression} placeholder="sqrt(3^2 + 4^2)" onChange={event => setExpression(event.target.value)} /></label>
        <button type="submit" disabled={job.busy}>{t('fusion.toolbox.calculate')}</button>
      </form>
      <p className="fusion-tool-hint">{t('fusion.toolbox.calculationHint')}</p>
      <div className="fusion-tool-row">
        <label>{t('fusion.toolbox.category')}<select value={category} onChange={event => { const next = event.target.value as keyof typeof UNITS; setCategory(next); setFrom(UNITS[next][0]); setTo(UNITS[next][1]); }}>{Object.keys(UNITS).map(key => <option key={key} value={key}>{t(`fusion.toolbox.units.${key}`)}</option>)}</select></label>
        <label>{t('fusion.toolbox.value')}<input type="number" value={value} onChange={event => setValue(event.target.value)} /></label>
        <label>{t('fusion.toolbox.from')}<select value={from} onChange={event => setFrom(event.target.value)}>{UNITS[category].map(unit => <option key={unit}>{unit}</option>)}</select></label>
        <label>{t('fusion.toolbox.to')}<select value={to} onChange={event => setTo(event.target.value)}>{UNITS[category].map(unit => <option key={unit}>{unit}</option>)}</select></label>
        <button type="button" disabled={job.busy} onClick={() => job.run({ kind: 'convert', value: value.trim() ? Number(value) : NaN, from, to })}>{t('fusion.toolbox.convert')}</button>
      </div>
      {typeof job.result === 'string' && <ToolResult text={job.result} />}
    </ToolBody>
  );
}
