# Cheat Extended：公开源码与验证范围

当前修订为`1.20.3.1-rebuild.29`，专项恢复直接改写余额的原生收支处理，见[金钱合同与验证说明](docs/release/REBUILD29_MONEY_RECOVERY.md)。rebuild.28 的 ZIP、摘要和标签保持冻结，其它已接受模块保持原范围。下方原 28 说明作为历史验证记录保留，不代表 29 重跑了整套旧包迁移及两端矩阵。

## 发布入口

- [正式说明、依赖、安装与回滚](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/RELEASE-NOTES.md)
- [发布页面说明](docs/release/REBUILD28_RELEASE_PAGE.md)
- [问题反馈模板](docs/release/REBUILD28_FEEDBACK_TEMPLATE.md)
- [源码与冻结制品身份](docs/release/REBUILD28_SOURCE_IDENTITY.md)

## 已交付

运行核心与功能接线已整理：Hook规则所有权和重绑、原生金钱交易、时间与战斗边界、服装/色表归属、敌方面板及菜单/语言/外观/地图临时资源。退出Simple Framework路径，继续使用原游戏和必要的MapleBirch接口；不引入Stone Free、Paisley Park或管理器运行依赖。

当前装配为3 early / 55 normal / 21 Twee / 3 CSS，94个ZIP成员；24项TweeReplacer与6项ReplacePatcher（4 JS＋2 Twee）。注册、装配与业务结果分开判断。

## 验证范围

开发方已有Windows Chrome与Android WebView代表性组合、原生保存/真实重启或文档重载/读档/重置及目标模块结果；187项项目检查按既有记录复用，本次公开源码整理未重跑，也不与现场计数相加。独立文件复核不等于独立重跑测试。

固定上游1.20.3.1源码原生生成的旧版样本在Windows由28完成读入、另存、文档重载再读及重置。Android另用作者实际发行ZIP（包内1.20.3.1）原生生成样本，仅替换CE后完成读入、另存、真实App重启、再读及重置；首次迁移17项和另存后检查27项分别通过。两种输入的旧版A组Hook失效均保留，不能把整个A/B写为全部通过。长期玩家旧档、其它历史版本、Simple-only迁移和反向降级仍未验证。独立复核确认了文件/源码身份和记录一致性，没有独立重跑游戏。

停用/重置不撤销既有金钱、时间、库存及穿戴效果。Dialog归属、动态文字排除、颜色容器接管、页面边界渲染同步和手动面板等范围按玩家说明与源码注释保留；整包不承诺热卸载。天气背景一次异常根因unknown，不宣称所有游戏环境无异常。

## 后续

优先处理有复现步骤的数据风险、功能失效和高频反馈，再选择具体业务目标；UI和性能改进按实际问题推进。未覆盖的设备、组合或业务不自动记为缺失实现，不设固定等待天数或反馈人数门槛。

内部验收记录、设备标识、机器路径和生成存档不随公开源码分发。当前发布源码在原公开基线上整理为独立提交，未包含内部研发分支历史；详见源码身份说明。
