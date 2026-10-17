/*==============================
CE Custom Hook 保存 / 重建工具
--------------------------------
1. 只保存設定，不保存 function
2. 保存 Hook 於 V.CE_customHooks
3. 臨時 Hook 於 setup.CE_runtimeCustomHooks
4. 支援監聽模式 monitor
5. 支援臨時自訂邏輯 custom
6. custom 模式預設不允許保存到存檔
==============================*/

(function(){

    const savedRegistrations = new Map();
    const runtimeRegistrations = new Map();
    let active = false;

    function ownerOf(hook) {
        const id = hook.saved ? hook.id : hook.runtimeId;
        return `${hook.saved ? "saved" : "runtime"}:${id ?? hookKey(hook)}`;
    }

    // A copied ID with a different definition is not the same restored rule.
    // Enabled/saved flags and State identity do not change the definition.
    function definitionOf(hook) {
        return JSON.stringify({
            type: hook.type, path: hook.path,
            targetPath: String(hook.targetPath || "").trim(),
            mode: hook.mode, value: hook.value,
            customCode: String(hook.customCode || ""),
            posMult: Number(hook.posMult), negMult: Number(hook.negMult),
            maxDepth: Number(hook.maxDepth) || 2
        });
    }

    function engineFor(type) {
        if (type === "VarHook") return window.VarHook;
        if (type === "RawHook") return window.RawHook;
        if (type === "DeepProxyHook") return window.DeepProxyHook;
    }

    if (typeof V.CE_allowCustomHookSave !== "boolean") {
        V.CE_allowCustomHookSave = false;
    }
    
    function ensureStore(){
        if (!Array.isArray(V.CE_customHooks)) {
            V.CE_customHooks = [];
        }

        return V.CE_customHooks;
    }

    function ensureRuntimeStore(){
        if (!Array.isArray(setup.CE_runtimeCustomHooks)) {
            setup.CE_runtimeCustomHooks = [];
        }

        return setup.CE_runtimeCustomHooks;
    }

    function makeId(){
        return Date.now() + "_" + Math.random().toString(36).slice(2);
    }

    function hookKey(hook){
        return [
            hook.type,
            hook.path,
            hook.targetPath || "",
            hook.mode
        ].join("|");
    }

    function runCustomCode(hook, ctx, fallbackValue){
        try {
            const code = String(hook.customCode || "");

            if (!code.trim()) {
                return fallbackValue;
            }

            const fn = new Function(
                "ctx",
                "V",
                "State",
                "setup",
                code
            );

            return fn(ctx, V, State, setup);
        }
        catch(e) {
            console.error("[cheat Extended][Custom Hook customCode error]", hook.path, e);
            return fallbackValue;
        }
    }

    setup.CE_makeCustomHookSnapshot = function(state){
        return {
            id: makeId(),
            runtimeId: makeId(),
            enabled: true,
            saved: !!state.saveToStore,

            type: state.type,
            path: String(state.path || "").trim(),
            targetPath: String(state.targetPath || "").trim(),

            mode: state.mode,
            value: state.value,
            customCode: String(state.customCode || ""),

            posMult: Number(state.posMult),
            negMult: Number(state.negMult),
            maxDepth: Number(state.maxDepth) || 2
        };
    };

    setup.CE_saveCustomHook = function(hook){
        if (
            hook?.mode === "custom" &&
            !(V.debug === 1 && V.CE_allowCustomHookSave)
        ) {
            alert("自訂邏輯模式不允許保存到存檔。");
            return;
        }

        const list = ensureStore();
        const key = hookKey(hook);
        const oldIndex = list.findIndex(item => hookKey(item) === key);

        const canSaveCustom =
            V.debug === 1 &&
            V.CE_allowCustomHookSave === true;

        const savedHook = {
            ...hook,
            customCode: hook.mode === "custom" && canSaveCustom
                ? String(hook.customCode || "")
                : "",
            saved: true
        };

        if (oldIndex >= 0) {
            savedHook.id = list[oldIndex].id;
            list[oldIndex] = savedHook;
        }
        else {
            list.push(savedHook);
        }
        return savedHook;
    };

    setup.CE_removeCustomHook = function(id){
        const list = ensureStore();
        const index = list.findIndex(item => item.id === id);

        if (index >= 0) {
            list.splice(index, 1);
        }
    };

    setup.CE_addRuntimeCustomHook = function(hook){
        const list = ensureRuntimeStore();
        const key = hookKey(hook);
        const oldIndex = list.findIndex(item => hookKey(item) === key);

        const runtimeHook = {
            ...hook,
            runtimeId: makeId(),
            saved: false
        };

        if (oldIndex >= 0) {
            runtimeHook.runtimeId = list[oldIndex].runtimeId;
            list[oldIndex] = runtimeHook;
        }
        else {
            list.push(runtimeHook);
        }
        return runtimeHook;
    };

    setup.CE_removeRuntimeCustomHook = function(runtimeId){
        const list = ensureRuntimeStore();
        const index = list.findIndex(item => item.runtimeId === runtimeId);

        if (index >= 0) {
            list.splice(index, 1);
        }
    };

    setup.CE_promoteRuntimeCustomHook = function(runtimeId){
        const list = ensureRuntimeStore();
        const hook = list.find(item => item.runtimeId === runtimeId);

        if (!hook) {
            alert("找不到臨時 Hook");
            return;
        }

        if (
            hook.mode === "custom" &&
            !(V.debug === 1 && V.CE_allowCustomHookSave)
        ) {
            alert("自訂邏輯模式不允許保存到存檔。");
            return;
        }

        const savedHook = setup.CE_saveCustomHook({
            ...hook,
            saved: true,            
        });
        if (!savedHook) return;

        setup.CE_unregisterCustomHookConfig(hook);
        setup.CE_removeRuntimeCustomHook(runtimeId);
        setup.CE_registerCustomHookConfig(savedHook);
        setup.CE_installAllCustomHooks();

        alert("已保存 Hook 到存檔：\n" + hook.path);
    };

    setup.CE_unregisterCustomHookConfig = function(hook){
        if (!hook) return;

        // The path-only UI command keeps its explicit whole-path behavior.
        const owner = hook.id != null || hook.runtimeId != null ? ownerOf(hook) : undefined;
        if (hook.type === "VarHook") VarHook.unregister?.(hook.path, owner);
        if (hook.type === "RawHook") RawHook.unregister?.(hook.path, owner);
        if (hook.type === "DeepProxyHook") DeepProxyHook.unregister?.(hook.path, owner);
        if (owner) { savedRegistrations.delete(owner); runtimeRegistrations.delete(owner); }
        setup.CE_installAllCustomHooks?.();
    };

    setup.CE_registerCustomHookConfig = function(hook, preserveOrder = false){
        if (!active || !hook || !engineFor(hook.type)) return;
        if (hook.enabled === false) {
            setup.CE_unregisterCustomHookConfig(hook);
            return;
        }

        const path = hook.path;
        const owner = ownerOf(hook);
        const ownership = {
            owner,
            preserveOrder,
            orderKey: definitionOf(hook),
            scope: hook.saved ? State.variables : undefined,
            isEnabled: () => active && hook.enabled !== false && (
                !hook.saved || hook.mode !== "custom" ||
                (V.debug === 1 && V.CE_allowCustomHookSave === true)
            )
        };
        if (hook.saved) savedRegistrations.set(owner, hook);
        else runtimeRegistrations.set(owner, hook);

        const registerVar = (path, pos, neg, options = {}) =>
            VarHook.register(path, pos, neg, { ...options, ...ownership });
        const registerRaw = (path, options) =>
            RawHook.register(path, { ...options, ...ownership });
        const registerDeep = (path, options) =>
            DeepProxyHook.register(path, { ...options, ...ownership });

        if (hook.type === "VarHook") {

            if (hook.mode === "monitor") {
                registerVar(path, 1, 1, {
                    after(oldValue, finalValue, diff, adjustedDiff, ctx){
                        console.log(
                            hook.saved ? "[cheat Extended][Saved VarHook Monitor]" : "[cheat Extended][Runtime VarHook Monitor]",
                            ctx.path,
                            oldValue,
                            "→",
                            finalValue,
                            "diff:",
                            diff,
                            "adjustedDiff:",
                            adjustedDiff
                        );
                    }
                });
            }

            if (hook.mode === "custom") {
                registerVar(path, 1, 1, {
                    transform(ctx){
                        return runCustomCode(hook, ctx, ctx.newValue);
                    },
                    after(oldValue, finalValue, diff, adjustedDiff, ctx){
                        console.log(
                            "[cheat Extended][Runtime VarHook Custom]",
                            ctx.path,
                            oldValue,
                            "→",
                            finalValue,
                            "diff:",
                            diff
                        );
                    }
                });
            }

            if (hook.mode === "multiplier") {
                registerVar(
                    path,
                    Number(hook.posMult),
                    Number(hook.negMult)
                );
            }

            if (hook.mode === "lock") {
                registerVar(path, 1, 1, {
                    transform(ctx){
                        return ctx.old;
                    }
                });
            }

            if (hook.mode === "blockIncrease") {
                registerVar(path, 1, 1, {
                    transform(ctx){
                        if (ctx.diff > 0) return ctx.old;
                        return ctx.old + ctx.adjustedDiff;
                    }
                });
            }

            if (hook.mode === "blockDecrease") {
                registerVar(path, 1, 1, {
                    transform(ctx){
                        if (ctx.diff < 0) return ctx.old;
                        return ctx.old + ctx.adjustedDiff;
                    }
                });
            }
        }

        if (hook.type === "RawHook") {

            if (hook.mode === "monitor") {
                registerRaw(path, {
                    after(oldValue, finalValue, ctx){
                        console.log(
                            hook.saved ? "[cheat Extended][Saved RawHook Monitor]" : "[cheat Extended][Runtime RawHook Monitor]",
                            ctx.path,
                            oldValue,
                            "→",
                            finalValue
                        );
                    }
                });
            }

            if (hook.mode === "custom") {
                registerRaw(path, {
                    transform(ctx){
                        return runCustomCode(hook, ctx, ctx.newValue);
                    },
                    after(oldValue, finalValue, ctx){
                        console.log(
                            "[cheat Extended][Runtime RawHook Custom]",
                            ctx.path,
                            oldValue,
                            "→",
                            finalValue
                        );
                    }
                });
            }

            if (hook.mode === "lock") {
                registerRaw(path, {
                    transform(ctx){
                        return ctx.old;
                    }
                });
            }

            if (hook.mode === "forceValue") {
                registerRaw(path, {
                    transform(){
                        return hook.value;
                    }
                });
            }
        }

        if (hook.type === "DeepProxyHook") {

            registerDeep(path, {
                maxDepth: Number(hook.maxDepth) || 2,
                ignoreKeys: ["length"],

                transform(ctx){
                    const targetPath = String(hook.targetPath || "").trim();

                    if (targetPath && ctx.fullPath !== targetPath) {
                        return ctx.newValue;
                    }

                    if (hook.mode === "monitor") return ctx.newValue;
                    if (hook.mode === "custom") return runCustomCode(hook, ctx, ctx.newValue);
                    if (hook.mode === "lock") return ctx.oldValue;
                    if (hook.mode === "forceValue") return hook.value;

                    if (hook.mode === "allowIncreaseOnly") {
                        const oldNum = Number(ctx.oldValue);
                        const newNum = Number(ctx.newValue);

                        if (!Number.isNaN(oldNum) && !Number.isNaN(newNum)) {
                            if (newNum < oldNum) return ctx.oldValue;
                        }

                        return ctx.newValue;
                    }

                    if (hook.mode === "allowDecreaseOnly") {
                        const oldNum = Number(ctx.oldValue);
                        const newNum = Number(ctx.newValue);

                        if (!Number.isNaN(oldNum) && !Number.isNaN(newNum)) {
                            if (newNum > oldNum) return ctx.oldValue;
                        }

                        return ctx.newValue;
                    }

                    return ctx.newValue;
                },

                delete(ctx){
                    const targetPath = String(hook.targetPath || "").trim();

                    if (targetPath && ctx.fullPath !== targetPath) {
                        return true;
                    }

                    if (hook.mode === "blockDelete") {
                        return false;
                    }

                    return true;
                },

                after(oldVal, finalVal, ctx){
                    const targetPath = String(hook.targetPath || "").trim();

                    if (targetPath && ctx.fullPath !== targetPath) {
                        return;
                    }

                    console.log(
                        hook.saved ? "[cheat Extended][ aved DeepProxyHook]" : "[cheat Extended][Runtime DeepProxyHook]",
                        ctx.fullPath,
                        oldVal,
                        "→",
                        finalVal,
                        "mode:",
                        hook.mode
                    );
                }
            });
        }
    };

    setup.CE_installAllCustomHooks = function(){
        VarHook?.installAll?.();
        RawHook?.installAll?.();
        DeepProxyHook?.installAll?.();
    };

    setup.CE_rebuildSavedCustomHooks = function(){
        if (!active) return;
        const list = ensureStore();

        // Reconcile only saved owners; builtins and document-session rules survive.
        // Rebuilding an existing owner must not change explicit registration order.
        const wanted = new Map();
        for (const hook of list) {
            if (!hook || !engineFor(hook.type) || hook.enabled === false) continue;
            if (hook.mode === "custom" && !(V.debug === 1 && V.CE_allowCustomHookSave === true)) continue;
            wanted.set(ownerOf(hook), hook);
        }
        for (const [owner, hook] of savedRegistrations) {
            const next = wanted.get(owner);
            if (!next || next.type !== hook.type || next.path !== hook.path) {
                engineFor(hook.type)?.unregister?.(hook.path, owner);
                savedRegistrations.delete(owner);
            }
        }
        for (const hook of wanted.values()) {
            setup.CE_registerCustomHookConfig(hook, true);
        }

        setup.CE_installAllCustomHooks();
    };

    const onPassage = () => { if (active) setup.CE_rebuildSavedCustomHooks(); };
    const release = () => {
        active = false;
        $(document).off(':passagestart', onPassage);
        for (const hook of [...savedRegistrations.values(), ...runtimeRegistrations.values()]) {
            setup.CE_unregisterCustomHookConfig(hook);
        }
    };
    setup.CE_features.register('custom-hooks', () => {
        active = true;
        try {
            for (const hook of ensureRuntimeStore()) setup.CE_registerCustomHookConfig(hook, true);
            setup.CE_rebuildSavedCustomHooks();
            $(document).on(':passagestart', onPassage);
        } catch (error) { release(); throw error; }
        return release;
    });
    setup.CE_features.enable('custom-hooks');

})();


