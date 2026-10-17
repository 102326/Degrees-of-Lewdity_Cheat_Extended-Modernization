(() => {
    // ===== 控制變數初始化 =====
    V.purity =
        (typeof V.purity === "number" && !isNaN(V.purity)) ? V.purity : 1000;

    V.CE_purityControl =
        (typeof V.CE_purityControl === "boolean") ? V.CE_purityControl : false;

    V.CE_purityMax =
        (typeof V.CE_purityMax === "number" && !isNaN(V.CE_purityMax))
            ? V.CE_purityMax
            : 1000;

    V.CE_purityMin =
        (typeof V.CE_purityMin === "number" && !isNaN(V.CE_purityMin))
            ? V.CE_purityMin
            : 0;

    V.CE_purityAddMultiplier =
        (typeof V.CE_purityAddMultiplier === "number"
            && !isNaN(V.CE_purityAddMultiplier)
            && V.CE_purityAddMultiplier > 0)
            ? V.CE_purityAddMultiplier
            : 1;

    V.CE_puritySubMultiplier =
        (typeof V.CE_puritySubMultiplier === "number"
            && !isNaN(V.CE_puritySubMultiplier)
            && V.CE_puritySubMultiplier > 0)
            ? V.CE_puritySubMultiplier
            : 1;
})();

function CE_purityHandler(amount) {
    if (isNaN(amount)) return;
   
    console.log(`[Cheat Extended][CE_purityHandler] 傳入 amount = ${amount}`);
    
    // ===== 控制變數檢測 =====
    V.purity = (typeof V.purity === "number" && !isNaN(V.purity)) ? V.purity : 1000;
    V.CE_purityControl = (typeof V.CE_purityControl === "boolean") ? V.CE_purityControl : false;
    V.CE_purityMax = (typeof V.CE_purityMax === "number" && !isNaN(V.CE_purityMax)) ? V.CE_purityMax : 1000;
    V.CE_purityMin = (typeof V.CE_purityMin === "number" && !isNaN(V.CE_purityMin)) ? V.CE_purityMin : 0;
    V.CE_purityAddMultiplier = (typeof V.CE_purityAddMultiplier === "number" && !isNaN(V.CE_purityAddMultiplier) && V.CE_purityAddMultiplier > 0) ? V.CE_purityAddMultiplier : 1;
    V.CE_puritySubMultiplier = (typeof V.CE_puritySubMultiplier === "number" && !isNaN(V.CE_puritySubMultiplier) && V.CE_puritySubMultiplier > 0) ? V.CE_puritySubMultiplier : 1;
        
    // 根據增減使用不同倍率
    if (amount > 0) {
        amount *= V.CE_purityAddMultiplier ?? 1;
    } else if (amount < 0) {
        amount *= V.CE_puritySubMultiplier ?? 1;
    } else return;
    
    amount = Math.round(amount);
    
    console.log(`[Cheat Extended][CE_purityHandler] 輸出 amount = ${amount}`);
    
    const mod = Object.values(V.worn).reduce((prev, item) => {
        if (item.type.includes("holy")) return prev + 1;
        return prev;
    }, 1);

    V.purity = Math.clamp(V.purity + amount * mod, V.CE_purityMin, V.CE_purityMax);

    console.log(`[Cheat Extended] ✨ Purity hook, ${amount > 0 ? '增加' : '減少'}: ${Math.abs(amount * mod)}, 當前純潔: ${V.purity}`);
}

// Native purity still handles disabled controls and invalid inputs.
setup.CE_features.register('purity', () => {
    const target = statChange;
    const native = target.purity;
    let active = true;
    const wrapper = function (...args) {
        if (active && V.CE_purityControl && !isNaN(args[0])) return CE_purityHandler(Number(args[0]));
        return native.apply(this, args);
    };
    CE_MacroHook.hookMacro('purity', {
        owner: 'builtin:purity', base: true,
        around(original, ...args) {
            if (V.CE_purityControl && !isNaN(this.args[0])) return CE_purityHandler(Number(this.args[0]));
            return original.apply(this, args);
        }
    });
    target.purity = wrapper;
    return () => {
        active = false;
        CE_MacroHook.unregisterOwner('builtin:purity');
        if (target.purity === wrapper) target.purity = native;
    };
});
$(document).one(':passagestart', () => setup.CE_features.enable('purity'));
