/* Core uses SugarCube directly; Maple supplies the existing UI injection points. */
(() => {
    window.modSC2DataManager.getModLoadController().addLifeTimeCircleHook('cheatExtended', {
        ModLoaderLoadEnd: async () => {
            const maple = window.maplebirch;
            if (typeof maple?.tool?.addTo !== 'function') {
                window.modUtils.getLogger().error('[Cheat Extended] MapleBirch tool.addTo unavailable; CE UI cannot register');
                return;
            }
            maple.modList.pushUnique('cheat extended');
            for (const [zone, widget] of [
                ['Cheats', 'cheat_extended'], ['MenuBig', 'CE_originalCheatButton'],
                ['CaptionAfterDescription', 'CEstatebox'], ['Options', 'CE_options'],
                ['HintMobile', 'CE_sideBarIcon'], ['Footer', 'CE_CheatExtendedVersion'],
            ]) maple.tool.addTo(zone, widget);
        }
    });
})();
