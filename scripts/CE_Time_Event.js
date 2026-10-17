// One provider for real clock-event semantics; no passage-event substitute.
function registerCE_genericTimeEvent(eventType, eventName, callback) {
    const dynamic = window.maplebirch?.dynamic;
    if (typeof dynamic?.regTimeEvent !== 'function') {
        console.error('[Cheat Extended] MapleBirch dynamic.regTimeEvent unavailable: ' + eventName);
        return false;
    }
    return dynamic.regTimeEvent(eventType, eventName, {
        action: callback, priority: 0, once: false
    });
}

window.registerCE_genericTimeEvent = registerCE_genericTimeEvent;

function unregisterCE_genericTimeEvent(eventType, eventName) {
    return window.maplebirch.dynamic.delTimeEvent(eventType, eventName);
}
window.unregisterCE_genericTimeEvent = unregisterCE_genericTimeEvent;

// Own native clock registrations as one feature; do not replace the provider's event semantics.
function registerCE_timeFeature(id, events) {
    setup.CE_features.register(id, () => {
        const owned = [];
        let active = false;
        const release = () => {
            active = false;
            let failure;
            for (const [type, name] of owned) {
                try { unregisterCE_genericTimeEvent(type, name); }
                catch (error) { failure ??= error; }
            }
            if (failure) throw failure;
        };
        try {
            for (const [type, name, action] of events) {
                if (registerCE_genericTimeEvent(type, name, function (...args) {
                    if (active) return action.apply(this, args);
                }) === false) {
                    throw new Error('[Cheat Extended] Clock registration failed: ' + id + '/' + name);
                }
                owned.push([type, name]);
            }
        } catch (error) {
            try { release(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Clock feature initialization failed'); }
            throw error;
        }
        active = true;
        return release;
    });
    return setup.CE_features.enable(id);
}
window.registerCE_timeFeature = registerCE_timeFeature;

// 範例使用：
registerCE_timeFeature('daily-status', [[
    'onAfter',
    'CE_自動調溫',
    () => {
        if (V.swich_auto_clothes_Warmth !== 1) return;

        const min = 36.5;
        const max = 37.5;

        const now = Weather.BodyTemperature.get();
        let corrected = now;

        if (now < min) {
            corrected = min;
            
        } else if (now > max) {
            corrected = max;
            
        }

        if (corrected !== now) {
            Weather.BodyTemperature.set(corrected);

            console.warn(
                `[Cheat Extended][AutoThermo] 被動恆溫修正: ` +
                `${now.toFixed(2)} → ${corrected.toFixed(2)}`
            );
        }
    }
], [
    'onDay',
    'CE_額外狀態恢復',
    () => {
        if (!V.swich_extraStatusRestore) return; // 開關檢查

        const restoreTargets = {
            pain: 0,
            arousal: 0,
            tiredness: 0,
            stress: 0,
            trauma: 0,
            control: 1000,
            drunk: 0,
            drugged: 0,
            hallucinogen: 0
        };

        const restoreRates = {
            pain: 50,
            arousal: 30,
            tiredness: 20,
            stress: 15,
            trauma: 10,
            control: 50,
            drunk: 50,
            drugged: 50,
            hallucinogen: 50
        };

        Object.keys(restoreTargets).forEach(key => {
            if (typeof V[key] === "number") {
                const target = restoreTargets[key];
                const current = V[key];
                const distance = target - current;
                const rate = restoreRates[key];
                const change = distance * 0.01 * rate;

                if (Math.abs(change) < 0.01) {
                    V[key] = target;
                } else {
                    V[key] += change;
                }

                // 輸出控制台
                if (change !== 0) {
                    console.log(`[cheat Extended][extraStatusRestore] ${key}: ${current.toFixed(2)} → ${V[key].toFixed(2)}`);
                }
            }
        });
    }
]]);
