/**
 * 日历视图模块
 * 支持周视图、月视图
 */

class CalendarView {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'week';
        this.container = document.getElementById('calendarContainer');
    }

    /**
     * 排序事项：先按类型（待办→会议→文件），再按时间
     */
    sortItems(items) {
        // 类型排序权重
        const typeOrder = { todo: 1, meeting: 2, document: 3 };
        
        return items.sort((a, b) => {
            // 先按类型排序
            const typeA = typeOrder[a.type] || 99;
            const typeB = typeOrder[b.type] || 99;
            if (typeA !== typeB) {
                return typeA - typeB;
            }
            
            // 同类型按时间排序
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

    /**
     * 设置当前日期
     */
    setDate(date) {
        this.currentDate = new Date(date);
        this.render();
    }

    /**
     * 设置视图类型
     */
    setView(viewType) {
        this.currentView = viewType;
        this.render();
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
    today() {
        this.currentDate = new Date();
        this.render();
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
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    /**
     * 跳转到指定日期的日视图
     */
    goToDate(dateStr) {
        // 触发全局事件，让app.js处理视图切换
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

            // 获取当前视图的数据
            const items = await this.getItemsForCurrentView();

            switch (this.currentView) {
                case 'week':
                    this.renderWeekView(items);
                    break;
                case 'month':
                    this.renderMonthView(items);
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
                this.container.replaceChildren(errorEl);
            }
        }
    }

    /**
     * 获取当前视图的事项
     */
    async getItemsForCurrentView() {
        let startDate, endDate;

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

    /**
     * 检查日期是否是工作日（不含周末和节假日）
     */
    isWorkday(dateStr) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        
        // 周六=6, 周日=0
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
        
        // 简单节假日检查（可扩展）
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const holidays = [
            '1-1', '1-2', '1-3',  // 元旦
            '5-1', '5-2', '5-3',  // 劳动节
            '10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7'  // 国庆
        ];
        return !holidays.includes(`${month}-${day}`);
    }

    /**
     * 触发日历空白处快速新增
     */
    quickAddForDate(dateStr) {
        const event = new CustomEvent('calendarQuickAdd', { detail: { date: dateStr } });
        document.dispatchEvent(event);
    }

    bindQuickAddEvents(cellDiv, dateStr) {
        cellDiv.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-item')) {
                return;
            }
            this.quickAddForDate(dateStr);
        });

        cellDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.quickAddForDate(dateStr);
        });
    }

    /**
     * 渲染周视图
     */
    renderWeekView(items) {
        const weekDates = this.getWeekDates(this.currentDate);
        const today = new Date();
        const todayStr = this.formatLocalDate(today);

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

            const dayItems = items.filter(item => {
                if (item.type === 'meeting' && item.date) {
                    if (item.endDate) return dateStr >= item.date && dateStr <= item.endDate;
                    return item.date === dateStr;
                }
                if (item.type === 'todo' && item.deadline) {
                    return item.deadline.split('T')[0] === dateStr;
                }
                if (item.type === 'document') {
                    const startDate = item.docStartDate || item.docDate;
                    const endDate = item.docEndDate;
                    let inRange = false;
                    if (startDate && endDate) inRange = dateStr >= startDate && dateStr <= endDate;
                    else if (startDate) inRange = startDate === dateStr;
                    else if (item.createdAt) inRange = item.createdAt.split('T')[0] === dateStr;
                    if (inRange && item.skipWeekend) return this.isWorkday(dateStr);
                    return inRange;
                }
                return false;
            });

            const sortedItems = this.sortItems(dayItems);

            const cellDiv = document.createElement('div');
            cellDiv.className = `week-cell${isToday ? ' today' : ''}`;
            cellDiv.dataset.date = dateStr;
            this.bindQuickAddEvents(cellDiv, dateStr);

            if (sortedItems.length > 0) {
                sortedItems.forEach(item => cellDiv.appendChild(this.createCalendarItem(item, true)));
            } else {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'calendar-empty-hint';
                emptyDiv.textContent = '+ 点击新增';
                cellDiv.appendChild(emptyDiv);
            }
            container.appendChild(cellDiv);
        }

        this.container.replaceChildren(container);
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

        // 获取该月第一天
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay() || 7; // 周一为1，周日为7

        // 计算该日期是该月的第几周
        // 第一周从1号开始，如果1号不是周一，则第一周包含上个月的天数
        const weekNumber = Math.ceil((day + firstDayOfWeek - 1) / 7);
        return weekNumber;
    }

    /**
     * 渲染月视图
     */
    renderMonthView(items) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay() || 7;

        const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
        const today = new Date();
        const todayStr = this.formatLocalDate(today);

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

            const dayItems = items.filter(item => {
                if (item.type === 'meeting' && item.date) {
                    if (item.endDate) return dateStr >= item.date && dateStr <= item.endDate;
                    return item.date === dateStr;
                }
                if (item.type === 'todo' && item.deadline) {
                    return item.deadline.startsWith(dateStr);
                }
                if (item.type === 'document') {
                    const startDate = item.docStartDate || item.docDate;
                    const endDate = item.docEndDate;
                    let inRange = false;
                    if (startDate && endDate) inRange = dateStr >= startDate && dateStr <= endDate;
                    else if (startDate) inRange = startDate === dateStr;
                    else if (item.createdAt) inRange = item.createdAt.startsWith(dateStr);
                    if (inRange && item.skipWeekend) return this.isWorkday(dateStr);
                    return inRange;
                }
                return false;
            });

            const sortedItems = this.sortItems(dayItems);

            const cellDiv = document.createElement('div');
            cellDiv.className = `month-cell${isToday ? ' today' : ''}${sortedItems.length === 0 ? ' empty-cell' : ''}`;
            const fullDateLabel = `${month + 1}月${day}日 周${weekDays[(startDayOfWeek - 1 + day - 1) % 7]}`;
            cellDiv.dataset.date = fullDateLabel;
            this.bindQuickAddEvents(cellDiv, dateStr);

            const dateLabelDiv = document.createElement('div');
            dateLabelDiv.className = 'month-cell-date';
            dateLabelDiv.textContent = day;
            cellDiv.appendChild(dateLabelDiv);

            if (sortedItems.length === 0) {
                const emptyHint = document.createElement('div');
                emptyHint.className = 'calendar-empty-hint';
                emptyHint.textContent = '+ 点击新增';
                cellDiv.appendChild(emptyHint);
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

        this.container.replaceChildren(container);
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
        el.className = `calendar-item ${typeClass}`;
        el.dataset.id = item.id;
        el.title = displayTitle;
        el.style.cursor = 'pointer';
        el.style.whiteSpace = 'normal';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.goToDate(item.type === 'todo'
                ? item.deadline?.split('T')[0]
                : item.type === 'meeting'
                    ? item.date
                    : (item.docStartDate || item.docDate || item.createdAt?.split('T')[0]));
        });

        const baseColor = this.getTypeColor(item.type);
        const bgColor = this.getTypeColor(item.type, 0.1);

        if (compact) {
            el.style.cssText = `padding:6px 8px;margin:4px 0;border-radius:6px;font-size:13px;background:${bgColor};border-left:4px solid ${baseColor};cursor:pointer;white-space:normal;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,0.1);`;
            const strong = document.createElement('strong');
            strong.textContent = `[${typeLabel}]`;
            el.appendChild(strong);
            el.appendChild(document.createTextNode(` ${displayTitle}`));
        } else {
            el.style.cssText = `padding:8px 12px;margin:4px 0;border-radius:6px;background:${bgColor};border-left:4px solid ${baseColor};cursor:pointer;`;
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

// 创建全局日历视图实例
window.calendarView = new CalendarView();
