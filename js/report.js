/**
 * 报告生成模块
 * 支持生成日报/周报/月报，导出高清长图
 */

class ReportGenerator {
    constructor() {
        this.itemTypes = window.OfficeConstants?.ITEM_TYPES || {
            TODO: 'todo',
            MEETING: 'meeting',
            DOCUMENT: 'document'
        };
    }

    /**
     * 获取全部事项
     */
    async getAllItems() {
        if (!window.db || typeof window.db.getAllItems !== 'function') {
            throw new Error('数据源未就绪，请刷新页面后重试');
        }

        const items = await window.db.getAllItems();
        return Array.isArray(items) ? items : [];
    }

    /**
     * 判断日期是否在范围内
     */
    isDateInRange(dateStr, startDate, endDate) {
        if (!dateStr) return false;
        return dateStr >= startDate && dateStr <= endDate;
    }

    /**
     * 获取事项日期
     */
    getItemDate(item) {
        if (!item) return '';

        if (item.type === this.itemTypes.TODO) {
            return item.deadline?.split('T')[0] || item.createdAt?.split('T')[0] || '';
        }

        if (item.type === this.itemTypes.MEETING) {
            return item.date || '';
        }

        if (item.type === this.itemTypes.DOCUMENT) {
            return item.docStartDate || item.docDate || item.date || '';
        }

        return item.deadline?.split('T')[0] || item.date || item.docStartDate || item.docDate || item.createdAt?.split('T')[0] || '';
    }

    /**
     * 生成报告数据
     */
    async generateReportData(reportType, startDate, endDate) {
        const allItems = await this.getAllItems();

        const todos = allItems.filter(item =>
            item?.type === this.itemTypes.TODO && this.isDateInRange(this.getItemDate(item), startDate, endDate)
        );

        const meetings = allItems.filter(item =>
            item?.type === this.itemTypes.MEETING && this.isDateInRange(this.getItemDate(item), startDate, endDate)
        );

        const documents = allItems.filter(item =>
            item?.type === this.itemTypes.DOCUMENT && this.isDateInRange(this.getItemDate(item), startDate, endDate)
        );

        return {
            todos,
            meetings,
            documents,
            stats: {
                todo: {
                    total: todos.length,
                    completed: todos.filter(t => t.completed).length,
                    pending: todos.filter(t => !t.completed).length,
                    highPriority: todos.filter(t => t.priority === 'high').length
                },
                meeting: {
                    total: meetings.length,
                    important: meetings.filter(m => m.isImportant).length,
                    withLeaders: meetings.filter(m => Array.isArray(m.attendees) && m.attendees.length > 0).length
                },
                document: {
                    total: documents.length,
                    processed: documents.filter(d => d.progress === 'completed' || d.status === 'processed').length,
                    pending: documents.filter(d => d.progress === 'pending' || d.status === 'pending').length
                }
            }
        };
    }

    /**
     * 获取报告标题
     */
    getReportTitle(reportType, date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        switch (reportType) {
            case 'daily':
                return `${year}年${month}月${day}日工作日报`;
            case 'weekly':
                return `${year}年第${this.getWeekNumber(d)}周工作周报`;
            case 'monthly':
                return `${year}年${month}月工作月报`;
            case 'yearly':
                return `${year}年工作年报`;
            case 'custom':
                return `工作报告`;
            default:
                return '工作报告';
        }
    }

    /**
     * 获取周数
     */
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    /**
     * 生成报告内容
     */
    async generateReportContent(reportType, startDate, endDate) {
        const data = await this.generateReportData(reportType, startDate, endDate);
        const dateRange = startDate === endDate ? startDate : `${startDate} 至 ${endDate}`;

        let content = '';

        // 标题
        content += `${this.getReportTitle(reportType, startDate)}\n`;
        content += `报告期间：${dateRange}\n`;
        content += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

        // 工作概况
        content += '一、工作概况\n';
        content += `本期间共处理工作事项 ${data.stats.todo.total} 项，`;
        content += `完成 ${data.stats.todo.completed} 项，`;
        content += `待处理 ${data.stats.todo.pending} 项。\n`;
        content += `组织会议活动 ${data.stats.meeting.total} 场，`;
        content += `处理办文 ${data.stats.document.total} 件。\n\n`;

        // 待办事项
        content += '二、待办事项完成情况\n';
        if (data.todos.length > 0) {
            data.todos.forEach((todo, index) => {
                content += `${index + 1}. ${todo.text}\n`;
                content += `   状态：${todo.completed ? '已完成' : '待处理'}`;
                content += `，优先级：${this.getPriorityText(todo.priority)}\n`;
                if (todo.description) {
                    content += `   说明：${todo.description}\n`;
                }
            });
        } else {
            content += '本期间无待办事项记录。\n';
        }
        content += '\n';

        // 会议活动
        content += '三、会议活动情况\n';
        if (data.meetings.length > 0) {
            data.meetings.forEach((meeting, index) => {
                content += `${index + 1}. ${meeting.title}\n`;
                content += `   时间：${meeting.date} ${meeting.time || ''}\n`;
                if (meeting.attendees && meeting.attendees.length > 0) {
                    content += `   参会人员：${meeting.attendees.join('、')}\n`;
                }
                if (meeting.location) {
                    content += `   地点：${meeting.location}\n`;
                }
            });
        } else {
            content += '本期间无会议活动记录。\n';
        }
        content += '\n';

        // 办文情况
        content += '四、办文情况\n';
        if (data.documents.length > 0) {
            data.documents.forEach((doc, index) => {
                content += `${index + 1}. ${doc.title}\n`;
                content += `   类型：${doc.type || '未分类'}，状态：${this.getStatusText(doc.status)}\n`;
                if (doc.documentNumber) {
                    content += `   文号：${doc.documentNumber}\n`;
                }
            });
        } else {
            content += '本期间无办文记录。\n';
        }
        content += '\n';

        // 重点工作
        content += '五、重点工作总结\n';
        if (data.stats.todo.highPriority > 0) {
            content += `本期间有 ${data.stats.todo.highPriority} 项高优先级工作需要重点关注。\n`;
        }
        if (data.stats.meeting.important > 0) {
            content += `组织了 ${data.stats.meeting.important} 场重要会议活动。\n`;
        }
        if (data.stats.document.pending > 0) {
            content += `当前还有 ${data.stats.document.pending} 件办文待处理。\n`;
        }
        content += '\n';

        // 下一步计划
        content += '六、下一步工作计划\n';
        content += '1. 继续推进未完成的工作事项\n';
        content += '2. 做好会议组织和文件办理工作\n';
        if (data.stats.todo.highPriority > 0) {
            content += `3. 重点关注${data.stats.todo.highPriority}项高优先级事项\n`;
        }

        return {
            title: this.getReportTitle(reportType, startDate),
            dateRange,
            content,
            data
        };
    }

    /**
     * 导出为高清长图
     */
    async exportToImage(reportType, startDate, endDate) {
        const report = await this.generateReportContent(reportType, startDate, endDate);

        // 创建临时容器
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 800px;
            padding: 40px;
            background: white;
            font-family: 'Noto Sans SC', sans-serif;
            line-height: 1.8;
        `;

        // 添加水印
        const watermark = document.createElement('div');
        watermark.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #999;
            opacity: 0.5;
        `;
        watermark.textContent = `生成时间：${new Date().toLocaleString('zh-CN')}`;
        container.appendChild(watermark);

        // 添加标题
        const title = document.createElement('h1');
        title.style.cssText = `
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        `;
        title.textContent = report.title;
        container.appendChild(title);

        // 添加日期
        const dateInfo = document.createElement('p');
        dateInfo.style.cssText = `
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
        `;
        dateInfo.textContent = `报告期间：${report.dateRange}`;
        container.appendChild(dateInfo);

        // 添加内容
        const contentDiv = document.createElement('div');
        contentDiv.style.fontSize = '14px';
        contentDiv.style.color = '#333';

        const sections = report.content.split('\n\n');
        for (const section of sections) {
            if (section.includes(report.title) || section.includes('报告期间')) continue;

            const lines = section.trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const p = document.createElement('p');
                    p.style.margin = '10px 0';

                    if (line.startsWith('一、') || line.startsWith('二、') ||
                        line.startsWith('三、') || line.startsWith('四、') ||
                        line.startsWith('五、') || line.startsWith('六、')) {
                        p.style.fontWeight = 'bold';
                        p.style.fontSize = '16px';
                        p.style.marginTop = '20px';
                    } else if (line.match(/^\d+\./)) {
                        p.style.marginLeft = '20px';
                    }

                    p.textContent = line;
                    contentDiv.appendChild(p);
                }
            }
        }

        container.appendChild(contentDiv);
        document.body.appendChild(container);

        try {
            // 使用html2canvas生成图片
            const canvas = await html2canvas(container, {
                scale: 2, // 高清
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // 下载图片
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${report.title}_${startDate}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            return true;
        } finally {
            document.body.removeChild(container);
        }
    }

    /**
     * 获取日期范围
     */
    getDateRange(reportType, date = new Date(), customStart = null, customEnd = null) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        // 辅助函数：格式化为本地日期字符串
        const formatLocalDate = (d) => {
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        };

        switch (reportType) {
            case 'daily':
                const dateStr = formatLocalDate(date);
                return { start: dateStr, end: dateStr };

            case 'weekly':
                const dayOfWeek = date.getDay();
                const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const weekStart = new Date(date.setDate(diff));
                const weekEnd = new Date(date.setDate(weekStart.getDate() + 6));
                return {
                    start: formatLocalDate(weekStart),
                    end: formatLocalDate(weekEnd)
                };

            case 'monthly':
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                return {
                    start: formatLocalDate(monthStart),
                    end: formatLocalDate(monthEnd)
                };

            case 'yearly':
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31);
                return {
                    start: formatLocalDate(yearStart),
                    end: formatLocalDate(yearEnd)
                };

            case 'custom':
                if (customStart && customEnd) {
                    return { start: customStart, end: customEnd };
                }
                const defaultStr = formatLocalDate(date);
                return { start: defaultStr, end: defaultStr };

            default:
                const defaultStr2 = formatLocalDate(date);
                return { start: defaultStr2, end: defaultStr2 };
        }
    }

    /**
     * 获取优先级文本
     */
    getPriorityText(priority) {
        const priorityMap = {
            high: '高',
            medium: '中',
            low: '低'
        };
        return priorityMap[priority] || priority;
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            pending: '待处理',
            processing: '处理中',
            processed: '已处理',
            archived: '已归档'
        };
        return statusMap[status] || status;
    }
}

// 创建全局报告生成器实例
const reportGenerator = new ReportGenerator();
