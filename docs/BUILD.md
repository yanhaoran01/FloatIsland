# 构建与发布

## 源码结构

| 路径 | 内容 |
| --- | --- |
| `app/src/main` | 窗口、权限、文件、下载、阅读及服务协调 |
| `app/src/preload` | 有类型的受限 IPC 接口 |
| `app/src/renderer` | React 工作区、工具、角色及主题 |
| `app/resources` | 图标、OCR 模型、下载资源清单和许可证 |
| `app/plugins`、`app/native` | Windows 原生组件源码 |
| `app/vendor`、`vendor/EchoIsland` | 固定版本的上游及衍生源码 |
| `app/i18n` | 简体中文与英文 |
| `dsh-plugin` | 配套插件 |
| `docs` | 使用、构建及贡献资料 |

## 环境

使用 Windows x64、Node.js 24.19 或更新版本、npm、Python 3。1.3.0 的 Electron 版本由锁文件固定。原生插件包含 .NET 与 C++ 实现；EchoIsland 主机包含 Rust 实现。完整编译需安装各工程文件声明的 .NET SDK、Rust 工具链、Visual Studio C++ 构建工具及 Windows SDK。

本次发布使用固定 eIsland v26.7.4 原生运行时；JavaScript 绑定必须与固定来源匹配，打包脚本会拒绝不一致的绑定。修改原生源码时须自行重编对应组件，不能沿用旧 DLL 并声称修改已经生效。原生运行时来源与校验保留在程序的 `resources/runtime-provenance.json`。

## 准备资源

在项目 `app` 目录执行：

```powershell
npm ci
python scripts/prepare-download-runtime.py
```

下载资源依据 `resources/download-runtime/manifest.json` 获取，脚本校验下载包及解压文件 SHA-256。OCR 模型随源码保留。固定上游音频使用资源清单恢复，避免把无关二进制混入仓库：

```powershell
node scripts/prepare-source-assets.cjs '固定上游的 resources/app.asar'
```

上游资源必须来自 eIsland v26.7.4。音频恢复脚本逐文件验证清单，原生准备脚本验证版本与绑定。不能使用任意新版本替代固定来源。

在仓库根目录构建三个 Rust 主机后再打包：

```powershell
./scripts/build-echoisland-sidecar.ps1
```

## 检查与构建

```powershell
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
npm run i18n:check
npm test
npm run build
```

测试代码和用于验证算法/格式的夹具属于源码，必须保留。测试结果 JSON、日志、覆盖率和临时截图属于本机产物，不提交。

开发启动前需编译本机原生插件，或用下述固定运行时启动已构建应用。只执行 `npm ci` 不会自动补齐全部 Windows 原生 DLL。插件构建脚本见 `package.json` 的 `plugins:build`；Rust 主机工程见 `native/` 和 `vendor/EchoIsland/`。本地服务与模型设置不包含于源码。

## 同源打包

从新的、专属输出目录开始，避免复用旧程序或旧结果：

```powershell
$env:FUSION_UPSTREAM_RESOURCES = '固定 eIsland v26.7.4/resources'
$env:FUSION_BUILD_DIR = 'D:/FloatIsland-build/runtime'
$env:FUSION_OUTPUT_DIR = 'D:/FloatIsland-build/output'

node scripts/release-workflow.cjs checks
node scripts/release-workflow.cjs build
node scripts/release-workflow.cjs stage
node scripts/release-workflow.cjs verify
node scripts/release-workflow.cjs package
```

`stage-product-runtime.cjs` 保留固定原生组件，并从当前锁定依赖复制生产模块及嵌套依赖。新增的 Tesseract worker、WASM core 与 OCR 模型必须随包提供，不从 CDN 临时获取。

发布流程核对源码摘要、锁文件摘要、构建标识和全部编译文件。检查完成后修改了源码，必须重新检查、构建。打包后的 ASAR 会逐文件与当前编译输出比较，并验证原生 GUI 启动、依赖加载及下载运行时。失败时打包中止。

安装版与便携版使用同一编译输出。产物名称为 `FloatIsland-1.3.0-Setup.exe` 与 `FloatIsland-1.3.0-portable.exe`。包未配置代码签名，Windows 可能显示未知发布者；不要把未签名描述为已签名。

## 发布目录与源码包

源码包保留源代码、锁文件、必要资源、构建脚本、测试夹具、上游署名和许可证。排除 `node_modules`、`out`、`target`、`bin`、`obj`、个人配置、令牌、缓存、过程报告、临时图片和旧源码副本。下载引擎二进制通过固定清单重现，安装包中包含运行资源。

GitHub Release 提供安装版、便携版、完整源码 ZIP 和 SHA-256 文件。Release 正文只记录实际交付变化、平台和已知限制。仓库根目录不堆放历史测试输出；构建证据放在发布工作目录内，交付时仅保留必要产物。

## 服务与设备边界

服务端提示词位于独立服务端仓库，当前源码不包含该服务端。UI 和本地构建不能证明云端提示词同步、账号服务或外部音源可用。硬件 GPU、麦克风、蓝牙、跨设备互传、登录网站、受限制媒体和在线接口需要独立实测。软件 GPU 的窗口检查不能代替硬件图形验收。
