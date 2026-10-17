# rebuild.28：公开源码与冻结运行包

发布标签：`v1.20.3.1-rebuild.28`，指向公开运行源码提交 `dcdfee74eac03dc3bad35c7b9356d4aea618ef24`。原发布分支 `release/rebuild.28-limited-test` 保留；`main` 已通过正常合并纳入该源码，默认克隆可直接用于后续维护。现有主分支历史、正式发布 ZIP 和标签均保留。

## 身份对应

- 游戏内版本：`1.20.3.1-rebuild.28`。
- 运行ZIP：`Cheat-Extended-1.20.3.1-rebuild.28.mod.zip`。
- ZIP SHA-256：`597a0297e462f14ef9db5f0fedbf0a4a2108e6f3011bd7e5d288c1f7c0224c61`。
- 研发时固定运行输入ID：`79c5ad388de82aca261b1d012dd21e5d478cf3d8`。这是来源记录，其内部历史未推送；它不是本次公开标签的目标。
- 上游基线：`c36b23a6ab1899c7f780faa63945fe6e199a6355`。公开提交基于既有公开`0a56aa4e675d8f905f906f6714d6e304490adddd`，保留上游历史与署名。

固定标签中的全部打包资源与冻结包逐项对应；boot按既有打包器JSON序列化后比较，其余包内文件逐字节比较。构建脚本、锁文件和测试源码保留固定运行输入的原字节。内部工程说明改为公开摘要，原始验收报告和私有数据未分发。发布附件沿用冻结ZIP，没有重新打包。

`main` 同步正式运行代码、补丁、清单、构建脚本、锁文件和测试，同时保留更新后的首页及维护说明。`readme.md` 本身是包内资源，因此从当前主分支构建的 ZIP 包含新版首页，不能使用冻结包的 SHA-256 标识它。精确复现已发布 ZIP 应检出固定标签；原标签中的通知及预发布说明保留冻结时的历史措辞，当前发布状态以 Release 页面为准。

## 构建与检查

使用Node.js `>=22.12.0`，在仓库根目录执行：

```sh
npm ci
npm run build
```

构建输出为`dist/cheat-extended-r1.mod.zip`，其游戏内版本以boot为准。`.gitattributes`保留上游混合换行字节；不要通过统一格式化运行资源来更新发布说明。

需要精确复现冻结包时，先在干净的克隆中执行 `git checkout v1.20.3.1-rebuild.28`，再运行上述安装和构建命令。不要覆盖本地未提交修改。主分支新构建只是本地输出，不替换现有 Release 附件，也不自动成为新版本。

本次只做源码/制品字节和公开内容核对，复用既有187项及现场结果，没有重新执行整包测试或实机矩阵。需要运行历史对照测试时请使用Git clone，源码ZIP不包含测试所用的Git历史。

安装、备份及旧档升级范围见[正式版使用说明](https://github.com/102326/Degrees-of-Lewdity_Cheat_Extended-Modernization/releases/download/v1.20.3.1-rebuild.28/RELEASE-NOTES.md)。Android 已完成作者发行 1.20.3.1 原生生成样本的代表性升级，Windows 仍按固定源码样本使用各自证据；长期玩家旧档、其它历史版本、Simple-only 迁移及反向降级未验证。原许可、Spectrum/OpenCC通知及贡献者署名保持，未将第三方资产重新许可。
