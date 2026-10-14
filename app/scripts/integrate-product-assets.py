# FusionIsland GPL-3.0. Local third-party resources and bilingual strings.
from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parent.parent
groups={
 '':{'drop':('选择操作','Choose an action'),'close':('关闭','Close'),'search':('搜索工具、应用与流程','Search tools, apps and flows'),'tools':('工具','Tools'),'apps':('应用','Apps'),'flows':('流程','Flows'),'save':('保存','Save'),'export':('导出','Export'),'external':('系统打开','Open with system'),'pin':('贴屏','Pin'),'pinUnlock':('解除贴图穿透与锁定','Restore pin controls'),'pinClose':('关闭贴图','Close pins'),'openText':('打开文本或网址','Open text or URL'),'player':('播放器预览','Preview in player'),'encoding':('文本编码','Encoding'),'empty':('暂无记录','No records'),'new':('新建','New'),'newFlow':('新流程','New flow'),'name':('名称','Name'),'stepLabel':('处理步骤','Step'),'optionsJson':('步骤配置 JSON','Step options JSON'),'addStep':('添加步骤','Add step'),'execute':('执行','Execute'),'restore':('恢复默认流程','Restore default flows'),'delete':('删除流程','Delete flow'),'hotkey':('统一搜索快捷键','Search shortcut'),'hotkeySave':('保存快捷键','Save shortcut'),'hotkeySaved':('已保存','Saved')},
 'action':{'ocr':('文字识别','OCR'),'text-clean':('整理文本','Clean text'),'image-convert':('图片处理','Process image'),'pdf':('PDF 整理','Organize PDF'),'csv':('CSV / JSON','CSV / JSON'),'url':('URL 编解码','URL codec'),'hash':('文件指纹','File hash'),'rename':('批量重命名','Batch rename'),'zip':('ZIP 压缩','ZIP compression'),'copy':('复制','Copy'),'export':('导出','Export')},
 'tabs':{'edit':('编辑','Edit'),'convert':('转换','Convert'),'compress':('压缩','Compress'),'history':('历史','History'),'preview':('预览','Preview'),'organize':('整理','Organize'),'favorites':('收藏','Favorites'),'catalog':('应用目录','App catalog')},
 'capture':{'region':('区域','Region'),'screen':('全屏','Screen'),'window':('窗口','Window'),'scroll':('长截图','Scrolling capture'),'frame':('捕获一帧','Capture frame'),'finish':('完成拼接','Finish stitching')},
 'record':{'mode':('录制范围','Capture mode'),'source':('录制来源','Capture source'),'selectSource':('选择来源','Choose source'),'systemAudio':('系统声音','System audio'),'microphone':('麦克风','Microphone'),'camera':('摄像头','Camera'),'focus':('鼠标聚焦','Mouse focus'),'keys':('按键提示','Key hints'),'start':('开始录制','Start recording'),'pause':('暂停','Pause'),'resume':('继续','Resume'),'stop':('停止','Stop'),'format':('导出格式','Export format'),'begin':('开始秒数','Start seconds'),'end':('结束秒数，0 为片尾','End seconds, 0 for full end'),'gifSilent':('GIF 不包含声音','GIF does not include audio')},
 'share':{'address':('局域网地址','LAN address'),'discover':('发现设备','Discover'),'active':('已开启 · 端口 {{port}}','Active · port {{port}}'),'stopped':('互传已停止','Sharing stopped'),'files':('{{count}} 个文件','{{count}} files'),'text':('发送文本','Send text'),'accept':('接收并选择目录','Accept and choose folder'),'reject':('拒绝','Reject')},
 'options':{'format':('格式','Format'),'width':('最大宽度','Maximum width'),'quality':('质量','Quality'),'empty':('去空行','Remove blank lines'),'dedupe':('去重行','Deduplicate lines'),'find':('查找','Find'),'replace':('替换','Replace'),'prefix':('前缀','Prefix'),'suffix':('后缀','Suffix'),'numbered':('递增编号','Numbering'),'start':('起始编号','Start number'),'digits':('位数','Digits'),'mode':('模式','Mode'),'pages':('页码','Pages'),'rotation':('旋转角度','Rotation'),'delimiter':('分隔符','Delimiter'),'encoding':('编码','Encoding'),'algorithm':('算法','Algorithm')},
 'preset':{'capture':('截图 → OCR → 去空行 → 复制','Screenshot → OCR → clean → copy'),'image':('图片缩放 → JPEG → 压缩','Resize → JPEG → compress'),'rename':('批量编号 → ZIP','Number files → ZIP')},
 'state':{'done':('完成','Done'),'running':('处理中','Running'),'waiting':('等待确认','Awaiting confirmation'),'cancelled':('已取消','Cancelled'),'error':('失败','Failed')},
}
items={'image':('图片','Images'),'preview':('快览','Preview'),'recording':('录屏','Record'),'workflows':('流程','Flows'),'sharing':('互传','Share'),'download':('下载','Downloads')}
errors={'hotkey-conflict':('快捷键被占用，请使用其他组合','Shortcut is in use; choose another combination'),'sharing-not-active':('互传页面未开启','Sharing page is not active'),'invalid-peer':('请输入有效的局域网地址','Enter a valid LAN address'),'scroll-match-failed':('拼接匹配失败，请减少每次滚动距离后重试','Matching failed; scroll a shorter distance and retry'),'scroll-match-ambiguous':('画面缺少可匹配细节，请换一段区域重试','Insufficient matching detail; choose another region'),'capture-cancelled':('截图已取消','Capture cancelled'),'record-region-must-fit-display':('录制区域需位于同一显示器','Recording region must fit one display'),'microphone-in-use':('麦克风正在被其他功能使用','Microphone is in use'),'system-audio-unavailable':('无法采集系统声音','System audio is unavailable'),'flow-type-mismatch':('相邻步骤的输入输出类型不兼容','Adjacent step types are incompatible'),'invalid-flow':('流程配置无效','Invalid workflow'),'invalid-trim':('裁剪时间无效','Invalid trim range'),'peer-certificate-changed':('设备证书已变化，请重新发现设备','Peer certificate changed; rediscover the device')}
for index,language in enumerate(['zh-CN','en-US']):
 path=root/'i18n'/f'{language}.json';data=json.loads(path.read_text(encoding='utf-8-sig'));fusion=data['fusion'];product={}
 for group,values in groups.items():
  target=product if not group else product.setdefault(group,{})
  target.update({key:value[index] for key,value in values.items()})
 fusion['product']=product
 for key,value in items.items():fusion['toolbox']['items'][key]=value[index]
 for key,value in errors.items():fusion['toolbox']['errors'][key]=value[index]
 fusion['toolbox'].update({'chooseFiles':('选择文件','Choose files')[index],'run':('运行','Run')[index]})
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ['cmaps','standard_fonts','wasm']:
 src=root/'node_modules/pdfjs-dist'/name
 if src.exists():shutil.copytree(src,root/'src/renderer/public/pdf'/name,dirs_exist_ok=True)
upstream=root/'../validation/external-sources/eSearch-6f3f56241cccc8ada2c503df642566322dc67a3e';vendor=root/'vendor/esearch';vendor.mkdir(parents=True,exist_ok=True)
for name in ['LICENSE','LICENSE.txt']:
 if (upstream/name).exists():shutil.copy2(upstream/name,vendor/'LICENSE');break
for name in ['clip/clip_window.ts','ding/ding.ts','recorder/recorder.ts','recorderTip/recorderTip.ts']:
 shutil.copy2(upstream/'src/renderer'/name,vendor/(name.replace('/','-')+'.upstream.txt'))
(vendor/'SOURCE.md').write_text('# eSearch adaptation\n\nVersion 15.6.0, commit 6f3f56241cccc8ada2c503df642566322dc67a3e. Source: https://github.com/xushengfeng/eSearch. GPL-3.0. Upstream files are preserved as text snapshots for attribution and review.\n\nAdapted longMatch inner-strip clipping and pin opacity/minimum zoom into src/shared/esearchCore.ts; used by native pin and scroll worker. Recorder uses the upstream keycode lookup approach, restricted to combinations and function keys, in a dedicated sandboxed recording host rather than importing the DKH renderer. Capture and FFmpeg services remain the existing application services. Scroll matching replaces picture_match with a bounded worker matcher. No upstream UI is loaded online.\n',encoding='utf-8')
print('Bilingual strings and offline PDF/eSearch resources prepared.')
