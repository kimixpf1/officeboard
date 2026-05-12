/**
 * 倒数日面板模块（mixin 模式）
 * 通过 Object.assign(OfficeDashboard.prototype, CountdownPanel) 混入
 */
const CountdownPanel = {

    initCountdownSystem() {
        this.countdownStorageKey = 'office_countdown_events';
        this.countdownTypeColorsKey = 'office_countdown_type_colors';
        this.countdownBuiltinYear = new Date().getFullYear();
        this.countdownDragId = null;
        this.countdownNoticeTimer = null;
        this.countdownNoticeIndex = 0;
        this.renderCountdownPanel();
        this.updateCountdownNotice();

        document.addEventListener('countdownSynced', () => {
            this.renderCountdownPanel();
            this.updateCountdownNotice();
        });
        document.addEventListener('syncDataLoaded', () => {
            this.renderCountdownPanel();
            this.updateCountdownNotice();
        });
    },

    initCountdownPanel() {
        const panel = document.getElementById('countdownPanel');
        const toggle = document.getElementById('countdownToggle');
        const close = document.getElementById('countdownClose');
        const addBtn = document.getElementById('addCountdownBtn');
        const nameInput = document.getElementById('countdownName');
        const dateInput = document.getElementById('countdownDate');
        const calendarTypeSelect = document.getElementById('countdownCalendarType');
        const typeSelect = document.getElementById('countdownEventType');
        const colorInput = document.getElementById('countdownColor');
        const customTypeInput = document.getElementById('countdownCustomType');
        const syncColor = () => {
            if (!colorInput || !typeSelect) {
                return;
            }
            const colors = this.getCountdownTypeColors();
            colorInput.value = colors[typeSelect.value] || '#f97316';
        };
        const toggleCustomTypeInput = () => {
            if (customTypeInput) {
                customTypeInput.style.display = typeSelect?.value === 'other' ? '' : 'none';
            }
        };

        if (!panel || !toggle) {
            return;
        }

        const isExpanded = () => panel.classList.contains('expanded');
        const openPanel = () => panel.classList.add('expanded');
        const closePanel = () => panel.classList.remove('expanded');
        const togglePanel = () => {
            if (isExpanded()) {
                closePanel();
            } else {
                openPanel();
            }
        };
        const handleAdd = () => this.handleAddCountdownEvent();

        toggle.addEventListener('click', togglePanel);
        close?.addEventListener('click', event => {
            event.stopPropagation();
            closePanel();
        });
        addBtn?.addEventListener('click', handleAdd);
        typeSelect?.addEventListener('change', () => {
            syncColor();
            toggleCustomTypeInput();
        });
        calendarTypeSelect?.addEventListener('change', () => {
            if (dateInput) {
                dateInput.title = calendarTypeSelect.value === 'lunar'
                    ? '请选择一个对应农历日期的公历日期，系统会自动按农历每年换算'
                    : '';
            }
            const dateTip = document.querySelector('.countdown-form-tip');
            if (dateTip) {
                dateTip.textContent = calendarTypeSelect.value === 'lunar'
                    ? '已切换为农历。你只需要选一次对应的公历日期，系统会自动记住农历月日，后续每年自动换算成新的公历日期。'
                    : '日期类型这里可切换"公历 / 农历"。选农历后，日期框里选一个对应农历月日的公历日期即可。';
            }
        });
        nameInput?.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (!dateInput?.value) {
                    dateInput?.focus();
                    return;
                }
                handleAdd();
            }
        });
        dateInput?.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
            }
        });

        panel.addEventListener('click', (event) => {
            const deleteBtn = event.target.closest('.countdown-item-delete');
            if (deleteBtn) {
                this.handleDeleteCountdownEvent(deleteBtn.dataset.id);
                return;
            }

            const editBtn = event.target.closest('.countdown-item-edit');
            if (editBtn) {
                this.startEditCountdownEvent(editBtn.dataset.id);
            }
        });

        panel.addEventListener('dragstart', event => {
            const item = event.target.closest('.countdown-item[data-id]');
            if (!item) {
                return;
            }
            this.countdownDragId = item.dataset.id;
            item.classList.add('dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.dataset.id || '');
            }
        });

        panel.addEventListener('dragend', event => {
            const item = event.target.closest('.countdown-item[data-id]');
            item?.classList.remove('dragging');
            panel.querySelectorAll('.countdown-item.drag-over').forEach(node => node.classList.remove('drag-over'));
            this.countdownDragId = null;
        });

        panel.addEventListener('dragover', event => {
            const item = event.target.closest('.countdown-item[data-id]');
            if (!item) {
                return;
            }
            event.preventDefault();
            panel.querySelectorAll('.countdown-item.drag-over').forEach(node => {
                if (node !== item) {
                    node.classList.remove('drag-over');
                }
            });
            item.classList.add('drag-over');
        });

        panel.addEventListener('drop', event => {
            const target = event.target.closest('.countdown-item[data-id]');
            if (!target || !this.countdownDragId) {
                return;
            }
            event.preventDefault();
            target.classList.remove('drag-over');
            this.reorderCountdownEvents(this.countdownDragId, target.dataset.id);
        });

        syncColor();
    },

    getBuiltinHolidayCountdowns() {
        const year = this.countdownBuiltinYear || new Date().getFullYear();
        const holidayDates = HolidayData?.holidays?.[year] || [];
        const holidayGroups = new Map();

        holidayDates.forEach(dateStr => {
            if (!dateStr) {
                return;
            }

            const holidayName = this.getHolidayDisplayName(dateStr);
            if (!holidayName) {
                return;
            }

            const existing = holidayGroups.get(holidayName);
            if (!existing || dateStr < existing.date) {
                holidayGroups.set(holidayName, {
                    id: `holiday-${holidayName}`,
                    name: holidayName,
                    date: dateStr,
                    type: 'holiday',
                    builtin: true,
                    eventType: 'festival'
                });
            }
        });

        return Array.from(holidayGroups.values())
            .map(item => this.normalizeCountdownEvent(item))
            .filter(item => item?.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft || a.date.localeCompare(b.date));
    },

    getHolidayDisplayName(dateStr) {
        const year = Number.parseInt(String(dateStr || '').slice(0, 4), 10);
        const holidayList = HolidayData?.holidays?.[year] || [];
        if (!holidayList.includes(dateStr)) {
            return '';
        }

        const monthDay = String(dateStr).slice(5);
        if (monthDay === '01-01') {
            return '元旦';
        }
        if (monthDay >= '04-04' && monthDay <= '04-06') {
            return '清明节';
        }
        if (monthDay >= '05-01' && monthDay <= '05-05') {
            return '劳动节';
        }
        if (monthDay >= '10-01' && monthDay <= '10-07') {
            return '国庆节';
        }

        const lunarInfo = window.LunarCalendarUtils?.getLunarMonthDay(dateStr);
        if (lunarInfo?.month === 1 && lunarInfo?.day === 1) {
            return '春节';
        }
        if (lunarInfo?.month === 5 && lunarInfo?.day === 5) {
            return '端午节';
        }
        if (lunarInfo?.month === 8 && lunarInfo?.day === 15) {
            return '中秋节';
        }

        if (dateStr >= `${year}-01-20` && dateStr <= `${year}-02-28`) {
            return '春节';
        }

        return '法定节假日';
    },

    getCountdownTypeColors() {
        const defaults = {
            birthday: '#ec4899',
            anniversary: '#8b5cf6',
            festival: '#f97316',
            other: '#06b6d4'
        };
        const saved = safeJsonParse(SafeStorage.get(this.countdownTypeColorsKey || 'office_countdown_type_colors'), null);
        return {
            ...defaults,
            ...(saved && typeof saved === 'object' ? saved : {})
        };
    },

    saveCountdownTypeColors(colors, options = {}) {
        SafeStorage.set(this.countdownTypeColorsKey || 'office_countdown_type_colors', JSON.stringify(colors || {}));

        if (!options.skipSync && window.syncManager?.isLoggedIn?.()) {
            window.syncManager.immediateSyncToCloud().catch(error => {
                console.warn('倒数日颜色同步失败:', error?.message || error);
            });
        }
    },

    getCustomCountdownEvents() {
        try {
            const raw = SafeStorage.get(this.countdownStorageKey || 'office_countdown_events');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('读取倒数日失败:', error);
            return [];
        }
    },

    saveCustomCountdownEvents(events, options = {}) {
        const normalized = Array.isArray(events)
            ? events.map((item, index) => ({
                ...item,
                order: Number.isFinite(item?.order) ? item.order : index
            }))
            : [];

        SafeStorage.set(this.countdownStorageKey || 'office_countdown_events', JSON.stringify(normalized));

        if (!options.skipSync && window.syncManager?.isLoggedIn?.()) {
            window.syncManager.immediateSyncToCloud().catch(error => {
                console.warn('倒数日同步失败:', error?.message || error);
            });
        }
    },

    getNextLunarOccurrence(item) {
        if (!item?.lunarMonth || !item?.lunarDay || !window.LunarCalendarUtils?.getNextSolarDateForLunar) {
            return item?.date || '';
        }
        return window.LunarCalendarUtils.getNextSolarDateForLunar(item.lunarMonth, item.lunarDay, new Date()) || item.date;
    },

    getCountdownEventLabel(item) {
        const typeMap = {
            birthday: '生日',
            anniversary: '纪念日',
            festival: '节日',
            other: item.customEventType || '其他'
        };
        const base = typeMap[item.eventType] || (item.type === 'holiday' ? '节日' : '纪念日');
        if (item.type === 'holiday') {
            return '节假日首日';
        }
        if (item.calendarType === 'lunar') {
            return `农历 ${item.lunarMonth || '--'}月${item.lunarDay || '--'}日 · ${base}`;
        }
        return `公历 ${String(item.date || '').slice(5)} · ${base}`;
    },

    normalizeCountdownEvent(item) {
        if (!item?.name) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let normalizedDate = item.date;
        let metaLabel = this.getCountdownEventLabel(item);
        if (item.calendarType === 'lunar') {
            normalizedDate = this.getNextLunarOccurrence(item);
        }

        const sourceDate = new Date(`${normalizedDate}T00:00:00`);
        if (!normalizedDate || Number.isNaN(sourceDate.getTime())) {
            return null;
        }

        let targetDate = new Date(sourceDate);
        const isHoliday = item.type === 'holiday';
        const originalYear = sourceDate.getFullYear();
        const currentYear = today.getFullYear();
        const isRecurringSolar = item.calendarType !== 'lunar' && !isHoliday && originalYear !== currentYear;

        if (isRecurringSolar) {
            targetDate = new Date(today.getFullYear(), sourceDate.getMonth(), sourceDate.getDate());
            if (targetDate < today) {
                targetDate = new Date(today.getFullYear() + 1, sourceDate.getMonth(), sourceDate.getDate());
            }
            metaLabel = this.getCountdownEventLabel({ ...item, date: this.formatDateLocal(targetDate) });
        }

        const finalDate = this.formatDateLocal(targetDate);
        const daysLeft = this.getDaysLeft(finalDate);
        const colors = this.getCountdownTypeColors();
        const color = item.color || colors[item.eventType] || colors.anniversary;

        return {
            ...item,
            originalDate: item.date,
            date: finalDate,
            daysLeft,
            metaLabel,
            isRecurring: item.calendarType === 'lunar' || isRecurringSolar,
            color,
            order: Number.isFinite(item.order) ? item.order : 9999
        };
    },

    getAllCountdownEvents() {
        const builtinEvents = this.getBuiltinHolidayCountdowns();
        const normalizedCustomEvents = this.getCustomCountdownEvents()
            .map(item => this.normalizeCountdownEvent(item))
            .filter(item => item?.name && item?.date && item.daysLeft >= 0);

        const allEvents = [...builtinEvents, ...normalizedCustomEvents]
            .filter(Boolean)
            .sort((a, b) => a.daysLeft - b.daysLeft || a.date.localeCompare(b.date) || String(a.name || '').localeCompare(String(b.name || '')));

        return this.applyCountdownSortOrder(allEvents);
    },

    applyCountdownSortOrder(events) {
        if (!Array.isArray(events) || events.length <= 1) {
            return events;
        }

        try {
            const sortOrderRaw = SafeStorage.get('office_countdown_sort_order');
            const sortOrder = sortOrderRaw ? JSON.parse(sortOrderRaw) : [];
            if (!Array.isArray(sortOrder) || !sortOrder.length) {
                return events;
            }

            const eventMap = new Map(events.map(e => [e.id, e]));
            const ordered = [];
            const placed = new Set();

            for (const id of sortOrder) {
                const event = eventMap.get(id);
                if (event) {
                    ordered.push(event);
                    placed.add(id);
                }
            }

            const unplaced = events.filter(e => !placed.has(e.id));
            if (!unplaced.length) return ordered;

            const result = [];
            let ui = 0;
            for (const event of ordered) {
                while (ui < unplaced.length && unplaced[ui].daysLeft < event.daysLeft) {
                    result.push(unplaced[ui]);
                    ui++;
                }
                result.push(event);
            }
            while (ui < unplaced.length) {
                result.push(unplaced[ui]);
                ui++;
            }
            return result;
        } catch (error) {
            console.warn('读取倒数日排序失败:', error);
            return events;
        }
    },

    getDaysLeft(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(`${dateStr}T00:00:00`);
        return Math.round((target.getTime() - today.getTime()) / 86400000);
    },

    renderCountdownPanel() {
        const listEl = document.getElementById('countdownList');
        const summaryEl = document.getElementById('countdownSummary');
        const addBtn = document.getElementById('addCountdownBtn');
        const calendarTypeSelect = document.getElementById('countdownCalendarType');
        if (!listEl || !summaryEl) {
            return;
        }

        const events = this.getAllCountdownEvents();
        const nextEvent = events[0] || null;

        summaryEl.innerHTML = nextEvent
            ? `<strong>${SecurityUtils.escapeHtml(nextEvent.name)}</strong><span>${nextEvent.daysLeft === 0 ? '今天就是' : `还有 ${nextEvent.daysLeft} 天`} · ${SecurityUtils.escapeHtml(nextEvent.date)}</span>`
            : '这里会自动展示今年剩余节假日首日，以及你新增的生日、节日、纪念日和其他重要日子。';

        if (calendarTypeSelect) {
            calendarTypeSelect.title = calendarTypeSelect.value === 'lunar'
                ? '已切换为农历。日期框里请选择一个对应农历月日的公历日期，系统会按农历自动换算下一次日期。'
                : '这里可以切换公历或农历。';
        }

        if (addBtn) {
            addBtn.textContent = addBtn.dataset.editingId ? '保存' : '+ 添加';
        }

        if (!events.length) {
            listEl.innerHTML = '<div class="countdown-empty">暂时还没有需要倒数的重要日子</div>';
            return;
        }

        listEl.innerHTML = events.map(item => {
            const isSoon = item.daysLeft <= 3;
            const isCustom = item.type !== 'holiday';
            const style = item.color ? ` style="--countdown-accent:${SecurityUtils.escapeHtml(item.color)}"` : '';
            const actionButtons = isCustom
                ? `<button type="button" class="countdown-item-edit" data-id="${SecurityUtils.escapeHtml(item.id)}" title="编辑">编辑</button>
                   <button type="button" class="countdown-item-delete" data-id="${SecurityUtils.escapeHtml(item.id)}" title="删除">×</button>`
                : '';
            return `
                <div class="countdown-item${isSoon ? ' soon' : ''}${isCustom ? ' custom' : ' builtin'}" data-id="${SecurityUtils.escapeHtml(item.id)}"${isCustom ? ' draggable="true"' : ''}${style}>
                    <div class="countdown-item-info">
                        <div class="countdown-item-title-row">
                            <span class="countdown-item-type-dot"></span>
                            <div class="countdown-item-title">${SecurityUtils.escapeHtml(item.name)}</div>
                        </div>
                        <div class="countdown-item-meta">${SecurityUtils.escapeHtml(item.date)} · ${SecurityUtils.escapeHtml(item.metaLabel || (item.type === 'holiday' ? '节假日' : '自定义'))}</div>
                    </div>
                    <div class="countdown-item-side">
                        <div class="countdown-item-days ${isSoon ? 'soon' : ''}">${item.daysLeft === 0 ? '今天' : `${item.daysLeft} 天`}</div>
                        <div class="countdown-item-actions">${actionButtons}</div>
                    </div>
                </div>`;
        }).join('');
    },

    updateCountdownNotice() {
        const todoReminderActive = this.updateTodoReminderNotice();
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl || todoReminderActive) {
            return;
        }

        // 闹钟/待办激活时不被外部调用覆盖
        if (noticeEl.classList.contains('alarm-active')) {
            return;
        }

        const upcoming = this.getAllCountdownEvents().filter(item => item.daysLeft >= 0 && item.daysLeft <= 10);
        if (this.countdownNoticeTimer) {
            clearInterval(this.countdownNoticeTimer);
            this.countdownNoticeTimer = null;
        }

        noticeEl.classList.remove('todo-reminder-active', 'todo-reminder-flashing');

        if (!upcoming.length) {
            this.countdownNoticeIndex = 0;
            if (typeof this.showIdleNotice === 'function') {
                this.showIdleNotice();
            } else {
                noticeEl.hidden = true;
            }
            return;
        }

        this.hideIdleNotice?.();

        const titleEl = noticeEl.querySelector('.countdown-notice-title');
        const descEl = noticeEl.querySelector('.countdown-notice-desc');
        const renderNoticeItem = (item) => {
            if (titleEl) {
                titleEl.textContent = `${item.name}${item.daysLeft === 0 ? '就在今天' : `还有 ${item.daysLeft} 天`}`;
            }
            if (descEl) {
                descEl.textContent = `${item.date} · ${item.metaLabel || (item.type === 'holiday' ? '节假日提醒' : '纪念日提醒')}`;
            }
        };

        const currentIndex = upcoming.length > 1
            ? this.countdownNoticeIndex % upcoming.length
            : 0;
        renderNoticeItem(upcoming[currentIndex]);
        noticeEl.hidden = false;

        if (upcoming.length > 1) {
            this.countdownNoticeIndex = currentIndex;
            this.countdownNoticeTimer = window.setInterval(() => {
                this.countdownNoticeIndex = (this.countdownNoticeIndex + 1) % upcoming.length;
                renderNoticeItem(upcoming[this.countdownNoticeIndex]);
            }, 3000);
        } else {
            this.countdownNoticeIndex = 0;
        }
    },

    startEditCountdownEvent(id) {
        const target = this.getCustomCountdownEvents().find(item => item.id === id);
        if (!target) {
            return;
        }

        const panel = document.getElementById('countdownPanel');
        if (panel && !panel.classList.contains('expanded')) {
            panel.classList.add('expanded');
        }

        const nameInput = document.getElementById('countdownName');
        const dateInput = document.getElementById('countdownDate');
        const calendarTypeSelect = document.getElementById('countdownCalendarType');
        const typeSelect = document.getElementById('countdownEventType');
        const colorInput = document.getElementById('countdownColor');
        const addBtn = document.getElementById('addCountdownBtn');
        const dateTip = document.querySelector('.countdown-form-tip');
        const customTypeInput = document.getElementById('countdownCustomType');

        if (nameInput) {
            nameInput.value = target.name || '';
        }
        if (dateInput) {
            dateInput.value = target.originalDate || target.date || '';
        }
        if (calendarTypeSelect) {
            calendarTypeSelect.value = target.calendarType || 'solar';
        }
        if (typeSelect) {
            typeSelect.value = target.eventType || 'anniversary';
        }
        if (customTypeInput) {
            customTypeInput.value = target.customEventType || '';
            customTypeInput.style.display = target.eventType === 'other' ? '' : 'none';
        }
        if (colorInput) {
            colorInput.value = target.color || this.getCountdownTypeColors()[target.eventType || 'anniversary'] || '#f97316';
        }
        if (addBtn) {
            addBtn.dataset.editingId = id;
            addBtn.textContent = '保存';
        }
        if (dateTip) {
            dateTip.textContent = (target.calendarType === 'lunar' && target.lunarMonth && target.lunarDay)
                ? `当前是农历 ${target.lunarMonth} 月 ${target.lunarDay} 日，日期框里保留的是用于换算的公历日期，保存时会自动继续按农历换算。`
                : '日期类型这里可切换"公历 / 农历"。选农历时只要挑一个对应的公历日期，系统会自动记住农历并换算成之后每年的公历日期。';
        }
        nameInput?.focus();
    },

    resetCountdownForm() {
        const nameInput = document.getElementById('countdownName');
        const dateInput = document.getElementById('countdownDate');
        const calendarTypeSelect = document.getElementById('countdownCalendarType');
        const typeSelect = document.getElementById('countdownEventType');
        const colorInput = document.getElementById('countdownColor');
        const addBtn = document.getElementById('addCountdownBtn');
        const dateTip = document.querySelector('.countdown-form-tip');
        const customTypeInput = document.getElementById('countdownCustomType');
        const colors = this.getCountdownTypeColors();

        if (nameInput) {
            nameInput.value = '';
        }
        if (dateInput) {
            dateInput.value = '';
            dateInput.title = '';
        }
        if (calendarTypeSelect) {
            calendarTypeSelect.value = 'solar';
        }
        if (typeSelect) {
            typeSelect.value = 'birthday';
        }
        if (customTypeInput) {
            customTypeInput.value = '';
            customTypeInput.style.display = 'none';
        }
        if (colorInput) {
            colorInput.value = colors.birthday || '#ec4899';
        }
        if (addBtn) {
            delete addBtn.dataset.editingId;
            addBtn.textContent = '+ 添加';
        }
        if (dateTip) {
            dateTip.textContent = '日期类型这里可切换"公历 / 农历"。选农历时只要挑一个对应的公历日期，系统会自动记住农历并换算成之后每年的公历日期。';
        }
    },

    handleAddCountdownEvent() {
        const nameInput = document.getElementById('countdownName');
        const dateInput = document.getElementById('countdownDate');
        const calendarTypeSelect = document.getElementById('countdownCalendarType');
        const typeSelect = document.getElementById('countdownEventType');
        const colorInput = document.getElementById('countdownColor');
        const addBtn = document.getElementById('addCountdownBtn');
        const customTypeInput = document.getElementById('countdownCustomType');
        const name = nameInput?.value?.trim();
        const date = dateInput?.value;
        const calendarType = calendarTypeSelect?.value || 'solar';
        const eventType = typeSelect?.value || 'anniversary';
        const customEventType = customTypeInput?.value?.trim() || '';
        const color = colorInput?.value || this.getCountdownTypeColors()[eventType] || '#f97316';
        const editingId = addBtn?.dataset.editingId;

        if (!name || !date) {
            this.showError('请先填写倒数日名称和日期');
            return;
        }

        if (eventType === 'other' && !customEventType) {
            this.showError('请填写自定义类型名称');
            return;
        }

        const events = this.getCustomCountdownEvents();

        const lunarInfo = calendarType === 'lunar'
            ? window.LunarCalendarUtils?.getLunarMonthDay(date)
            : null;

        if (calendarType === 'lunar' && (!lunarInfo?.month || !lunarInfo?.day)) {
            this.showError('当前浏览器无法换算农历日期，请改用公历或更换浏览器后重试');
            return;
        }

        const colors = this.getCountdownTypeColors();
        colors[eventType] = color;
        this.saveCountdownTypeColors(colors, { skipSync: true });

        const normalizedDate = calendarType === 'lunar'
            ? (window.LunarCalendarUtils?.getNextSolarDateForLunar(lunarInfo.month, lunarInfo.day, new Date()) || date)
            : date;

        const nextOrder = events.length ? Math.max(...events.map(item => item.order ?? 0)) + 1 : 0;
        const payload = {
            id: editingId || `custom-${Date.now()}`,
            name,
            date: normalizedDate,
            originalDate: date,
            type: 'custom',
            calendarType,
            eventType,
            customEventType: eventType === 'other' ? customEventType : '',
            color,
            lunarMonth: lunarInfo?.month || null,
            lunarDay: lunarInfo?.day || null,
            order: editingId ? (events.find(item => item.id === editingId)?.order ?? nextOrder) : nextOrder
        };

        const nextEvents = editingId
            ? events.map(item => item.id === editingId ? { ...item, ...payload } : item)
            : [...events, payload];

        this.saveCustomCountdownEvents(nextEvents);
        this.resetCountdownForm();
        this.renderCountdownPanel();
        this.updateCountdownNotice();
        this.showSuccess(editingId ? '倒数日已更新' : '倒数日已添加');
    },

    moveCountdownEvent(id, direction) {
        const events = this.getCustomCountdownEvents().slice().sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        const index = events.findIndex(item => item.id === id);
        if (index < 0) {
            return;
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= events.length) {
            return;
        }

        const [moved] = events.splice(index, 1);
        events.splice(targetIndex, 0, moved);
        this.saveCustomCountdownEvents(events.map((item, order) => ({ ...item, order })));
        this.renderCountdownPanel();
        this.updateCountdownNotice();
    },

    reorderCountdownEvents(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) {
            return;
        }

        const allEvents = this.getAllCountdownEvents();
        const sourceIndex = allEvents.findIndex(item => item.id === sourceId);
        const targetIndex = allEvents.findIndex(item => item.id === targetId);
        if (sourceIndex < 0 || targetIndex < 0) {
            return;
        }

        const [moved] = allEvents.splice(sourceIndex, 1);
        allEvents.splice(targetIndex, 0, moved);

        const sortOrder = allEvents.map(item => item.id);
        SafeStorage.set('office_countdown_sort_order', JSON.stringify(sortOrder));

        if (window.syncManager?.isLoggedIn?.()) {
            window.syncManager.immediateSyncToCloud().catch(error => {
                console.warn('倒数日排序同步失败:', error?.message || error);
            });
        }

        this.renderCountdownPanel();
        this.updateCountdownNotice();
    },

    handleDeleteCountdownEvent(id) {
        if (!id) {
            return;
        }

        const events = this.getCustomCountdownEvents().filter(item => item.id !== id);
        this.saveCustomCountdownEvents(events.map((item, order) => ({ ...item, order })));
        this.renderCountdownPanel();
        this.updateCountdownNotice();
        this.showSuccess('已删除倒数日');
    }

};
