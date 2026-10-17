/**
 * ========================================================
 * Cheat Extended 宏 Hook 通用函數說明
 * ========================================================
 *
 * 功能：
 *  1. 安全 hook Twine/SugarCube 宏，保留原始 this 上下文。
 *  2. 可修改任意數量參數（args），支援正負倍率、單倍率或自訂邏輯。
 *  3. 支援 log 輸出前後參數變化。
 *  4. 可快速擴充新宏，只需呼叫 hookMacro()。
 *
 * 核心函數：
 *  hookMacro(macroName, options)
 *
 * 參數說明：
 *  - macroName : 字串，宏的名稱 (Macro.get(macroName))
 *  - options : 物件，包含以下欄位：
 *      * cheatVar        : V 物件上的開關名稱 (boolean)，開啟/關閉作弊
 *      * multiplierVar   : V 物件上的正數倍率名稱 (number)
 *      * negativeVar     : V 物件上的負數倍率名稱 (number，可選)
 *      * modifyFunc      : 函數 (args) → 回傳修改後的 args 陣列
 *                          args 是宏原始傳入的參數陣列，可修改任意參數或新增參數
 *      * logFunc         : 函數 (macroName, oldArgs, newArgs)，可自訂 log
 *
 * 使用範例：
 * hookMacro('pain', {
 *     cheatVar: 'CE_painCheat',
 *     multiplierVar: 'CE_painMultiplier',
 *     negativeVar: 'CE_painNegativeMultiplier',
 *     modifyFunc: args => {
 *         args[0] = args[0] > 0 ? args[0] * V.CE_painMultiplier : args[0] * V.CE_painNegativeMultiplier;
 *         args[1] = args[1] ?? 4; // 保留或補預設值
 *         return args;
 *     },
 *     logFunc: (name, oldArgs, newArgs) => console.log(`😌 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
 * });
 *
 * 注意事項：
 *  1. 所有宏的 this 上下文會被保留，不會丟失隱藏屬性。
 *  2. 若宏有多個參數需修改，可全部寫在 modifyFunc 中操作。
 *  3. 不需要修改的參數可以直接保留。
 *  4. 若需要新增參數，也可以在 modifyFunc 裡補入 args 陣列。
 *  5. logFunc 可自訂 log 或直接省略。
 *
 * ========================================================
 * 作者: CahtGpt & 隨風飄逸
 * 日期: 2025-12-05
 * ========================================================
 */

(function(){

    function registerMacroHooks(){

        // ------------------- Pain / Masopain -------------------
        ["pain", "masopain"].forEach(name => {
            CE_MacroHook.hookMacro(name, {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_painCheat",
                multiplierVar: "CE_painMultiplier",
                negativeVar: "CE_painNegativeMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    args[0] = amount > 0
                        ? amount * V.CE_painMultiplier
                        : amount * V.CE_painNegativeMultiplier;

                    if (name === "pain") {
                        args[1] = args[1] ?? 4;
                    }

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 😌 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });

        // ------------------- Trauma -------------------
        ["trauma", "combattrauma", "straighttrauma"].forEach(name => {
            CE_MacroHook.hookMacro(name, {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_traumaCheat",
                multiplierVar: "CE_traumaMultiplier",
                negativeVar: "CE_traumaNegativeMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    args[0] = amount > 0
                        ? amount * V.CE_traumaMultiplier
                        : amount * V.CE_traumaNegativeMultiplier;

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 💀 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });

        // ------------------- Control -------------------
        ["control", "combatcontrol"].forEach(name => {
            CE_MacroHook.hookMacro(name, {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_controlCheat",
                multiplierVar: "CE_controlMultiplier",
                negativeVar: "CE_controlNegativeMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    args[0] = amount > 0
                        ? amount * V.CE_controlMultiplier
                        : amount * V.CE_controlNegativeMultiplier;

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 🎮 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });

        // ------------------- Stress -------------------
        CE_MacroHook.hookMacro("stress", {
            owner: "builtin:macro-status", base: true,
            cheatVar: "CE_stressCheat",
            multiplierVar: "CE_stressMultiplier",
            negativeVar: "CE_stressNegativeMultiplier",

            modifyFunc: args => {
                let amount = Number(args[0] ?? 0);

                args[0] = amount > 0
                    ? amount * V.CE_stressMultiplier
                    : amount * V.CE_stressNegativeMultiplier;

                return args;
            },

            logFunc: (name, oldArgs, newArgs) =>
                console.log(`[Cheat Extended][macroHook] 😰 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
        });

        // ------------------- Sensitivity -------------------
        ["breast", "mouth", "genital", "bottom"].forEach(key => {
            CE_MacroHook.hookMacro(key + "_sensitivity", {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_sensCheat",
                multiplierVar: "CE_sensMultiplier",
                negativeVar: "CE_sensNegativeMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    args[0] = amount > 0
                        ? amount * V.CE_sensMultiplier
                        : amount * V.CE_sensNegativeMultiplier;

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 🥵 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });

        // ------------------- Arousal -------------------
        ["arousal", "breastarousal", "genitalarousal"].forEach(name => {
            CE_MacroHook.hookMacro(name, {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_arousalCheat",
                multiplierVar: "CE_arousalMultiplier",
                negativeVar: "CE_arousalNegativeMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    args[0] = amount > 0
                        ? amount * V.CE_arousalMultiplier
                        : amount * V.CE_arousalNegativeMultiplier;

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 🔥 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });

        // ------------------- Tiredness -------------------
        CE_MacroHook.hookMacro("tiredness", {
            owner: "builtin:macro-status", base: true,
            cheatVar: "CE_tiredCheat",
            multiplierVar: "CE_tiredMultiplier",
            negativeVar: "CE_tiredNegativeMultiplier",

            modifyFunc: args => {
                let amount = Number(args[0] ?? 0);

                args[0] = amount > 0
                    ? amount * V.CE_tiredMultiplier
                    : amount * V.CE_tiredNegativeMultiplier;

                return args;
            },

            logFunc: (name, oldArgs, newArgs) =>
                console.log(`[Cheat Extended][macroHook] 😴 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
        });

        // ------------------- SexSkill -------------------
        [
            "oralskill", "vaginalskill", "penileskill", "handskill", "analskill",
            "feetskill", "bottomskill", "thighskill", "chestskill",
            "beauty", "seductionskill", "skulduggery"
        ].forEach(name => {
            CE_MacroHook.hookMacro(name, {
                owner: "builtin:macro-status", base: true,
                cheatVar: "CE_skillCheat",
                multiplierVar: "CE_skillMultiplier",

                modifyFunc: args => {
                    let amount = Number(args[0] ?? 0);

                    if (amount > 0) {
                        args[0] = amount * V.CE_skillMultiplier;
                    }

                    return args;
                },

                logFunc: (name, oldArgs, newArgs) =>
                    console.log(`[Cheat Extended][macroHook] 💪 ${name} ${oldArgs[0]} → ${newArgs[0]}`)
            });
        });
    }

    setup.CE_features.register('macro-status', () => {
        registerMacroHooks();
        return () => CE_MacroHook.unregisterOwner('builtin:macro-status');
    });
    $(document).one(":passagedisplay", () => setup.CE_features.enable('macro-status'));

})();
