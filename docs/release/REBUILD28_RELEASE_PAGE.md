# Cheat Extended 1.20.3.1-rebuild.28｜正式版

本版是 Cheat Extended 的重制版本，保留原有菜单、面板和操作入口，重点修复功能行为，整理 Hook、事件与界面资源的生命周期，并退出旧 Simple Framework 接入。

本次正式发布沿用已验证的 `1.20.3.1-rebuild.28` 冻结运行包，支持范围见下文。首次升级仍请保留旧包与原存档备份。

[下载运行包](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/Cheat-Extended-1.20.3.1-rebuild.28.mod.zip) · [安装、升级与已知边界](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/RELEASE-NOTES.md) · [本版源码](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/tree/v1.20.3.1-rebuild.28)

## 本版改动

| 范围 | 技术变化 |
| --- | --- |
| Hook 与规则 | 分离 Hook 核心和操作界面，整理 Var、Raw、Deep Hook 的注册、对象重绑、注销及保存规则恢复，保全其它修改方仍拥有的属性与新值。 |
| 金钱、时间与战斗 | 金钱改用游戏原生交易入口，避免重放余额；修正时间快捷按钮的重复导航和失败后导航，补齐每战一次标记与功能启停的边界处理。 |
| 服装与自定义颜色 | 按实际修改对象记录归属、原属性描述和恢复基线；撤销仅处理仍归 CE 所有的覆盖，继续使用原库存、穿戴和第三方状态来源。 |
| 界面生命周期 | 整理敌方状态面板、侧栏、菜单、语言转换、外观刷新和探索地图的监听、定时器、动画帧及临时节点，阻止过期回调继续更新旧视图。 |
| 框架与依赖 | 使用 MapleBirch 和游戏原有接口替代旧 Simple Framework 路径；删除 SweetAlert 硬依赖，保留可选增强与原生提示回退。 |

## 安装与依赖

1. 备份原 CE 包和升级前存档，保留可恢复的旧环境。
2. 下载上方 `.mod.zip`，通过 ModLoader 或所用管理器的正常导入入口安装，同一环境保留一份 CE。
3. 按依赖提示安装并重启游戏，确认版本为 `1.20.3.1-rebuild.28`。首次升级请另存，不要覆盖唯一旧档。

| 包内依赖声明 | 版本范围 |
| --- | --- |
| Degrees of Lewdity（`GameVersion`） | `>=0.5.12.13` |
| ModLoader | `>=2.17.0` |
| TweeReplacer | `>=1.0.0` |
| ReplacePatcher | `>=1.0.0` |
| maplebirch（MapleBirch） | `>=3.2.5` |

`GameVersion` 是游戏版本约束，无需安装同名 Mod。SweetAlert2Mod 可选；CE 不再直接声明 ImageLoader，但 Maple 相关组件可能仍间接需要它。ModHub 和 DoLGameUI 等不是 CE 必需依赖，ModHub 导入流程未单独验收。上述声明范围宽于实际测试组合，不代表所有满足最低版本的组合都已验证。

## 验证范围与升级限制

开发方已验证 DoL `0.5.12.13`、Lyra `0.5.12.13-1.0.1a-1004.1-goose-ucb`、ModLoader `2.101.1`、MapleBirch `5.4.3`、DoLGameUI `2.7.0` 及对应的 39 Mod 组合。

| 平台 | 验证宿主 |
| --- | --- |
| Windows | Chrome `155.0.8059.84`，使用测试 APK 游戏资产，仅移除两条 Cordova 桥标签；未验收 Windows 封装 App 或 Cordova 桥。 |
| Android | Android `17` / WebView `154.0.8037.58`。 |

Android 已使用原作者 [1.20.3 Release](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/releases/tag/1.20.3) 中包内版本为 `1.20.3.1` 的实际发行 ZIP，原生生成代表性配置，仅替换 CE 后完成读入、另存、真实 App 重启、再读及重置。覆盖偏好、保存型 RawHook 的配置与实际效果、肤色/眼色及服装特质。旧包样本中的 Hook 重启后失效，rebuild.28 读取同一规则后恢复有效。

Windows 已完成固定上游源码生成样本的对应升级检查。两种输入分别记录。**真实玩家长期旧档、其它历史 CE 版本、Simple-only 环境迁移及新版档向旧版降级未验证，不保证任意旧档无条件覆盖升级。** 开发方运行验证与独立文件复核各按其范围使用。

新版保存不保证旧版可读，回滚依靠升级前的包与存档备份。停用或重置不会撤销已经发生的金钱、时间、库存、穿戴等游戏效果，也不等于恢复全部外观。

服装单件还原与批量撤销、关闭自动预设后仍可操作的旧手动面板、排序窗口归属及外观刷新时机，详见[正式版使用说明](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/RELEASE-NOTES.md)。Windows 测试准备中曾出现一次原生天气背景异步回调异常，根因仍为 **unknown**，未证明由 CE 引起；后续通过的结论仅覆盖已记录步骤。其它设备、版本和 Mod 组合未验证。

## 附件与校验

| 附件 | 用途 |
| --- | --- |
| [Cheat-Extended-1.20.3.1-rebuild.28.mod.zip](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/Cheat-Extended-1.20.3.1-rebuild.28.mod.zip) | 可导入的冻结运行包。 |
| [RELEASE-NOTES.md](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/RELEASE-NOTES.md) | 安装、回滚与已知边界。 |
| [SHA256SUMS.txt](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/SHA256SUMS.txt) | 运行包、玩家说明与反馈模板的 SHA-256。 |
| [FEEDBACK-TEMPLATE.md](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/FEEDBACK-TEMPLATE.md) | 问题反馈模板。 |

附带的 `LIMITED-TEST-NOTES.md` 保留为预发布时的历史说明；当前安装与支持范围以 `RELEASE-NOTES.md` 为准。

运行 ZIP 的 SHA-256：

```text
597a0297e462f14ef9db5f0fedbf0a4a2108e6f3011bd7e5d288c1f7c0224c61
```

## 源码、署名与反馈

默认克隆的 `main` 已通过保留历史的合并纳入当前正式版运行源码。精确复现已发布包仍使用固定标签 [`v1.20.3.1-rebuild.28`](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/tree/v1.20.3.1-rebuild.28)。主分支保留新版 README，它属于打包资源，本地重打包摘要可能不同；发布 ZIP 和标签保持不变。随附说明及固定标签文档中的“main 尚未合并”为发布时状态，当前入口见[源码与构建说明](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/blob/main/docs/release/REBUILD28_SOURCE_IDENTITY.md)。

原 Mod 作者为 [chris81605](https://github.com/chris81605)，重制维护为 [102326](https://github.com/102326)，保留隨風飄逸及其它原贡献者署名。本项目为独立衍生维护，不代表原作者正式发行或背书。沿用 CC BY-NC-SA 4.0，包内 Spectrum（MIT）、OpenCC（Apache 2.0）等第三方代码保留各自许可与通知。

请在[仓库 Issues](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/issues)使用附件模板反馈，提供 CE、游戏与框架版本、触发步骤、预期和实际结果，可选附脱敏截图或日志，无需默认提供完整存档。优先处理数据风险、功能失效和高频问题。
