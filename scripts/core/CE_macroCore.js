/* Macro definitions belong to SugarCube; this registry owns only CE wrappers. */
window.CE_MacroHook = (() => {
    const rules = CE_createHookRegistry();
    const installed = new Map();

    function install(name) {
        const macro = Macro.get(name);
        const previous = installed.get(name);
        if (previous && previous.macro === macro && macro?.handler === previous.wrapper) return;
        installed.delete(name);
        if (!macro || typeof macro.handler !== 'function' || !rules.current[name]) return;
        const binding = { macro, original: macro.handler };
        binding.wrapper = function (...callArgs) {
            const config = rules.current[name];
            if (installed.get(name) !== binding || Macro.get(name) !== macro ||
                macro.handler !== binding.wrapper || !config) {
                return binding.original.apply(this, callArgs);
            }
            if (config.around) return config.around.call(this, binding.original, ...callArgs);
            let args = Array.from(this.args);
            const oldArgs = [...args];
            if (V[config.cheatVar] && config.modifyFunc) args = config.modifyFunc(args);
            for (let i = 0; i < args.length; i++) this.args[i] = args[i];
            if (config.logFunc) config.logFunc(name, oldArgs, args);
            const previousLock = setup.CE_macroLock;
            setup.CE_macroLock = true;
            try { return binding.original.apply(this, callArgs); }
            finally { setup.CE_macroLock = previousLock; }
        };
        macro.handler = binding.wrapper;
        installed.set(name, binding);
    }

    function unhookMacro(name, owner) {
        rules.unregister(name, owner);
        if (rules.current[name]) return;
        const binding = installed.get(name);
        installed.delete(name);
        if (binding && binding.macro.handler === binding.wrapper) binding.macro.handler = binding.original;
    }

    function installAll() {
        for (const name of Object.keys(rules.current)) install(name);
    }

    $(document).on(':passagedisplay', installAll);
    return {
        hookMacro(name, options = {}) {
            if (typeof name !== 'string' || !name) throw new Error('[Cheat Extended] Invalid Macro name');
            for (const [key, fallback] of [[options.cheatVar, false], [options.multiplierVar, 1], [options.negativeVar, 1]]) {
                if (key && typeof V[key] !== typeof fallback) V[key] = fallback;
            }
            rules.register(name, { ...options }, options.owner, options.preserveOrder);
            install(name);
        },
        unhookMacro,
        unregisterOwner(owner) {
            for (const name of rules.pathsForOwner(owner)) unhookMacro(name, owner);
        },
        installAll
    };
})();
