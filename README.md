# 浮屿 · FloatIsland

FloatIsland 是 Windows 桌面的贴边工作台。展开后可使用对话、工具、音乐、阅读和下载，收起后保留当前工作区。界面支持深色与浅色主题、手动调整窗口尺寸，以及顶部、左侧和右侧停靠。

[下载 1.3.0](https://github.com/yanhaoran01/FloatIsland/releases/tag/v1.3.0) · [使用说明](docs/USER_GUIDE.md) · [构建说明](docs/BUILD.md) · [更新记录](CHANGELOG.md) · [许可证](LICENSE)

## 安装

支持 Windows 10/11 x64。

| 文件 | 用途 |
| --- | --- |
| `FloatIsland-1.3.0-Setup.exe` | 安装版，可选择安装目录 |
| `FloatIsland-1.3.0-portable.exe` | 免安装启动 |
| `FloatIsland-1.3.0-source.zip` | 与发布程序对应的源码、构建脚本和许可证 |
| `SHA256SUMS.txt` | 发布文件的 SHA-256 |

安装版与便携版沿用应用既有配置位置。便携版的“免安装”不代表用户数据自动保存到 EXE 所在目录。升级前退出旧程序；不要同时运行不同版本。卸载默认保留用户数据。

首次点击“开始使用”进入对话；停靠和快捷键可随后在设置中调整。需要模型连接的功能使用你配置的服务。

## 工作区

| 页面 | 主要内容 |
| --- | --- |
| 对话 | 模型连接、附件、语音草稿、会话历史及停止生成 |
| 工具 | 常用、媒体、效率、文件、开发五类目录；同一工作区的子功能显名排列 |
| 音乐 | 搜歌、歌单、本地音乐、正在播放、音源 |
| 阅读 | 书架、搜书、本地阅读、书源 |
| 下载 | 新建下载、视频/音频、BT/磁力、任务与历史 |

工具目录按实际工作区整理入口，保留旧工具 ID、子功能和历史映射。截图/OCR、图片、PDF、ZIP、文件指纹、局域网互传、计算、文本与开发工具仍通过各自工作区使用。复制、保存和适用的下一步操作位于结果附近。

默认展开尺寸为 760×560，通常最小为 560×420。切页不改变手动尺寸；已访问的页面和子功能保留输入、结果与滚动位置。重启恢复工作区时不会自动录音或播放。

### 文件与内容

音乐、阅读的专用导入默认引用原文件，支持文件选择、文件夹扫描及拖入。既有收藏库的拖入移动、目录结构和撤销机制继续保留。请注意两种导入方式的区别。

截图文字识别默认使用随程序附带的中文、英文模型，本地执行，无需 FloatIsland 账号。图片文字翻译会将识别出的文字提交给所选翻译服务；原图排版翻译属于独立云端服务，使用其实际登录与权限要求。

音乐播放、歌单和音质由具体音源决定。Hi-Res 选项不能提高低规格源文件的实际音质；搜索、歌单、播放和下载分别显示音源能力。第三方脚本需自行导入，截图中的音源名称不代表已预装或已验证兼容。

阅读支持本地电子书、PDF 和 Office 内容，并保留书源、OPDS 与原站入口。网站浏览和聚合搜索是不同能力。Z-Library 原站地址未获得可靠核验时保持未验证，由用户编辑地址。

下载共用任务和历史，支持现有 HTTP、媒体、原站及 aria2 任务模型。原站下载保留网站会话；暂停、继续和重试由实际引擎能力决定。网站验证、地区限制、过期链接和 DRM 会影响获取结果。

## 开发

应用位于 `app/`，配套插件位于 `dsh-plugin/`，EchoIsland 衍生源码位于 `vendor/EchoIsland/`。使用 Windows x64、Node.js 24.19 或更高版本、npm 和 Python 3。原生组件的完整编译另需 .NET、Rust 和 Visual Studio C++ 工具链。

```powershell
cd app
npm ci
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
npm test
npm run i18n:check
npm run build
```

新克隆在构建前须准备固定资源与原生运行时，步骤见[构建说明](docs/BUILD.md)。安装包包含运行所需的下载引擎和 OCR 模型；开发目录不依赖未提交的个人文件。

仓库保留源码测试和构建所需素材，不提交依赖目录、个人配置、测试结果、截图对比、临时运行目录或打包缓存。问题反馈与修改约定见[贡献说明](CONTRIBUTING.md)。

## 兼容与服务范围

UI 与本地工具可独立运行。模型、在线歌单、书源和下载站点需要网络或相应服务；接口可用性不能由空搜索结果证明。当前发布的界面回归不等于所有外部服务均已验证。蓝牙、麦克风、录屏音频、跨设备传输和硬件 GPU 效果需要实际设备条件。

详细的格式、服务和已知限制见[使用说明](docs/USER_GUIDE.md)。云端服务提示词仓库不在本源码中，其同步状态不属于本地构建通过条件。

## 来源与许可

FloatIsland 衍生自 [eIsland](https://github.com/JNTMTMTM/eIsland) / FusionIsland，保留原作者署名、原始许可证及资源声明：

- Copyright (C) 2026-present JNTMTMTM
- Copyright (C) 2026-present pyisland.com

本仓库沿用原项目 LICENSE，包括其中原文附加条款。原项目的使用与平台限制见[上游声明](app/docs/UPSTREAM-NOTICE.md)。第三方代码和资源适用各自许可，参见[组件清单](app/docs/THIRD_PARTY_TOOLS.md)、各 `vendor/` 目录及 `app/resources/licenses/`。AnyReader、foliate-js、Bloub 和其他衍生源码及修改说明随源码保留。

角色沿用固定版本的 Bloub SVG 引擎，补充状态表情和可取消的点击反馈；交互节奏参考 [BongoCat](https://github.com/ayangweb/BongoCat) 与 [nano-pet](https://github.com/Poseima/nano-pet)。这两项参考未引入额外桌面宠物运行时。
