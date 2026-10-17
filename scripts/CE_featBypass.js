/* Bypass only during one original earnFeat call; never unlock the save permanently. */
setup.CE_features.register('achievement', () => {
    CE_MacroHook.hookMacro('earnFeat', {
        owner: 'builtin:achievement', base: true, cheatVar: 'CE_featBypass',
        around(original, ...args) {
            if (!V.CE_featBypass) return original.apply(this, args);
            const state = State.variables;
            const fields = [[state.feats, 'locked', false], [state, 'cheatsEnabled', false],
                [state, 'debug', false], [state, 'statFreeze', false], [state.settings, 'allureModifier', 1]];
            const saved = fields.filter(([target]) => target).map(([target, key, value]) =>
                ({ target, key, value, old: target[key], own: Object.hasOwn(target, key) }));
            try {
                for (const { target, key, value } of saved) target[key] = value;
                return original.apply(this, args);
            } finally {
                for (const { target, key, old, own } of saved) {
                    if (own) target[key] = old;
                    else delete target[key];
                }
            }
        }
    });
    return () => CE_MacroHook.unregisterOwner('builtin:achievement');
});
$(document).one(':passagestart', () => setup.CE_features.enable('achievement'));
