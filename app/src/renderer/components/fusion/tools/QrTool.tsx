/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file QrTool.tsx @description 二维码生成、文件和粘贴图像识别。 @author 鸡哥 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import {useProductFiles} from '../productStore';
import { ToolBody, ToolResult } from './ToolControls';
import { downloadToolFile } from './toolHelpers';

/** 本地二维码往返；图片识别不上传到网络。 */
export function QrTool() {
  const { t } = useTranslation();
  const [text, setText] = useState('https://www.bilibili.com');
  const [decoded, setDecoded] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const qr = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  useProductFiles('qr',files=>{const file=files[0];if(file?.type.startsWith('image/'))void read(file);else if(file)void file.text().then(setText).catch(reason=>setError(String(reason)));});
  const valid = new TextEncoder().encode(text).length <= 2000;
  const read = async (file?: File): Promise<void> => {
    if (!file) return;
    const current = ++generation.current;
    setBusy(true); setError(''); setDecoded('');
    try {
      if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) throw new Error('invalid-image');
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('invalid-image');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const result = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (!result) throw new Error('qr-not-found');
        if (current === generation.current) setDecoded(result.data);
      } finally { bitmap.close(); }
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const save = async (format: 'svg' | 'png'): Promise<void> => {
    const svg = qr.current?.querySelector('svg'); if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    if (format === 'svg') { downloadToolFile('qrcode.svg', xml, 'image/svg+xml'); return; }
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 768;
      canvas.getContext('2d')?.drawImage(image, 0, 0, 768, 768);
      canvas.toBlob(blob => { if (blob) downloadToolFile('qrcode.png', blob, 'image/png'); });
    } catch (reason) { setError(String(reason)); } finally { URL.revokeObjectURL(url); }
  };
  return <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); void read(event.dataTransfer.files[0]); }} onPaste={event => { const file = [...event.clipboardData.items].find(item => item.type.startsWith('image/'))?.getAsFile(); if (file) { event.preventDefault(); void read(file); } }}>
    <ToolBody busy={busy} cancel={() => { generation.current++; setBusy(false); }} error={valid ? error : 'qr-too-long'}>
      <label>{t('fusion.toolbox.qr.text')}<textarea maxLength={1800} value={text} onChange={event => setText(event.target.value)} /></label>
      <div className="fusion-qr-preview" ref={qr}>{text && valid && <QRCodeSVG value={text} size={192} marginSize={4} level="M" />}</div>
      <div className="fusion-tool-actions">{(['png', 'svg'] as const).map(format => <button disabled={!text || !valid} key={format} onClick={() => void save(format)}>{t('fusion.toolbox.export')} {format.toUpperCase()}</button>)}<label className="fusion-file-button">{t('fusion.toolbox.qr.read')}<input type="file" accept="image/*" onChange={event => { void read(event.target.files?.[0]); event.target.value = ''; }} /></label></div>
      <small>{t('fusion.toolbox.qr.drop')}</small>{decoded && <ToolResult text={decoded} />}
    </ToolBody>
  </div>;
}
