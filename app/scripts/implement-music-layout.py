"""Apply exact UI integration edits and bilingual music copy; no user data migration."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def edit(path,old,new):
    file=ROOT/path
    text=file.read_text(encoding='utf-8')
    if old not in text:
        if new in text:return
        raise RuntimeError(f'Missing edit anchor: {path}: {old[:80]}')
    file.write_text(text.replace(old,new,1),encoding='utf-8')
edit('src/renderer/components/fusion/FusionChat.tsx',"import { useMediaState } from './mediaState';","import { useMediaState } from './mediaState';\nimport { useMusicState } from './musicState';\nimport './responsiveWorkspace.css';")
edit('src/renderer/components/fusion/FusionChat.tsx','const media = useMediaState().find(item => item.active);','const media = useMediaState().find(item => item.active);\n  const music = useMusicState();')
edit('src/renderer/components/fusion/FusionChat.tsx','compact && !islandSettings && !voicePage && !voiceFocused && media && <MediaBar />','compact && !islandSettings && !voiceFocused && ((!voicePage && media) || music?.active) && <MediaBar />')
edit('src/renderer/components/components/DynamicIslandStateContent.tsx',"import { useMediaState } from '../fusion/mediaState';","import { useMediaState } from '../fusion/mediaState';\nimport { useMusicState } from '../fusion/musicState';")
edit('src/renderer/components/components/DynamicIslandStateContent.tsx','const media = useMediaState().some(item => item.active);','const music = useMusicState();\n  const media = useMediaState().some(item => item.active) || Boolean(music?.active);')
edit('src/renderer/components/fusion/FusionSettings.tsx',"import {WorkBuddySettings} from './WorkBuddySettings';","import {WorkBuddySettings} from './WorkBuddySettings';\nimport {useContentWidth} from './useContentWidth';")
edit('src/renderer/components/fusion/FusionSettings.tsx',"const aside = useRef<HTMLElement>(null);","const aside = useRef<HTMLElement>(null);\n  const content=useContentWidth<HTMLElement>();")
edit('src/renderer/components/fusion/FusionSettings.tsx','return <section className="fusion-settings">','return <section ref={content.ref} className="fusion-settings" data-narrow={content.narrow}>\n    <div className="fusion-settings-selector" hidden={!content.narrow}><select aria-label={t(\'fusion.navigation.settings\')} value={section} onChange={event=>{selection.current++;setSection(event.target.value as Section);}}>{SECTIONS.map(id=><option key={id} value={id}>{t(\'fusion.settings.\'+id)}</option>)}</select></div>')
edit('src/renderer/components/fusion/FusionSettings.tsx','<aside ref={aside} aria-label={t(\'fusion.navigation.settings\')}>','<aside ref={aside} hidden={content.narrow} aria-label={t(\'fusion.navigation.settings\')}>')
edit('src/renderer/components/fusion/tools/ProductPreview.tsx',"import { parsePdfPages } from './utilityOperations';","import { parsePdfPages } from './utilityOperations';\nimport {useContentWidth} from '../useContentWidth';")
edit('src/renderer/components/fusion/tools/ProductPreview.tsx','const generation=useRef(0);','const generation=useRef(0),canvas=useContentWidth<HTMLDivElement>();')
edit('src/renderer/components/fusion/tools/ProductPreview.tsx','<div className="fusion-product-pdf-page"><Page pageNumber={page} width={430}/></div>','<div ref={canvas.ref} className="fusion-product-pdf-page"><Page pageNumber={page} width={Math.max(100,canvas.width||300)}/></div>')
edit('src/renderer/components/fusion/tools/MusicTool.tsx',"{!searchOpen&&icon('fusion.music.search',()=>setSearchOpen(true),<Search size={20} strokeWidth={1.6}/>)}",'')
edit('src/renderer/components/fusion/tools/MusicTool.tsx',"aria-label={t('fusion.toolbox.save')}","aria-label={t('fusion.music.save')}")
english={
 'search':'Search','library':'My music','playing':'Now playing','system':'System playback','source':'Music source','query':'Song or artist','local':'Local music','restricted':'Requires authorization','favorite':'Favorite','more':'More actions','addQueue':'Add to queue','up':'Move up','down':'Move down','remove':'Remove','addPlaylist':'Add to {{name}}','import':'Import music','newPlaylist':'New playlist','previousPage':'Previous page','nextPage':'Next page','collection':'Collection','favorites':'Favorites','rename':'Rename playlist','deletePlaylist':'Delete playlist','playlistName':'Playlist name','save':'Save','findMusic':'Find music','qualityUnknown':'Quality unknown','lyrics':'Lyrics','queue':'Queue','lyricsUnavailable':'Lyrics unavailable','noLyrics':'No lyrics','shuffle':'Shuffle','repeat':'Repeat','volume':'Volume','loading':'Loading audio…','noResults':'No matching songs','playTrack':'Play {{title}}',
 'provider':{'netease':'NetEase Music','qq':'QQ Music','migu':'Migu Music','local':'Local music'}
}
chinese={
 'search':'搜索','library':'我的音乐','playing':'正在播放','system':'系统播放','source':'音乐来源','query':'歌曲或歌手','local':'本地音乐','restricted':'需要授权','favorite':'收藏','more':'更多操作','addQueue':'加入队列','up':'上移','down':'下移','remove':'移除','addPlaylist':'加入「{{name}}」','import':'导入音乐','newPlaylist':'新建歌单','previousPage':'上一页','nextPage':'下一页','collection':'音乐分类','favorites':'收藏','rename':'重命名歌单','deletePlaylist':'删除歌单','playlistName':'歌单名称','save':'保存','findMusic':'找些音乐','qualityUnknown':'音质未知','lyrics':'歌词','queue':'队列','lyricsUnavailable':'歌词暂不可用','noLyrics':'暂无歌词','shuffle':'随机播放','repeat':'循环播放','volume':'音量','loading':'正在加载音频…','noResults':'没有匹配的歌曲','playTrack':'播放 {{title}}',
 'provider':{'netease':'网易云音乐','qq':'QQ 音乐','migu':'咪咕音乐','local':'本地音乐'}
}
errors={
 'music-track-missing':('Song is no longer available.','歌曲已不可用。'),'music-playlist-missing':('Playlist no longer exists.','歌单已不存在。'),'music-invalid-name':('Enter a playlist name up to 120 characters.','请输入不超过 120 字的歌单名称。'),'music-invalid-value':('Invalid music control value.','音乐操作参数无效。'),'music-empty-queue':('Add a song to the queue first.','请先添加歌曲。'),'music-local-missing':('Local file was moved or removed.','本地文件已移动或删除。'),'music-invalid-source':('The music source returned an unsupported address.','音源返回了不支持的地址。'),'music-invalid-response':('The music source returned an unexpected response.','音源返回的数据异常。'),'music-unavailable':('No anonymously playable source is available.','没有可匿名播放的音源。'),'music-restricted':('This song requires platform authorization.','此歌曲需要平台授权。'),'music-preview-only':('Only a preview is available.','此歌曲仅提供试听。'),'music-timeout':('The music source timed out. Try again.','音源请求超时，请重试。'),'music-cancelled':('Cancelled.','已取消。'),'music-host-crashed':('Audio player stopped unexpectedly. Play again to retry.','音频播放器意外停止，请重新播放。'),'music-decode-2':('Audio could not be loaded.','音频加载失败。'),'music-decode-3':('Audio decoding failed.','音频解码失败。'),'music-decode-4':('Audio format is not supported.','音频格式不受支持。'),'music-seek-unavailable':('This source cannot seek yet.','此音源暂不可调整进度。')
}
for language,copy,index in [('en-US',english,0),('zh-CN',chinese,1)]:
    file=ROOT/'i18n'/f'{language}.json'
    data=json.loads(file.read_text(encoding='utf-8'))
    data['fusion']['music']=copy
    data['fusion']['toolbox']['errors'].update({key:values[index] for key,values in errors.items()})
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
