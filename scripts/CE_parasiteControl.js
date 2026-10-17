// 寄生物懷孕功能變數初始化
/* Cheat Extended - Custom Parasite Limit Init */
(function () {
	if (typeof V === "undefined") return;

	// 是否啟用自訂寄生物上限
	if (V.CE_parasiteControl === undefined) {
		V.CE_parasiteControl = false;
	}

	// 無限模式（fetus.length + 1）
	if (V.CE_parasiteUnlimited === undefined) {
		V.CE_parasiteUnlimited = false;
	}

	// 手動上限：陰道
	if (V.CE_parasiteMaxVagina === undefined || isNaN(V.CE_parasiteMaxVagina)) {
		V.CE_parasiteMaxVagina = 4;
	}

	// 手動上限：肛門
	if (V.CE_parasiteMaxAnus === undefined || isNaN(V.CE_parasiteMaxAnus)) {
		V.CE_parasiteMaxAnus = 2;
	}

	// 保底安全
	V.CE_parasiteMaxVagina = Math.max(1, V.CE_parasiteMaxVagina);
	V.CE_parasiteMaxAnus = Math.max(1, V.CE_parasiteMaxAnus);
})();

// Chance belongs to the original Macro; CE only adjusts its numeric input.
setup.CE_features.register('parasite', () => {
    if (typeof V.CE_parasiteMultiplierEnable !== 'boolean') V.CE_parasiteMultiplierEnable = false;
    if (typeof V.CE_parasiteMultiplier !== 'number') V.CE_parasiteMultiplier = 1;
    CE_MacroHook.hookMacro('impregnateParasite', {
        owner: 'builtin:parasite', base: true,
        around(original, ...args) {
            if (V.CE_parasiteMultiplierEnable) {
                const before = Array.from(this.args);
                if (typeof this.args[1] === 'number') this.args[1] *= Math.max(1, V.CE_parasiteMultiplier);
                if (!Array.isArray(V.CE_parasiteMultiplierLog)) V.CE_parasiteMultiplierLog = [];
                V.CE_parasiteMultiplierLog.push({time: `第${Time.days}天`, macro: 'impregnateParasite', before: clone(before), after: clone(Array.from(this.args))});
                if (V.CE_parasiteMultiplierLog.length > 5) V.CE_parasiteMultiplierLog.shift();
            }
            return original.apply(this, args);
        }
    });
    return () => CE_MacroHook.unregisterOwner('builtin:parasite');
});
$(document).one(':passagestart', () => setup.CE_features.enable('parasite'));

// 自訂寄生物上限計算函數
// (在原版代碼插入此函數打補丁）
function CE_parasiteControlLimit(orifice = "anus") {
    // 無限模式
    if (V.CE_parasiteUnlimited) {
        const fetusArr = V.sexStats[orifice]?.pregnancy?.fetus;
        if (Array.isArray(fetusArr)) {
            const unlimitedCount = fetusArr.length + 1;
            console.log(`[Cheat Extended] ✨ CE_calculateParasiteLimit 無限模式, orifice: ${orifice}, 上限: ${unlimitedCount}`);
            return unlimitedCount;
        }
    }

    // 手動模式
    let customLimit;
    switch (orifice) {
        case "vagina":
            customLimit = parseInt(V.CE_parasiteMaxVagina);
            break;
        case "anus":
            customLimit = parseInt(V.CE_parasiteMaxAnus);
            break;
        default:
            customLimit = 1;
    }

    if (isNaN(customLimit) || customLimit < 1) customLimit = 1;
    console.log(`[Cheat Extended] ✨ CE_calculateParasiteLimit 手動模式, orifice: ${orifice}, 上限: ${customLimit}`);
    return customLimit;
}

