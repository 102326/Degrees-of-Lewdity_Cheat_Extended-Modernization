/* DoL owns validation and bookkeeping; Money Watch routes sampled external net changes. */
setup.CE_features.register('money', () => {
    if (typeof V.CE_moneyCheat !== 'boolean') V.CE_moneyCheat = false;
    if (typeof V.CE_moneyInMultiplier !== 'number' || V.CE_moneyInMultiplier < 1) V.CE_moneyInMultiplier = 2;
    if (typeof V.CE_moneyOutMultiplier !== 'number' || V.CE_moneyOutMultiplier < 0) V.CE_moneyOutMultiplier = 0.5;
    if (typeof V.CE_moneyWatchEnabled !== 'boolean') V.CE_moneyWatchEnabled = false;

    let active = true;
    let baseline = null;
    let accounted = 0;
    let owner = null;
    let watching = false;
    let depth = 0;
    let settling = false;
    let fault = null;
    const reset = () => { baseline = null; accounted = 0; owner = null; watching = false; fault = null; };
    function context() {
        const state = State.variables;
        const enabled = state.CE_moneyWatchEnabled === true;
        if (owner !== state || watching !== enabled) {
            reset(); owner = state; watching = enabled;
        }
        return state;
    }
    function fail(error) {
        fault = String(error?.message || error);
        console.error('[Cheat Extended][Money Watch] Routing stopped; no automatic retry or rollback. Disable/re-enable after inspecting balance and moneyStats:', error);
    }
    const observe = lastMoney => Number.isFinite(V.money) && Number.isFinite(lastMoney)
        ? V.money - lastMoney - accounted : 0;
    observe.reset = reset;
    Object.defineProperty(observe, 'error', { get: () => fault });

    function dispatch(original, receiver, args, fromMacro = false) {
        if (!active || window.CE_moneyTransaction !== dispatch) return original.apply(receiver, args);
        const state = context();
        const before = state.money;
        const outermost = depth === 0;
        if (outermost && fromMacro) {
            // The author's Macro normalized these inputs before calling native money.
            args = [...args];
            args[0] = Number(args[0]);
            args[2] = args[2] || {};
            if (typeof args[2] === 'object' || typeof args[2] === 'function') {
                Reflect.set(args[2], '_CE_macroTriggered', true);
            }
        }
        if (outermost && V.CE_moneyCheat) {
            const [input, source, optional] = args;
            const amount = typeof input === 'number' || typeof input === 'string' ? Number(input) : NaN;
            const validSource = source === undefined || typeof source === 'string' || source instanceof String;
            const validOptions = optional === undefined || optional !== null && typeof optional === 'object';
            // Accessor/inherited flags remain entirely native: do not execute their getters twice.
            const flag = !fromMacro && validOptions && optional && Object.getOwnPropertyDescriptor(optional, 'recordOnly');
            const ordinaryTransaction = fromMacro || optional === undefined || validOptions &&
                (!('recordOnly' in optional) || flag && 'value' in flag && !flag.value);
            if (Number.isFinite(amount) && (fromMacro || validSource) && ordinaryTransaction) {
                const factor = amount > 0 ? V.CE_moneyInMultiplier : V.CE_moneyOutMultiplier;
                if (Number.isFinite(factor) && (amount > 0 && factor > 1 || amount < 0 && factor >= 0 && factor < 1)) {
                    args = [...args];
                    args[0] = amount * factor;
                    if (source && (fromMacro || typeof source === 'string')) {
                        args[1] = (source + '_modifiedByCE')
                            .replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
                            .replace(/^(.)/, c => c.toLowerCase());
                    }
                }
            }
        }
        depth++;
        try { return original.apply(receiver, args); }
        catch (error) {
            if (State.variables === state && watching && !fault) fail(error);
            throw error;
        }
        finally {
            depth--;
            if (State.variables !== state) reset();
            else if (outermost && watching && Number.isFinite(before) && Number.isFinite(state.money)) {
                accounted += state.money - before;
            }
        }
    }

    function tick() {
        if (!active || settling || depth) return;
        const state = context();
        if (!watching || fault) return;
        if (!Number.isFinite(state.money)) { fail(new Error('Non-finite balance')); return; }
        if (baseline === null) { baseline = state.money; accounted = 0; return; }
        const unexplained = observe(baseline);
        if (!Number.isFinite(unexplained) || !Number.isFinite(state.money - unexplained)) {
            fail(new Error('Non-finite net change or reconstructed balance')); return;
        }
        if (unexplained !== 0) {
            settling = true;
            try {
                if (window.CE_moneyTransaction !== dispatch || typeof Macro.get('money')?.handler !== 'function' ||
                    typeof Wikifier === 'undefined' || typeof Wikifier.wikifyEval !== 'function') {
                    throw new Error('Controlled money Macro unavailable or bridge replaced');
                }
                const restored = state.money - unexplained;
                state.money = restored;
                if (!active || State.variables !== state || !state.CE_moneyWatchEnabled) {
                    throw new Error('Money context changed during routing');
                }
                if (state.money !== restored) throw new Error('Money Hook rejected reconstruction');
                // Native execution (including nested wrappers) is one accounted boundary.
                Wikifier.wikifyEval(`<<money ${unexplained} unknown>>`);
                if (!Number.isFinite(state.money)) throw new Error('Native routing left a non-finite balance');
            } catch (error) {
                if (State.variables === state && !fault) fail(error);
                else if (State.variables !== state) console.error('[Cheat Extended][Money Watch] Old State routing interrupted:', error);
            } finally {
                settling = false;
            }
        }
        if (State.variables !== state) { reset(); return; }
        baseline = state.money;
        accounted = 0;
    }

    const saves = Save;
    window.CE_moneyTransaction = dispatch;
    window.CE_moneyWatch = observe;
    saves.onLoad.add(reset);
    $(document).on(':passagestart.CEMoney', context);
    function release() {
        active = false;
        if (window.CE_moneyTransaction === dispatch) delete window.CE_moneyTransaction;
        if (window.CE_moneyWatch === observe) delete window.CE_moneyWatch;
        reset();
        $(document).off(':passagestart.CEMoney', context);
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
