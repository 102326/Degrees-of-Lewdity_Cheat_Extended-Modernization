/* DoL owns balances, validation and bookkeeping. CE adjusts real transaction inputs. */
setup.CE_features.register('money', () => {
    if (typeof V.CE_moneyCheat !== 'boolean') V.CE_moneyCheat = false;
    if (typeof V.CE_moneyInMultiplier !== 'number' || V.CE_moneyInMultiplier < 1) V.CE_moneyInMultiplier = 2;
    if (typeof V.CE_moneyOutMultiplier !== 'number' || V.CE_moneyOutMultiplier < 0) V.CE_moneyOutMultiplier = 0.5;
    if (typeof V.CE_moneyWatchEnabled !== 'boolean') V.CE_moneyWatchEnabled = false;

    let active = true;
    let baseline = null;
    let accounted = 0;
    const reset = () => { baseline = null; accounted = 0; };
    const observe = lastMoney => Number.isFinite(V.money) && Number.isFinite(lastMoney)
        ? V.money - lastMoney - accounted : 0;

    function dispatch(original, receiver, args) {
        if (!active || window.CE_moneyTransaction !== dispatch) return original.apply(receiver, args);
        const state = State.variables;
        const before = state.money;
        if (V.CE_moneyCheat) {
            const [input, source, optional] = args;
            const amount = typeof input === 'number' || typeof input === 'string' ? Number(input) : NaN;
            const validSource = source === undefined || typeof source === 'string' || source instanceof String;
            const validOptions = optional === undefined || optional !== null && typeof optional === 'object';
            // Accessor/inherited flags remain entirely native: do not execute their getters twice.
            const flag = validOptions && optional && Object.getOwnPropertyDescriptor(optional, 'recordOnly');
            const ordinaryTransaction = optional === undefined || validOptions &&
                (!('recordOnly' in optional) || flag && 'value' in flag && !flag.value);
            if (Number.isFinite(amount) && validSource && ordinaryTransaction) {
                const factor = amount > 0 ? V.CE_moneyInMultiplier : V.CE_moneyOutMultiplier;
                if (Number.isFinite(factor) && (amount > 0 && factor > 1 || amount < 0 && factor >= 0 && factor < 1)) {
                    args = [...args];
                    args[0] = amount * factor;
                    if (typeof source === 'string' && source) {
                        args[1] = (source + '_modifiedByCE')
                            .replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
                            .replace(/^(.)/, c => c.toLowerCase());
                    }
                }
            }
        }
        try { return original.apply(receiver, args); }
        finally {
            if (State.variables !== state) reset();
            else if (V.CE_moneyWatchEnabled && Number.isFinite(before) && Number.isFinite(state.money)) {
                accounted += state.money - before;
            }
        }
    }

    function tick() {
        if (!active) return;
        if (!V.CE_moneyWatchEnabled || !Number.isFinite(V.money)) { reset(); return; }
        if (baseline !== null) {
            const unexplained = observe(baseline);
            if (unexplained !== 0) console.warn('[Cheat Extended][Money Watch] Untracked balance change; observation only:', unexplained);
        }
        baseline = V.money;
        accounted = 0;
    }

    const saves = Save;
    window.CE_moneyTransaction = dispatch;
    window.CE_moneyWatch = observe;
    saves.onLoad.add(reset);
    function release() {
        active = false;
        if (window.CE_moneyTransaction === dispatch) delete window.CE_moneyTransaction;
        if (window.CE_moneyWatch === observe) delete window.CE_moneyWatch;
        reset();
        saves.onLoad.delete(reset);
    }
    try {
        if (registerCE_genericTimeEvent('onSec', 'CE_money_Watch', tick) === false) {
            throw new Error('[Cheat Extended] Money clock listener could not register');
        }
    } catch (error) { release(); throw error; }
    return () => {
        active = false;
        let failure;
        try { unregisterCE_genericTimeEvent('onSec', 'CE_money_Watch'); }
        catch (error) { failure = error; }
        try { release(); }
        catch (error) { failure ??= error; }
        if (failure) throw failure;
    };
});

$(document).one(':passagestart', () => {
    try { setup.CE_features.enable('money'); }
    catch (error) { console.error('[Cheat Extended] Money module unavailable', error); }
});
