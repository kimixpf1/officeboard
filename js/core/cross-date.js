/**
 * CrossDateCore - 跨日期办文/会议作用域更新模块
 * 从 app.js 第7批拆分（v5.65）
 * 15个方法：判断、payload构建、作用域更新、日期视图解析
 */

const CrossDateCore = {

    /**
     * 显示跨日期办文操作选择框
     * @param {string} actionType - 操作类型
     * @param {string} actionName - 操作名称
     * @returns {Promise<string>} 'this' | 'all' | 'cancel'
     */
    showCrossDateDocChoice(actionType, actionName) {
        return this._createChoiceModal({
            title: '跨日期办文 - ' + actionType,
            description: '这是一个跨日期办文，您想如何操作？',
            maxWidth: '450px',
            buttons: [
                { label: '仅当天' + actionName, subLabel: '独立记录当天的状态，不影响其他日期', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: 'this' },
                { label: '今天及之后都' + actionName, subLabel: '同步更新今天及后续所有日期的状态', className: 'btn-primary', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: 'future' },
                { label: '全部日期都' + actionName, subLabel: '同步更新所有日期（含之前日期）的状态', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: 'all' },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }
,

    /**
     * 清除dayStates中所有日期的指定字段
     * @param {Object} dayStates - 原始dayStates对象
     * @param {Array<string>} fields - 要清除的字段名数组
     * @returns {Object} 清除后的dayStates
     */
    clearDayStatesFields(dayStates, fields) {
        if (!dayStates || typeof dayStates !== 'object') {
            return {};
        }

        const cleared = {};
        for (const date of Object.keys(dayStates)) {
            const dayState = { ...dayStates[date] };
            // 删除指定字段
            for (const field of fields) {
                delete dayState[field];
            }
            // 只保留非空的dayState
            if (Object.keys(dayState).length > 0) {
                cleared[date] = dayState;
            }
        }
        return cleared;
    }
,

    isCrossDateDocument(item) {
        return !!(item && item.type === ITEM_TYPES.DOCUMENT && item.docStartDate && item.docEndDate && !item.recurringGroupId);
    }
,

    isCrossDateMeeting(item) {
        return !!(item && item.type === ITEM_TYPES.MEETING && item.date && item.endDate && item.endDate > item.date && !item.recurringGroupId);
    }
,

    getMeetingItemForSelectedDate(item, selectedDate = this.selectedDate) {
        if (!this.isCrossDateMeeting(item)) {
            return item;
        }

        const dayState = item.dayStates?.[selectedDate];
        const fallbackCompleted = !!item.completed;
        const fallbackCompletedAt = item.completedAt ?? null;

        if (!dayState) {
            return {
                ...item,
                completed: fallbackCompleted,
                completedAt: fallbackCompletedAt
            };
        }

        return {
            ...item,
            completed: dayState.completed !== undefined ? dayState.completed : fallbackCompleted,
            completedAt: dayState.completedAt !== undefined ? dayState.completedAt : fallbackCompletedAt,
            pinned: dayState.pinned !== undefined ? dayState.pinned : item.pinned,
            sunk: dayState.sunk !== undefined ? dayState.sunk : item.sunk,
            title: dayState.title !== undefined ? dayState.title : item.title,
            content: dayState.content !== undefined ? dayState.content : item.content,
            location: dayState.location !== undefined ? dayState.location : item.location,
            _hidden: dayState.hidden || false
        };
    }
,

    async getEffectiveDocumentItemById(id, selectedDate = this.selectedDate) {
        const rawItem = await db.getItem(parseInt(id));
        if (!rawItem) {
            return null;
        }
        return this.getDocumentItemForSelectedDate(rawItem, selectedDate);
    }
,

    getCrossDateDocumentUpdatePayload(originalItem, choice, fields, globalUpdates = {}, dayStateUpdates = {}, selectedDate = this.selectedDate) {
        if (choice === 'this') {
            const dayStates = { ...(originalItem.dayStates || {}) };
            dayStates[selectedDate] = {
                ...(dayStates[selectedDate] || {}),
                ...dayStateUpdates
            };
            return { dayStates };
        }

        if (choice === 'future') {
            const dayStates = this._freezeBeforeAndClearFrom(originalItem, selectedDate, fields, fields.map(field => originalItem[field]));
            return {
                ...globalUpdates,
                dayStates
            };
        }

        return {
            ...globalUpdates,
            dayStates: this.clearDayStatesFields(originalItem.dayStates, fields)
        };
    }
,

    async applyCrossDateMeetingScopedUpdate(id, originalItem, choice, { fields, globalUpdates = {}, dayStateUpdates = {} }) {
        this.saveUndoHistory('update', { item: originalItem });
        const payload = this.getCrossDateMeetingUpdatePayload(originalItem, choice, fields, globalUpdates, dayStateUpdates);
        try {
            await db.updateItem(parseInt(id), payload);
        } catch (e) {
            console.warn('按ID更新跨日期会议失败，尝试按标题查找:', e);
            const allItems = await db.getAllItems();
            const match = allItems.find(i =>
                i.type === ITEM_TYPES.MEETING && (i.title || '').trim() === (originalItem.title || '').trim()
            );
            if (match) {
                await db.updateItem(match.id, payload);
            } else {
                throw e;
            }
        }
        return payload;
    }
,

    getCrossDateMeetingUpdatePayload(originalItem, choice, fields, globalUpdates = {}, dayStateUpdates = {}, selectedDate = this.selectedDate) {
        if (choice === 'this') {
            const dayStates = { ...(originalItem.dayStates || {}) };
            dayStates[selectedDate] = {
                ...(dayStates[selectedDate] || {}),
                ...dayStateUpdates
            };
            return { dayStates };
        }

        if (choice === 'future') {
            const dayStates = { ...(originalItem.dayStates || {}) };
            let currentDate = new Date(originalItem.date + 'T12:00:00');
            const endDate = new Date(originalItem.endDate + 'T12:00:00');
            while (currentDate <= endDate) {
                const dateStr = this.formatDateLocal(currentDate);
                if (dateStr >= selectedDate) {
                    dayStates[dateStr] = {
                        ...(dayStates[dateStr] || {}),
                        ...dayStateUpdates
                    };
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return {
                ...globalUpdates,
                dayStates
            };
        }

        return {
            ...globalUpdates,
            dayStates: this.clearDayStatesFields(originalItem.dayStates, fields)
        };
    }
,

    async applyCrossDateDocumentScopedUpdate(id, originalItem, choice, { fields, globalUpdates = {}, dayStateUpdates = {} }) {
        this.saveUndoHistory('update', { item: originalItem });
        const payload = this.getCrossDateDocumentUpdatePayload(originalItem, choice, fields, globalUpdates, dayStateUpdates);
        try {
            await db.updateItem(parseInt(id), payload);
        } catch (e) {
            console.warn('按ID更新跨日期办文失败，尝试按标题查找:', e);
            const allItems = await db.getAllItems();
            const match = allItems.find(i =>
                i.type === ITEM_TYPES.DOCUMENT && (i.title || '').trim() === (originalItem.title || '').trim()
            );
            if (match) {
                await db.updateItem(match.id, payload);
            } else {
                throw e;
            }
        }
        return payload;
    }
,

    getCrossDateDocumentDeletePayload(originalItem, choice, selectedDate = this.selectedDate) {
        if (choice === 'this') {
            return this.getCrossDateDocumentUpdatePayload(
                originalItem,
                choice,
                ['hidden'],
                {},
                { hidden: true },
                selectedDate
            );
        }

        if (choice === 'future') {
            const dayStates = { ...(originalItem.dayStates || {}) };
            let currentDate = new Date(originalItem.docStartDate + 'T12:00:00');
            const endDate = new Date(originalItem.docEndDate + 'T12:00:00');
            while (currentDate <= endDate) {
                const dateStr = this.formatDateLocal(currentDate);
                if (dateStr >= selectedDate) {
                    dayStates[dateStr] = {
                        ...(dayStates[dateStr] || {}),
                        hidden: true
                    };
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return { dayStates };
        }

        return null;
    }
,

    async applyCrossDateDocumentDelete(id, originalItem, choice) {
        if (choice === 'all') {
            this.deleteItemId = id;
            this.deleteItem = originalItem;
            await this.confirmDelete();
            return;
        }

        this.saveUndoHistory('update', { item: originalItem });
        const payload = this.getCrossDateDocumentDeletePayload(originalItem, choice);
        await db.updateItem(parseInt(id), payload);
        await this.loadItems();
        if (syncManager.isLoggedIn()) {
            await syncManager.immediateSyncToCloud();
        }
    }
,

    getDocumentItemForSelectedDate(item, selectedDate = this.selectedDate) {
        if (!item || item.type !== ITEM_TYPES.DOCUMENT || !item.docStartDate || !item.docEndDate || item.recurringGroupId) {
            return item;
        }

        const dayState = item.dayStates?.[selectedDate];
        if (!dayState) {
            return item;
        }

        return {
            ...item,
            completed: dayState.completed !== undefined ? dayState.completed : item.completed,
            completedAt: dayState.completedAt !== undefined ? dayState.completedAt : item.completedAt,
            progress: dayState.progress !== undefined ? dayState.progress : item.progress,
            pinned: dayState.pinned !== undefined ? dayState.pinned : item.pinned,
            sunk: dayState.sunk !== undefined ? dayState.sunk : item.sunk,
            title: dayState.title !== undefined ? dayState.title : item.title,
            content: dayState.content !== undefined ? dayState.content : item.content,
            handler: dayState.handler !== undefined ? dayState.handler : item.handler,
            transferHistory: dayState.transferHistory !== undefined ? dayState.transferHistory : item.transferHistory,
            _hidden: dayState.hidden || false
        };
    }
,

    _freezeBeforeAndClearFrom(originalItem, fromDate, fields, fieldValues) {
        const dayStates = { ...(originalItem.dayStates || {}) };
        const startDate = originalItem.docStartDate;
        const endDate = originalItem.docEndDate;
        if (!startDate || !endDate) return dayStates;

        const defaults = { completed: false, completedAt: null, progress: 'pending', pinned: false, sunk: false };
        const getEffectiveValue = (dateStr, field) => {
            const dayState = dayStates[dateStr];
            if (dayState && dayState[field] !== undefined) {
                return dayState[field];
            }
            if (originalItem[field] !== undefined) {
                return originalItem[field];
            }
            return defaults[field] !== undefined ? defaults[field] : undefined;
        };

        let cur = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        const from = fromDate;

        while (cur <= end) {
            const dateStr = this.formatDateLocal(cur);
            if (dateStr < from) {
                const existing = dayStates[dateStr] || {};
                const frozen = { ...existing };
                for (const field of fields) {
                    frozen[field] = getEffectiveValue(dateStr, field);
                }
                dayStates[dateStr] = frozen;
            } else {
                const existing = dayStates[dateStr];
                if (existing) {
                    const cleaned = { ...existing };
                    for (const field of fields) {
                        delete cleaned[field];
                    }
                    if (Object.keys(cleaned).length > 0) {
                        dayStates[dateStr] = cleaned;
                    } else {
                        delete dayStates[dateStr];
                    }
                }
            }
            cur.setDate(cur.getDate() + 1);
        }
        return dayStates;
    }
,

    showCrossDateDocDeleteChoice() {
        return this._createChoiceModal({
            title: '删除跨日期办文',
            description: '这是一个跨日期办文，您想如何删除？',
            maxWidth: '450px',
            buttons: [
                { label: '仅从当天移除', subLabel: '其他日期仍可看到此办文', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: 'this' },
                { label: '从今天及之后移除', subLabel: '之前的日期仍可看到此办文', className: 'btn-primary', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: 'future' },
                { label: '彻底删除', subLabel: '从所有日期删除此办文', className: 'btn-danger', style: 'width: 100%; padding: 12px; background: #ef4444; color: white; border-color: #ef4444;', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: 'all' },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }

};
