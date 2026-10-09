/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file ToolControls.tsx @description 统一工具反馈、结果复制和导出控件。 @author 鸡哥 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Download } from 'lucide-react';
import { downloadToolFile } from './toolHelpers';
/** 为可复制结果提供明确反馈。
 * @param props - 结果文本及可选下载文件名。
 * @returns 结果与操作按钮。
 */
export function ToolResult({ text, filename }: { text: string; filename?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fusion-tool-result">
      <pre>{text}</pre>
      <div className="fusion-tool-actions">
        <button type="button" onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(reason => setError(String(reason))); }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}{t(copied ? 'fusion.toolbox.copied' : 'fusion.toolbox.copy')}
        </button>
        {filename && <button type="button" onClick={() => downloadToolFile(filename, text)}><Download size={15} />{t('fusion.toolbox.export')}</button>}
      </div>
      {error && <ToolError error={error} />}
    </div>
  );
}
/** 显示可翻译的已知错误，其余错误保留诊断。
 * @param props - 错误信息。
 * @returns 错误提示。
 */
export function ToolError({ error }: { error: string }) {
  const { t, i18n } = useTranslation();
  const code=error.split('Error:').at(-1)?.trim()||error;
  const key = `fusion.toolbox.errors.${code}`;
  return error ? <p className="fusion-inline-error" role="alert">{i18n.exists(key) ? t(key) : code}</p> : null;
}
/** 为所有工具提供统一的可取消状态。
 * @param props - 内容及可取消任务。
 * @returns 工具主体。
 */
export function ToolBody({ children, busy = false, error = '', cancel }: { children: ReactNode; busy?: boolean; error?: string; cancel?: () => void }) {
  const { t } = useTranslation();
  return <div className="fusion-utility" aria-busy={busy}>{children}{busy && <div className="fusion-tool-actions" role="status">{t('fusion.toolbox.processing')}{cancel && <button type="button" onClick={cancel}>{t('fusion.toolbox.cancel')}</button>}</div>}<ToolError error={error} /></div>;
}
