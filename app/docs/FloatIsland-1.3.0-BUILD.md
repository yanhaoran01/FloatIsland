# 浮屿 / FloatIsland 1.3.0

Windows x64。公共名称为 FloatIsland；内部标识 `fusionisland`、`com.fusionisland.desktop` 和已有数据路径保留。便携版不会自动迁移或清空旧数据。

## 运行

运行 `FloatIsland-1.3.0-portable.exe`，或安装 `FloatIsland-1.3.0-Setup.exe`。亦可直接运行交付目录 `win-unpacked/FloatIsland.exe`。首次使用在主窗口内完成三步引导；已有首次启动标记的用户不会重复看到引导。设置可重新打开引导。

顶端收起态 260×42，左右收起态 48×260，媒体条 360×72；展开统一 760×560 DIP，小屏按工作区限制。悬停只高亮，点击或快捷键展开。默认快捷键注册冲突时会显示真实结果，允许改成未占用组合键。

## 从源码构建

需要 Windows x64、Node.js 25 或更新版本、npm；原生插件完整编译另需项目各插件声明的 .NET / C++ 工具链。

```powershell
npm ci
python scripts/prepare-download-runtime.py
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
npm run i18n:check
npm test
npm run build
```

交付程序使用固定 eIsland v26.7.4 原生运行时。源码保留原生插件源码；预编译运行时的哈希记录在程序 `resources/runtime-provenance.json` 和验收证据中。

```powershell
$env:FUSION_UPSTREAM_RESOURCES = '已解压的 eIsland v26.7.4/resources'
$env:FUSION_BUILD_DIR = Join-Path (Split-Path (Get-Location).Path -Parent) 'packaging-runtime-1.3.0-fixed'
$env:FUSION_OUTPUT_DIR = '本地交付输出目录'
node scripts/prepare-fusion-runtime.cjs $env:FUSION_UPSTREAM_RESOURCES $env:FUSION_BUILD_DIR
node scripts/stage-product-runtime.cjs
node scripts/package-fusion.cjs
```

`stage-product-runtime.cjs` 当前使用源码父目录下 `packaging-runtime-1.3.0-fixed`，应与上面环境变量一致。它保留 npm 嵌套依赖结构，更新新增生产依赖的物理文件。不要复用缺少新依赖的旧打包目录。打包脚本会校验安装包内每个编译文件与当前 `out` 的哈希，并在打包后的 Electron GUI 中验证原生钩子启动和释放；任何失败会中止打包。

源包不包含 node_modules、个人配置、验证用证书、构建缓存或已编译原生插件。依赖精确版本由 package-lock.json 保留；生产包已经包含离线依赖、PDF worker/字体/cmap、FFmpeg 和第三方许可证。

## 来源

应用继承 eIsland / FusionIsland 的 GPL-3.0 版权与内部数据协议。Bloub、shadcn/ui、electron-pixel-picker 和 eSearch 的固定源码、许可证及修改说明见各 vendor 目录和 `docs/THIRD_PARTY_TOOLS.md`。Seelen UI、PowerToys Dock、QuickLook、ShareX 为交互参考；LocalSend v2 为兼容协议实现。


## 媒体下载运行时

下载工具统一普通 HTTP 任务和匿名媒体任务。视频、音频、列表、字幕、封面及预设共用历史；解析不会自动下载。任务默认并行 2 项，设置为 1–4 项。下载阶段可暂停，后处理阶段仅支持取消。重启后媒体未完成任务保持暂停，不自动联网。

程序自带 yt-dlp 2026.08.19、Deno 2.9.7 和 FFmpeg/ffprobe 9.0.2 GPL shared 版，不需要安装 Python 或首次启动下载依赖。精确来源与 SHA256 见 `resources/download-runtime/manifest.json`；依赖及许可证随源码包提供。打包过程验证全部运行时哈希，并执行四个程序的版本查询。

网站要求登录、机器人验证、地区授权或 DRM 时返回实际错误。首版不导入 Cookie，不能保证所有站点在匿名网络条件下可下载。

## GitHub 纯源码版本

仓库不包含预编译 EXE/DLL、独立上游网站、宣传截图、本地验证目录或大体积 WAV。图标、字体、PDF 资源及许可证保留；媒体程序由准备脚本按固定哈希获取。音频清单见 `resources/source-assets.json`，构建前使用 `node scripts/prepare-source-assets.cjs <eIsland-v26.7.4/resources/app.asar>` 恢复；每个文件验证大小和 SHA256。`--check` 只验证、不写文件。匹配的 FloatIsland 安装包中同样的 `app.asar` 也可作为音频来源。

原生宿主需要 Windows Rust 工具链。在仓库根目录执行：

```powershell
cargo build --release --manifest-path app/native/fusion-host/Cargo.toml
cargo build --release --manifest-path vendor/EchoIsland/Cargo.toml -p desktop-host
Copy-Item app/native/fusion-host/target/release/fusion-host.exe app/resources/echoisland/fusion-host.exe
Copy-Item app/native/fusion-host/target/release/fusion-hook.exe app/resources/echoisland/fusion-hook.exe
Copy-Item vendor/EchoIsland/target/release/desktop-host.exe app/resources/echoisland/desktop-host.exe
```

`vendor/EchoIsland` 保留宿主依赖的 Rust crates、宿主源码及终端聚焦模块，移除未使用的独立 Tauri UI workspace 成员；固定提交和修改说明见 `UPSTREAM.json`。这些步骤用于补齐纯源码仓库省略的程序，不代表此上传步骤已经重新完成原生编译验收。
