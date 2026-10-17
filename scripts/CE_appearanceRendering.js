/* All three colour panels redraw the current native model through this owned queue. */
setup.CE_appearanceRendering = (() => {
    const timers = new Set(); let active = false, generation = 0;
    function cancel() { generation++; for (const id of timers) clearTimeout(id); timers.clear(); }
    function refresh(full = false, delay = 50) {
        if (!active) return;
        const state = V, epoch = generation;
        const id = setTimeout(() => {
            timers.delete(id);
            if (!active || epoch !== generation || V !== state) return;
            try {
                if (full) { Renderer.lastAnimation?.stop(); Renderer.animateLayersAgain(); }
                else { Renderer.lastAnimation?.invalidateCaches(); Renderer.lastAnimation?.redraw(); }
                Wikifier.wikifyEval('<<updatesidebarimg true>>');
            } catch (error) { console.warn('[Cheat Extended] Appearance refresh failed:', error); }
        }, delay);
        timers.add(id);
    }
    setup.CE_features.register('appearance-rendering', () => {
        active = true;
        $(document).on(':passagestart', cancel); Save.onLoad.add(cancel);
        return () => {
            active = false; cancel();
            try { Save.onLoad.delete(cancel); }
            finally { $(document).off(':passagestart', cancel); }
        };
    });
    setup.CE_features.enable('appearance-rendering');
    return { refresh };
})();
