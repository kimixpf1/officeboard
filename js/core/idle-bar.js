/**
 * 空闲态通知栏模块
 * 无倒数日和待办提醒时，通知栏展示鸡汤/宠物内容
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
        { emoji: '🐱', name: '小橘', actions: { morning: ['正在伸懒腰', '追着阳光跑'], afternoon: ['趴着打盹', '在舔爪子'], evening: ['蜷成一团', '在打呼噜'] } },
        { emoji: '🐶', name: '旺财', actions: { morning: ['摇着尾巴等你', '在院子里跑圈'], afternoon: ['趴在脚边发呆', '在啃骨头'], evening: ['打着哈欠', '趴着打盹'] } },
        { emoji: '🐼', name: '滚滚', actions: { morning: ['在啃竹子', '翻了个滚'], afternoon: ['懒洋洋躺着', '抱着竹子打盹'], evening: ['靠在石头上', '闭着眼啃竹子'] } },
        { emoji: '🦊', name: '小灵', actions: { morning: ['在草丛里探头', '甩着大尾巴'], afternoon: ['蜷在窝里', '半眯着眼晒太阳'], evening: ['望着月亮', '安静地蹲着'] } },
        { emoji: '🐰', name: '团团', actions: { morning: ['竖着耳朵听', '蹦蹦跳跳'], afternoon: ['趴着休息', '在啃胡萝卜'], evening: ['缩成一团白球', '闭眼打盹'] } },
        { emoji: '🐧', name: '波波', actions: { morning: ['摇摇摆摆走路', '在整理羽毛'], afternoon: ['站着打盹', '和同伴聊天'], evening: ['挤在群里取暖', '安静地站着'] } },
    ],

    _idleTimer: null,
    _idlePetIndex: 0,
    _idleQuoteIndex: 0,
    _idleShowPet: false,

    initIdleBar() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        noticeEl.addEventListener('click', (e) => {
            if (noticeEl.classList.contains('idle-mode') && !e.target.closest('.todo-reminder-complete-btn')) {
                this.rotateIdleContent();
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

        noticeEl.addEventListener('dblclick', (e) => {
            if (noticeEl.classList.contains('idle-mode') && typeof this.showAlarmSettings === 'function') {
                this.showAlarmSettings();
            }
        });
    },

    showIdleNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        noticeEl.hidden = false;
        noticeEl.classList.remove('todo-reminder-active', 'todo-reminder-flashing');

        const wasIdle = noticeEl.classList.contains('idle-mode');
        noticeEl.classList.add('idle-mode');

        if (!wasIdle) {
            this._idlePetIndex = Math.floor(Math.random() * this.IDLE_PETS.length);
            const hour = new Date().getHours();
            const quotes = this._getQuotesForHour(hour);
            this._idleQuoteIndex = Math.floor(Math.random() * quotes.length);
            this._idleShowPet = Math.random() < 0.4;
        }

        this._renderIdleContent();
    },

    hideIdleNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;
        noticeEl.classList.remove('idle-mode');
        this._stopIdleRotation();
    },

    rotateIdleContent() {
        const hour = new Date().getHours();
        const quotes = this._getQuotesForHour(hour);
        this._idleQuoteIndex = (this._idleQuoteIndex + 1) % quotes.length;
        this._idleShowPet = !this._idleShowPet;
        if (this._idleShowPet) {
            this._idlePetIndex = (this._idlePetIndex + 1) % this.IDLE_PETS.length;
        }
        this._renderIdleContent();
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

        if (this._idleShowPet) {
            const pet = this.IDLE_PETS[this._idlePetIndex];
            const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
            const actions = pet.actions[period];
            const action = actions[this._idlePetIndex % actions.length];
            if (titleEl) titleEl.textContent = `${pet.emoji} ${pet.name} ${action}`;
            if (descEl) descEl.textContent = '点击切换 · 双击闹钟';
        } else {
            const quotes = this._getQuotesForHour(hour);
            const quote = quotes[this._idleQuoteIndex % quotes.length];
            if (titleEl) titleEl.textContent = `${quote.text}`;
            if (descEl) descEl.textContent = quote.author ? `—— ${quote.author}` : '点击切换 · 双击闹钟';
        }
        if (badgeEl) badgeEl.textContent = '闲';
    },

    _startIdleRotation() {
    },

    _stopIdleRotation() {
        if (this._idleTimer) {
            clearInterval(this._idleTimer);
            this._idleTimer = null;
        }
    }
};
