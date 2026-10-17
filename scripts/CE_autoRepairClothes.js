(() => {
    let active = false;
    function initialize() {
        if (V.CE_autoRepairClothesEnabled === undefined) V.CE_autoRepairClothesEnabled = false;
        if (V.CE_autoRepairClothesRatio === undefined) V.CE_autoRepairClothesRatio = 0.5;
        if (V.CE_autoRepairLockEnabled === undefined) V.CE_autoRepairLockEnabled = false;
        V.CE_autoRepairClothesLockSlots ??= {};
    }

    function repair(ratio, targetSlot) {
        if (!Number.isFinite(ratio) || ratio < 0) throw new Error('[Cheat Extended] Invalid repair ratio');
        if (ratio === 0 || !V.worn || !setup.clothes) return;
        for (const [slot, item] of Object.entries(V.worn)) {
            if (targetSlot && targetSlot !== slot || !item || !Array.isArray(setup.clothes[slot])) continue;
            const proto = setup.clothes[slot].find(c => c?.variable === item.variable);
            if (!Number.isFinite(proto?.integrity) || !Number.isFinite(item.integrity)) continue;
            item.integrity = Math.min(item.integrity + Math.ceil(proto.integrity * ratio), proto.integrity);
        }
    }

    Macro.add('CE_autoRepairClothes', {
        handler() {
            if (!active) return;
            repair(this.args[0] ?? 0.5, this.args[1]);
        }
    });

    setup.CE_features.register('wardrobe-repair', () => {
        let leaseActive = true;
        initialize();
        const eventName = 'CE_每日恢復服裝耐久事件';
        const daily = () => {
            if (!leaseActive) return;
            initialize();
            if (!V.CE_autoRepairClothesEnabled) return;
            for (const slot of Object.keys(V.worn || {})) {
                if (!V.CE_autoRepairClothesLockSlots[slot]) repair(V.CE_autoRepairClothesRatio, slot);
            }
        };
        const locked = () => {
            if (!leaseActive) return;
            initialize();
            if (!V.CE_autoRepairClothesEnabled || !V.CE_autoRepairLockEnabled) return;
            for (const slot of Object.keys(V.worn || {})) {
                if (V.CE_autoRepairClothesLockSlots[slot]) repair(1, slot);
            }
        };
        if (registerCE_genericTimeEvent('onDay', eventName, daily) === false) {
            throw new Error('[Cheat Extended] Wardrobe repair clock listener could not register');
        }
        $(document).on(':passagedisplay', locked);
        active = true;
        return () => {
            active = leaseActive = false;
            let failure;
            try { unregisterCE_genericTimeEvent('onDay', eventName); }
            catch (error) { failure = error; }
            try { $(document).off(':passagedisplay', locked); }
            catch (error) { failure ??= error; }
            if (failure) throw failure;
        };
    });
    $(document).one(':passagestart', () => setup.CE_features.enable('wardrobe-repair'));
})();
