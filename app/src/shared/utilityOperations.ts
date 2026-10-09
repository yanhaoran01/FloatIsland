/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file utilityOperations.ts @description 可测试的离线计算、文本对比和 PDF 工作任务。 @author 鸡哥 */
import { executeDataJob,type DataJob,type DataResult } from './dataOperations';
export interface PdfInput { name: string; mime: string; bytes: Uint8Array; }
export type UtilityJob = DataJob
  | { kind: 'calculate'; expression: string }
  | { kind: 'convert'; value: number; from: string; to: string }
  | { kind: 'diff'; before: string; after: string }
  | { kind: 'pdf'; mode: 'merge' | 'extract' | 'rotate' | 'images'; files: PdfInput[]; pages: string; rotation: number };
export interface DiffPart { value: string; added?: boolean; removed?: boolean; count?: number; }

/** 解析保留顺序的页码列表。
 * @param value - 一起始页码及闭区间，例如 3,1-2。
 * @param count - PDF 页数。
 * @returns 零起始页码，可用于重排和提取。
 */
export function parsePdfPages(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, index) => index);
  const result = value.split(',').flatMap(part => {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('invalid-pages');
    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (first < 1 || last > count || last < first || last - first > 10000) throw new Error('invalid-pages');
    return Array.from({ length: last - first + 1 }, (_, index) => first + index - 1);
  });
  if (result.length > 10000) throw new Error('invalid-pages');
  return result;
}

/** 在隔离工作线程内执行耗时工具。
 * @param job - 明确的有限工具任务。
 * @returns 计算文本、差异列表或导出的 PDF 字节。
 */
export async function executeUtilityJob(job: UtilityJob): Promise<string | DiffPart[] | Uint8Array | DataResult> {
  if(job.kind==='csv'||job.kind==='regex')return executeDataJob(job);
  if (job.kind === 'calculate' || job.kind === 'convert') {
    const math = await import('mathjs');
    if (job.kind === 'convert') {
      if (!Number.isFinite(job.value)) throw new Error('invalid-number');
      return String(math.unit(job.value, job.from).toNumber(job.to));
    }
    if (!job.expression.trim() || job.expression.length > 4096) throw new Error('invalid-expression');
    const node = math.parse(job.expression);
    const functions = ['abs', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'log10', 'exp', 'floor', 'ceil', 'round', 'pow', 'min', 'max'];
    node.traverse(current => {
      if (!['ConstantNode', 'OperatorNode', 'ParenthesisNode', 'FunctionNode', 'SymbolNode'].includes(current.type)) throw new Error('invalid-expression');
      if (current.type === 'SymbolNode' && !['pi', 'e', ...functions].includes((current as { name?: string }).name || '')) throw new Error('invalid-expression');
    });
    const result = node.compile().evaluate();
    if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('invalid-number');
    return math.format(result, { precision: 14 });
  }
  if (job.kind === 'diff') {
    if (job.before.length + job.after.length > 500_000) throw new Error('text-too-large');
    const { diffLines } = await import('diff');
    const result = diffLines(job.before, job.after, { timeout: 2000 });
    if (!result) throw new Error('job-timeout');
    return result;
  }
  const { PDFDocument, degrees } = await import('pdf-lib');
  if (!job.files.length) throw new Error('choose-files');
  const output = await PDFDocument.create();
  if (job.mode === 'images') {
    for (const file of job.files) {
      const image = file.mime === 'image/png' ? await output.embedPng(file.bytes) : await output.embedJpg(file.bytes);
      const size = image.scaleToFit(595, 842);
      const page = output.addPage([595, 842]);
      page.drawImage(image, { x: (595 - size.width) / 2, y: (842 - size.height) / 2, ...size });
    }
  } else {
    const sources = await Promise.all(job.files.map(file => PDFDocument.load(file.bytes)));
    const selected = job.mode === 'merge' ? sources : sources.slice(0, 1);
    for (const source of selected) {
      const indices = job.mode === 'merge' ? source.getPageIndices() : parsePdfPages(job.pages, source.getPageCount());
      const pages = await output.copyPages(source, indices);
      pages.forEach(page => {
        if (job.mode === 'rotate') page.setRotation(degrees((page.getRotation().angle + job.rotation) % 360));
        output.addPage(page);
      });
    }
  }
  return output.save();
}
