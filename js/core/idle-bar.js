/**
 * 空闲态通知栏模块
 * 无倒数日和待办提醒时，通知栏展示鸡汤/宠物内容
 * 点击弹出选择面板，选哪个就固定显示哪个
 * 支持宠物交互（喂食/喝水/遛弯/零食）和自定义宠物/句子
 * 通过 Object.assign(OfficeDashboard.prototype, IdleBarManager) 混入
 */
const IdleBarManager = {

    IDLE_QUOTES_MORNING: [
        { text: '每一个清晨，都是一次重新开始的机会', author: '' },
        { text: '早起的鸟儿有虫吃，早起的人儿有梦追', author: '' },
        { text: '把每一个黎明看作生命的开始', author: '约翰·拉斯金' },
        { text: '一日之计在于晨，一年之计在于春', author: '' },
        { text: '清晨的粥比深夜的酒好喝', author: '' },
        { text: '新的一天，元气满满', author: '' },
        { text: '今天也要做个闪闪发光的人', author: '' },
    ],
    IDLE_QUOTES_AFTERNOON: [
        { text: '心之所向，素履以往', author: '七堇年' },
        { text: '生活的意义在于无穷地探索尚未知道的东西', author: '雨果' },
        { text: '世上无难事，只怕有心人', author: '' },
        { text: '千里之行，始于足下', author: '老子' },
        { text: '不积跬步，无以至千里', author: '荀子' },
        { text: '路虽远行则将至，事虽难做则必成', author: '' },
        { text: '加油，离下班又近了一步', author: '' },
        { text: '午后的阳光正好，适合继续努力', author: '' },
    ],
    IDLE_QUOTES_EVENING: [
        { text: '今天辛苦了，明天会更好', author: '' },
        { text: '人生没有白走的路，每一步都算数', author: '' },
        { text: '但行好事，莫问前程', author: '' },
        { text: '星光不问赶路人，时光不负有心人', author: '' },
        { text: '愿你所有的努力都不被辜负', author: '' },
        { text: '日子是过以后，不是过以前', author: '' },
        { text: '好好休息，明天又是新的一天', author: '' },
    ],

    IDLE_PETS: [
        { emoji: '🐶', name: '点点', actions: { morning: ['摇着尾巴等你喂食', '在院子里跑圈等你'], afternoon: ['趴在你脚边看你工作', '开心地啃小零食'], evening: ['蜷在你腿上睡着了', '梦里还在摇尾巴'] } },
        { emoji: '🐱', name: '小橘', actions: { morning: ['正在伸懒腰', '追着阳光跑'], afternoon: ['趴着打盹', '在舔爪子'], evening: ['蜷成一团', '在打呼噜'] } },
        { emoji: '🐶', name: '旺财', actions: { morning: ['摇着尾巴等你', '在院子里跑圈'], afternoon: ['趴在脚边发呆', '在啃骨头'], evening: ['打着哈欠', '趴着打盹'] } },
        { emoji: '🐼', name: '滚滚', actions: { morning: ['在啃竹子', '翻了个滚'], afternoon: ['懒洋洋躺着', '抱着竹子打盹'], evening: ['靠在石头上', '闭着眼啃竹子'] } },
        { emoji: '🦊', name: '小灵', actions: { morning: ['在草丛里探头', '甩着大尾巴'], afternoon: ['蜷在窝里', '半眯着眼晒太阳'], evening: ['望着月亮', '安静地蹲着'] } },
        { emoji: '🐰', name: '团团', actions: { morning: ['竖着耳朵听', '蹦蹦跳跳'], afternoon: ['趴着休息', '在啃胡萝卜'], evening: ['缩成一团白球', '闭眼打盹'] } },
        { emoji: '🐧', name: '波波', actions: { morning: ['摇摇摆摆走路', '在整理羽毛'], afternoon: ['站着打盹', '和同伴聊天'], evening: ['挤在群里取暖', '安静地站着'] } },
    ],

    IDLE_REACTIONS: {
        feed: ['开心地摇着尾巴吃完了！', '狼吞虎咽很快就吃光了！', '舔舔嘴巴，还想吃~', '大口大口吃得好香'],
        water: ['咕咚咕咚喝饱了水！', '吧唧吧唧喝得很开心', '喝完水精神焕发！', '小口小口地喝着水'],
        walk: ['兴奋地围着你转圈！', '叼来牵引绳催你出门', '在外面跑了一大圈，好开心', '在草地上欢快地打滚'],
        snack: ['叼着零食跑开了~', '眼睛亮晶晶地盯着零食', '小心地从你手心取走零食', '吃完零食满足地眯起眼睛'],
    },

    _idleTimer: null,
    _idleActionIndex: 0,
    _idleSelection: null,
    _idleDisplay: null,
    _interactTimer: null,

    _loadIdleSelection() {
        try {
            const raw = SafeStorage.get('office_idle_selection');
            this._idleSelection = raw ? JSON.parse(raw) : { type: 'random' };
        } catch (e) {
            this._idleSelection = { type: 'random' };
        }
    },

    _saveIdleSelection() {
        SafeStorage.set('office_idle_selection', JSON.stringify(this._idleSelection));
    },

    _loadCustomPets() {
        try {
            const raw = SafeStorage.get('office_custom_pets');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },

    _saveCustomPets(pets) {
        SafeStorage.set('office_custom_pets', JSON.stringify(pets));
    },

    _loadCustomQuotes() {
        try {
            const raw = SafeStorage.get('office_custom_quotes');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },

    _saveCustomQuotes(quotes) {
        SafeStorage.set('office_custom_quotes', JSON.stringify(quotes));
    },

    _getAllPets() {
        return [...this.IDLE_PETS, ...this._loadCustomPets()];
    },

    _getAllQuotes(period) {
        const key = period === 'morning' ? 'IDLE_QUOTES_MORNING' : period === 'afternoon' ? 'IDLE_QUOTES_AFTERNOON' : 'IDLE_QUOTES_EVENING';
        const builtIn = this[key] || [];
        const customs = this._loadCustomQuotes().filter(q => q.period === 'all' || q.period === period);
        return [...builtIn, ...customs];
    },

    initIdleBar() {
        this._loadIdleSelection();
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        // 创建宠物 Canvas
        if (!this._petCanvas) {
            this._petCanvas = document.createElement('canvas');
            this._petCanvas.className = 'idle-pet-canvas';
            this._petCanvas.width = 64;
            this._petCanvas.height = 64;
            this._petCanvas.style.cssText = 'display:none;width:36px;height:36px;vertical-align:middle;margin-right:4px;border-radius:50%;';
            this._petRenderer = null;
        }

        noticeEl.addEventListener('click', (e) => {
            if (!noticeEl.classList.contains('idle-mode')) return;
            if (e.target.closest('.idle-interact-btn')) return;
            if (e.target.closest('.todo-reminder-complete-btn')) return;
            this.showIdlePicker();
        });

        noticeEl.addEventListener('contextmenu', (e) => {
            if (noticeEl.classList.contains('idle-mode')) {
                e.preventDefault();
                if (typeof this.showAlarmSettings === 'function') this.showAlarmSettings();
            }
        });

        let longPressTimer = null;
        noticeEl.addEventListener('touchstart', (e) => {
            if (!noticeEl.classList.contains('idle-mode')) return;
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                if (typeof this.showAlarmSettings === 'function') this.showAlarmSettings();
            }, 600);
        }, { passive: true });
        noticeEl.addEventListener('touchmove', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }, { passive: true });
        noticeEl.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
    },

    showIdleNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        noticeEl.hidden = false;
        noticeEl.classList.remove('todo-reminder-active', 'todo-reminder-flashing');

        const wasIdle = noticeEl.classList.contains('idle-mode');
        noticeEl.classList.add('idle-mode');

        if (!wasIdle) {
            this._idleActionIndex = 0;
            if (!this._idleSelection || this._idleSelection.type === 'random') {
                this._randomPickContent();
                this._startIdleRotation();
            } else if (this._idleSelection.type === 'pet') {
                this._idleDisplay = this._idleSelection;
                this._startIdleRotation();
            } else {
                this._idleDisplay = this._idleSelection;
            }
        }

        this._renderIdleContent();
    },

    hideIdleNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;
        noticeEl.classList.remove('idle-mode');
        this._stopIdleRotation();
        if (this._petCanvas) this._petCanvas.style.display = 'none';
    },

    _cycleActions() {
        if (this._interactTimer) return;
        if (!this._idleSelection || this._idleSelection.type === 'random') {
            this._randomPickContent();
        } else if (this._idleSelection.type === 'pet') {
            const allPets = this._getAllPets();
            const pet = allPets[this._idleSelection.index];
            if (!pet) return;
            const hour = new Date().getHours();
            const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
            const actions = pet.actions[period];
            this._idleActionIndex = (this._idleActionIndex + 1) % actions.length;
        }
        this._renderIdleContent();
    },

    interactPet(action) {
        const sel = this._idleDisplay || this._idleSelection;
        if (!sel || sel.type !== 'pet') return;
        const allPets = this._getAllPets();
        const pet = allPets[sel.index];
        if (!pet) return;
        const reactions = this.IDLE_REACTIONS[action];
        if (!reactions) return;

        const reaction = reactions[Math.floor(Math.random() * reactions.length)];

        // 宠物动画切换
        if (this._petRenderer) {
            this._petRenderer.setAction(action);
        }

        // 更新文字（隐藏 canvas 期间的文字不受影响）
        const titleEl = document.querySelector('#countdownNotice .countdown-notice-title');
        if (titleEl) {
            const textNode = titleEl.lastChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = `${pet.name} ${reaction}`;
            } else {
                titleEl.textContent = `${pet.name} ${reaction}`;
            }
        }

        if (this._interactTimer) clearTimeout(this._interactTimer);
        this._interactTimer = setTimeout(() => {
            this._interactTimer = null;
            if (this._petRenderer) this._petRenderer.setAction('idle');
            this._renderIdleContent();
        }, 3000);
    },

    _randomPickContent() {
        const allPets = this._getAllPets();
        if (Math.random() < 0.45 && allPets.length > 0) {
            this._idleDisplay = { type: 'pet', index: Math.floor(Math.random() * allPets.length) };
        } else {
            const hour = new Date().getHours();
            const quotes = this._getAllQuotes(this._getPeriodForHour(hour));
            if (quotes.length > 0) {
                this._idleDisplay = { type: 'quote', period: this._getPeriodForHour(hour), index: Math.floor(Math.random() * quotes.length) };
            } else {
                const allPets2 = this._getAllPets();
                this._idleDisplay = { type: 'pet', index: Math.floor(Math.random() * allPets2.length) };
            }
        }
    },

    _getQuotesForHour(hour) {
        const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        return this._getAllQuotes(period);
    },

    _renderIdleContent() {
        if (this._interactTimer) return;
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl || !noticeEl.classList.contains('idle-mode')) return;

        const titleEl = noticeEl.querySelector('.countdown-notice-title');
        const descEl = noticeEl.querySelector('.countdown-notice-desc');
        const badgeEl = noticeEl.querySelector('.countdown-notice-badge');
        const hour = new Date().getHours();

        const sel = this._idleDisplay;
        if (sel && sel.type === 'pet') {
            const allPets = this._getAllPets();
            const pet = allPets[sel.index];
            if (pet) {
                const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
                const actions = pet.actions[period] || ['在玩耍'];
                const action = actions[this._idleActionIndex % actions.length];

                // Canvas 宠物动画
                if (this._petCanvas && titleEl) {
                    this._petCanvas.style.display = 'inline-block';
                    if (!titleEl.contains(this._petCanvas)) {
                        titleEl.innerHTML = '';
                        titleEl.appendChild(this._petCanvas);
                    }
                    // 确保文字节点在 Canvas 后
                    if (!titleEl.dataset.petTextNode) {
                        const textNode = document.createTextNode('');
                        titleEl.appendChild(textNode);
                        titleEl.dataset.petTextNode = '1';
                    }
                    const textNode = titleEl.lastChild;
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        textNode.textContent = `${pet.name} ${action}`;
                    }

                    // 初始化或更换 PetRenderer
                    const petColorMap = {
                        '点点': { body: '#F0C060', bodyLight: '#F5D080', bodyDark: '#D4A040', belly: '#FBE8B0', ear: '#C4883C', earInner: '#D4A050', eye: '#2C1810', nose: '#4A2810', paw: '#FBE8B0', blush: 'rgba(255,150,150,0.35)' },
                        '小橘': { body: '#F8A850', bodyLight: '#FAC880', bodyDark: '#D48830', belly: '#FDE0B8', ear: '#E88830', earInner: '#F0A850', eye: '#2C1810', nose: '#D47850', paw: '#FDE0B8', blush: 'rgba(255,150,150,0.35)' },
                        '旺财': { body: '#D4B060', bodyLight: '#E8C880', bodyDark: '#B89040', belly: '#F0D8A0', ear: '#A07030', earInner: '#C89850', eye: '#2C1810', nose: '#4A2810', paw: '#F0D8A0', blush: 'rgba(255,150,150,0.35)' },
                        '滚滚': { body: '#EAEAEA', bodyLight: '#F8F8F8', bodyDark: '#C0C0C0', belly: '#FEFEFE', ear: '#333333', earInner: '#555555', eye: '#1A1A1A', nose: '#333333', paw: '#EEEEEE', blush: 'rgba(255,180,180,0.3)' },
                        '小灵': { body: '#F08040', bodyLight: '#F0A070', bodyDark: '#D06030', belly: '#FDE0C8', ear: '#D86830', earInner: '#E89060', eye: '#2C1810', nose: '#3A2010', paw: '#FDE0C8', blush: 'rgba(255,150,150,0.35)' },
                        '团团': { body: '#FAFAFA', bodyLight: '#FFFFFF', bodyDark: '#E0E0E0', belly: '#FFFFFF', ear: '#E8C8D8', earInner: '#F0D8E8', eye: '#CC3355', nose: '#FF8899', paw: '#FFFFFF', blush: 'rgba(255,180,200,0.4)' },
                        '波波': { body: '#3A3A50', bodyLight: '#505068', bodyDark: '#2A2A3A', belly: '#F8F8F8', ear: '#3A3A50', earInner: '#505068', eye: '#111122', nose: '#FF8833', paw: '#3A3A50', blush: 'rgba(255,150,150,0.3)' },
                    };
                    const colors = petColorMap[pet.name] || petColorMap['点点'];
                    if (!this._petRenderer || this._petRenderer._petName !== pet.name) {
                        if (this._petRenderer) this._petRenderer.destroy();
                        this._petRenderer = new PetRenderer(this._petCanvas, { colors: colors });
                        this._petRenderer._petName = pet.name;
                        this._petRenderer.start();
                    }
                    // 保持 idle 动作（非 interact 期间）
                    if (!this._interactTimer) {
                        this._petRenderer.setAction('idle');
                    }
                }
                if (descEl) {
                    descEl.innerHTML = '<span class="idle-interact-btn" data-action="feed" style="cursor:pointer;margin-right:2px;" title="喂食">🍖</span><span class="idle-interact-btn" data-action="water" style="cursor:pointer;margin-right:2px;" title="喝水">🚰</span><span class="idle-interact-btn" data-action="walk" style="cursor:pointer;margin-right:2px;" title="遛弯">🦮</span><span class="idle-interact-btn" data-action="snack" style="cursor:pointer;margin-right:2px;" title="零食">🍪</span>';
                    descEl.querySelectorAll('.idle-interact-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.interactPet(btn.dataset.action);
                        });
                    });
                }
            }
        } else if (sel && sel.type === 'quote') {
            const quotes = this._getAllQuotes(sel.period || this._getPeriodForHour(hour));
            const quote = quotes[sel.index];
            if (quote) {
                if (titleEl) titleEl.textContent = quote.text;
                if (descEl) descEl.textContent = quote.author ? `—— ${quote.author}` : '点击选句 · 右键闹钟';
            }
        } else {
            if (titleEl) titleEl.textContent = '🐾 点击选择宠物或句子';
            if (descEl) descEl.textContent = '挑选一个陪伴你 · 右键闹钟';
        }
        if (badgeEl) badgeEl.textContent = '闲';
    },

    showIdlePicker() {
        let overlay = document.getElementById('idlePickerOverlay');
        if (overlay) { overlay.remove(); return; }

        const allPets = this._getAllPets();
        const customPets = this._loadCustomPets();

        overlay = document.createElement('div');
        overlay.id = 'idlePickerOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';

        const esc = (s) => typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(String(s)) : String(s);
        const petCards = allPets.map((p, i) => {
            const isActive = this._idleSelection && this._idleSelection.type === 'pet' && this._idleSelection.index === i;
            const isCustom = i >= this.IDLE_PETS.length;
            return `<div data-pet-idx="${i}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:10px;cursor:pointer;border:2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'};background:${isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)'};min-width:70px;transition:all 0.15s;position:relative;">
                <span style="font-size:28px;">${esc(p.emoji)}</span>
                <span style="font-size:12px;color:var(--text-primary);font-weight:500;">${esc(p.name)}</span>
                ${isCustom ? '<span style="font-size:9px;color:var(--text-secondary);">自定</span>' : ''}
            </div>`;
        }).join('');

        const customQuotes = this._loadCustomQuotes();

        overlay.innerHTML = `
            <div style="background:var(--bg-primary);border-radius:14px;padding:20px;width:380px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div style="font-size:16px;font-weight:600;color:var(--text-primary);">🎨 选择通知栏内容</div>
                    <button id="idlePickerClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
                </div>
                <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);">🐾 选择宠物</div>
                <div id="idlePetGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                    ${petCards}
                </div>
                <button id="idleAddPetBtn" style="width:100%;padding:6px;border:1px dashed var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;margin-bottom:16px;">➕ 自定义宠物</button>
                <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);">📝 选择句子</div>
                <div id="idleQuoteList" style="margin-bottom:6px;max-height:200px;overflow-y:auto;"></div>
                <button id="idleAddQuoteBtn" style="width:100%;padding:6px;border:1px dashed var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;margin-bottom:12px;">➕ 自定义句子</button>
                <button id="idleRandomBtn" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;cursor:pointer;">🔄 随机轮播</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const currentPeriod = this._getPeriodForHour(new Date().getHours());

        const renderQuotes = (period) => {
            const listEl = overlay.querySelector('#idleQuoteList');
            if (!listEl) return;
            const quotes = this._getAllQuotes(period);
            const isActive = this._idleSelection && this._idleSelection.type === 'quote' && this._idleSelection.period === period;
            const builtInCount = period === 'morning' ? this.IDLE_QUOTES_MORNING.length : period === 'afternoon' ? this.IDLE_QUOTES_AFTERNOON.length : this.IDLE_QUOTES_EVENING.length;
            listEl.innerHTML = '<div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">' +
                ['morning','afternoon','evening'].map(p => {
                    const label = p === 'morning' ? '早' : p === 'afternoon' ? '午' : '晚';
                    return `<button data-period="${p}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border-color);background:${period===p?'var(--primary-color)':'var(--bg-secondary)'};color:${period===p?'#fff':'var(--text-secondary)'};font-size:12px;cursor:pointer;">${label}</button>`;
                }).join('') +
            '</div>' +
            quotes.map((q, i) => {
                const active = isActive && this._idleSelection.index === i;
                const isCustom = i >= builtInCount;
                return `<div data-quote-idx="${i}" data-period="${period}" style="padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:4px;border:1px solid ${active ? 'var(--primary-color)' : 'transparent'};background:${active ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)'};font-size:13px;color:var(--text-primary);position:relative;">${esc(q.text)}${q.author ? '<span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">——' + esc(q.author) + '</span>' : ''}${isCustom ? '<span style="font-size:9px;color:var(--text-secondary);margin-left:4px;">[自定]</span>' : ''}</div>`;
            }).join('') + (quotes.length === 0 ? '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:8px;">暂无句子</div>' : '');

            listEl.querySelectorAll('[data-period]').forEach(btn => {
                btn.addEventListener('click', () => renderQuotes(btn.dataset.period));
            });

            listEl.querySelectorAll('[data-quote-idx]').forEach(el => {
                el.addEventListener('click', () => {
                    this._idleSelection = { type: 'quote', period: period, index: parseInt(el.dataset.quoteIdx) };
                    this._idleDisplay = this._idleSelection;
                    this._saveIdleSelection();
                    this._stopIdleRotation();
                    this._renderIdleContent();
                    overlay.remove();
                });
            });
        };
        renderQuotes(currentPeriod);

        overlay.querySelector('#idlePetGrid').addEventListener('click', (e) => {
            const card = e.target.closest('[data-pet-idx]');
            if (!card) return;
            const idx = parseInt(card.dataset.petIdx);
            this._idleSelection = { type: 'pet', index: idx };
            this._idleDisplay = this._idleSelection;
            this._saveIdleSelection();
            this._idleActionIndex = 0;
            this._startIdleRotation();
            this._renderIdleContent();
            overlay.remove();
        });

        overlay.querySelector('#idleRandomBtn').addEventListener('click', () => {
            this._idleSelection = { type: 'random' };
            this._saveIdleSelection();
            this._randomPickContent();
            this._startIdleRotation();
            this._renderIdleContent();
            overlay.remove();
        });

        overlay.querySelector('#idleAddPetBtn').addEventListener('click', () => {
            overlay.remove();
            this._showAddCustomPet();
        });

        overlay.querySelector('#idleAddQuoteBtn').addEventListener('click', () => {
            overlay.remove();
            this._showAddCustomQuote();
        });

        const close = () => { overlay.remove(); this.hideContextMenu?.(); };
        overlay.querySelector('#idlePickerClose').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    },

    _showAddCustomPet() {
        let ov = document.getElementById('customPetOverlay');
        if (ov) { ov.remove(); return; }

        ov = document.createElement('div');
        ov.id = 'customPetOverlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:10003;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
        ov.innerHTML = `
            <div style="background:var(--bg-primary);border-radius:14px;padding:20px;width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div style="font-size:16px;font-weight:600;color:var(--text-primary);">🐾 添加自定义宠物</div>
                    <button id="customPetClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-secondary);">表情符号</label>
                    <div id="emojiPicker" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;margin-bottom:4px;">
                        ${['🐶','🐱','🐼','🦊','🐰','🐧','🐹','🐨','🐯','🐮','🐷','🐸','🐵','🐔','🦄','🐴','🐢','🐙','🦜','🐠'].map(e => `<span data-emoji="${e}" style="font-size:24px;cursor:pointer;padding:2px 4px;border-radius:6px;border:1px solid transparent;">${e}</span>`).join('')}
                    </div>
                    <input type="text" id="customPetEmoji" value="🐶" maxlength="2" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-secondary);">宠物名字</label>
                    <input type="text" id="customPetName" placeholder="如：大黄、咪咪" maxlength="10" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                </div>
                <button id="saveCustomPet" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">保存宠物</button>
            </div>
        `;
        document.body.appendChild(ov);

        ov.querySelector('#emojiPicker').addEventListener('click', (e) => {
            const em = e.target.closest('[data-emoji]');
            if (!em) return;
            ov.querySelector('#customPetEmoji').value = em.dataset.emoji;
            ov.querySelectorAll('[data-emoji]').forEach(el => el.style.border = '1px solid transparent');
            em.style.border = '1px solid var(--primary-color)';
        });

        const saveBtn = ov.querySelector('#saveCustomPet');
        saveBtn.addEventListener('click', () => {
            const emoji = ov.querySelector('#customPetEmoji').value.trim() || '🐕';
            const name = ov.querySelector('#customPetName').value.trim();
            if (!name) { if (typeof this.showError === 'function') this.showError('请输入宠物名字'); return; }
            const pet = {
                id: 'custom_' + Date.now(),
                emoji: emoji,
                name: name,
                actions: {
                    morning: [`在等${name}起床`, `陪${name}迎接新的一天`],
                    afternoon: [`陪${name}认真工作`, `趴在旁边打盹`],
                    evening: [`陪${name}休息`, `安静地陪着${name}`]
                }
            };
            const pets = this._loadCustomPets();
            pets.push(pet);
            this._saveCustomPets(pets);
            this._idleSelection = { type: 'pet', index: this.IDLE_PETS.length + pets.length - 1 };
            this._idleDisplay = this._idleSelection;
            this._saveIdleSelection();
            this._idleActionIndex = 0;
            this._startIdleRotation();
            this._renderIdleContent();
            ov.remove();
            if (typeof this.showSuccess === 'function') this.showSuccess(`已添加宠物 ${emoji} ${name}`);
        });

        const close = () => ov.remove();
        ov.querySelector('#customPetClose').addEventListener('click', close);
        ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    },

    _showAddCustomQuote() {
        let ov = document.getElementById('customQuoteOverlay');
        if (ov) { ov.remove(); return; }

        ov = document.createElement('div');
        ov.id = 'customQuoteOverlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:10003;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
        ov.innerHTML = `
            <div style="background:var(--bg-primary);border-radius:14px;padding:20px;width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div style="font-size:16px;font-weight:600;color:var(--text-primary);">📝 添加自定义句子</div>
                    <button id="customQuoteClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-secondary);">句子内容</label>
                    <textarea id="customQuoteText" placeholder="如：加油，你是最棒的！" maxlength="100" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;resize:vertical;"></textarea>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:var(--text-secondary);">作者（选填）</label>
                    <input type="text" id="customQuoteAuthor" placeholder="如：鲁迅" maxlength="20" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:var(--text-secondary);">适用时段</label>
                    <select id="customQuotePeriod" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                        <option value="all">不限</option>
                        <option value="morning">早晨</option>
                        <option value="afternoon">下午</option>
                        <option value="evening">晚上</option>
                    </select>
                </div>
                <button id="saveCustomQuote" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">保存句子</button>
            </div>
        `;
        document.body.appendChild(ov);

        const saveBtn = ov.querySelector('#saveCustomQuote');
        saveBtn.addEventListener('click', () => {
            const text = ov.querySelector('#customQuoteText').value.trim();
            if (!text) { if (typeof this.showError === 'function') this.showError('请输入句子内容'); return; }
            const quote = {
                id: 'cq_' + Date.now(),
                text: text,
                author: ov.querySelector('#customQuoteAuthor').value.trim(),
                period: ov.querySelector('#customQuotePeriod').value
            };
            const quotes = this._loadCustomQuotes();
            quotes.push(quote);
            this._saveCustomQuotes(quotes);
            const allQuotes = this._getAllQuotes(quote.period === 'all' ? this._getPeriodForHour(new Date().getHours()) : quote.period);
            this._idleSelection = { type: 'quote', period: quote.period === 'all' ? this._getPeriodForHour(new Date().getHours()) : quote.period, index: allQuotes.length - 1 };
            this._idleDisplay = this._idleSelection;
            this._saveIdleSelection();
            this._stopIdleRotation();
            this._renderIdleContent();
            ov.remove();
            if (typeof this.showSuccess === 'function') this.showSuccess('已添加自定义句子');
        });

        const close = () => ov.remove();
        ov.querySelector('#customQuoteClose').addEventListener('click', close);
        ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    },

    _getPeriodForHour(hour) {
        if (hour < 12) return 'morning';
        if (hour < 18) return 'afternoon';
        return 'evening';
    },

    _startIdleRotation() {
        this._stopIdleRotation();
        this._idleTimer = setInterval(() => {
            this._cycleActions();
        }, 10000);
    },

    _stopIdleRotation() {
        if (this._idleTimer) {
            clearInterval(this._idleTimer);
            this._idleTimer = null;
        }
        if (this._interactTimer) {
            clearTimeout(this._interactTimer);
            this._interactTimer = null;
        }
    }
};
