# Cheat Extended — 重构研究版

原 Mod 作者：[chris81605](https://github.com/chris81605)。
对应原项目：[Degrees-of-Lewdity_Cheat_Extended](https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended)。
原项目中隨風飄逸及其他作者/贡献者的署名、功能来源与感谢名单按原文保留。
重构维护：[102326](https://github.com/102326)。
原始基线：c36b23a6ab1899c7f780faa63945fe6e199a6355，1.20.3.1。
本地版本：1.20.3.1-rebuild.28，2026-10-17。

本包为 CE 重制候选，保留原 UI，以 Core 分离与原生业务入口替代旧框架及余额重放。
Simple Framework 已退役，不再作为运行依赖或回退路径。MapleBirch 声明最低版本为 >=3.2.5，实际代表性验证为 5.4.3；其它版本未验证。
rebuild.16 定向修订 Hook 对象重绑值保全、第三方属性归属、时间快捷按钮、释放失败后的失活及停用期间的战斗边界。
rebuild.18 继续整理服装特质定义与穿着预设的所有权及启停，保留编辑器 UI 和存档结构。读档只回收 CE 拥有的定义修改；重置设置清除本模块配置，不回滚原生库存和已编辑的穿戴实例。特质清理异常仍会恢复无关的 Custom Hook 模块并保留报错。
SweetAlert2Mod 改为可选提示增强；CE 删除 ImageLoaderHook 的重复直接声明，Maple 的美化组件仍可能间接需要它。GameVersion 约束保留，具体安装需求见 readme.md。
rebuild.19 仅澄清服装动态刷新、单件套回初始特质与撤销全部覆写的区别，以及自动预设停用后的手动面板边界；不改变这些业务行为。30项补丁为24项 TweeReplacer 加6项 ReplacePatcher（4 JS＋2 Twee）。
rebuild.20 修正自訂眼色、髮色與膚色色表的跨讀檔殘留，只回收仍歸 CE 的投影。自動同步停用保留當前外觀所需色表；手動面板仍可操作，重新啟用後在下一頁面同步。
rebuild.21 補齊自動橋停用後手動新增眼色的鍵保留，同時避開保存陣列與色表中的既有編號。
rebuild.22 修正同名第三方顏色插到 CE 條目前方後，再編輯時的目標與基線一致性。第三方以 slice 淺拷貝替換整個色表，視為新容器接管；其中攜帶的舊 CE 物件可保留，清理仍只處理原記錄容器。
rebuild.23 整理敵方狀態顯示的頁面、讀檔與動畫資源；離開頁面或停用時取消自有回調並移除自有容器。保留原血條樣式與戰鬥數據來源，補純觸手場景及無效顯示數值防護。
rebuild.26 整理側欄顯示、語言觀察器、選單臨時資源、外觀刷新與五個探索地圖。取消與失活只處理自有回調/節點；未勾選隱藏時不強制顯示其他 UI 隱藏的元素。語言轉換保留可編輯輸入值並跟隨動態文字。外觀管線在原生頁面邊界同步，停用按步驟物件身份清理。手動庫存、快捷、循環與森林商店保留原入口和資料權威；本輪不承諾整包熱卸載。
rebuild.28 補齊排序面板自有原生 Dialog 的關閉，第三方替換或共用內容時不代為關閉，並按原生 Dialog.open(options, onClose) 接入關閉回調；動態文字入口遵守 PRE/CODE/TEXTAREA/SCRIPT/STYLE 祖先排除規則。
保留父 Deep 与子 Var/Raw、父子 Deep 的组合规则及旧 State/真实对象替换防护。
父子 Deep 都参与同一次写入时，祖先变换先执行，结果交给后代；各执行一次，注销一项保留另一项。
跨存档自动恢复沿用已知规则的登记顺序；显式新增、更新或重新启用才提高优先级。
离线组合验证不替代真实宿主加载、读档和 Patch 命中验证；本包未正式发布。
保留原作界面和功能入口，属于衍生重构研究制品，并非原作者正式发布版本或其对修改的背书。
当前源码、定向验证和未验证范围见工程 CE_REBUILD_MAP.md；早期 R1 记录见 docs/R1.md。

保留原 LICENSE.txt（CC BY-NC-SA 4.0）及原作者署名。
Spectrum 的 MIT 通知保留于 scriptEarly/Utils/spectrum.js 文件头。
OpenCC 来源与 Apache 2.0 说明保留于 scripts/lan_t2s/README.md 和原字典文件。
没有将旧资产或第三方资产重新许可。构建工具 JSZip 仅供开发打包，不随运行脚本加载。

Paisley Park 6.1.0 仅作开发辅助；CE 不依赖 Paisley Park、Soft & Wet 或 Stone Free。
