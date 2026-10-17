# Cheat Extended 1.20.3.1-rebuild.28｜限定测试版

本版整理CE的运行核心和功能接线，保留原UI、菜单与操作入口。适合愿意在独立副本或可回滚环境中试用、反馈问题的玩家；暂不作为面向所有旧用户直接覆盖升级的正式稳定版。

主要变化：退出旧Simple Framework路径；金钱使用游戏原生交易入口；整理Hook、时间、战斗边界、服装/颜色归属，以及菜单、侧栏、语言、外观和地图的临时资源。

## 安装前

先备份原CE包和原存档。通过原ModLoader或所用管理器的正常导入入口安装，同一环境保留一份CE，重启后确认版本为`1.20.3.1-rebuild.28`。新版保存不保证旧版可读，回滚依赖升级前备份。

依赖：DoL / GameVersion `>=0.5.12.13`、ModLoader `>=2.17.0`、TweeReplacer `>=1.0.0`、ReplacePatcher `>=1.0.0`、maplebirch（MapleBirch）`>=3.2.5`。GameVersion无需另装同名Mod；SweetAlert2Mod可选，ImageLoader可能仍被Maple相关组件间接需要。ModHub不是CE必需依赖，未单独验收其导入流程。

## 已验证与边界

已验证组合为DoL`0.5.12.13`、Lyra`0.5.12.13-1.0.1a-1004.1-goose-ucb`、Loader`2.101.1`、MapleBirch`5.4.3`、DoLGameUI`2.7.0`及对应39 Mod。平台为Windows Chrome`155.0.8059.84`与Android`17` / WebView`154.0.8037.58`。Windows是使用测试APK资产、仅移除两条Cordova桥标签的Chrome浏览器宿主，未验收Windows封装App。

固定上游源码生成的代表性旧版样本，已由28完成读入、另存、跨文档再读及重置检查；该专项只覆盖Windows。**作者发行ZIP、真实玩家长期旧档、Android升级等尚未验证，不承诺任意旧用户直接覆盖升级。** 开发方验证、独立文件复核与未覆盖范围分别保留。

停用或重置不撤销已发生的金钱、时间、库存、穿戴等效果。服装还原语义、旧手动面板、排序窗口、渲染同步与天气unknown等已知边界，见附件`LIMITED-TEST-NOTES.md`；使用前请阅读。

## 下载与校验

- `Cheat-Extended-1.20.3.1-rebuild.28.mod.zip`：冻结运行包。
- `LIMITED-TEST-NOTES.md`：玩家说明、安装及已知边界。
- `SHA256SUMS.txt`：附件校验信息。
- `FEEDBACK-TEMPLATE.md`：简短反馈模板。

运行ZIP SHA-256：`597a0297e462f14ef9db5f0fedbf0a4a2108e6f3011bd7e5d288c1f7c0224c61`。

原作者chris81605，重构维护102326，保留隨風飄逸及其他贡献者署名。本项目为独立衍生维护，不代表原作者正式发行或背书。沿用CC BY-NC-SA 4.0及包内Spectrum MIT、OpenCC Apache 2.0等原许可与通知。

反馈请提供CE／游戏／框架版本、触发步骤、预期和实际结果，可选附脱敏截图或日志；无需默认提供完整存档。优先处理数据风险、功能失效和高频问题，确认缺陷后再做定向修复。

## 源码

公开源码使用标签`v1.20.3.1-rebuild.28`，分支为`release/rebuild.28-limited-test`；主分支未合并。运行资源逐项对应冻结ZIP，内部研发历史未公开。来源与验证范围见[源码身份说明](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/blob/v1.20.3.1-rebuild.28/docs/release/REBUILD28_SOURCE_IDENTITY.md)。
