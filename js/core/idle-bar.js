/**
 * 空闲态通知栏模块
 * 无倒数日和待办提醒时，通知栏展示鸡汤/宠物内容
 * 点击弹出选择面板，选哪个就固定显示哪个
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

    _idleTimer: null,
    _idleActionIndex: 0,
    _idleSelection: null,
    _idleDisplay: null,

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

    initIdleBar() {
        this._loadIdleSelection();
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        noticeEl.addEventListener('click', (e) => {
            if (noticeEl.classList.contains('idle-mode') && !e.target.closest('.todo-reminder-complete-btn')) {
                this.showIdlePicker();
            }
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
    },

    _cycleActions() {
        if (!this._idleSelection || this._idleSelection.type === 'random') {
            this._randomPickContent();
        } else if (this._idleSelection.type === 'pet') {
            const pet = this.IDLE_PETS[this._idleSelection.index];
            if (!pet) return;
            const hour = new Date().getHours();
            const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
            const actions = pet.actions[period];
            this._idleActionIndex = (this._idleActionIndex + 1) % actions.length;
        }
        this._renderIdleContent();
    },

    _randomPickContent() {
        if (Math.random() < 0.45) {
            this._idleDisplay = { type: 'pet', index: Math.floor(Math.random() * this.IDLE_PETS.length) };
        } else {
            const hour = new Date().getHours();
            const quotes = this._getQuotesForHour(hour);
            this._idleDisplay = { type: 'quote', period: this._getPeriodForHour(hour), index: Math.floor(Math.random() * quotes.length) };
        }
    },

    _getQuotesForHour(hour) {
        if (hour < 12) return this.IDLE_QUOTES_MORNING;
        if (hour < 18) return this.IDLE_QUOTES_AFTERNOON;
        return this.IDLE_QUOTES_EVENING;
    },

    _renderIdleContent() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl || !noticeEl.classList.contains('idle-mode')) return;

        const titleEl = noticeEl.querySelector('.countdown-notice-title');
        const descEl = noticeEl.querySelector('.countdown-notice-desc');
        const badgeEl = noticeEl.querySelector('.countdown-notice-badge');
        const hour = new Date().getHours();

        const sel = this._idleDisplay;
        if (sel && sel.type === 'pet') {
            const pet = this.IDLE_PETS[sel.index];
            if (pet) {
                const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
                const actions = pet.actions[period];
                const action = actions[this._idleActionIndex % actions.length];
                if (titleEl) titleEl.textContent = `${pet.emoji} ${pet.name} ${action}`;
                if (descEl) descEl.textContent = '点击选宠 · 右键闹钟';
            }
        } else if (sel && sel.type === 'quote') {
            const quotes = sel.period ? this['IDLE_QUOTES_' + sel.period.toUpperCase()] || this._getQuotesForHour(hour) : this._getQuotesForHour(hour);
            const quote = quotes[sel.index];
            if (quote) {
                if (titleEl) titleEl.textContent = quote.text;
                if (descEl) descEl.textContent = quote.author ? `—— ${quote.author}` : '点击选句 · 右键闹钟';
            }
        } else {
            // 随机模式：首次进入固定内容
            if (titleEl) titleEl.textContent = '🐾 点击选择宠物或句子';
            if (descEl) descEl.textContent = '挑选一个陪伴你 · 右键闹钟';
        }
        if (badgeEl) badgeEl.textContent = '闲';
    },

    showIdlePicker() {
        let overlay = document.getElementById('idlePickerOverlay');
        if (overlay) { overlay.remove(); return; }

        overlay = document.createElement('div');
        overlay.id = 'idlePickerOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';

        const petCards = this.IDLE_PETS.map((p, i) => {
            const isActive = this._idleSelection && this._idleSelection.type === 'pet' && this._idleSelection.index === i;
            return `<div data-pet-idx="${i}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:10px;cursor:pointer;border:2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'};background:${isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)'};min-width:70px;transition:all 0.15s;">
                <span style="font-size:28px;">${p.emoji}</span>
                <span style="font-size:12px;color:var(--text-primary);font-weight:500;">${p.name}</span>
            </div>`;
        }).join('');

        overlay.innerHTML = `
            <div style="background:var(--bg-primary);border-radius:14px;padding:20px;width:380px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div style="font-size:16px;font-weight:600;color:var(--text-primary);">🎨 选择通知栏内容</div>
                    <button id="idlePickerClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
                </div>
                <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);">🐾 选择宠物</div>
                <div id="idlePetGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
                    ${petCards}
                </div>
                <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);">📝 选择句子</div>
                <div id="idleQuoteList" style="margin-bottom:12px;max-height:200px;overflow-y:auto;"></div>
                <button id="idleRandomBtn" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;cursor:pointer;">🔄 随机轮播</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const renderQuotes = (period) => {
            const listEl = overlay.querySelector('#idleQuoteList');
            if (!listEl) return;
            const key = period === 'morning' ? 'IDLE_QUOTES_MORNING' : period === 'afternoon' ? 'IDLE_QUOTES_AFTERNOON' : 'IDLE_QUOTES_EVENING';
            const quotes = this[key];
            const isActive = this._idleSelection && this._idleSelection.type === 'quote' && this._idleSelection.period === period;
            listEl.innerHTML = '<div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">' +
                ['morning','afternoon','evening'].map(p => {
                    const label = p === 'morning' ? '早' : p === 'afternoon' ? '午' : '晚';
                    return `<button data-period="${p}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border-color);background:${period===p?'var(--primary-color)':'var(--bg-secondary)'};color:${period===p?'#fff':'var(--text-secondary)'};font-size:12px;cursor:pointer;">${label}</button>`;
                }).join('') +
            '</div>' +
            quotes.map((q, i) => {
                const active = isActive && this._idleSelection.index === i;
                return `<div data-quote-idx="${i}" data-period="${period}" style="padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:4px;border:1px solid ${active ? 'var(--primary-color)' : 'transparent'};background:${active ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)'};font-size:13px;color:var(--text-primary);">${q.text}${q.author ? '<span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">——' + q.author + '</span>' : ''}</div>`;
            }).join('');

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
        renderQuotes(this._getPeriodForHour(new Date().getHours()));

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

        const close = () => { overlay.remove(); this.hideContextMenu?.(); };
        overlay.querySelector('#idlePickerClose').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
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
    }
};
