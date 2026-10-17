/* Keep the original settings and arithmetic; only module ownership changes. */
setup.CE_features.register('status', () => {
    const options = { owner: 'builtin:status', base: true };
    for (const [path, name] of [
        ['pain', 'pain'], ['trauma', 'trauma'], ['control', 'control'],
        ['stress', 'stress'], ['arousal', 'arousal'], ['tiredness', 'tired'],
    ]) {
        VarHook.register(path, `CE_${name}Multiplier`, `CE_${name}NegativeMultiplier`, options);
    }
    VarHook.register('angelBanish', 1, () => V?.CE_noAngelBanishLoss ? 0 : 1, options);
    VarHook.register('oxygen', 1, () => V?.CE_lockOxygenEnabled ? 0 : 1, options);
    VarHook.register('wardrobe.space', 1, 1, {
        ...options,
        transform(ctx) {
            if (!V?.bigest_wardrobe_swich) return ctx.old + ctx.adjustedDiff;
            if (Number(ctx.newValue) === Number(V?.bigest_wardrobe_fix)) return ctx.newValue;
            return ctx.old;
        }
    });
    VarHook.installAll();
    return () => VarHook.unregisterOwner(options.owner);
});

$(document).one(':passagestart', () => setup.CE_features.enable('status'));
