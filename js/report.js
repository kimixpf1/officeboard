/**
 * 报告生成模块
 * 支持生成日报/周报/月报，导出Word文档或高清长图
 */

class ReportGenerator {
    constructor() {
        this.companyName = '办公室';
        this.department = '';
    }

    /**
     * 生成报告数据
     */
    async generateReportData(reportType, startDate, endDate) {
        // 获取日期范围内的事项
        const items = await db.getItemsByDateRange(startDate, endDate);

        // 分类统计
        const stats = {
            todo: { total: 0, completed: 0, pending: 0, highPriority: 0 },
            meeting: { total: 0, upcoming: 0 },
            document: { total: 0, completed: 0, processing: 0, pending: 0 }
        };

        const categorized = {
            todo: [],
            meeting: [],
            document: []
        };

        for (const item of items) {
            switch (item.type) {
                case 'todo':
                    categorized.todo.push(item);
                    stats.todo.total++;
                    if (item.completed) {
                        stats.todo.completed++;
                    } else {
                        stats.todo.pending++;
                    }
                    if (item.priority === 'high') {
                        stats.todo.highPriority++;
                    }
                    break;

                case 'meeting':
                    categorized.meeting.push(item);
                    stats.meeting.total++;
                    if (item.date >= new Date().toISOString().split('T')[0]) {
                        stats.meeting.upcoming++;
                    }
                    break;

                case 'document':
                    categorized.document.push(item);
                    stats.document.total++;
                    if (item.progress === 'completed') {
                        stats.document.completed++;
                    } else if (item.progress === 'processing') {
                        stats.document.processing++;
                    } else {
                        stats.document.pending++;
                    }
                    break;
            }
        }

        return {
            type: reportType,
            startDate,
            endDate,
            generatedAt: new Date().toISOString(),
            stats,
            items: categorized
        };
    }

    /**
     * 生成报告标题
     */
    getReportTitle(reportType, date) {
        const titles = {
            daily: '工作日报',
            weekly: '工作周报',
            monthly: '工作月报'
        };
        return titles[reportType] || '工作报告';
    }

    /**
     * 格式化日期范围
     */
    formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const format = (date) => {
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        };

        if (startDate === endDate) {
            return format(start);
        }

        return `${format(start)} 至 ${format(end)}`;
    }

    /**
     * 生成报告内容（文本格式）
     */
    async generateReportContent(reportType, startDate, endDate) {
        const data = await this.generateReportData(reportType, startDate, endDate);
        const title = this.getReportTitle(reportType, startDate);
        const dateRange = this.formatDateRange(startDate, endDate);

        let content = `${this.companyName}${title}\n`;
        content += `报告期间：${dateRange}\n`;
        content += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
        content += '\n';

        // 工作概述
        content += '一、工作概述\n';
        content += `本${reportType === 'daily' ? '日' : reportType === 'weekly' ? '周' : '月'}共处理待办事项${data.stats.todo.total}项`;
        content += `（已完成${data.stats.todo.completed}项，待完成${data.stats.todo.pending}项），`;
        content += `安排会议${data.stats.meeting.total}场，`;
        content += `处理文件${data.stats.document.total}件。\n\n`;

        // 待办事项
        if (data.items.todo.length > 0) {
            content += '二、待办事项完成情况\n';
            data.items.todo.forEach((item, index) => {
                const status = item.completed ? '已完成' : '进行中';
                const priority = item.priority === 'high' ? '【高优先级】' : '';
                content += `${index + 1}. ${priority}${item.title} - ${status}\n`;
                if (item.deadline) {
                    content += `   截止时间：${new Date(item.deadline).toLocaleString('zh-CN')}\n`;
                }
            });
            content += '\n';
        }

        // 会议活动
        if (data.items.meeting.length > 0) {
            content += '三、会议活动安排\n';
            data.items.meeting.forEach((item, index) => {
                content += `${index + 1}. ${item.title}\n`;
                if (item.date) {
                    content += `   时间：${item.date}`;
                    if (item.time) content += ` ${item.time}`;
                    content += '\n';
                }
                if (item.location) content += `   地点：${item.location}\n`;
                if (item.attendees && item.attendees.length > 0) {
                    content += `   参会人员：${item.attendees.join('、')}\n`;
                }
            });
            content += '\n';
        }

        // 办文情况
        if (data.items.document.length > 0) {
            content += '四、文件办理情况\n';
            data.items.document.forEach((item, index) => {
                const progressMap = {
                    pending: '待办',
                    processing: '办理中',
                    completed: '已办结'
                };
                const progress = progressMap[item.progress] || item.progress;
                content += `${index + 1}. ${item.title} - ${progress}\n`;
                if (item.docNumber) content += `   文号：${item.docNumber}\n`;
                if (item.source) content += `   来文单位：${item.source}\n`;
            });
            content += '\n';
        }

        // 工作总结
        content += '五、工作总结\n';
        content += `本${reportType === 'daily' ? '日' : reportType === 'weekly' ? '周' : '月'}工作按计划有序推进，`;
        if (data.stats.todo.pending > 0) {
            content += `有${data.stats.todo.pending}项待办事项需继续跟进，`;
        }
        if (data.stats.document.processing > 0) {
            content += `${data.stats.document.processing}件文件正在办理中。`;
        }
        content += '\n\n';

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
     * 动态加载docx库（多CDN备用）
     */
    async loadDocxLibrary() {
        // 检查是否已加载
        if (window.docx) return window.docx;

        // 多个CDN源
        const cdnSources = [
            'https://unpkg.com/docx@8.2.0/build/index.umd.js',
            'https://cdn.jsdelivr.net/npm/docx@8.2.0/build/index.umd.js',
            'https://cdnjs.cloudflare.com/ajax/libs/docx/8.2.0/index.umd.min.js'
        ];

        // 尝试每个CDN
        for (const src of cdnSources) {
            try {
                await this.loadScript(src);
                if (window.docx) {
                    console.log('docx库加载成功:', src);
                    return window.docx;
                }
            } catch (e) {
                console.warn('CDN加载失败:', src, e.message);
            }
        }

        throw new Error('所有CDN源均无法加载，请检查网络连接');
    }

    /**
     * 加载单个脚本
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
            // 超时处理
            setTimeout(() => reject(new Error('加载超时')), 10000);
        });
    }

    /**
     * 导出为Word文档
     */
    async exportToWord(reportType, startDate, endDate) {
        // 动态加载docx库
        let docxLib;
        try {
            docxLib = await this.loadDocxLibrary();
        } catch (error) {
            throw new Error('Word导出库加载失败: ' + error.message);
        }

        const report = await this.generateReportContent(reportType, startDate, endDate);

        // 使用docx.js生成Word文档
        const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = docxLib;

        const children = [
            new Paragraph({
                text: report.title,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: '报告期间：', bold: true }),
                    new TextRun(report.dateRange)
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: '生成时间：', bold: true }),
                    new TextRun(new Date().toLocaleString('zh-CN'))
                ],
                spacing: { after: 400 }
            })
        ];

        // 解析内容并添加到文档
        const sections = report.content.split('\n\n');
        for (const section of sections) {
            const lines = section.trim().split('\n');
            for (const line of lines) {
                if (line.startsWith('一、') || line.startsWith('二、') ||
                    line.startsWith('三、') || line.startsWith('四、') ||
                    line.startsWith('五、') || line.startsWith('六、')) {
                    children.push(new Paragraph({
                        text: line,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 200 }
                    }));
                } else if (line.match(/^\d+\./)) {
                    children.push(new Paragraph({
                        text: line,
                        spacing: { before: 100, after: 100 },
                        indent: { left: 400 }
                    }));
                } else if (line.trim()) {
                    children.push(new Paragraph({
                        text: line,
                        spacing: { after: 100 }
                    }));
                }
            }
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children
            }]
        });

        // 生成并下载
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title}_${startDate}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
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
    getDateRange(reportType, date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        switch (reportType) {
            case 'daily':
                const dateStr = date.toISOString().split('T')[0];
                return { start: dateStr, end: dateStr };

            case 'weekly':
                const dayOfWeek = date.getDay();
                const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const weekStart = new Date(date.setDate(diff));
                const weekEnd = new Date(date.setDate(weekStart.getDate() + 6));
                return {
                    start: weekStart.toISOString().split('T')[0],
                    end: weekEnd.toISOString().split('T')[0]
                };

            case 'monthly':
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                return {
                    start: monthStart.toISOString().split('T')[0],
                    end: monthEnd.toISOString().split('T')[0]
                };

            default:
                const defaultStr = date.toISOString().split('T')[0];
                return { start: defaultStr, end: defaultStr };
        }
    }
}

// 创建全局报告生成器实例
const reportGenerator = new ReportGenerator();
