# 浮屿 · FloatIsland

面向 Windows 的贴边工作台，集成角色对话、语音草稿、常用工具和媒体功能。基于 eIsland / FusionIsland，使用 Electron、React 和 TypeScript。

**当前为 1.3.0 开发中的源码快照。** 全面排错和最终原生验收仍在进行；此仓库的初始化提交不代表稳定版本已发布。已知仍待核对展开窗口的鼠标穿透竞态。网站下载、设备权限和实机条件的限制见验收记录。

## 功能

- 顶部胶囊与左右竖栏停靠，主视口 760×560；石墨灰和冷白主题。
- 本地 Bloub 角色、对话、语音识别草稿和完整会话历史。
- 分类工具与统一搜索、文件快览、图片/PDF/ZIP、计算、文本和开发工具。
- 网页与本地音视频、录屏、流程及 LocalSend 协议互传。
- 统一普通文件和匿名媒体下载，解析后选择格式、播放列表、字幕和封面；使用固定版本 yt-dlp、Deno、FFmpeg/ffprobe。

## 开发

源码位于 `app/`，配套插件位于 `dsh-plugin/`；`vendor/EchoIsland/` 保留原生宿主引用的 Rust 模块。需要 Windows x64、Node.js 25+、npm、Python 3；编译原生插件另需相应 .NET/C++ 和 Rust 工具链。

```powershell
cd app
npm ci
python scripts/prepare-download-runtime.py
node scripts/prepare-source-assets.cjs '已解压的 eIsland v26.7.4/resources/app.asar'
npm run dev
```

下载引擎二进制不提交到 Git；准备脚本按照 `app/resources/download-runtime/manifest.json` 获取固定资源并校验 SHA256。安装包应包含这些资源，应用首次运行不补下载。

```powershell
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
npm run i18n:check
npm test -- --maxWorkers=4
npm run build
```

完整构建步骤、原生运行时来源与验证限制：

- [构建说明](app/docs/FloatIsland-1.3.0-BUILD.md)
- [逐项验收记录](app/docs/FloatIsland-1.3.0-ACCEPTANCE.md)
- [第三方组件与许可证](app/docs/THIRD_PARTY_TOOLS.md)

## 公开源码范围

仓库包含当前源码、依赖锁定、资源清单和许可证；不包含个人设置、账号数据、测试用户目录、图谱缓存、node_modules 或构建输出。便携版和安装版在最终验收后通过 Releases 分发。

独立上游网页项目、旧宣传截图和公告、历史部署工作流、一次性改版脚本及预编译 EXE/DLL 未上传。保留图标、字体和 PDF 渲染资源；大体积音频通过固定哈希清单在构建时恢复，应用运行时不会下载它们。Coucou 的旧图标和音效受独立素材许可限制，未纳入公开上传；许可证说明保留。当前默认角色为 Bloub。

## 来源与署名

本项目衍生自 [eIsland](https://github.com/JNTMTMTM/eIsland)，原作者署名保留：

- Copyright (C) 2026-present JNTMTMTM (https://github.com/JNTMTMTM)
- Copyright (C) 2026-present pyisland.com (https://pyisland.com)

沿用原项目 LICENSE（GPLv3 及原文附加条款），参见 [完整许可证](LICENSE)。原项目署名与平台限制保留在 [上游署名说明](app/docs/UPSTREAM-NOTICE.md)。Bloub、shadcn/ui、eSearch 等组件按各自许可证保留来源；项目不代表这些上游作者。
