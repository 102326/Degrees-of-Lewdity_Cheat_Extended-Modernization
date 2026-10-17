/* Shared by the five exploration maps; discovery data remains in their original renderers. */
setup.CE_mapView = (id, render, disconnect = () => {}) => {
    let active = false, epoch = 0, timer, root;
    const frames = new Set();
    function clear() {
        epoch++; clearTimeout(timer); timer = undefined;
        for (const frame of frames) cancelAnimationFrame(frame);
        frames.clear(); disconnect(); root?.remove(); root = undefined;
    }
    function guard(callback, node = root) {
        const generation = epoch, state = V;
        return () => { if (active && generation === epoch && V === state && node?.isConnected) callback(); };
    }
    function frame(callback) {
        const run = guard(callback);
        const handle = requestAnimationFrame(() => { frames.delete(handle); run(); });
        frames.add(handle); return handle;
    }
    function schedule() {
        clear();
        const generation = epoch, state = V;
        const handle = setTimeout(() => {
            if (timer === handle) timer = undefined;
            if (active && generation === epoch && V === state) render();
        }, 0);
        timer = handle;
    }
    setup.CE_features.register(id, () => {
        active = true;
        $(document).on(':passagestart', clear);
        $(document).on(':passagedisplay', schedule);
        Save.onLoad.add(clear); schedule();
        return () => {
            active = false; clear();
            try { Save.onLoad.delete(clear); }
            finally { $(document).off(':passagestart', clear); $(document).off(':passagedisplay', schedule); }
        };
    });
    setup.CE_features.enable(id);
    return { clear, frame, guard, cancelFrame(handle) { cancelAnimationFrame(handle); frames.delete(handle); }, own(node) { root = node; } };
};
