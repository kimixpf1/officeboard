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
                this.container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">加载日历失败，请刷新重试</div>';
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
     * 渲染周视图
     */
    renderWeekView(items) {
        const weekStart = this.getWeekStart(this.currentDate);
        const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const today = new Date();
        const todayStr = this.formatLocalDate(today);

        // 计算是该月的第几周
        const weekOfMonth = this.getWeekOfMonth(weekStart);
        const monthLabel = `${weekStart.getMonth() + 1}月第${weekOfMonth}周`;

        let html = '<div class="week-view">';

        // 表头 - 显示x月第x周
        html += `<div class="week-header week-title">${monthLabel}</div>`;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatLocalDate(date);
            const isToday = dateStr === todayStr;
            const dayLabel = `${weekDays[i]} ${date.getMonth() + 1}/${date.getDate()}`;

            html += `<div class="week-header ${isToday ? 'today' : ''}">${dayLabel}</div>`;
        }

        // 按天显示事项
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatLocalDate(date);
            const isToday = dateStr === todayStr;
            const dayLabel = `${weekDays[i]} ${date.getMonth() + 1}/${date.getDate()}`;

            // 修复：支持跨天会议显示
            const dayItems = items.filter(item => {
                // 会议：检查日期范围
                if (item.type === 'meeting' && item.date) {
                    if (item.endDate) {
                        // 跨天会议：检查当前日期是否在范围内
                        return dateStr >= item.date && dateStr <= item.endDate;
                    }
                    return item.date === dateStr;
                }
                // 待办：按截止日期
                if (item.deadline) return item.deadline.startsWith(dateStr);
                // 文件：按创建日期
                if (item.createdAt) return item.createdAt.startsWith(dateStr);
                return false;
            });

            html += `
                <div class="week-cell ${isToday ? 'today' : ''}" data-date="${dayLabel}" onclick="window.calendarView.goToDate('${dateStr}')">
                    ${dayItems.map(item => this.renderCalendarItem(item, true)).join('')}
                </div>
            `;
        }

        html += '</div>';
        this.container.innerHTML = html;
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
        const startDayOfWeek = firstDay.getDay() || 7; // 周一为1，周日为7

        const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
        const today = new Date();
        const todayStr = this.formatLocalDate(today);

        let html = '<div class="month-view">';

        // 表头
        weekDays.forEach(day => {
            html += `<div class="month-header">周${day}</div>`;
        });

        // 上月空白
        for (let i = 1; i < startDayOfWeek; i++) {
            html += '<div class="month-cell other-month"></div>';
        }

        // 当月日期
        for (let day = 1; day <= daysInMonth; day++) {
            // 使用本地时间构建日期字符串，避免时区问题
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            // 修复：支持跨天会议显示
            const dayItems = items.filter(item => {
                // 会议：检查日期范围
                if (item.type === 'meeting' && item.date) {
                    if (item.endDate) {
                        // 跨天会议：检查当前日期是否在范围内
                        return dateStr >= item.date && dateStr <= item.endDate;
                    }
                    return item.date === dateStr;
                }
                // 待办：按截止日期
                if (item.deadline) return item.deadline.startsWith(dateStr);
                // 文件：按创建日期
                if (item.createdAt) return item.createdAt.startsWith(dateStr);
                return false;
            });

            const fullDateLabel = `${month + 1}月${day}日 周${weekDays[(startDayOfWeek - 1 + day - 1) % 7]}`;
            // 只显示有事项的日期，或者今天
            if (dayItems.length > 0 || isToday) {
                html += `
                    <div class="month-cell ${isToday ? 'today' : ''}" data-date="${fullDateLabel}" onclick="window.calendarView.goToDate('${dateStr}')">
                        <div class="month-cell-date">${day}</div>
                        ${dayItems.map(item => this.renderCalendarItem(item, true)).join('')}
                    </div>
                `;
            } else {
                // 空日期只显示日期数字
                html += `
                    <div class="month-cell empty-cell" data-date="${fullDateLabel}">
                        <div class="month-cell-date">${day}</div>
                    </div>
                `;
            }
        }

        // 下月空白
        const remainingCells = (7 - ((startDayOfWeek - 1 + daysInMonth) % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            html += '<div class="month-cell other-month"></div>';
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    /**
     * 渲染日历中的事项
     */
    renderCalendarItem(item, compact = false) {
        const typeClass = `${item.type}-card`;
        const typeLabels = { todo: '待办', meeting: '会议', document: '文件' };
        const typeLabel = typeLabels[item.type] || item.type;

        // 会议特殊格式：【参会人员】会议名称-时间-地点
        let displayTitle = item.title;
        if (item.type === 'meeting') {
            const parts = [];
            if (item.attendees && item.attendees.length > 0) {
                parts.push(`【${item.attendees.join('、')}】`);
            }
            parts.push(item.title);
            if (item.time) {
                parts.push(`-${item.time}`);
            }
            if (item.location) {
                parts.push(`-${item.location}`);
            }
            displayTitle = parts.join('');
        }

        if (compact) {
            return `
                <div class="calendar-item ${typeClass}" data-id="${item.id}" style="
                    padding: 2px 6px;
                    margin: 2px 0;
                    border-radius: 4px;
                    font-size: 11px;
                    background: ${this.getTypeColor(item.type, 0.1)};
                    border-left: 3px solid ${this.getTypeColor(item.type)};
                    cursor: pointer;
                    white-space: normal;
                    line-height: 1.4;
                " title="${displayTitle}">
                    [${typeLabel}] ${displayTitle}
                </div>
            `;
        }

        return `
            <div class="calendar-item ${typeClass}" data-id="${item.id}" style="
                padding: 8px 12px;
                margin: 4px 0;
                border-radius: 6px;
                background: ${this.getTypeColor(item.type, 0.1)};
                border-left: 4px solid ${this.getTypeColor(item.type)};
                cursor: pointer;
            ">
                <div style="font-weight:600;font-size:13px;">${displayTitle}</div>
                ${item.type !== 'meeting' && item.time ? `<div style="font-size:11px;color:#666;">⏰ ${item.time}</div>` : ''}
                ${item.type !== 'meeting' && item.location ? `<div style="font-size:11px;color:#666;">📍 ${item.location}</div>` : ''}
            </div>
        `;
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
