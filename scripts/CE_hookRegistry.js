/* Cheat Extended R1: per-engine ownership, not a second Hook executor.
 * Legacy register(path, ...) remains the base rule. Custom owners shadow it;
 * last registered custom owner wins. Removing one owner reveals its predecessor.
 * unregister(path) retains the explicit legacy meaning: remove that entire path.
 */
window.CE_createHookRegistry = function () {
    const current = Object.create(null);
    const paths = new Map();

    function select(path) {
        const owners = paths.get(path);
        let selected = owners?.get("legacy");
        for (const [owner, config] of owners ?? []) {
            if (owner !== "legacy") selected = config;
        }
        if (selected) current[path] = selected;
        else {
            delete current[path];
            paths.delete(path);
        }
    }

    return {
        current,
        register(path, config, owner = "legacy", preserveOrder = false) {
            const owners = paths.get(path) ?? new Map();
            if (!preserveOrder) owners.delete(owner);
            owners.set(owner, config);
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
