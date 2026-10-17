/* Hide only when requested; an unchecked preference does not own another UI's visibility. */
setup.CE_sidebarVisibility = (() => {
    const writes = new Map();
    let active = false, timer, generation = 0;
    function release() {
        for (const [element, before] of writes) {
            if (element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== '') continue;
            if (before.value) element.style.setProperty('display', before.value, before.priority);
            else element.style.removeProperty('display');
        }
        writes.clear();
    }
    function cancel() { generation++; clearTimeout(timer); timer = undefined; }
    function refresh() {
        if (!active) return;
        release();
        const ids = [];
        if (V.CE_hideUiBarToggleEnable) ids.push('ui-bar-toggle', 'characterTemperature', 'pepper-sprays', 'condoms-sidebar', 'condoms-sidebar-text');
        if (V.CE_hideCEToggleDisable === true) ids.push('CE_Toggle', 'CEstatebox');
        for (const id of ids) {
            const element = document.getElementById(id);
            if (!element) continue;
            writes.set(element, { value: element.style.getPropertyValue('display'), priority: element.style.getPropertyPriority('display') });
            element.style.setProperty('display', 'none');
        }
    }
    function schedule() {
        if (!active) return;
        cancel();
        const state = V, epoch = generation;
        const id = setTimeout(() => {
            if (timer !== id) return;
            timer = undefined;
            if (active && epoch === generation && V === state) refresh();
        }, 100);
        timer = id;
    }
    function onLoad() { if (active) { cancel(); release(); } }
    setup.CE_features.register('sidebar-visibility', () => {
        active = true;
        $(document).on(':passagedisplay', schedule);
        $(document).on(':passageend', refresh);
        $(document).on(':passagestart', onLoad);
        Save.onLoad.add(onLoad);
        return () => {
            active = false; cancel(); release();
            try { Save.onLoad.delete(onLoad); }
            finally { $(document).off(':passagedisplay', schedule); $(document).off(':passageend', refresh); $(document).off(':passagestart', onLoad); }
        };
    });
    setup.CE_features.enable('sidebar-visibility');
    return { refresh };
})();
