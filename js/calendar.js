/**
 * 日历视图模块
 * 支持周视图、月视图
 */

class CalendarView {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'week';
        this.container = document.getElementById('calendarContainer');
        this.lastRenderSignature = '';
        this.lastRenderAt = 0;
        this._forceRender = false;
    }

    parseLocalDate(dateStr) {
        if (dateStr instanceof Date) return new Date(dateStr);
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
    }

    safeReplaceChildren(newChild) {
        if (this.container.replaceChildren) {
            this.container.replaceChildren(newChild);
        } else {
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            this.container.appendChild(newChild);
        }
    }

    getDashboardApp() {
        return window.officeDashboard || null;
    }

    getComparableTimestamp(value) {
        const timestamp = new Date(value || 0).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    getMeetingLeaderRank(item) {
        const app = this.getDashboardApp();
        if (!app?.getMeetingLevel || !item || item.type !== 'meeting') {
            return Number.MAX_SAFE_INTEGER;
        }
        return app.getMeetingLevel(item);
    }

    compareMeetingsByBoardOrder(a, b) {
        const rankA = this.getMeetingLeaderRank(a);
        const rankB = this.getMeetingLeaderRank(b);
        if (rankA !== rankB) {
            return rankA - rankB;
        }

        const timeA = a.time || '99:99';
        const timeB = b.time || '99:99';
        if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
        }

        return this.getComparableTimestamp(a.createdAt) - this.getComparableTimestamp(b.createdAt);
    }

    isItemCompleted(item) {
        if (!item) {
            return false;
        }

        if (item.type === 'document') {
            return item.progress === 'completed';
        }

        return Boolean(item.completed);
    }

    /**
     * 排序事项：未完成优先，再按类型（待办→会议→文件），再按时间
     */
    sortItems(items) {
        const typeOrder = { todo: 1, meeting: 2, document: 3 };

        return items.sort((a, b) => {
            const completedA = this.isItemCompleted(a) ? 1 : 0;
            const completedB = this.isItemCompleted(b) ? 1 : 0;
            if (completedA !== completedB) {
                return completedA - completedB;
            }

            const typeA = typeOrder[a.type] || 99;
            const typeB = typeOrder[b.type] || 99;
            if (typeA !== typeB) {
                return typeA - typeB;
            }

            if (a.type === 'meeting' && b.type === 'meeting') {
                return this.compareMeetingsByBoardOrder(a, b);
            }

            const timeA = this.getItemTime(a);
            const timeB = this.getItemTime(b);
            return timeA.localeCompare(timeB);
        });
    }

    /**
     * 获取事项的时间字符串用于排序
     */
    getItemTime(item) {
        switch (item.type) {
            case 'todo':
                return item.deadline ? item.deadline : '99:99';
            case 'meeting':
                return item.time ? item.time : '99:99';
            case 'document':
                return item.createdAt ? item.createdAt.substring(11, 16) : '99:99';
            default:
                return '99:99';
        }
    }

    shouldSkipRender() {
        if (this._forceRender) {
            this._forceRender = false;
            this.lastRenderSignature = '';
            this.lastRenderAt = 0;
            return false;
        }
        const signature = `${this.currentView}:${this.formatLocalDate(this.currentDate)}`;
        const now = Date.now();

        if (this.lastRenderSignature === signature && now - this.lastRenderAt < 120) {
            return true;
        }

        this.lastRenderSignature = signature;
        this.lastRenderAt = now;
        return false;
    }

    /**
     * 设置当前日期
     */
    setDate(date, shouldRender = true) {
        this.currentDate = this.parseLocalDate(date);
        if (shouldRender) {
            this.render();
        }
    }

    /**
     * 设置视图类型
     */
    setView(viewType, shouldRender = true) {
        this.currentView = viewType;
        if (shouldRender) {
            this.render();
        }
    }

    /**
     * 上一页/天
     */
    prev() {
        switch (this.currentView) {
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
        this.render();
    }

    /**
     * 下一页/天
     */
    next() {
        switch (this.currentView) {
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
        this.render();
    }

    /**
     * 回到今天
     */
    async today() {
        this.currentDate = new Date();
        this.lastRenderSignature = null;
        this._scrollToToday = true;
        await this.render();
    }

    /**
     * 获取日期范围字符串
     */
    getDateRangeText() {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };

        switch (this.currentView) {
            case 'week': {
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return `${weekStart.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('zh-CN', options)}`;
            }

            case 'month':
                return this.currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

            default:
                return this.currentDate.toLocaleDateString('zh-CN', options);
        }
    }

    /**
     * 获取周开始日期（周一）
     */
    getWeekStart(date) {
        const d = date instanceof Date ? new Date(date) : this.parseLocalDate(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    /**
     * 跳转到指定日期的日视图
     */
    goToDate(dateStr) {
        const event = new CustomEvent('gotoDate', { detail: { date: dateStr } });
        document.dispatchEvent(event);
    }

    /**
     * 渲染日历
     */
    async render() {
        try {
            if (!this.container) {
                console.warn('日历容器不存在');
                return;
            }

            if (this.shouldSkipRender()) {
                return;
            }

            const items = await this.getItemsForCurrentView();
            const itemsByDate = this.buildItemsByDateMap(items);

            switch (this.currentView) {
                case 'week':
                    this.renderWeekView(itemsByDate);
                    break;
                case 'month':
                    this.renderMonthView(itemsByDate);
                    break;
            }
        } catch (error) {
            console.error('渲染日历失败:', error);
            if (this.container) {
                const errorEl = document.createElement('div');
                errorEl.style.textAlign = 'center';
                errorEl.style.padding = '40px';
                errorEl.style.color = '#666';
                errorEl.textContent = '加载日历失败，请刷新重试';
                this.safeReplaceChildren(errorEl);
            }
        }
    }

    getCurrentViewDateRange() {
        let startDate;
        let endDate;

        switch (this.currentView) {
            case 'week': {
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                startDate = this.formatLocalDate(weekStart);
                endDate = this.formatLocalDate(weekEnd);
                break;
            }
            case 'month': {
                const year = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                startDate = this.formatLocalDate(monthStart);
                endDate = this.formatLocalDate(monthEnd);
                break;
            }
            default:
                startDate = endDate = this.formatLocalDate(this.currentDate);
        }

        return { startDate, endDate };
    }

    /**
     * 获取当前视图的事项
     */
    async getItemsForCurrentView() {
        const { startDate, endDate } = this.getCurrentViewDateRange();
        return await db.getItemsByDateRange(startDate, endDate);
    }

    /**
     * 格式化本地日期（避免时区问题）
     */
    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    addDays(dateStr, days) {
        const date = new Date(`${dateStr}T00:00:00`);
        date.setDate(date.getDate() + days);
        return this.formatLocalDate(date);
    }

    getItemDateSpan(item) {
        if (item.type === 'meeting' && item.date) {
            return {
                startDate: item.date,
                endDate: item.endDate || item.date,
                skipWeekend: false
            };
        }

        if (item.type === 'todo' && item.deadline) {
            const dateStr = item.deadline.split('T')[0];
            return {
                startDate: dateStr,
                endDate: dateStr,
                skipWeekend: false
            };
        }

        if (item.type === 'document') {
            const startDate = item.docStartDate || item.docDate || item.createdAt?.split('T')[0] || null;
            const endDate = item.docEndDate || startDate;
            if (startDate) {
                return {
                    startDate,
                    endDate,
                    skipWeekend: Boolean(item.skipWeekend)
                };
            }
        }

        return null;
    }

    getItemForDate(item, dateStr) {
        if (!item || !dateStr) {
            return item;
        }

        const baseItem = {
            ...item,
            _viewDate: dateStr
        };

        if (item.type !== 'meeting' && item.type !== 'document') {
            return baseItem;
        }

        const dayState = item.dayStates?.[dateStr];

        if (!dayState) {
            return baseItem;
        }

        return {
            ...baseItem,
            completed: dayState.completed !== undefined ? dayState.completed : item.completed,
            completedAt: dayState.completedAt !== undefined ? dayState.completedAt : item.completedAt,
            progress: dayState.progress !== undefined ? dayState.progress : item.progress,
            pinned: dayState.pinned !== undefined ? dayState.pinned : item.pinned,
            sunk: dayState.sunk !== undefined ? dayState.sunk : item.sunk,
            title: dayState.title !== undefined ? dayState.title : item.title,
            content: dayState.content !== undefined ? dayState.content : item.content,
            location: dayState.location !== undefined ? dayState.location : item.location,
            attendees: dayState.attendees !== undefined ? dayState.attendees : item.attendees,
            time: dayState.time !== undefined ? dayState.time : item.time,
            endTime: dayState.endTime !== undefined ? dayState.endTime : item.endTime,
            handler: dayState.handler !== undefined ? dayState.handler : item.handler,
            transferHistory: dayState.transferHistory !== undefined ? dayState.transferHistory : item.transferHistory,
            _hidden: dayState.hidden || false
        };
    }

    buildItemsByDateMap(items) {
        const { startDate, endDate } = this.getCurrentViewDateRange();
        const itemsByDate = new Map();

        items.forEach(item => {
            const span = this.getItemDateSpan(item);
            if (!span) {
                return;
            }

            let rangeStart = span.startDate;
            let rangeEnd = span.endDate || span.startDate;

            if (rangeStart > endDate || rangeEnd < startDate) {
                return;
            }

            if (rangeStart < startDate) {
                rangeStart = startDate;
            }
            if (rangeEnd > endDate) {
                rangeEnd = endDate;
            }

            let currentDate = rangeStart;
            while (currentDate <= rangeEnd) {
                if (!span.skipWeekend || this.isWorkday(currentDate)) {
                    const dateItem = this.getItemForDate(item, currentDate);
                    if (!dateItem?._hidden) {
                        if (!itemsByDate.has(currentDate)) {
                            itemsByDate.set(currentDate, []);
                        }
                        itemsByDate.get(currentDate).push(dateItem);
                    }
                }
                currentDate = this.addDays(currentDate, 1);
            }
        });

        return itemsByDate;
    }

    getSortedItemsForDate(itemsByDate, dateStr) {
        const dayItems = itemsByDate.get(dateStr) || [];
        return this.sortItems([...dayItems]);
    }

    /**
     * 检查日期是否是工作日（不含周末和节假日）
     */
    isWorkday(dateStr) {
        const date = new Date(`${dateStr}T00:00:00`);
        const dayOfWeek = date.getDay();

        if (typeof HolidayData !== 'undefined') {
            if (HolidayData.isHoliday(dateStr)) {
                return false;
            }
            if (HolidayData.isMakeupDay(dateStr)) {
                return true;
            }
        }

        return dayOfWeek !== 0 && dayOfWeek !== 6;
    }

    /**
     * 触发日历空白处快速新增
     */
    quickAddForDate(dateStr) {
        const event = new CustomEvent('calendarQuickAdd', { detail: { date: dateStr } });
        document.dispatchEvent(event);
    }

    createCellAddButton(dateStr) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar-cell-add-btn';
        button.textContent = '+ 新增';
        button.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border:none;border-radius:999px;background:rgba(99,102,241,0.12);color:var(--primary-color);font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.quickAddForDate(dateStr);
        });
        return button;
    }

    createCellTopBar(dateStr, labelText = '') {
        const topBar = document.createElement('div');
        topBar.className = 'calendar-cell-topbar';
        topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;position:sticky;top:0;z-index:1;padding-bottom:4px;background:inherit;';

        const label = document.createElement('div');
        label.className = 'calendar-cell-topbar-label';
        label.textContent = labelText;
        label.style.cssText = 'font-size:12px;font-weight:600;color:var(--gray-600);min-width:0;';
        topBar.appendChild(label);
        topBar.appendChild(this.createCellAddButton(dateStr));

        return topBar;
    }

    createEmptyHint() {
        const emptyHint = document.createElement('div');
        emptyHint.className = 'calendar-empty-hint';
        emptyHint.textContent = '左键查看，右键新增';
        emptyHint.style.cssText = 'margin-top:8px;color:var(--gray-500);font-size:12px;line-height:1.5;';
        return emptyHint;
    }

    bindQuickAddEvents(cellDiv, dateStr) {
        cellDiv.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-item') || e.target.closest('.calendar-cell-add-btn')) {
                return;
            }
            this.goToDate(dateStr);
        });

        cellDiv.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.calendar-item')) {
                return;
            }
            e.preventDefault();
            this.quickAddForDate(dateStr);
        });

        cellDiv.addEventListener('dragover', (e) => {
            if (!window.officeDashboard?.draggedItem) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            cellDiv.classList.add('drag-over');
        });

        cellDiv.addEventListener('dragleave', (e) => {
            if (!cellDiv.contains(e.relatedTarget)) {
                cellDiv.classList.remove('drag-over');
            }
        });

        cellDiv.addEventListener('drop', async (e) => {
            if (!window.officeDashboard?.draggedItem) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            cellDiv.classList.remove('drag-over');

            const draggedItem = window.officeDashboard.draggedItem;
            const sameCell = draggedItem.type === 'todo'
                ? draggedItem.deadline?.split('T')[0] === dateStr
                : draggedItem.type === 'meeting'
                    ? draggedItem.date === dateStr
                    : (draggedItem.docStartDate || draggedItem.docDate) === dateStr;

            if (sameCell) {
                const calendarItems = cellDiv.querySelectorAll('.calendar-item');
                const orderedIds = [...calendarItems].map(el => parseInt(el.dataset.id)).filter(id => !isNaN(id));
                if (orderedIds.length > 0 && window.officeDashboard?.saveCalendarItemOrder) {
                    await window.officeDashboard.saveCalendarItemOrder(orderedIds);
                }
            } else {
                if (window.officeDashboard?.moveItemToDateFromCalendar) {
                    await window.officeDashboard.moveItemToDateFromCalendar(dateStr);
                }
            }
        });
    }

    /**
     * 渲染周视图
     */
    renderWeekView(itemsByDate) {
        const weekDates = this.getWeekDates(this.currentDate);
        const today = new Date();
        const todayStr = this.formatLocalDate(today);
        const app = this.getDashboardApp();
        const selectedStr = app?.selectedDate || todayStr;

        const weekStart = weekDates[0];
        const weekOfMonth = this.getWeekOfMonth(weekStart);
        const monthLabel = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月第${weekOfMonth}周`;

        const container = document.createElement('div');
        container.className = 'week-view';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'week-title';
        titleDiv.style.gridColumn = '1 / span 7';
        titleDiv.style.textAlign = 'center';
        titleDiv.textContent = monthLabel;
        container.appendChild(titleDiv);

        const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        for (let i = 0; i < 7; i++) {
            const date = weekDates[i];
            const dateStr = this.formatLocalDate(date);
            const isToday = dateStr === todayStr;
            const dayLabel = `${weekDayNames[i]} ${date.getMonth() + 1}/${date.getDate()}`;

            const headerDiv = document.createElement('div');
            headerDiv.className = `week-header${isToday ? ' today' : ''}`;
            headerDiv.textContent = dayLabel;
            container.appendChild(headerDiv);
        }

        for (let i = 0; i < 7; i++) {
            const date = weekDates[i];
            const dateStr = this.formatLocalDate(date);
            const isToday = dateStr === todayStr;
            const sortedItems = this.getSortedItemsForDate(itemsByDate, dateStr);

            const cellDiv = document.createElement('div');
            cellDiv.className = `week-cell${isToday ? ' today' : ''}${dateStr === selectedStr ? ' selected-date' : ''}`;
            cellDiv.dataset.date = dateStr;
            this.bindQuickAddEvents(cellDiv, dateStr);
            cellDiv.appendChild(this.createCellTopBar(dateStr, '左键进日视图'));

            if (sortedItems.length > 0) {
                sortedItems.forEach(item => cellDiv.appendChild(this.createCalendarItem(item, true)));
            } else {
                cellDiv.appendChild(this.createEmptyHint());
            }
            container.appendChild(cellDiv);
        }

        this.safeReplaceChildren(container);

        requestAnimationFrame(() => {
            if (this._scrollToToday) {
                this._scrollToToday = false;
                const todayCell = container.querySelector('.week-cell.today');
                if (todayCell) {
                    todayCell.scrollIntoView({ behavior: 'instant', block: 'center' });
                    return;
                }
            }
            const scrollParent = this.container.closest('.calendar-view') || this.container;
            scrollParent.scrollTo({ top: 0, behavior: 'instant' });
        });
    }

    /**
     * 获取一周的所有日期（周一到周日）
     */
    getWeekDates(baseDate) {
        const dates = [];
        const weekStart = this.getWeekStart(baseDate);

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            dates.push(date);
        }

        return dates;
    }

    /**
     * 计算日期是该月的第几周
     * @param {Date} date - 周一日期
     * @returns {number} 第几周
     */
    getWeekOfMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay() || 7;

        const weekNumber = Math.ceil((day + firstDayOfWeek - 1) / 7);
        return weekNumber;
    }

    /**
     * 渲染月视图
     */
    renderMonthView(itemsByDate) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay() || 7;

        const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
        const today = new Date();
        const todayStr = this.formatLocalDate(today);
        const app = this.getDashboardApp();
        const selectedStr = app?.selectedDate || todayStr;

        const container = document.createElement('div');
        container.className = 'month-view';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'month-title';
        titleDiv.style.gridColumn = '1 / span 7';
        titleDiv.style.textAlign = 'center';
        titleDiv.textContent = `${year}年${month + 1}月`;
        container.appendChild(titleDiv);

        weekDays.forEach(day => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'month-header';
            headerDiv.textContent = `周${day}`;
            container.appendChild(headerDiv);
        });

        for (let i = 1; i < startDayOfWeek; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'month-cell other-month';
            container.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const sortedItems = this.getSortedItemsForDate(itemsByDate, dateStr);

            const cellDiv = document.createElement('div');
            cellDiv.className = `month-cell${isToday ? ' today' : ''}${sortedItems.length === 0 ? ' empty-cell' : ''}${dateStr === selectedStr ? ' selected-date' : ''}`;
            const fullDateLabel = `${month + 1}月${day}日 周${weekDays[(startDayOfWeek - 1 + day - 1) % 7]}`;
            cellDiv.dataset.date = dateStr;
            cellDiv.title = fullDateLabel;
            this.bindQuickAddEvents(cellDiv, dateStr);
            cellDiv.appendChild(this.createCellTopBar(dateStr, `${month + 1}月${day}日`));

            if (sortedItems.length === 0) {
                cellDiv.appendChild(this.createEmptyHint());
            }

            sortedItems.forEach(item => cellDiv.appendChild(this.createCalendarItem(item, true)));
            container.appendChild(cellDiv);
        }

        const remainingCells = (7 - ((startDayOfWeek - 1 + daysInMonth) % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'month-cell other-month';
            container.appendChild(emptyDiv);
        }

        this.safeReplaceChildren(container);

        requestAnimationFrame(() => {
            if (this._scrollToToday) {
                this._scrollToToday = false;
                const todayCell = container.querySelector('.month-cell.today');
                if (todayCell) {
                    todayCell.scrollIntoView({ behavior: 'instant', block: 'center' });
                    return;
                }
            }
            const selectedCell = container.querySelector('.selected-date');
            if (selectedCell) {
                selectedCell.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
        });
    }

    /**
     * 渲染日历中的事项
     */
    renderCalendarItem(item, compact = false) {
        return this.createCalendarItem(item, compact);
    }

    createCalendarItem(item, compact = false) {
        const typeClass = `${item.type}-card`;
        const typeLabels = { todo: '待办', meeting: '会议', document: '文件' };
        const typeLabel = typeLabels[item.type] || item.type;
        const isCompleted = this.isItemCompleted(item);

        let displayTitle = item.title;
        if (item.type === 'meeting') {
            const parts = [];
            if (item.attendees && item.attendees.length > 0) {
                parts.push(`【${item.attendees.join('、')}】`);
            }
            parts.push(item.title);
            if (item.time) parts.push(`-${item.time}`);
            if (item.location) parts.push(`-${item.location}`);
            displayTitle = parts.join('');
        }

        const el = document.createElement('div');
        el.className = `calendar-item ${typeClass}${isCompleted ? ' completed' : ''}`;
        el.dataset.id = item.id;
        el.title = displayTitle;
        el.draggable = true;
        el.style.cursor = 'pointer';
        el.style.whiteSpace = 'normal';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetDate = item._viewDate || (item.type === 'todo'
                ? item.deadline?.split('T')[0]
                : item.type === 'meeting'
                    ? item.date
                    : (item.docStartDate || item.docDate || item.createdAt?.split('T')[0]));
            this.goToDate(targetDate);
        });
        el.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            if (window.officeDashboard?.handleDragStart) {
                window.officeDashboard.handleDragStart(e, item);
            }
        });
        el.addEventListener('dragend', (e) => {
            e.stopPropagation();
            if (window.officeDashboard?.handleDragEnd) {
                window.officeDashboard.handleDragEnd(e);
            }
        });
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!window.officeDashboard?.draggedItem) {
                return;
            }
            if (window.officeDashboard.draggedItem.id === item.id) {
                return;
            }
            const rect = el.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
                el.parentNode.insertBefore(window.officeDashboard.draggedElement, el);
            } else {
                el.parentNode.insertBefore(window.officeDashboard.draggedElement, el.nextSibling);
            }
        });

        const baseColor = this.getTypeColor(item.type);
        const bgColor = this.getTypeColor(item.type, 0.1);

        if (compact) {
            el.style.padding = '6px 8px';
            el.style.margin = '4px 0';
            el.style.borderRadius = '6px';
            el.style.fontSize = '13px';
            el.style.background = bgColor;
            el.style.borderLeft = `4px solid ${baseColor}`;
            el.style.lineHeight = '1.4';
            el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
            const strong = document.createElement('strong');
            strong.textContent = `[${typeLabel}]`;
            el.appendChild(strong);
            el.appendChild(document.createTextNode(` ${displayTitle}`));
        } else {
            el.style.padding = '8px 12px';
            el.style.margin = '4px 0';
            el.style.borderRadius = '6px';
            el.style.background = bgColor;
            el.style.borderLeft = `4px solid ${baseColor}`;
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = 'font-weight:600;font-size:13px;';
            titleDiv.textContent = displayTitle;
            el.appendChild(titleDiv);
            if (item.type !== 'meeting' && item.time) {
                const timeDiv = document.createElement('div');
                timeDiv.style.cssText = 'font-size:11px;color:#666;';
                timeDiv.textContent = `⏰ ${item.time}`;
                el.appendChild(timeDiv);
            }
            if (item.type !== 'meeting' && item.location) {
                const locDiv = document.createElement('div');
                locDiv.style.cssText = 'font-size:11px;color:#666;';
                locDiv.textContent = `📍 ${item.location}`;
                el.appendChild(locDiv);
            }
        }

        return el;
    }

    /**
     * 获取类型颜色
     */
    getTypeColor(type, alpha = 1) {
        const colors = {
            todo: alpha === 1 ? '#f59e0b' : `rgba(245, 158, 11, ${alpha})`,
            meeting: alpha === 1 ? '#3b82f6' : `rgba(59, 130, 246, ${alpha})`,
            document: alpha === 1 ? '#10b981' : `rgba(16, 185, 129, ${alpha})`
        };
        return colors[type] || (alpha === 1 ? '#6b7280' : `rgba(107, 114, 128, ${alpha})`);
    }
}

window.calendarView = new CalendarView();

