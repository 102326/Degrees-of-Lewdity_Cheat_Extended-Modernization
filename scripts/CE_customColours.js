/* Saved custom colours stay in V; these records own only their setup projection. */
setup.CE_customColours = (() => {
    const records = new Map(['eyes', 'hair', 'skin_options'].map(kind => [kind, new Map()]));
    function sameData(a, b) {
        if (Object.is(a, b)) return true;
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
        const keys = Reflect.ownKeys(a);
        if (keys.length !== Reflect.ownKeys(b).length) return false;
        return keys.every(key => {
            const x = Object.getOwnPropertyDescriptor(a, key), y = Object.getOwnPropertyDescriptor(b, key);
            return y && 'value' in x && 'value' in y && x.writable === y.writable &&
                x.enumerable === y.enumerable && x.configurable === y.configurable && sameData(x.value, y.value);
        });
    }
    function slot(record) {
        return record.array ? Object.keys(record.parent).find(key =>
            Object.getOwnPropertyDescriptor(record.parent, key)?.value === record.value) : record.key;
    }
    function owns(record) {
        const key = slot(record), d = Object.getOwnPropertyDescriptor(record.parent, key);
        return key !== undefined && d && d.value === record.value && d.writable === record.descriptor.writable &&
            d.enumerable === record.descriptor.enumerable && d.configurable === record.descriptor.configurable &&
            sameData(d.value, record.snapshot);
    }
    function release(record) {
        if (!owns(record)) return;
        const key = slot(record);
        if (record.before) Object.defineProperty(record.parent, key, record.before);
        else if (record.array) record.parent.splice(Number(key), 1);
        else delete record.parent[key];
    }
    function project(kind, entries) {
        const parent = setup.colours[kind], array = Array.isArray(parent), owned = records.get(kind);
        const written = [];
        const desired = new Map(entries.map(entry => [array ? entry.variable : entry.name, entry]));
        for (const [key, record] of owned) {
            // A replacement container owns its copied entries; cleanup stays bound to the recorded container.
            if (record.parent !== parent || !desired.has(key)) { release(record); owned.delete(key); }
        }
        for (const [key, entry] of desired) {
            if (typeof key !== 'string' || !key) continue;
            const value = clone(array ? entry : {
                gradient: entry.colors, blendMode: 'multiply', desaturate: !!entry.desaturate, alpha: entry.alpha ?? 1
            });
            let record = owned.get(key);
            const stillOwned = record && owns(record);
            if (stillOwned && sameData(value, record.snapshot)) continue;
            const index = stillOwned ? slot(record) : array ? parent.findIndex(item => item.variable === key) : key;
            const target = array && index < 0 ? parent.length : index;
            const current = Object.getOwnPropertyDescriptor(parent, target);
            const before = stillOwned ? record.before : current;
            if (current && (!('value' in current) || !current.writable)) {
                throw new Error(`[Cheat Extended] Cannot project read-only colour: ${kind}/${key}`);
            }
            const descriptor = current ? { ...current, value } : { value, writable: true, enumerable: true, configurable: true };
            Object.defineProperty(parent, target, descriptor);
            record = { parent, array, key, before, descriptor, value, snapshot: clone(value) };
            owned.set(key, record);
            written.push(record);
        }
        if (array) { setup.colours[kind + '_map'] = {}; buildColourMap(kind); }
        // Native map construction fills rendering defaults into the entries we just installed.
        for (const record of written) record.snapshot = clone(record.value);
    }
    return { project };
})();

setup.CE_features.register('custom-colours', () => {
    let active = true, pending = true;
    function markPending() { if (active) pending = true; }
    function apply() {
        if (!active || !pending) return;
        pushCustomSkinsToSetup(); pushCustomEyesToSetup(); pushCustomHairToSetup();
        pending = false;
    }
    Save.onLoad.add(markPending);
    $(document).on(':passagestart', apply);
    return () => {
        active = false;
        try { Save.onLoad.delete(markPending); }
        finally { $(document).off(':passagestart', apply); }
        // Keep the current player's colour definitions; disabling pauses automatic load projection only.
    };
});
setup.CE_features.enable('custom-colours');
