/* Module resources only. Saved feature settings remain authoritative in V. */
setup.CE_features = (() => {
    const features = new Map();
    function get(id) {
        const feature = features.get(id);
        if (!feature) throw new Error(`[Cheat Extended] Unknown feature: ${id}`);
        return feature;
    }
    function disable(id) {
        const feature = get(id);
        if (!feature.dispose) return false;
        feature.enabled = false;
        feature.dispose();
        feature.dispose = undefined;
        return true;
    }
    return {
        register(id, start) {
            if (typeof id !== 'string' || !id || typeof start !== 'function' || features.has(id)) {
                throw new Error('[Cheat Extended] Invalid or duplicate feature registration');
            }
            features.set(id, { start });
        },
        enable(id) {
            const feature = get(id);
            if (feature.dispose) return false;
            const dispose = feature.start();
            if (typeof dispose !== 'function') throw new Error(`[Cheat Extended] Missing cleanup: ${id}`);
            feature.dispose = dispose;
            feature.enabled = true;
            return true;
        },
        disable,
        isEnabled(id) { return features.get(id)?.enabled === true; },
        unregister(id) { disable(id); features.delete(id); }
    };
})();
