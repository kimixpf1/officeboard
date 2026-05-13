/**
 * 上下文菜单模块（v5.66 拆分）
 * 右键/长按菜单 + 截图分享
 */
const ContextMenuCore = {

    initContextMenu() {
        this._contextMenuEl = document.getElementById('contextMenu');
        this._contextMenuItem = null;

        document.addEventListener('click', (e) => {
            if (this._contextMenuEl && !this._contextMenuEl.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.card');
            const calItem = e.target.closest('.calendar-item');
            const target = card || calItem;
            if (!target) return;

            e.preventDefault();
            const itemId = target.dataset?.itemId || target.dataset?.id || target.getAttribute('data-item-id');
            if (!itemId) return;

            const item = this.items?.find(i => String(i.id) === String(itemId));
            if (!item) return;

            this.showContextMenu(e.clientX, e.clientY, item);
        });

        let longPressTimer = null;
        let longPressStartPos = null;

        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.card');
            const calItem = e.target.closest('.calendar-item');
            const target = card || calItem;
            if (!target) return;

            const itemId = target.dataset?.itemId || target.dataset?.id || target.getAttribute('data-item-id');
            if (!itemId) return;

            const item = this.items?.find(i => String(i.id) === String(itemId));
            if (!item) return;

            const touch = e.touches[0];
            longPressStartPos = { x: touch.clientX, y: touch.clientY };
            longPressTimer = setTimeout(() => {
                this.showContextMenu(touch.clientX, touch.clientY, item);
                longPressTimer = null;
            }, 500);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (longPressTimer && longPressStartPos && e.touches.length === 1) {
                const touch = e.touches[0];
                const dx = touch.clientX - longPressStartPos.x;
                const dy = touch.clientY - longPressStartPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });
    },

    showContextMenu(x, y, item) {
        if (!this._contextMenuEl) return;
        this._contextMenuItem = item;

        const menu = this._contextMenuEl;
        const items = menu.querySelectorAll('.context-menu-item');

        const isCompleted = !!item.completed;
        const isPinned = !!item.pinned;
        const isSunk = !!item.sunk;
        const isTodo = item.type === 'todo';
        const isMeeting = item.type === 'meeting';
        const isDocument = item.type === 'document';
        const hasRecurring = !!item.recurringGroupId;

        items.forEach(el => {
            const action = el.dataset.action;
            if (action === 'complete') el.style.display = isCompleted ? 'none' : '';
            else if (action === 'uncomplete') el.style.display = isCompleted ? '' : 'none';
            else if (action === 'pin') el.style.display = isPinned ? 'none' : '';
            else if (action === 'unpin') el.style.display = isPinned ? '' : 'none';
            else if (action === 'sink') el.style.display = isSunk ? 'none' : '';
            else if (action === 'unsink') el.style.display = isSunk ? '' : 'none';
            else if (action === 'move-date') el.style.display = (isMeeting || isDocument) ? '' : 'none';
            else if (action === 'move-to') el.style.display = '';
            else if (action === 'set-recurring') el.style.display = hasRecurring ? 'none' : '';
            else if (action === 'priority') el.style.display = isTodo ? '' : 'none';
        });

        menu.style.display = 'block';

        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            let left = x;
            let top = y;
            if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;
            if (left < 0) left = 8;
            if (top < 0) top = 8;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        });

        const submenuActions = ['move-date', 'move-to', 'copy', 'set-recurring', 'priority'];
        menu.onclick = (e) => {
            const actionEl = e.target.closest('.context-menu-item');
            if (!actionEl) return;
            const action = actionEl.dataset.action;
            const menuRect = menu.getBoundingClientRect();
            this._contextMenuPos = { left: menuRect.left, top: menuRect.top, right: menuRect.right, bottom: menuRect.bottom };
            if (!submenuActions.includes(action)) {
                this.hideContextMenu();
            }
            this.executeContextAction(action, item);
        };
    },

    hideContextMenu() {
        if (this._contextMenuEl) {
            this._contextMenuEl.style.display = 'none';
        }
        this._contextMenuItem = null;
    },

    async shareCalendarScreenshot(container, title) {
        try {
            this.showSuccess('正在生成截图...');

            let html2canvasLib = window.html2canvas;
            if (!html2canvasLib) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('截图库加载失败'));
                    document.head.appendChild(script);
                });
                html2canvasLib = window.html2canvas;
            }

            const canvas = await html2canvasLib(container, {
                scale: 2,
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#ffffff',
                useCORS: true,
                logging: false
            });

            if (/Mobi|Android|iPhone/i.test(navigator.userAgent) && navigator.share) {
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    const file = new File([blob], `${title || '日程'}.png`, { type: 'image/png' });
                    try {
                        await navigator.share({ title, files: [file] });
                    } catch (e) {
                        if (e.name !== 'AbortError') this._downloadCanvas(canvas, title);
                    }
                }, 'image/png');
            } else {
                this._downloadCanvas(canvas, title);
            }
        } catch (error) {
            console.error('截图失败:', error);
            this.showError('截图失败: ' + error.message);
        }
    },

    _downloadCanvas(canvas, title) {
        const link = document.createElement('a');
        link.download = `${title || '日程截图'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showSuccess('截图已下载');
    },

    executeContextAction(action, item) {
        switch (action) {
            case 'edit':
                this.editItem(item);
                break;
            case 'complete':
                this.toggleItemComplete(item.id, item.type, true);
                break;
            case 'uncomplete':
                this.toggleItemComplete(item.id, item.type, false);
                break;
            case 'pin':
                this.toggleItemPin(item.id, item.type, true);
                break;
            case 'unpin':
                this.toggleItemPin(item.id, item.type, false);
                break;
            case 'sink':
                this.toggleItemSink(item.id, item.type, true);
                break;
            case 'unsink':
                this.toggleItemSink(item.id, item.type, false);
                break;
            case 'move-date':
                this._contextMoveToDate(item);
                break;
            case 'move-to':
                this._contextMoveTo(item);
                break;
            case 'copy':
                this._contextCopyItem(item);
                break;
            case 'set-recurring':
                this._contextSetRecurring(item);
                break;
            case 'priority':
                this._contextShowPriorityPicker(item);
                break;
            case 'delete':
                this.showDeleteConfirm(item.id);
                break;
        }
    },

    _contextShowPriorityPicker(item) {
        const current = item.priority || 'medium';
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = 'position:fixed;z-index:10001;display:block;';
        menu.innerHTML = `
            <div class="context-menu-item" data-priority="high" style="${current === 'high' ? 'font-weight:700;' : ''}">🔴 高优先级${current === 'high' ? ' ✓' : ''}</div>
            <div class="context-menu-item" data-priority="medium" style="${current === 'medium' ? 'font-weight:700;' : ''}">🟡 中优先级${current === 'medium' ? ' ✓' : ''}</div>
            <div class="context-menu-item" data-priority="low" style="${current === 'low' ? 'font-weight:700;' : ''}">🟢 低优先级${current === 'low' ? ' ✓' : ''}</div>
        `;
        document.body.appendChild(menu);

        const pos = this._contextMenuPos || { right: 100, top: 100 };
        menu.style.left = pos.right + 'px';
        menu.style.top = pos.top + 'px';

        const cleanup = () => { menu.remove(); this.hideContextMenu(); };
        menu.onclick = (e) => {
            const el = e.target.closest('[data-priority]');
            if (!el) return;
            cleanup();
            this._contextSetPriority(item, el.dataset.priority);
        };
        setTimeout(() => {
            document.addEventListener('click', function handler() {
                cleanup();
                document.removeEventListener('click', handler);
            }, { once: true });
        }, 10);
    },

    async _contextSetPriority(item, priority) {
        try {
            await db.updateItem(item.id, { priority, updatedAt: new Date().toISOString() });
            this.showSuccess(`优先级已设为${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}`);
            await this.loadItems();
            if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
        } catch (e) {
            this.showError('修改优先级失败');
        }
    },

    async _contextMoveToDate(item) {
        const currentDate = item.type === 'meeting' ? item.date
            : item.type === 'document' ? (item.docStartDate || item.docDate || this.selectedDate)
            : (item.deadline ? item.deadline.split('T')[0] : this.selectedDate);
        const newDate = await this._showDatePicker('选择目标日期', currentDate);
        if (!newDate) return;

        const updates = { updatedAt: new Date().toISOString() };
        if (item.type === 'meeting') {
            updates.date = newDate;
        } else if (item.type === 'document') {
            updates.docStartDate = newDate;
            updates.docEndDate = newDate;
        } else if (item.type === 'todo') {
            const time = item.deadline ? (item.deadline.split('T')[1] || '09:00') : '09:00';
            updates.deadline = `${newDate}T${time}`;
        }

        try {
            const original = await db.getItem(item.id);
            this.saveUndoHistory('update', { item: original });
            await db.updateItem(item.id, updates);
            this.showSuccess('日期已修改');
            await this.loadItems();
            if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
        } catch (e) {
            this.showError('修改日期失败');
        }
    },

    _contextMoveTo(item) {
        const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        const mondayOffset = 1 - today.getDay(); // getDay: 0=周日, 1=周一… mondayOffset≤0表示周一已过
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        const rows = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const wd = weekNames[d.getDay()];
            const isToday = d.toDateString() === today.toDateString();
            const dateStr = `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            rows.push({ dateStr, label: `${wd} ${m}/${day}`, isToday });
        }

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        const nextRows = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(nextMonday);
            d.setDate(nextMonday.getDate() + i);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const wd = weekNames[d.getDay()];
            const dateStr = `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            nextRows.push({ dateStr, label: `${wd} ${m}/${day}`, isToday: false });
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = 'position:fixed;z-index:10001;display:block;max-height:80vh;overflow-y:auto;';

        const itemsHtml = [
            '<div style="padding:6px 12px;font-size:12px;color:var(--text-secondary);font-weight:600;">本周</div>',
            ...rows.map(r =>
                `<div class="context-menu-item" data-move-date="${r.dateStr}" style="${r.isToday ? 'color:var(--primary-color);font-weight:600;' : ''}">${r.isToday ? '📍 ' : ''}${r.label}</div>`
            ),
            '<div class="context-menu-divider"></div>',
            '<div style="padding:6px 12px;font-size:12px;color:var(--text-secondary);font-weight:600;">下周</div>',
            ...nextRows.map(r =>
                `<div class="context-menu-item" data-move-date="${r.dateStr}">${r.label}</div>`
            ),
            '<div class="context-menu-divider"></div>',
            '<div class="context-menu-item" data-move-date="custom">📅 选择其他日期…</div>'
        ].join('');
        menu.innerHTML = itemsHtml;

        document.body.appendChild(menu);

        const pos = this._contextMenuPos || { right: 100, top: 100 };
        menu.style.left = pos.right + 'px';
        menu.style.top = pos.top + 'px';

        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.top + rect.height > window.innerHeight) {
                menu.style.top = Math.max(8, window.innerHeight - rect.height - 8) + 'px';
            }
            if (rect.left + rect.width > window.innerWidth) {
                menu.style.left = Math.max(8, window.innerWidth - rect.width - 8) + 'px';
            }
        });

        const cleanup = () => { menu.remove(); this.hideContextMenu(); };

        menu.onclick = async (e) => {
            const el = e.target.closest('[data-move-date]');
            if (!el) return;
            const dateVal = el.dataset.moveDate;
            cleanup();

            if (dateVal === 'custom') {
                this._contextMoveToDate(item);
                return;
            }

            const updates = { updatedAt: new Date().toISOString() };
            if (item.type === 'meeting') {
                updates.date = dateVal;
            } else if (item.type === 'document') {
                updates.docStartDate = dateVal;
                updates.docEndDate = dateVal;
            } else if (item.type === 'todo') {
                const time = item.deadline ? (item.deadline.split('T')[1] || '09:00') : '09:00';
                updates.deadline = `${dateVal}T${time}`;
            }

            try {
                const original = await db.getItem(item.id);
                this.saveUndoHistory('update', { item: original });
                await db.updateItem(item.id, updates);
                this.showSuccess(`已移动到 ${dateVal}`);
                await this.loadItems();
                if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
            } catch (err) {
                this.showError('移动失败');
            }
        };

        setTimeout(() => {
            document.addEventListener('click', function handler() {
                cleanup();
                document.removeEventListener('click', handler);
            }, { once: true });
        }, 10);
    },

    async _contextCopyItem(item) {
        this._contextCopyTo(item);
    },

    _contextCopyTo(item) {
        const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        const mondayOffset = 1 - today.getDay(); // getDay: 0=周日, 1=周一… mondayOffset≤0表示周一已过
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        const rows = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const wd = weekNames[d.getDay()];
            const isToday = d.toDateString() === today.toDateString();
            const dateStr = `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            rows.push({ dateStr, label: `${wd} ${m}/${day}`, isToday });
        }

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        const nextRows = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(nextMonday);
            d.setDate(nextMonday.getDate() + i);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const wd = weekNames[d.getDay()];
            const dateStr = `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            nextRows.push({ dateStr, label: `${wd} ${m}/${day}`, isToday: false });
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = 'position:fixed;z-index:10001;display:block;max-height:80vh;overflow-y:auto;';

        const itemsHtml = [
            '<div style="padding:6px 12px;font-size:12px;color:var(--text-secondary);font-weight:600;">📋 复制到本周</div>',
            ...rows.map(r =>
                `<div class="context-menu-item" data-copy-date="${r.dateStr}" style="${r.isToday ? 'color:var(--primary-color);font-weight:600;' : ''}">${r.isToday ? '📍 ' : ''}${r.label}</div>`
            ),
            '<div class="context-menu-divider"></div>',
            '<div style="padding:6px 12px;font-size:12px;color:var(--text-secondary);font-weight:600;">📋 复制到下周</div>',
            ...nextRows.map(r =>
                `<div class="context-menu-item" data-copy-date="${r.dateStr}">${r.label}</div>`
            ),
            '<div class="context-menu-divider"></div>',
            '<div class="context-menu-item" data-copy-date="custom">📅 选择其他日期…</div>'
        ].join('');
        menu.innerHTML = itemsHtml;

        document.body.appendChild(menu);

        const pos = this._contextMenuPos || { left: 100, top: 100 };
        menu.style.left = pos.right ? pos.right + 'px' : pos.left + 'px';
        menu.style.top = pos.top + 'px';

        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.top + rect.height > window.innerHeight) {
                menu.style.top = Math.max(8, window.innerHeight - rect.height - 8) + 'px';
            }
            if (rect.left + rect.width > window.innerWidth) {
                menu.style.left = Math.max(8, window.innerWidth - rect.width - 8) + 'px';
            }
        });

        const cleanup = () => { menu.remove(); this.hideContextMenu(); };

        menu.onclick = async (e) => {
            const el = e.target.closest('[data-copy-date]');
            if (!el) return;
            const dateVal = el.dataset.copyDate;
            cleanup();

            let targetDate;
            if (dateVal === 'custom') {
                targetDate = await this._showDatePicker('选择目标日期', this.selectedDate);
                if (!targetDate) return;
            } else {
                targetDate = dateVal;
            }

            const clone = { ...item };
            delete clone.id;
            delete clone.hash;
            delete clone.createdAt;
            delete clone.updatedAt;
            delete clone.recurringGroupId;
            delete clone.occurrenceIndex;
            delete clone.isRecurring;
            delete clone.recurringRule;
            delete clone.recurringCount;
            delete clone.dayStates;
            delete clone.pinned;
            delete clone.sunk;
            delete clone.manualOrder;
            delete clone.completed;
            delete clone.reminderDismissedAt;
            clone.source = 'copy';

            if (item.type === 'meeting') clone.date = targetDate;
            else if (item.type === 'document') { clone.docStartDate = targetDate; clone.docEndDate = targetDate; }
            else if (item.type === 'todo') {
                const time = item.deadline ? (item.deadline.split('T')[1] || '09:00') : '09:00';
                clone.deadline = `${targetDate}T${time}`;
                // 副本提醒属性与原事项完全一致：原事项没有手动设过提醒/截止，副本也不应有
                if (!item.reminderManuallySet && !item.deadlineManuallySet) {
                    clone.deadlineManuallySet = false;
                    clone.reminderManuallySet = false;
                }
            }

            try {
                await db.addItem(clone);
                this.showSuccess(`已复制到 ${targetDate}`);
                await this.loadItems();
                if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
            } catch (e) {
                this.showError('复制事项失败');
            }
        };

        setTimeout(() => {
            document.addEventListener('click', function handler() {
                cleanup();
                document.removeEventListener('click', handler);
            }, { once: true });
        }, 10);
    },


    async _contextSetRecurring(item) {
        const choice = await this._showRecurringDialog();
        if (!choice) return;

        try {
            const groupId = 'recur_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            await db.updateItem(item.id, {
                recurringGroupId: groupId,
                occurrenceIndex: 0,
                updatedAt: new Date().toISOString()
            });

            const baseItem = { ...item, recurringGroupId: groupId };
            const refDate = item.date || item.docStartDate || this.selectedDate;
            const dow = refDate ? new Date(refDate + 'T12:00:00').getDay() : 1;
            const dom = refDate ? new Date(refDate + 'T12:00:00').getDate() : 1;

            let ruleObj;
            const endDate = choice.endDate || null;
            switch (choice.rule) {
                case 'daily': ruleObj = { type: 'daily', endDate }; break;
                case 'workday': ruleObj = { type: 'workday_daily', endDate }; break;
                case 'weekly': ruleObj = { type: 'weekly_day', weekDay: dow, endDate }; break;
                case 'biweekly': ruleObj = { type: 'biweekly_day', weekDay: dow, endDate }; break;
                case 'monthly': ruleObj = { type: 'monthly_date', monthDate: dom, endDate }; break;
                case 'yearly': {
                    const items = [];
                    const start = new Date(refDate + 'T12:00:00');
                    const endD = endDate ? new Date(endDate + 'T12:00:00') : null;
                    for (let i = 0; i < (choice.count || 6); i++) {
                        const d = new Date(start);
                        d.setFullYear(d.getFullYear() + i);
                        if (endD && d > endD) break;
                        items.push(this.createRecurringItem({ ...baseItem }, d, { type: 'monthly_date', monthDate: d.getDate() }, groupId, i + 1));
                    }
                    const total = items.length + 1;
                    for (const ri of items) await db.addItem(ri);
                    this.showSuccess(`已生成 ${total} 个周期事项（每年）`);
                    await this.loadItems();
                    if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
                    return;
                }
                default: ruleObj = { type: 'weekly_day', weekDay: dow };
            }

            const recurringItems = this.generateRecurringItems(baseItem, ruleObj, choice.count || 6);
            for (const ri of recurringItems) {
                await db.addItem(ri);
            }

            this.showSuccess(`已生成 ${recurringItems.length + 1} 个周期事项`);
            await this.loadItems();
            if (syncManager.isLoggedIn()) syncManager.immediateSyncToCloud().catch(() => {});
        } catch (e) {
            this.showError('设置周期性失败');
        }
    },

    _showRecurringDialog() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
            overlay.innerHTML = `
                <div style="background:var(--bg-primary);border-radius:12px;padding:20px;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                    <div style="font-size:16px;font-weight:600;margin-bottom:16px;color:var(--text-primary);">设为周期性事项</div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">重复频率</label>
                        <select id="recurringTypeSelect" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);">
                            <option value="daily">每天</option>
                            <option value="workday">每工作日</option>
                            <option value="weekly" selected>每周</option>
                            <option value="biweekly">每两周</option>
                            <option value="monthly">每月</option>
                            <option value="yearly">每年</option>
                        </select>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">生成数量（含当天）</label>
                        <input type="number" id="recurringCountInput" value="6" min="2" max="50" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);">
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">截止日期（可选，优先级高于数量）</label>
                        <input type="date" id="recurringEndDateInput" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);">
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button id="recurringCancelBtn" style="padding:8px 16px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-primary);cursor:pointer;">取消</button>
                        <button id="recurringConfirmBtn" style="padding:8px 16px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;cursor:pointer;">确认</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const close = (result) => { overlay.remove(); this.hideContextMenu(); resolve(result); };
            overlay.querySelector('#recurringCancelBtn').onclick = () => close(null);
            overlay.querySelector('#recurringConfirmBtn').onclick = () => {
                const rule = overlay.querySelector('#recurringTypeSelect').value;
                const count = Math.max(2, Math.min(50, parseInt(overlay.querySelector('#recurringCountInput').value) || 6));
                const endDate = overlay.querySelector('#recurringEndDateInput').value || null;
                close({ rule, count, endDate });
            };
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
        });
    },

    _showDatePicker(title, defaultDate) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.3);';
            const box = document.createElement('div');
            box.style.cssText = 'position:fixed;z-index:10003;background:var(--bg-primary);border-radius:12px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;min-width:220px;';

            const pos = this._contextMenuPos;
            if (pos) {
                let left = pos.right + 4;
                let top = pos.top;
                if (left + 240 > window.innerWidth) left = Math.max(8, pos.left - 244);
                if (top + 180 > window.innerHeight) top = Math.max(8, window.innerHeight - 180);
                box.style.left = left + 'px';
                box.style.top = top + 'px';
            } else {
                box.style.left = '50%';
                box.style.top = '50%';
                box.style.transform = 'translate(-50%, -50%)';
            }
            const esc = (s) => (typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(String(s)) : String(s));
            box.innerHTML = `
                <div style="margin-bottom:12px;font-weight:600;">${esc(title)}</div>
                <input type="date" value="${esc(defaultDate || '')}" style="font-size:16px;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;width:100%;">
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                    <button class="btn-secondary btn-sm" data-action="cancel">取消</button>
                    <button class="btn-primary btn-sm" data-action="confirm">确认</button>
                </div>
            `;
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const input = box.querySelector('input');
            box.onclick = (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                overlay.remove();
                this.hideContextMenu();
                resolve(btn.dataset.action === 'confirm' ? input.value : null);
            };
            overlay.onclick = (e) => {
                if (e.target === overlay) { overlay.remove(); this.hideContextMenu(); resolve(null); }
            };
        });
    }
};
