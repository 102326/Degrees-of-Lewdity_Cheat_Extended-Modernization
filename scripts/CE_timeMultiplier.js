/* Time passage keeps its native event chain; do not set the status Macro lock. */
setup.CE_features.register('time', () => {
    CE_MacroHook.hookMacro('pass', {
        owner: 'builtin:time', base: true,
        cheatVar: 'CE_timePassMultiplier', multiplierVar: 'CE_timeMultiplier',
        around(original, ...callArgs) {
            const before = this.args[0];
            if (V.CE_timePassMultiplier) {
                this.args[0] = Math.round(Number(this.args[0] ?? 0) * V.CE_timeMultiplier);
            }
            console.log(`[Cheat Extended] pass ${before} -> ${this.args[0]}`);
            return original.apply(this, callArgs);
        }
    });
    return () => CE_MacroHook.unregisterOwner('builtin:time');
});
$(document).one(':passagestart', () => setup.CE_features.enable('time'));
