/* Cheat Extended R1: per-engine ownership, not a second Hook executor.
 * Legacy register(path, ...) remains the base rule. Custom owners shadow it;
 * last explicitly registered custom owner wins. Automatic restore keeps its rank.
 * Removing one owner reveals its predecessor.
 * unregister(path) retains the explicit legacy meaning: remove that entire path.
 */
// Internal identity shared by the three engines. Only CE-created proxies are
// transparent here; third-party proxies retain their own identity and traps.
window.CE_hookIdentity = (() => {
    const targets = new WeakMap();
    return {
        remember(proxy, target) { targets.set(proxy, target); },
        raw(value) {
            while (targets.has(value)) value = targets.get(value);
            return value;
        },
        contains(value, wrapper) {
            while (value !== wrapper && targets.has(value)) value = targets.get(value);
            return value === wrapper;
        }
    };
})();

window.CE_createHookRegistry = function () {
    const current = Object.create(null);
    const paths = new Map();
    // Document-local scalar metadata only: no State, targets or rule closures.
    const orderHistory = new Map();
    let sequence = 0;

    function select(path) {
        const owners = paths.get(path);
        let selected;
        let baseRank = -1;
        let winner;
        for (const [owner, { config, rank }] of owners ?? []) {
            if (owner === "legacy" || config.base) {
                if (rank.sequence > baseRank) { selected = config; baseRank = rank.sequence; }
            }
        }
        for (const [owner, { config, rank }] of owners ?? []) {
            if (owner !== "legacy" && !config.base && (!winner ||
                rank.explicit > winner.explicit ||
                (rank.explicit === winner.explicit && rank.sequence > winner.sequence))) {
                selected = config;
                winner = rank;
            }
        }
        if (selected) current[path] = selected;
        else {
            delete current[path];
            paths.delete(path);
        }
    }

    return {
        current,
        pathsForOwner(owner) {
            return [...paths].filter(([, owners]) => owners.has(owner)).map(([path]) => path);
        },
        register(path, config, owner = "legacy", preserveOrder = false) {
            const owners = paths.get(path) ?? new Map();
            const identity = JSON.stringify([path, owner, config.orderKey ?? ""]);
            let rank = preserveOrder ? orderHistory.get(identity) : undefined;
            if (!rank) {
                rank = { explicit: !preserveOrder, sequence: ++sequence };
                orderHistory.set(identity, rank);
            }
            owners.set(owner, { config, rank });
            paths.set(path, owners);
            select(path);
        },
        unregister(path, owner) {
            if (owner === undefined) paths.delete(path);
            else paths.get(path)?.delete(owner);
            select(path);
        }
    };
};
