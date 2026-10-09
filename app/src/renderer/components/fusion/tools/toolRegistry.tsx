/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file toolRegistry.tsx @description 统一的工具导航、加载和布局定义。 @author 鸡哥 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Calculator, QrCode, StickyNote, Files, Text, Clock, Palette, KeyRound, Globe, Video, Clipboard, Camera, Timer, ListTodo, CalendarDays, Music, Rocket, Languages, Download, History, Star, Languages as TranslateIcon, Fingerprint, Braces, Binary, Network, ImageDown, ArchiveRestore, Images, Film, Image, TimerReset, Dices, FolderPen, Archive, Table, Regex, Link, Eye, Share2, Workflow, ScreenShare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TOOLBOX_NAV_CARDS, type ToolboxIndexCardId } from '../../states/maxExpand/components/tools/config/commonToolboxConfig';
export const TOOL_GROUPS = ['common', 'media', 'efficiency', 'file', 'development'] as const;
export interface ToolDefinition { id: string; group: typeof TOOL_GROUPS[number]; label: string; description?: string; icon: LucideIcon; keywords: string; layout: 'adaptive'|'web'|'video'; width: 560|880; component?: LazyExoticComponent<ComponentType>; }
const extra = (name: 'NoteTool'|'DateTool'|'ColorTool'|'PasswordTool') => lazy(() => import('./ExtraTools').then(module => ({default: module[name]})));
const web = (kind: 'browser'|'video') => lazy(() => import('./WebTool').then(module => ({default: () => <module.WebTool kind={kind} />})));
const legacy = (id: string) => lazy(() => import('./LegacyTools').then(module => ({default: () => <module.LegacyTools id={id} />})));
const item = (id: string, group: ToolDefinition['group'], icon: LucideIcon, keywords: string, component?: ToolDefinition['component'], width: 560|880 = 560, layout: ToolDefinition['layout'] = 'adaptive'): ToolDefinition => ({id,group,icon,keywords,component,width,layout,label:'fusion.toolbox.items.'+id,description:'fusion.toolbox.descriptions.'+id});
const legacyIcons:Record<ToolboxIndexCardId,LucideIcon>={
 'download-create':Download,'download-history':History,software:Star,translate:TranslateIcon,
 'fileService-hash':Fingerprint,'encodingService-json':Braces,'encodingService-base64':Binary,
 networkService:Network,'fileCompression-imageCompression':ImageDown,'fileCompression-history':ArchiveRestore,
 'formatFactory-image':Images,'formatFactory-video':Film,
};
const daily=(name:'StopwatchTool'|'RandomTool'|'UrlTool')=>lazy(()=>import('./DailyTools').then(m=>({default:m[name]})));
const data=(name:'CsvTool'|'RegexTool')=>lazy(()=>import('./DataTools').then(m=>({default:m[name]})));
const integrated=(name:'ImageUnified'|'PdfUnified'|'DownloadUnified'|'LauncherUnified'|'ProductFlows')=>lazy(()=>import('./UnifiedTools').then(m=>({default:m[name]})));
const file=(name:'RenameTool'|'ZipTool')=>lazy(()=>import('./FileTools').then(m=>({default:m[name]})));
export const TOOL_ALIASES:Record<string,{id:string;tab:string}>={
 'image-edit':{id:'image',tab:'edit'},'fileCompression-imageCompression':{id:'image',tab:'compress'},'fileCompression-history':{id:'image',tab:'history'},'formatFactory-image':{id:'image',tab:'convert'},
 'download-create':{id:'download',tab:'create'},'download-history':{id:'download',tab:'history'},software:{id:'launcher',tab:'catalog'},translate:{id:'translation',tab:''},
};
/** Resolves old routes to the unique canonical page. @param id - Old or current id. @returns Canonical route. */
export function resolveToolTarget(id:string):{id:string;tab:string} {return TOOL_ALIASES[id]??{id,tab:''};}
/** 所有首页和恢复导航都使用稳定 ID；组件首次访问才加载。 */
export const TOOL_REGISTRY: ToolDefinition[] = [
 item('screenshot','common',Camera,'OCR 截图 screenshot',lazy(()=>import('./ProductCapture').then(m=>({default:m.ProductCapture})))), // i18n-exclude: bilingual search keywords; never displayed
 item('clipboard','common',Clipboard,'剪贴板 clipboard',lazy(()=>import('../../states/maxExpand/components/clipBoardHistory').then(m=>({default:m.ClipboardHistoryTab})))), // i18n-exclude: bilingual search keywords; never displayed
 item('calculator','common',Calculator,'math 计算 科学 单位 换算',lazy(()=>import('./CalculationTool').then(m=>({default:m.CalculationTool})))), // i18n-exclude: bilingual search keywords; never displayed
 item('qr','common',QrCode,'二维码 QR 扫码',lazy(()=>import('./QrTool').then(m=>({default:m.QrTool})))), // i18n-exclude: bilingual search keywords; never displayed
 item('notes','common',StickyNote,'便签 markdown note',extra('NoteTool'),880), // i18n-exclude: bilingual search keywords; never displayed
 item('browser','media',Globe,'网页 浏览 browser bilibili youtube',web('browser'),880,'web'), // i18n-exclude: bilingual search keywords; never displayed
 item('video','media',Video,'视频 播放 mp4 webm bilibili youtube',web('video'),880,'video'), // i18n-exclude: bilingual search keywords; never displayed
 item('music','media',Music,'音乐 music',lazy(()=>import('../../states/expand/components/SongTab').then(m=>({default:m.SongTab})))), // i18n-exclude: bilingual search keywords; never displayed
 item('timer','efficiency',Timer,'倒计时 番茄 timer',lazy(()=>import('../FusionTimerPanel').then(m=>({default:m.FusionTimerPanel})))), // i18n-exclude: bilingual search keywords; never displayed
 item('todo','efficiency',ListTodo,'待办 todo',lazy(()=>import('../../states/maxExpand/components/todo/components/TodoTab').then(m=>({default:m.TodoTab})))), // i18n-exclude: bilingual search keywords; never displayed
 item('dates','efficiency',Clock,'日期 时区 时间戳 timezone timestamp',extra('DateTool'),880), // i18n-exclude: bilingual search keywords; never displayed
 item('anniversary','efficiency',CalendarDays,'纪念日 countdown',lazy(()=>import('../../states/maxExpand/components/countdown/components/CountdownTab').then(m=>({default:m.CountdownTab})))), // i18n-exclude: bilingual search keywords; never displayed
 item('translation','efficiency',Languages,'翻译 translation',lazy(()=>import('../../states/expand/components/TranslationTab').then(m=>({default:m.TranslationTab})))), // i18n-exclude: bilingual search keywords; never displayed
 item('launcher','efficiency',Rocket,'启动 程序 launcher',integrated('LauncherUnified')), // i18n-exclude: bilingual search keywords; never displayed
 item('pdf','file',Files,'PDF 合并 提取 旋转 图片',integrated('PdfUnified'),880), // i18n-exclude: bilingual search keywords; never displayed
 item('text','development',Text,'文本 对比 diff replace',lazy(()=>import('./TextPdfTools').then(m=>({default:m.TextTool}))),880), // i18n-exclude: bilingual search keywords; never displayed
 item('colors','development',Palette,'取色 配色 HEX RGB HSL',extra('ColorTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('password','development',KeyRound,'密码 UUID password',extra('PasswordTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('image','file',Image,'图片 裁剪 标注 压缩 转换 crop annotate compress convert',integrated('ImageUnified')), // i18n-exclude: bilingual search keywords; never displayed
 item('stopwatch','efficiency',TimerReset,'秒表 分段 stopwatch laps',daily('StopwatchTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('random','common',Dices,'抽签 随机 名单 random pick',daily('RandomTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('rename','file',FolderPen,'批量 重命名 文件 rename',file('RenameTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('zip','file',Archive,'ZIP 压缩 解压 archive',file('ZipTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('csv','development',Table,'CSV JSON 表格 转换 table',data('CsvTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('regex','development',Regex,'正则 表达式 测试 匹配 regex',data('RegexTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('url-codec','development',Link,'URL 编码 解码 地址 参数 url encode',daily('UrlTool')), // i18n-exclude: bilingual search keywords; never displayed
 item('download','file',Download,'download history',integrated('DownloadUnified')),
 item('preview','file',Eye,'preview PDF image ZIP text',lazy(()=>import('./ProductPreview').then(m=>({default:m.ProductPreview})))),
 item('recording','media',ScreenShare,'record screen GIF camera',lazy(()=>import('./ProductRecorder').then(m=>({default:m.ProductRecorder})))),
 item('workflows','efficiency',Workflow,'workflow automation steps',lazy(()=>import('./ProductFlows').then(m=>({default:m.ProductFlows})))),
 item('sharing','file',Share2,'LocalSend LAN transfer',lazy(()=>import('./ProductSharing').then(m=>({default:m.ProductSharing})))),
 ...TOOLBOX_NAV_CARDS.filter(card=>!TOOL_ALIASES[card.id]).map(card=>({id:card.id,group:(card.sidebar==='encodingService'||card.sidebar==='networkService'?'development':card.sidebar==='translate'||card.sidebar==='software'?'efficiency':'file') as ToolDefinition['group'],label:card.labelKey,description:card.descKey,icon:legacyIcons[card.id],keywords:card.id,layout:'adaptive' as const,width:880 as const,component:legacy(card.id)})),
];

for(const [oldId,target] of Object.entries(TOOL_ALIASES)){const tool=TOOL_REGISTRY.find(item=>item.id===target.id);if(tool)tool.keywords+=" "+oldId;}
