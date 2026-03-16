/**
 * Kimi API 集成模块
 * 支持 Kimi Code API
 */

class KimiAPI {
    constructor() {
        // Kimi Code 使用 Moonshot API 端点
        this.baseUrl = 'https://api.moonshot.ai/v1';
        this.model = 'moonshot-v1-8k';
    }

    /**
     * 获取API Key
     */
    async getApiKey() {
        const apiKey = await cryptoManager.secureGetApiKey();
        if (!apiKey) {
            throw new Error('请先设置Kimi API Key');
        }
        return apiKey;
    }

    /**
     * 测试API连接
     */
    async testConnection(apiKey) {
        try {
            // 直接测试chat接口
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'hi' }],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                return {
                    success: true,
                    endpoint: 'Kimi Code',
                    url: this.baseUrl
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
                
                // 提供更具体的错误信息
                if (errorMsg.includes('suspended') || errorMsg.includes('balance')) {
                    return {
                        success: false,
                        message: '账户余额不足，请前往 kimi.com/code 充值'
                    };
                } else if (errorMsg.includes('invalid') || response.status === 401) {
                    return {
                        success: false,
                        message: 'API Key 无效，请确认是否正确复制完整'
                    };
                } else if (errorMsg.includes('rate')) {
                    return {
                        success: false,
                        message: '请求过于频繁，请稍后再试'
                    };
                } else {
                    return {
                        success: false,
                        message: `连接失败: ${errorMsg}`
                    };
                }
            }
        } catch (e) {
            console.error('API连接测试失败:', e);
            return {
                success: false,
                message: `网络错误: ${e.message}。请检查网络连接或尝试使用VPN`
            };
        }
    }

    /**
     * 发送请求到Kimi API
     */
    async request(messages, temperature = 0.3) {
        const apiKey = await this.getApiKey();

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const errorMsg = error.error?.message || `API请求失败: ${response.status}`;

            // 提供更友好的错误提示
            if (errorMsg.includes('suspended') || errorMsg.includes('balance')) {
                throw new Error('账户余额不足，请充值后重试');
            } else if (errorMsg.includes('invalid') || response.status === 401) {
                throw new Error('API Key无效，请检查后重新设置');
            }

            throw new Error(errorMsg);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content;
    }

    /**
     * 解析自然语言输入
     */
    async parseNaturalLanguage(input) {
        const systemPrompt = `你是一个智能办公助手，专门解析用户的自然语言输入并转换为结构化数据。

你需要将输入分类为以下三种类型之一：
1. todo - 待办事项
2. meeting - 会议活动
3. document - 办文情况

【周期性任务识别 - 非常重要】
如果用户描述包含周期性含义，识别为周期性任务：
- "每月X号"或"每个月X号" → isRecurring: true, recurringRule: { type: 'monthly_date', day: X }
- "每月第X个工作日" → isRecurring: true, recurringRule: { type: 'monthly_workday', nthWorkDay: X }
- "每周X"或"每星期X" → isRecurring: true, recurringRule: { type: 'weekly_day', weekDay: 1-7 }
  （周一=1, 周二=2, 周三=3, 周四=4, 周五=5, 周六=6, 周日=7）
- 如果提到"非节假日"、"非周末"、"工作日"，设置 skipWeekends: true
- 默认生成6个实例

对于每种类型，提取相应字段：

【todo】待办事项字段：
- title: 任务标题（必填）
- priority: 优先级（high/medium/low，默认medium）
- deadline: 截止时间（ISO 8601格式，如2024-03-20T15:00:00）
- completed: 是否完成（布尔值，默认false）

【meeting】会议活动字段：
- title: 会议标题（必填）
- date: 日期（YYYY-MM-DD格式）
- time: 时间（HH:MM格式）
- location: 地点
- attendees: 参会人员数组（如["张三","李四"]）
- agenda: 议程摘要

【document】办文情况字段：
- title: 文件标题（必填）
- docNumber: 文号/文件类型
- source: 来文单位
- progress: 办理进度（pending/processing/completed，默认pending）
- attachment: 附件链接

当前日期：${new Date().toISOString().split('T')[0]}

请分析用户输入，返回JSON格式：
{
  "type": "todo|meeting|document",
  "data": { 相应字段 },
  "confidence": 0.0-1.0 的置信度,
  "isRecurring": true/false,
  "recurringRule": { type, day/nthWorkDay/weekDay, skipWeekends },
  "recurringCount": 6
}

相对日期处理规则：
- "今天" = 当前日期
- "明天" = 当前日期+1天
- "后天" = 当前日期+2天
- "下周X" = 下周一到周日的对应日期
- "下月X号" = 下月对应日期`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
        ];

        const response = await this.request(messages);

        try {
            const result = JSON.parse(response);
            return this.validateAndNormalize(result);
        } catch (error) {
            console.error('解析响应失败:', error);
            throw new Error('无法解析AI响应，请重试');
        }
    }

    /**
     * 验证和规范化解析结果
     */
    validateAndNormalize(result) {
        if (!result.type || !['todo', 'meeting', 'document'].includes(result.type)) {
            throw new Error('无法识别事项类型');
        }

        const data = result.data || {};

        // 确保标题存在
        if (!data.title) {
            data.title = '未命名事项';
        }

        // 根据类型设置默认值
        switch (result.type) {
            case 'todo':
                data.priority = data.priority || 'medium';
                data.completed = data.completed || false;
                break;
            case 'meeting':
                data.attendees = Array.isArray(data.attendees) ? data.attendees : [];
                if (typeof data.attendees === 'string') {
                    data.attendees = data.attendees.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                }
                break;
            case 'document':
                data.progress = data.progress || 'pending';
                break;
        }

        return {
            type: result.type,
            data,
            confidence: result.confidence || 0.8,
            // 保留周期性任务字段
            isRecurring: result.isRecurring || false,
            recurringRule: result.recurringRule || null,
            recurringCount: result.recurringCount || 6
        };
    }

    /**
     * 从文档内容提取事项
     */
    async extractFromDocument(text, source = '') {
        const systemPrompt = `你是一个文档分析助手。请从以下文档内容中提取办公相关的事项，包括待办任务、会议安排、文件处理等。

对于每个提取到的事项，返回：
- type: 类型（todo/meeting/document）
- title: 标题
- 相关字段根据类型填写

请以JSON数组格式返回所有提取到的事项：
{
  "items": [
    { "type": "...", "title": "...", ... },
    ...
  ]
}

文档来源：${source}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.slice(0, 4000) } // 限制长度
        ];

        const response = await this.request(messages);

        try {
            const result = JSON.parse(response);
            return (result.items || []).map(item => this.validateAndNormalize(item));
        } catch (error) {
            console.error('解析文档失败:', error);
            return [];
        }
    }

    /**
     * 生成工作报告
     */
    async generateReport(items, reportType, startDate, endDate) {
        const typeLabels = { daily: '日报', weekly: '周报', monthly: '月报' };
        const typeLabel = typeLabels[reportType] || '报告';

        const systemPrompt = `你是一个专业的办公报告撰写助手。请根据提供的事项数据生成一份${typeLabel}。

报告要求：
1. 使用标准公文格式
2. 包含工作概述、完成情况、下一步计划等部分
3. 语言正式、简洁、准确
4. 统计数据要准确

报告时间段：${startDate} 至 ${endDate}`;

        // 统计信息
        const stats = this.calculateStats(items);

        const userContent = `请根据以下数据生成${typeLabel}：

=== 统计数据 ===
- 待办事项总数：${stats.todo.total}，已完成：${stats.todo.completed}，待完成：${stats.todo.pending}
- 会议活动总数：${stats.meeting.total}
- 文件办理总数：${stats.document.total}，已办结：${stats.document.completed}，办理中：${stats.document.processing}，待办：${stats.document.pending}

=== 详细事项 ===
${JSON.stringify(items, null, 2)}

请生成正式的工作${typeLabel}，包含标题、正文和落款。`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];

        const response = await this.request(messages, 0.5);

        try {
            const result = JSON.parse(response);
            return result.report || result.content || response;
        } catch (error) {
            // 如果不是JSON格式，直接返回文本
            return response;
        }
    }

    /**
     * 计算统计数据
     */
    calculateStats(items) {
        const stats = {
            todo: { total: 0, completed: 0, pending: 0 },
            meeting: { total: 0 },
            document: { total: 0, completed: 0, processing: 0, pending: 0 }
        };

        for (const item of items) {
            switch (item.type) {
                case 'todo':
                    stats.todo.total++;
                    if (item.completed) {
                        stats.todo.completed++;
                    } else {
                        stats.todo.pending++;
                    }
                    break;
                case 'meeting':
                    stats.meeting.total++;
                    break;
                case 'document':
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

        return stats;
    }

    /**
     * 智能推荐（基于历史数据）
     */
    async getRecommendations(items, context) {
        const systemPrompt = `你是一个智能办公助手。根据用户的历史数据和当前上下文，提供工作建议和提醒。`;

        const userContent = `当前上下文：${context}

近期事项：
${JSON.stringify(items.slice(0, 10), null, 2)}

请提供：
1. 即将到期的事项提醒
2. 可能需要关注的事项
3. 工作建议

以JSON格式返回：
{
  "reminders": [{"title": "...", "reason": "..."}],
  "suggestions": ["..."]
}`;

        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ];

            const response = await this.request(messages);
            return JSON.parse(response);
        } catch (error) {
            console.error('获取推荐失败:', error);
            return { reminders: [], suggestions: [] };
        }
    }
}

// 创建全局Kimi API实例
const kimiAPI = new KimiAPI();
