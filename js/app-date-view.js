class OfficeDateViewController {
    constructor(app) {
        this.app = app;
    }

    initDatePicker() {
        const datePicker = document.getElementById('datePicker');
        if (datePicker) {
            datePicker.value = this.app.selectedDate;
        }
    }

    onDatePickerChange(e) {
        this.applySelectedDate(e.target.value, true);
    }

    applySelectedDate(dateStr, shouldLoadItems = true) {
        if (!dateStr) {
            return false;
        }

        if (this.app.selectedDate === dateStr) {
            this.updateDateDisplay();
            return false;
        }

        this.app.selectedDate = dateStr;
        const datePicker = document.getElementById('datePicker');
        if (datePicker && datePicker.value !== dateStr) {
            datePicker.value = dateStr;
        }

        this.updateDateDisplay();

        if (shouldLoadItems) {
            this.loadItems();
        }

        return true;
    }

    switchView(view) {
        try {
            const previousView = this.app.currentView;
            this.app.currentView = view;

            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });

            const boardViewEl = document.getElementById('boardView');
            const calendarViewEl = document.getElementById('calendarView');

            if (view === 'board') {
                boardViewEl?.classList.add('active');
                calendarViewEl?.classList.remove('active');
                if (previousView !== 'board') {
                    this.loadItems();
                }
            } else {
                boardViewEl?.classList.remove('active');
                calendarViewEl?.classList.add('active');
                if (window.calendarView) {
                    if (typeof window.calendarView.setDate === 'function') {
                        window.calendarView.setDate(this.app.selectedDate, false);
                    }
                    if (typeof window.calendarView.setView === 'function') {
                        window.calendarView.setView(view, true);
                    }
                }
            }

            this.updateDateDisplay();
        } catch (error) {
            console.error('切换视图失败:', error);
            this.app.showError('切换视图失败: ' + error.message);
        }
    }

    goToDateView(dateStr) {
        this.app.selectedDate = dateStr;
        this.switchView('board');
        const datePicker = document.getElementById('datePicker');
        if (datePicker) {
            datePicker.value = dateStr;
        }
        this.updateDateDisplay();
    }

    navigateDate(direction) {
        if (this.app.currentView === 'board') {
            const current = new Date(this.app.selectedDate);
            current.setDate(current.getDate() + direction);
            const nextDate = this.app.formatDateLocal(current);
            this.applySelectedDate(nextDate, true);
            return;
        }

        if (window.calendarView) {
            if (direction < 0) {
                window.calendarView.prev();
            } else {
                window.calendarView.next();
            }
            this.app.selectedDate = window.calendarView.formatLocalDate(window.calendarView.currentDate);
        }

        this.updateDateDisplay();
    }

    goToToday() {
        const todayDate = this.app.formatDateLocal(new Date());
        this.app.currentDate = new Date();

        if (this.app.currentView === 'board') {
            this.applySelectedDate(todayDate, true);
            return;
        }

        if (window.calendarView) {
            window.calendarView.today();
            this.app.selectedDate = window.calendarView.formatLocalDate(window.calendarView.currentDate);
        } else {
            this.app.selectedDate = todayDate;
        }

        this.updateDateDisplay();
    }

    updateDateDisplay() {
        const datePicker = document.getElementById('datePicker');
        const boardDateTitle = document.getElementById('boardDateTitle');

        if (this.app.currentView === 'board') {
            if (datePicker) {
                datePicker.value = this.app.selectedDate;
            }
            if (boardDateTitle) {
                const date = new Date(this.app.selectedDate);
                const today = new Date();
                const isToday = this.app.formatDateLocal(today) === this.app.selectedDate;
                const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
                boardDateTitle.textContent = isToday ? `今日事项 (${dateStr})` : `${dateStr}事项`;
            }
        }
    }

    async getBoardItemsForSelectedDate() {
        const items = await db.getItemsByDateRange(this.app.selectedDate, this.app.selectedDate);
        const isSelectedDateWorkday = this.app.isWorkday(this.app.selectedDate);

        return items.filter(item => {
            if (item.type === ITEM_TYPES.DOCUMENT && item.skipWeekend && !isSelectedDateWorkday) {
                return false;
            }
            return true;
        });
    }

    getVisibleBoardItems(items) {
        return items.map(item => {
            if (this.app.isCrossDateDocument(item)) {
                return this.app.getDocumentItemForSelectedDate(item);
            }
            if (this.app.isCrossDateMeeting(item)) {
                return this.app.getMeetingItemForSelectedDate(item);
            }
            return item;
        }).filter(item => !item._hidden);
    }

    groupItemsByType(items) {
        const grouped = {
            [ITEM_TYPES.TODO]: [],
            [ITEM_TYPES.MEETING]: [],
            [ITEM_TYPES.DOCUMENT]: []
        };

        items.forEach(item => {
            if (item && item.type && grouped[item.type]) {
                grouped[item.type].push(item);
            }
        });

        return grouped;
    }

    async loadItems() {
        const requestSeq = ++this.app.loadItemsRequestSeq;

        const allItems = this.app.currentView === 'board'
            ? await this.getBoardItemsForSelectedDate()
            : await db.getAllItems();

        if (requestSeq !== this.app.loadItemsRequestSeq) {
            return;
        }

        const items = this.app.currentView === 'board'
            ? this.getVisibleBoardItems(allItems)
            : allItems;

        const grouped = this.groupItemsByType(items);

        this.app.renderColumn(ITEM_TYPES.TODO, grouped[ITEM_TYPES.TODO]);
        this.app.renderColumn(ITEM_TYPES.MEETING, grouped[ITEM_TYPES.MEETING]);
        this.app.renderColumn(ITEM_TYPES.DOCUMENT, grouped[ITEM_TYPES.DOCUMENT]);

        if (window.calendarView && this.app.currentView !== 'board') {
            await window.calendarView.render();
        }
    }
}

window.OfficeDateViewController = OfficeDateViewController;
