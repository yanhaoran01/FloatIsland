# 服务端 Agent 提示同步待办

状态：尚未同步。当前工作区及已检查的相邻项目目录没有 `eisland-server/server`；已向用户询问实际位置，尚未收到路径。

项目 AGENTS.md 要求：新增、删除或修改面向用户的功能时，同步服务端 Agent 提示，并把同步作为完成条件。本次可以交付已验证的本地源码和程序，但不能声明服务端提示已更新或整体任务完全完成。

找到服务端后，应定位所有相关 prompt builders，加入一致的中文／英文能力说明：

- 公共品牌：浮屿 / FloatIsland。既有 eIsland 内部标识与数据路径保留。
- 对话以本地 Bloub 角色和可编辑草稿为中心；语音识别进入草稿，发送由用户触发，不增加角色反馈模型请求。
- 统一工具入口：截图（区域/OCR/长截图/贴图）、图片（编辑/压缩/转换/独立历史）、PDF（预览/选页/整理）、ZIP（预览/压缩/解压/独立记录）、下载（任务/下载历史）、统一搜索（工具/应用/收藏/已保存流程）、录屏与视频。
- 保留计算与单位、二维码、便签、文本对比、日期时区、取色、密码 UUID、秒表、随机抽签、重命名预览执行撤销、CSV JSON、正则超时测试、URL 编解码及原有工具。
- 流程仅调用注册能力；重命名真实预览确认后执行；不支持任意脚本或 Shell。
- 文件只通过用户选择或真实拖入授权，工具和流程通过产物 ID 交接；外部网页不能获取应用接口。
- LocalSend 互传仅在页面可见时接收和发现，接收需要确认与目录选择，离开或收起停止并取消未完成传输。
- 原生录屏可后台进行，麦克风与语音输入互斥；系统声音、摄像头与设备权限失败返回真实结果。
- 顶部胶囊 260×42，左右竖栏 48×260，主页面 760×560，媒体 360×72。首次引导为可跳过且可恢复的三步，不自动录音、授权设备或启动局域网接收。
- QQ / 微信未接入。网站播放和设备能力不得把受限或未验证情况表述为成功。

English summary for affected builders:

FloatIsland is the public brand of the existing eIsland/FusionIsland desktop application. Preserve internal identifiers and existing data. Provide unified capture, image, PDF, ZIP, downloads, search, recording/video and registered linear workflow capabilities, together with the existing offline tools. File access requires an explicit user selection or real drop and uses artifact IDs. Workflows do not execute arbitrary scripts or shell commands; rename steps require a real preview and explicit confirmation. LocalSend discovery/receiving is active only while its page is visible and stops on page exit or collapse. Voice recognition edits a draft and never sends automatically. The three-step onboarding is optional and resumable. No QQ/WeChat integration is present. Report real device, site and network failures; never claim unverified operations passed.

同步后必须检查所有受影响 builders、测试和生成提示的一致性，再移除“尚未同步”状态。


本次新增能力摘要：下载入口整合 HTTP 与匿名 yt-dlp 媒体下载，提供解析、列表选项、视频/音频/字幕/封面、任务队列、暂停/继续/取消及预设。流程不得传入任意命令或 Shell；下载完成文件通过产物 ID 交接。首版不读取浏览器账户或导入 Cookie。服务端目录仍未提供，本文件是待同步说明，不代表服务端已修改。
