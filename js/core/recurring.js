/**
 * 周期性事项模块（mixin 模式）
 * 含表单渲染、事项生成、分组更新
 * 通过 Object.assign(OfficeDashboard.prototype, RecurringCore) 混入
 */
const RecurringCore = {

    initializeRecurringFieldOptions() {
        this.renderRecurringFieldTemplate(false);
        this.renderRecurringFieldTemplate(true);
        this.renderRecurringTypeSelect('recurringType');
        this.renderRecurringTypeSelect('docRecurringType');
        this.renderSimpleSelectOptions('weekDay', WEEKDAY_OPTIONS);
        this.renderSimpleSelectOptions('docWeekDay', WEEKDAY_OPTIONS);
        this.renderSimpleSelectOptions('monthlyWeekDayValue', WEEKDAY_OPTIONS);
        this.renderSimpleSelectOptions('docMonthlyWeekDayValue', WEEKDAY_OPTIONS);
        this.renderSimpleSelectOptions('monthlyNthWeek', NTH_WEEK_OPTIONS);
        this.renderSimpleSelectOptions('docMonthlyNthWeek', NTH_WEEK_OPTIONS);
        this.renderWeekdayCheckboxes('weekDaysOptions', 'weekDays');
        this.renderWeekdayCheckboxes('docWeekDaysOptions', 'docWeekDays');
    }
,
    getRecurringFieldConfig(isDocument = false) {
        return isDocument
            ? {
                containerId: 'docRecurringFields',
                typeSelectId: 'docRecurringType',
                countId: 'docRecurringCount',
                monthlyDateGroupId: 'docMonthlyDateGroup',
                dayInputId: 'docRecurringDay',
                nthWorkDayGroupId: 'docNthWorkDayGroup',
                nthWorkDayInputId: 'docNthWorkDay',
                weekDayGroupId: 'docWeekDayGroup',
                weekDaySelectId: 'docWeekDay',
                weekMultiGroupId: 'docWeekMultiGroup',
                weekDaysContainerId: 'docWeekDaysOptions',
                monthlyWeekDayGroupId: 'docMonthlyWeekDayGroup',
                nthWeekSelectId: 'docMonthlyNthWeek',
                monthlyWeekDayValueId: 'docMonthlyWeekDayValue',
                skipWeekendsId: 'docRecurringSkipWeekends',
                skipHolidaysId: 'docRecurringSkipHolidays',
                startDateId: 'docRecurringStartDate',
                endDateId: 'docRecurringEndDate'
            }
            : {
                containerId: 'recurringFields',
                typeSelectId: 'recurringType',
                countId: 'recurringCount',
                monthlyDateGroupId: 'monthlyDateGroup',
                dayInputId: 'recurringDay',
                nthWorkDayGroupId: 'nthWorkDayGroup',
                nthWorkDayInputId: 'nthWorkDay',
                weekDayGroupId: 'weekDayGroup',
                weekDaySelectId: 'weekDay',
                weekMultiGroupId: 'weekMultiGroup',
                weekDaysContainerId: 'weekDaysOptions',
                monthlyWeekDayGroupId: 'monthlyWeekDayGroup',
                nthWeekSelectId: 'monthlyNthWeek',
                monthlyWeekDayValueId: 'monthlyWeekDayValue',
                skipWeekendsId: 'skipWeekends',
                skipHolidaysId: 'skipHolidays',
                startDateId: 'recurringStartDate',
                endDateId: 'recurringEndDate'
            };
    }
,
    createRecurringFormGroup({ id, labelText, inputElement, hidden = false }) {
        const group = document.createElement('div');
        group.className = 'form-group';
        if (id) {
            group.id = id;
        }
        if (hidden) {
            group.style.display = 'none';
        }

        if (labelText) {
            const label = document.createElement('label');
            label.textContent = labelText;
            group.appendChild(label);
        }

        if (inputElement) {
            group.appendChild(inputElement);
        }

        return group;
    }
,
    createRecurringInput(type, options = {}) {
        const input = document.createElement('input');
        input.type = type;

        if (options.id) input.id = options.id;
        if (options.min !== undefined) input.min = String(options.min);
        if (options.max !== undefined) input.max = String(options.max);
        if (options.value !== undefined) input.value = String(options.value);
        if (options.placeholder) input.placeholder = options.placeholder;
        if (options.checked) input.checked = true;

        return input;
    }
,
    createRecurringSelect(id) {
        const select = document.createElement('select');
        select.id = id;
        return select;
    }
,
    createRecurringCheckboxGroup(checkboxId, text, checked = false) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const input = this.createRecurringInput('checkbox', {
            id: checkboxId,
            checked
        });
        const span = document.createElement('span');
        span.textContent = text;

        label.append(input, span);
        group.appendChild(label);

        return group;
    }
,
    renderRecurringFieldTemplate(isDocument = false) {
        const config = this.getRecurringFieldConfig(isDocument);
        const container = document.getElementById(config.containerId);
        if (!container) return;

        const typeRow = document.createElement('div');
        typeRow.className = 'form-row';
        typeRow.append(
            this.createRecurringFormGroup({
                labelText: '周期类型',
                inputElement: this.createRecurringSelect(config.typeSelectId)
            }),
            this.createRecurringFormGroup({
                labelText: '生成数量',
                inputElement: this.createRecurringInput('number', {
                    id: config.countId,
                    min: 1,
                    max: 365,
                    value: 20,
                    placeholder: '生成几个'
                })
            })
        );

        const monthlyWeekRow = document.createElement('div');
        monthlyWeekRow.className = 'form-row';

        const nthWeekWrapper = document.createElement('div');
        nthWeekWrapper.style.flex = '1';
        const nthWeekLabel = document.createElement('label');
        nthWeekLabel.textContent = '第几个';
        nthWeekWrapper.append(nthWeekLabel, this.createRecurringSelect(config.nthWeekSelectId));

        const weekDayValueWrapper = document.createElement('div');
        weekDayValueWrapper.style.flex = '1';
        const weekDayValueLabel = document.createElement('label');
        weekDayValueLabel.textContent = '星期';
        weekDayValueWrapper.append(weekDayValueLabel, this.createRecurringSelect(config.monthlyWeekDayValueId));

        monthlyWeekRow.append(nthWeekWrapper, weekDayValueWrapper);

        const optionsRow = document.createElement('div');
        optionsRow.className = 'form-row';
        optionsRow.append(
            this.createRecurringFormGroup({
                id: config.monthlyDateGroupId,
                labelText: '每月几号',
                inputElement: this.createRecurringInput('number', {
                    id: config.dayInputId,
                    min: 1,
                    max: 31,
                    placeholder: '如：13'
                })
            }),
            this.createRecurringFormGroup({
                id: config.nthWorkDayGroupId,
                labelText: '第几个工作日',
                hidden: true,
                inputElement: this.createRecurringInput('number', {
                    id: config.nthWorkDayInputId,
                    min: 1,
                    max: 23,
                    placeholder: '如：1=第一个工作日'
                })
            }),
            this.createRecurringFormGroup({
                id: config.weekDayGroupId,
                labelText: '每周几',
                hidden: true,
                inputElement: this.createRecurringSelect(config.weekDaySelectId)
            }),
            this.createRecurringFormGroup({
                id: config.weekMultiGroupId,
                labelText: '选择星期（可多选）',
                hidden: true,
                inputElement: Object.assign(document.createElement('div'), {
                    className: 'weekday-checkboxes',
                    id: config.weekDaysContainerId
                })
            }),
            this.createRecurringFormGroup({
                id: config.monthlyWeekDayGroupId,
                hidden: true,
                inputElement: monthlyWeekRow
            })
        );

        const dateRow = document.createElement('div');
        dateRow.className = 'form-row';
        dateRow.append(
            this.createRecurringFormGroup({
                labelText: '生效开始日期',
                inputElement: this.createRecurringInput('date', {
                    id: config.startDateId,
                    placeholder: '留空则从今天开始'
                })
            }),
            this.createRecurringFormGroup({
                labelText: '生效结束日期',
                inputElement: this.createRecurringInput('date', {
                    id: config.endDateId,
                    placeholder: '留空则不限结束'
                })
            })
        );

        container.replaceChildren(
            typeRow,
            optionsRow,
            this.createRecurringCheckboxGroup(config.skipWeekendsId, '跳过周末（顺延到下一工作日）', true),
            this.createRecurringCheckboxGroup(config.skipHolidaysId, '跳过法定节假日（顺延到下一工作日）'),
            dateRow
        );
    }
,
    renderRecurringTypeSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.replaceChildren();
        const fragment = document.createDocumentFragment();

        RECURRING_OPTION_GROUPS.forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.label;

            group.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                optgroup.appendChild(optionEl);
            });

            fragment.appendChild(optgroup);
        });

        select.appendChild(fragment);
    }
,
    /**
     * 批量更新周期性任务组
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     * @param {string} groupId - 周期性任务组ID
     * @param {number} fromIndex - 从第几个开始更新
     */
    async updateRecurringGroup(originalItem, updates, groupId, fromIndex) {
        const allItems = await db.getAllItems();
        const targetGroupId = String(groupId);
        const groupItems = allItems.filter(item => 
            String(item.recurringGroupId) === targetGroupId && 
            parseInt(item.occurrenceIndex) >= parseInt(fromIndex)
        );

        this.saveUndoHistory('update', { items: groupItems.map(i => ({ ...i })) });

        const fieldsToUpdate = { ...updates };
        delete fieldsToUpdate.isRecurring;
        delete fieldsToUpdate.recurringRule;
        delete fieldsToUpdate.recurringCount;
        delete fieldsToUpdate.recurringGroupId;
        delete fieldsToUpdate.occurrenceIndex;
        delete fieldsToUpdate.deadline;
        delete fieldsToUpdate.docStartDate;
        delete fieldsToUpdate.docEndDate;
        delete fieldsToUpdate.docDate;
        delete fieldsToUpdate.date;
        delete fieldsToUpdate.endDate;
        delete fieldsToUpdate.id;
        delete fieldsToUpdate.createdAt;
        delete fieldsToUpdate.completed;
        delete fieldsToUpdate.completedAt;
        delete fieldsToUpdate.hash;

        for (const groupItem of groupItems) {
            await db.updateItem(groupItem.id, fieldsToUpdate);
        }
    }
,
    /**
     * 批量更新周期性任务组的状态（用于置顶、沉底、完成等）
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     */
    async updateRecurringGroupStatus(originalItem, updates) {
        const allItems = await db.getAllItems();
        const allRecurringTasks = allItems.filter(i => i.recurringGroupId);
        
        // 检查 recurringGroupId 是否存在
        if (!originalItem.recurringGroupId) {
            console.error('❌ originalItem.recurringGroupId 为空！');
            // 仍然更新当前项
            await db.updateItem(originalItem.id, updates);
            await this.loadItems();
            this.showError('该任务没有周期组ID，仅更新了当前项');
            return;
        }
        
        // 筛选同一组的后续周期任务
        // 使用 String() 确保类型一致进行比较
        const targetGroupId = String(originalItem.recurringGroupId);
        const currentIndex = parseInt(originalItem.occurrenceIndex) || 0;
        
        const groupItems = allItems.filter(item => {
            if (!item.recurringGroupId) return false;
            const itemGroupId = String(item.recurringGroupId);
            const itemIndex = parseInt(item.occurrenceIndex) || 0;
            return itemGroupId === targetGroupId && itemIndex >= currentIndex;
        });

        if (groupItems.length === 0) {
            console.warn('⚠️ 没有找到后续周期任务，只更新当前项');
            await db.updateItem(originalItem.id, updates);
            await this.loadItems();
            this.showError('未找到其他周期任务，仅更新了当前项');
            return;
        }

        // 保存所有原始数据用于撤回
        this.saveUndoHistory('update', { items: groupItems.map(i => ({ ...i })) });

        // 批量更新
        let successCount = 0;
        for (const groupItem of groupItems) {
            const updateData = { ...updates };
            // 清理undefined值
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) delete updateData[key];
            });
            
            try {
                await db.updateItem(groupItem.id, updateData);
                successCount++;
            } catch (err) {
                console.error(`❌ 更新失败: ${groupItem.id}`, err);
            }
        }

        await this.loadItems();
        
        if (syncManager.isLoggedIn()) {
            await syncManager.immediateSyncToCloud();
        }
        
        this.showSuccess(`已更新 ${successCount} 个周期任务`);
    }
,
    generateRecurringItems(baseItem, rule, count) {
        const items = [];
        const groupId = 'recurring_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        // 日期范围过滤
        const startDate = rule.startDate ? new Date(rule.startDate + 'T12:00:00') : null;
        const endDate = rule.endDate ? new Date(rule.endDate + 'T12:00:00') : null;
        
        // 如果有开始日期且早于今天，从开始日期开始
        const firstDate = startDate && startDate > today ? startDate : today;

        const cleanItem = { ...baseItem };
        delete cleanItem.isRecurring;
        delete cleanItem.recurringRule;
        delete cleanItem.recurringCount;
        delete cleanItem.displayTitle;
        delete cleanItem.deadline;
        // 办文类型也需要移除日期字段，由 createRecurringItem 重新设置
        delete cleanItem.docStartDate;
        delete cleanItem.docEndDate;
        delete cleanItem.docDate;

        const skipHolidays = rule.skipHolidays || false;
        
        // 辅助函数：检查日期是否在范围内
        const isInRange = (date) => {
            if (startDate && date < startDate) return false;
            if (endDate && date > endDate) return false;
            return true;
        };

        switch (rule.type) {
            case RECURRING_TYPES.DAILY:
                // 每天
                let dailyCount = 0;
                let dailyDate = new Date(firstDate);
                while (dailyCount < count) {
                    // 检查日期范围
                    if (endDate && dailyDate > endDate) break;
                    
                    if (rule.skipWeekends && this.isWeekend(dailyDate)) {
                        dailyDate.setDate(dailyDate.getDate() + 1);
                        continue;
                    }
                    if (skipHolidays && this.isHoliday(dailyDate)) {
                        dailyDate.setDate(dailyDate.getDate() + 1);
                        continue;
                    }
                    items.push(this.createRecurringItem(cleanItem, dailyDate, rule, groupId, items.length + 1));
                    dailyCount++;
                    dailyDate = new Date(dailyDate);
                    dailyDate.setDate(dailyDate.getDate() + 1);
                }
                break;

            case RECURRING_TYPES.WORKDAY_DAILY:
                // 工作日每天（周一至周五，跳过周末和节假日）
                let workdayCount1 = 0;
                let currentDate1 = new Date(firstDate);
                while (workdayCount1 < count) {
                    // 检查日期范围
                    if (endDate && currentDate1 > endDate) break;
                    
                    const isWeekendDay = this.isWeekend(currentDate1);
                    const isHolidayDay = skipHolidays && this.isHoliday(currentDate1);
                    
                    if (!isWeekendDay && !isHolidayDay) {
                        items.push(this.createRecurringItem(cleanItem, currentDate1, rule, groupId, items.length + 1));
                        workdayCount1++;
                    }
                    currentDate1 = new Date(currentDate1);
                    currentDate1.setDate(currentDate1.getDate() + 1);
                }
                break;

            case RECURRING_TYPES.WEEKLY_DAY:
                // 每周固定星期
                let weeklyCount = 0;
                let weekNum = 0;
                while (weeklyCount < count) {
                    const date = this.getWeeklyDay(firstDate, weekNum, rule.weekDay);
                    // 检查日期范围
                    if (endDate && date > endDate) break;
                    
                    if (date >= firstDate) {
                        let shouldSkip = false;
                        if (rule.skipWeekends && this.isWeekend(date)) {
                            shouldSkip = true;
                        }
                        if (skipHolidays && this.isHoliday(date)) {
                            shouldSkip = true;
                        }
                        if (!shouldSkip) {
                            items.push(this.createRecurringItem(cleanItem, date, rule, groupId, items.length + 1));
                            weeklyCount++;
                        }
                    }
                    weekNum++;
                }
                break;

            case RECURRING_TYPES.WEEKLY_MULTI:
                // 每周多天（如一二三）
                const weekDays = rule.weekDays || [];
                let weekOffset = 0;
                let itemsGenerated = 0;
                while (itemsGenerated < count) {
                    for (const day of weekDays) {
                        if (itemsGenerated >= count) break;
                        const date = this.getWeeklyDay(firstDate, weekOffset, day);
                        // 检查日期范围
                        if (endDate && date > endDate) {
                            weekOffset = Infinity; // 结束外层循环
                            break;
                        }
                        // 确保日期不早于开始日期
                        if (date >= firstDate) {
                            let shouldSkip = false;
                            if (rule.skipWeekends && this.isWeekend(date)) {
                                shouldSkip = true;
                            }
                            if (skipHolidays && this.isHoliday(date)) {
                                shouldSkip = true;
                            }
                            if (!shouldSkip) {
                                items.push(this.createRecurringItem(cleanItem, date, rule, groupId, itemsGenerated + 1));
                                itemsGenerated++;
                            }
                        }
                    }
                    weekOffset++;
                    if (weekOffset === Infinity) break;
                }
                break;

            case RECURRING_TYPES.BIWEEKLY_DAY:
                // 每两周固定星期（14天间隔）
                let biweekDCount = 0;
                let biweekNum = 0;
                while (biweekDCount < count) {
                    const date = this.getWeeklyDay(firstDate, biweekNum * 2, rule.weekDay);
                    if (endDate && date > endDate) break;
                    if (date >= firstDate) {
                        let skip = false;
                        if (rule.skipWeekends && this.isWeekend(date)) skip = true;
                        if (skipHolidays && this.isHoliday(date)) skip = true;
                        if (!skip) {
                            items.push(this.createRecurringItem(cleanItem, date, rule, groupId, items.length + 1));
                            biweekDCount++;
                        }
                    }
                    biweekNum++;
                }
                break;

            case RECURRING_TYPES.BIWEEKLY_MULTI:
                // 每两周多天
                const biweekDays = rule.weekDays || [];
                let biweekOffset = 0;
                let biItemsGen = 0;
                while (biItemsGen < count) {
                    for (const day of biweekDays) {
                        if (biItemsGen >= count) break;
                        const date = this.getWeeklyDay(firstDate, biweekOffset * 2, day);
                        if (endDate && date > endDate) { biweekOffset = Infinity; break; }
                        if (date >= firstDate) {
                            let skip = false;
                            if (rule.skipWeekends && this.isWeekend(date)) skip = true;
                            if (skipHolidays && this.isHoliday(date)) skip = true;
                            if (!skip) {
                                items.push(this.createRecurringItem(cleanItem, date, rule, groupId, biItemsGen + 1));
                                biItemsGen++;
                            }
                        }
                    }
                    biweekOffset++;
                    if (biweekOffset === Infinity) break;
                }
                break;

            case RECURRING_TYPES.MONTHLY_DATE:
                // 每月固定日期
                let monthlyDateCount = 0;
                let monthNum = 1;
                while (monthlyDateCount < count) {
                    const date = this.getMonthlyDate(firstDate, monthNum, rule.day, false);
                    // 检查日期范围
                    if (endDate && date > endDate) break;
                    
                    let shouldSkip = false;
                    if (rule.skipWeekends && this.isWeekend(date)) {
                        shouldSkip = true;
                    }
                    if (skipHolidays && this.isHoliday(date)) {
                        shouldSkip = true;
                    }
                    if (shouldSkip) {
                        // 顺延到下一个工作日
                        while (this.isWeekend(date) || (skipHolidays && this.isHoliday(date))) {
                            date.setDate(date.getDate() + 1);
                        }
                    }
                    items.push(this.createRecurringItem(cleanItem, date, rule, groupId, items.length + 1));
                    monthlyDateCount++;
                    monthNum++;
                }
                break;

            case RECURRING_TYPES.MONTHLY_WORKDAY:
                // 每月第N个工作日
                for (let i = 0; i < count; i++) {
                    const date = this.getNthWorkDayOfMonth(firstDate, i + 1, rule.nthWorkDay, skipHolidays);
                    // 检查日期范围
                    if (endDate && date && date > endDate) break;
                    
                    if (date) {
                        items.push(this.createRecurringItem(cleanItem, date, rule, groupId, i + 1));
                    }
                }
                break;

            case RECURRING_TYPES.MONTHLY_WEEKDAY:
                // 每月第N个星期X（如每月第一个周一）
                for (let i = 0; i < count; i++) {
                    const date = this.getNthWeekDayOfMonth(firstDate, i + 1, rule.nthWeek, rule.weekDay);
                    // 检查日期范围
                    if (endDate && date && date > endDate) break;
                    
                    if (date) {
                        items.push(this.createRecurringItem(cleanItem, date, rule, groupId, i + 1));
                    }
                }
                break;
        }

        return items;
    }
,
    /**
     * 创建单个周期性任务项
     * @param {Object} baseItem - 基础任务数据
     * @param {Date} date - 周期日期
     * @param {Object} rule - 周期规则
     * @param {string} groupId - 周期组ID
     * @param {number} index - 周期序号
     * @returns {Object} 周期性任务项
     */
    createRecurringItem(baseItem, date, rule, groupId, index) {
        const dateStr = this.formatDateForInput(date);
        const item = {
            ...baseItem,
            isRecurring: true,
            recurringRule: rule,
            recurringGroupId: groupId,
            occurrenceIndex: index
        };
        
        // 根据事项类型设置正确的日期字段
        if (baseItem.type === ITEM_TYPES.DOCUMENT) {
            // 办文类型使用 docStartDate
            item.docStartDate = dateStr.split('T')[0]; // 只取日期部分
            item.docDate = item.docStartDate; // 兼容旧数据
            // 保留原始的结束日期偏移逻辑（如果有跨天设置）
        } else {
            // 待办和会议类型使用 deadline
            item.deadline = dateStr;
        }
        
        return item;
    }
,
    /**
     * 获取每月固定日期（支持跳过周末）
     */
    getMonthlyDate(baseDate, monthsAhead, day, skipWeekends) {
        const date = new Date(baseDate);
        // 先设置日期为1号，避免月份溢出问题
        date.setDate(1);
        date.setMonth(date.getMonth() + monthsAhead);
        // 然后设置目标日期
        const maxDay = this.getDaysInMonth(date.getFullYear(), date.getMonth());
        date.setDate(Math.min(day, maxDay));
        date.setHours(12, 0, 0, 0);

        if (skipWeekends) {
            while (this.isWeekend(date)) {
                date.setDate(date.getDate() + 1);
            }
        }
        return date;
    }
,
    /**
     * 获取每月天数
     */
    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

};
