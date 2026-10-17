(() => {

    // ================================
    // CE StateBar UI Animation
    // ================================

    const lastPercents = Object.create(null);
    const frames = new Set(), timers = new Set(), containers = new Set();
    let active = false, renderEpoch = 0;

    function shouldDisplay() {
        return active && V.combat === 1 && V.stalk !== true && !!V.CE_EnemyStateEnable;
    }
    function rounded(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.round(number) : fallback;
    }
    function nextFrame(callback, valid) {
        const id = requestAnimationFrame(() => { frames.delete(id); if (valid()) callback(); });
        frames.add(id);
    }
    function later(callback, valid) {
        const id = setTimeout(() => { timers.delete(id); if (valid()) callback(); }, 500);
        timers.add(id);
    }
    function clearView() {
        renderEpoch++;
        for (const id of frames) cancelAnimationFrame(id);
        frames.clear();
        for (const id of timers) clearTimeout(id);
        timers.clear();
        for (const container of containers) container.remove();
        containers.clear();
    }
    function resetAnimation() {
        setup.CE_StateBarInitialized = false;
        setup.CE_HadCombatBarTarget = false;
        for (const key of Object.keys(lastPercents)) delete lastPercents[key];
    }
    
    setup.CE_StateBarInitialized ??= false;

    function getLastPercent(key, currentPercent) {
        
        // 本場戰鬥第一次顯示
        if (!setup.CE_StateBarInitialized) {
            lastPercents[key] = 0;
            return 0;
        }
        
        if (lastPercents[key] == null) {
            lastPercents[key] = currentPercent;
            return currentPercent;
        }

        return lastPercents[key];
    }

    function setLastPercent(key, percent) {
        lastPercents[key] = percent;
    }

    function animateFillLag(barDiv, fillDiv, key, currentPercent, color) {
        const lastPercent = getLastPercent(key, currentPercent);
        const isOpening = !setup.CE_StateBarInitialized;
        const epoch = renderEpoch, state = V;
        const valid = () => shouldDisplay() && renderEpoch === epoch && V === state && barDiv.isConnected;
        const lagDiv = document.createElement('div');
        lagDiv.className = 'ce-enemy-state-fill-lag';
        lagDiv.style.background = color;
        fillDiv.style.background = color;
        fillDiv.style.width = (isOpening ? 0 : lastPercent) + '%';
        lagDiv.style.width = (isOpening ? 0 : Math.max(lastPercent, currentPercent)) + '%';
        barDiv.appendChild(lagDiv);
        barDiv.appendChild(fillDiv);
        nextFrame(() => nextFrame(() => {
            lagDiv.style.width = currentPercent + '%';
            if (isOpening) {
                later(() => {
                    fillDiv.style.width = currentPercent + '%';
                    setLastPercent(key, currentPercent);
                }, valid);
            } else {
                fillDiv.style.width = currentPercent + '%';
                setLastPercent(key, currentPercent);
            }
        }, valid), valid);
    }

    // ================================
    // CE_EnemyState Macro（四捨五入版本）
    // ================================
    /*
     * Macro：CE_EnemyState
     * 用途：
     *  - 顯示敵方當前各項狀態的條狀 UI
     *  - 包含生命、性奋、愤怒、信任
     *
     * 設計重點：
     *  - 所有數值 → 先計算 → 再建立 DOM
     *  - 信任為「軟上限」：100 以上視覺上滿條，但數值仍可繼續成長
     */
    Macro.add('CE_EnemyState', {
        handler() {
            if (!shouldDisplay()) return;

            /* ===== 狀態資料定義 =====
             * key   ：內部識別用（同時用於 class）
             * label ：UI 顯示名稱
             * value ：當前數值（來自 SugarCube 變數 V.）
             * max   ：顯示用最大值（信任為軟上限）
             */
            const states = [
                { key: 'health', label: '生命值', value: V.enemyhealth, max: V.enemyhealthmax },
                { key: 'arousal', label: '性奮', value: V.enemyarousal, max: V.enemyarousalmax },
                { key: 'anger', label: '憤怒', value: V.enemyanger, max: V.enemyangermax },
                { key: 'trust', label: '信任', value: V.enemytrust, max: 100 }, // 信任軟上限
            ];

            /* ===== 外層容器 ===== */
            const container = document.createElement('div');
            container.className = 'ce-enemy-state';

            /* ===== 逐一處理每個狀態 ===== */
            states.forEach(state => {

                /* --- 數值安全處理 ---
                 *  - 四捨五入
                 *  - 防止出現負值
                 */
                let value = Math.max(rounded(state.value), 0);
                let max = Math.max(0, rounded(state.max));

                /* --- 條狀百分比計算 ---
                 *  - 最大不超過 100%
                 */
                let percent = Math.min(
                    max > 0 ? Math.round((value / max) * 100) : 0,
                    100
                );

                /* --- 視覺相關變數 ---
                 * color    ：填充顏色
                 * trustLevel ：是否進入「爆表 / 軟上限」狀態
                 * （注意：這裡只記錄狀態，不操作 DOM）
                 */
                let color = '#888';
                let trustLevel = 0;
                let angerLevel = 0;
                let healthLevel = 0;
                let arousalLevel = 0;

                /* ===== 狀態判斷與顏色邏輯 ===== */
                switch (state.key) {

                    case 'health':
                        // 滿血綠 → 半血黃 → 低血紅
                        color = percent > 70
                            ? '#2ecc71'
                            : percent > 40
                                ? '#f1c40f'
                                : '#e74c3c';

                        // 低血特效：百分比 <= 30 → 閃爍, <=10 → 脈衝
                        if (percent <= 30) healthLevel = 1;
                       // if (percent <= 10) healthLevel = 2;

                        break;

                    case 'arousal':
                        // 高性奋深紫 → 低性奋淡紫
                        color = percent > 70
                            ? '#e056fd'
                            : percent > 40
                                ? '#be2edd'
                                : '#9b59b6';

                        // 高性奋特效：百分比 >=70 → 閃爍, >=100 → 脈衝
                        if (percent >= 70) arousalLevel = 1;
                        if (percent >= 90) arousalLevel = 2;

                        break;

                    /*
                    case 'anger':
                        // 高怒紅 → 中怒橘紅 → 低怒橘
                        color = percent > 70 ? '#e74c3c'
                              : percent > 40 ? '#f0932b'
                              : '#f5b041';
                        break;
                    */

                    case 'anger': {
                        const softMax = 200;

                        percent = Math.min(
                            Math.round((value / softMax) * 100),
                            100
                        );

                        // 0 = 正常
                        // 1 = 爆怒（閃爍）
                        // 2 = 極怒（閃爍 + 脈衝）
                        if (value >= 200) {
                            angerLevel = 2;
                            color = '#c0392b'; // 深紅
                        } else if (value >= 100) {
                            angerLevel = 1;
                            color = '#e74c3c'; // 紅
                        } else {
                            color = percent > 70
                                ? '#e74c3c'
                                : percent > 40
                                    ? '#f0932b'
                                    : '#f5b041';
                        }

                        break;
                    }

                    case 'trust': {
                        /* 信任特殊處理：
                         *  - 沒有實際上限
                         *  - UI 使用 100 作為軟上限
                         */
                        const softMax = 100;

                        percent = Math.min(
                            Math.round((value / softMax) * 100),
                            100
                        );

                        // 0 = 正常
                        // 1 = 滿信任（流動高光）
                        // 2 = 深度信任（高光 + 脈衝）
                        if (value >= 200) {
                            trustLevel = 2;
                            color = '#1abc9c';
                        } else if (value >= 100) {
                            trustLevel = 1;
                            color = '#27ae60';
                        } else {
                            color = percent > 70
                                ? '#2ecc71'
                                : percent > 40
                                    ? '#f1c40f'
                                    : '#e67e22';
                        }

                        break;
                    }
                }

                /* ===== DOM 建立區（此時才開始碰 DOM） ===== */

                // 每一行狀態的容器
                const row = document.createElement('div');
                row.className = `ce-enemy-state-row ce-enemy-state--${state.key}`;

                // 狀態名稱文字
                const labelSpan = document.createElement('span');
                labelSpan.className = 'ce-enemy-state-label';
                labelSpan.textContent = state.label;
                row.appendChild(labelSpan);

                // 條狀背景
                const barDiv = document.createElement('div');
                barDiv.className = 'ce-enemy-state-bar';

                // 條狀填充
                const fillDiv = document.createElement('div');
                fillDiv.className = 'ce-enemy-state-fill';
                fillDiv.style.background = color;

                // UI動畫
                animateFillLag(
                    barDiv,
                    fillDiv,
                    `enemy-${state.key}`,
                    percent,
                    color
                );

                // 生命值低血特效
                if (healthLevel >= 1) fillDiv.classList.add('health-shine');
                if (healthLevel >= 2) fillDiv.classList.add('health-pulse');

                // 性奋高特效
                if (arousalLevel >= 1) fillDiv.classList.add('arousal-shine');
                if (arousalLevel >= 2) fillDiv.classList.add('arousal-pulse');

                // 若為信任爆表，追加特效 class
                if (trustLevel >= 1) {
                    fillDiv.classList.add('trust-shine');
                }
                if (trustLevel >= 2) {
                    fillDiv.classList.add('trust-pulse');
                }

                // 若為憤怒爆表，追加特效 class
                if (angerLevel >= 1) {
                    fillDiv.classList.add('anger-shine');
                }
                if (angerLevel >= 2) {
                    fillDiv.classList.add('anger-pulse');
                }
                
                row.appendChild(barDiv);

                // 除錯 / 數值顯示（可日後關閉）
                const debugDiv = document.createElement('div');
                debugDiv.className = 'ce-enemy-state-debug';
                debugDiv.textContent = `: ${value} / ${max}`;
                row.appendChild(debugDiv);

                // 將整行加入容器
                container.appendChild(row);
            });

            /* ===== 將整個狀態 UI 輸出到當前 passage ===== */
            this.output.appendChild(container);
        }
    });

    Macro.add('CE_NPCHealthBars', {
        handler: function () {
            if (!shouldDisplay()) return;
            if (!Array.isArray(V.NPCList)) return;

            // 過濾出有效 NPC（有 health 屬性）
            const validNPCs = Array.isArray(V.NPCList)
                ? V.NPCList.filter(npc =>
                    npc &&
                    npc.health !== undefined &&
                    npc.health !== null
                )
                : [];

            // 如果有效 NPC 不足 2 個，就不顯示
            if (validNPCs.length <= 1) return;

            const container = document.createElement('div');
            container.className = 'ce-npc-healthbars-container';

            // 折疊按鈕
            const toggleButton = document.createElement('button');
            toggleButton.textContent = '∇複數敵人生命值';
            toggleButton.style.padding = '2px 6px';
            toggleButton.style.fontSize = '0.8em';
            toggleButton.style.marginBottom = '2px';

            toggleButton.onclick = () => {
                const content = container.querySelector('.ce-npc-healthbars-content');
                content.style.display = content.style.display === 'none'
                    ? 'block'
                    : 'none';
            };

            container.appendChild(toggleButton);

            // 內容區域
            const contentDiv = document.createElement('div');
            contentDiv.className = 'ce-npc-healthbars-content';
            contentDiv.style.display = 'none';
            container.appendChild(contentDiv);

            // 每個有效 NPC 血條
            validNPCs.forEach((npc, i) => {
                const value = Math.max(0, rounded(npc.health));
                const max = Math.max(1, rounded(npc.healthmax || 100, 100));
                const percent = Math.min(100, Math.round((value / max) * 100));
                const name = npc.fullDescription || `NPC ${i + 1}`;

                let healthLevel = 0;
                if (percent <= 30) healthLevel = 1;
                if (percent <= 10) healthLevel = 2;     

                const row = document.createElement('div');
                row.className = 'ce-enemy-state-row ce-enemy-state--health';

                const label = document.createElement('span');
                label.className = 'ce-enemy-state-label';
                label.textContent = `${name} 的生命值`;
                row.appendChild(label);

                const bar = document.createElement('div');
                bar.className = 'ce-enemy-state-bar';

                const fill = document.createElement('div');
                fill.className = 'ce-enemy-state-fill';
                
                if (healthLevel >= 1) fill.classList.add('health-shine');
                if (healthLevel >= 2) fill.classList.add('health-pulse');

                // 統一顏色邏輯：綠 >70%，黃 >40%，紅 <=40%
                const color = percent > 70
                    ? '#2ecc71'
                    : percent > 40
                    ? '#f1c40f'
                    : '#e74c3c';                                          

                // UI動畫
                animateFillLag(
                    bar,
                    fill,
                    `npc-${npc.id ?? npc.fullDescription ?? i}`,
                    percent,
                    color
                );
                
                row.appendChild(bar);

                // 可選：顯示 DEBUG 值
                const debugDiv = document.createElement('div');
                debugDiv.className = 'ce-enemy-state-debug';
                debugDiv.textContent = `: ${value} / ${max}`;
                row.appendChild(debugDiv);

                contentDiv.appendChild(row);
            });

            this.output.append(container);
        }
    });

    Macro.add('CE_TentacleState', {
        handler() {
            if (!shouldDisplay()) return;

            const count = Number(V.tentacles?.max);
            if (!Number.isInteger(count) || count < 1) return;

            const container = document.createElement('div');
            container.className = 'ce-enemy-state ce-tentacle-state';

            for (let i = 0; i < count; i++) {
                const tentacle = V.tentacles[i];

                if (!tentacle) continue;
                if (tentacle.head === 'finished') continue;
                if (tentacle.shaft === 'finished') continue;

                const value = Math.max(
                    0,
                    rounded(tentacle.tentaclehealth || 0)
                );

                const max = Math.max(
                    1,
                    rounded(tentacle.tentaclehealthstart ?? tentacle.tentaclehealth ?? 15, 15)
                );

                const percent = Math.min(
                    100,
                    Math.round((value / max) * 100)
                );

                const color = percent > 70
                    ? '#2ecc71'
                    : percent > 40
                        ? '#f1c40f'
                        : '#e74c3c';

                let healthLevel = 0;
                if (percent <= 30) healthLevel = 1;
                if (percent <= 10) healthLevel = 2;

                const row = document.createElement('div');
                row.className = 'ce-enemy-state-row ce-enemy-state--tentacle';

                const labelSpan = document.createElement('span');
                labelSpan.className = 'ce-enemy-state-label';
                labelSpan.textContent = tentacle.fullDesc || `觸手 ${i + 1}`;
                row.appendChild(labelSpan);

                const barDiv = document.createElement('div');
                barDiv.className = 'ce-enemy-state-bar';

                const fillDiv = document.createElement('div');
                fillDiv.className = 'ce-enemy-state-fill';
                fillDiv.style.background = color;

                // UI動畫
                animateFillLag(
                    barDiv,
                    fillDiv,
                    `tentacle-${tentacle.id ?? i}`,
                    percent,
                    color
                );

                if (healthLevel >= 1) fillDiv.classList.add('health-shine');
                if (healthLevel >= 2) fillDiv.classList.add('health-pulse');
                
                row.appendChild(barDiv);

                const debugDiv = document.createElement('div');
                debugDiv.className = 'ce-enemy-state-debug';
                debugDiv.textContent = `: ${value} / ${max}`;
                row.appendChild(debugDiv);

                container.appendChild(row);
            }

            this.output.appendChild(container);
        }
    });
    
    // ================================
    // 在第 3 個 div 開頭插入 CE 容器（支援多個 slot）
    // ================================
    function insertCEContainerAtThirdDiv(slotId) {
        const passageContent = document.getElementById('passage-content');
        if (!passageContent) return null;

        // 只抓直屬 div
        const divs = passageContent.querySelectorAll(':scope > div');
        if (!divs[2]) return null;

        const targetDiv = divs[2];

        // 防止重複插入同 id
        if (targetDiv.querySelector(`#${slotId}`)) return null;

        const container = document.createElement('div');
        container.className = 'ce-enemy-state-container';

        const slot = document.createElement('div'); // 改成 div
        slot.id = slotId;
        container.appendChild(slot);

        targetDiv.insertBefore(container, targetDiv.firstChild);
        containers.add(container);

        console.log(`[cheat Extended][EnemyStateBar] 容器已插入 id=${slotId}`);
        return slot;
    }    

    // ================================
    // passage 顯示後執行
    // ================================
    function render() {
        if (!active) return;
        clearView();
        if (!shouldDisplay()) { resetAnimation(); return; }

        // 開始堆疊widget，最後插入的會顯示在最上面

        // 第二個 widget（NPC血條，僅在 NPCList.length > 1）
        const validNPCs = Array.isArray(V.NPCList) ? V.NPCList.filter(npc => npc && npc.health != null) : [];
        const hasHuman = validNPCs.length > 0;
        const hasTentacle = Number(V.tentacles?.active || 0) > 0;
        if (!hasHuman && !hasTentacle) { resetAnimation(); return; }

        if (validNPCs.length > 1) {
            const slotNPC = insertCEContainerAtThirdDiv('CE_EnemyState_Slot_NPC');

            if (slotNPC) {
                new Wikifier(slotNPC, `<<CE_NPCHealthBars>>`);
            }
        }

        // 第一個 widget（全局狀態）
        const slotGlobal =
            insertCEContainerAtThirdDiv('CE_EnemyState_Slot_Global');

        if (slotGlobal) {
            if (hasHuman) {
                new Wikifier(slotGlobal, '<<CE_EnemyState>>');
            }

            if (hasTentacle) {
                new Wikifier(slotGlobal, '<<CE_TentacleState>>');
            }
        }
        
        setup.CE_StateBarInitialized = containers.size > 0;
        setup.CE_HadCombatBarTarget = containers.size > 0;
    }
    function onStart() {
        if (!active) return;
        clearView();
        if (!shouldDisplay()) resetAnimation();
    }
    function onLoad() {
        if (!active) return;
        clearView();
        resetAnimation();
    }
    setup.CE_enemyState = { refresh: render };
    setup.CE_features.register('enemy-state-display', () => {
        active = true;
        resetAnimation();
        Save.onLoad.add(onLoad);
        $(document).on(':passagestart', onStart);
        $(document).on(':passagedisplay', render);
        return () => {
            active = false;
            clearView();
            resetAnimation();
            try { Save.onLoad.delete(onLoad); }
            finally {
                $(document).off(':passagestart', onStart);
                $(document).off(':passagedisplay', render);
            }
        };
    });
    setup.CE_features.enable('enemy-state-display');
})();