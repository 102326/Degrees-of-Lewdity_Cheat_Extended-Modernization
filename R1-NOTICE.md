# Cheat Extended — 重构研究版

原 Mod 作者：[chris81605](https://github.com/chris81605)。
对应原项目：[Degrees-of-Lewdity_Cheat_Extended](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended)。
原项目中隨風飄逸及其他作者/贡献者的署名、功能来源与感谢名单按原文保留。
重构维护：[102326](https://github.com/102326)。
原始基线：c36b23a6ab1899c7f780faa63945fe6e199a6355，1.20.3.1。
本地版本：1.20.3.1-r1.2，2026-10-16。

本包修复 Hook 注销、保存规则清算与归属、嵌套宏锁、可选 Framework 查询及资源清单。
R1.2 修复父 Deep 与子 Var/Raw、父子 Deep 的组合回归，保留旧 State/真实对象替换防护。
父子 Deep 都参与同一次写入时，祖先变换先执行，结果交给后代；各执行一次，注销一项保留另一项。
跨存档恢复的自定义规则优先级（F3）仍未解决，R1 不作完成或正式发布声明。
保留原作界面和功能入口，属于衍生重构研究制品，并非原作者正式发布版本或其对修改的背书。
源码、定向验证和未验证范围见工程 docs/R1.md。

保留原 LICENSE.txt（CC BY-NC-SA 4.0）及原作者署名。
Spectrum 的 MIT 通知保留于 scriptEarly/Utils/spectrum.js 文件头。
OpenCC 来源与 Apache 2.0 说明保留于 scripts/lan_t2s/README.md 和原字典文件。
没有将旧资产或第三方资产重新许可。构建工具 JSZip 仅供开发打包，不随运行脚本加载。

Paisley Park 6.0.0 仅作开发辅助；CE 不依赖 Paisley Park、Soft & Wet 或 Stone Free。
