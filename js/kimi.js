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
     * 带重试机制的 fetch 请求
     */
    async fetchWithRetry(url, options, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok && (response.status === 429 || response.status >= 500)) {
                    if (i === maxRetries - 1) return response;
                    const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
                    console.warn(`[Kimi API] 请求失败 (状态码: ${response.status}), ${delay}ms 后进行第 ${i + 1} 次重试...`);
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }
                return response;
            } catch (e) {
                if (i === maxRetries - 1) throw e;
                const delay = 1000 * Math.pow(2, i);
                console.warn(`[Kimi API] 网络请求异常: ${e.message}, ${delay}ms 后进行第 ${i + 1} 次重试...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    /**
     * 测试API连接
     */
    async testConnection(apiKey) {
        try {
            // 直接测试 chat 接口
            const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
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

        const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
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
     * 支持新增、编辑、删除操作
     */
    async parseNaturalLanguage(input) {
        const systemPrompt = `你是一个智能办公助手，专门解析用户的自然语言输入并转换为结构化数据。

【操作类型识别 - 非常重要】
首先判断用户想要执行什么操作：
1. "add"（新增）：默认操作，用户描述新事项
2. "delete"（删除）：包含"删除"、"移除"、"清除"、"去掉"、"取消"等词
3. "edit"（修改）：包含"修改"、"更改"、"改成"、"改为"、"调整"、"更新"等词
4. "query"（查询）：包含"查找"、"搜索"、"有哪些"、"列出"等词

【删除操作识别示例】
- "删除3月26号到3月30号所有名为每日汇报的周期性事项" → action: "delete"
- "帮我删除所有已完成的待办" → action: "delete"
- "清除上周的会议记录" → action: "delete"
- "取消明天的周例会" → action: "delete"

【修改操作识别示例】
- "把每周例会改到周三下午3点" → action: "edit"
- "修改明天会议的地点为二号会议室" → action: "edit"
- "将张三的待办优先级改为高" → action: "edit"

【筛选条件识别】
当用户要删除或修改事项时，需要提取筛选条件：
- 日期范围：startDate, endDate（格式YYYY-MM-DD）
- 标题匹配：titleMatch（模糊匹配）
- 事项类型：itemType（todo/meeting/document）
- 是否周期性：isRecurring（true/false）
- 完成状态：completed（true/false）
- 周期组ID：recurringGroupId（如果要操作整个周期组）

【修改操作的更新字段】
当是修改操作时，需要提取要更新的字段：
- updates: { title, priority, deadline, location, time, date, handler... }

你需要将输入分类为以下三种事项类型之一：
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
- title: 会议标题（必填，简洁明确，如"研究工作会议"）
- date: 日期（YYYY-MM-DD格式）
- time: 时间（HH:MM格式）
- location: 地点
- attendees: 参会人员数组（如["张三","李四"]）
- agenda: 议程摘要

【参会人员和会议名称识别规则 - 非常重要】
- "X召集Y开会/研究/座谈"：X和Y都是参会人员，会议名称为"研究工作会议"等
- "X和Y开会讨论Z"：参会人员=[X,Y]，会议名称="Z讨论会"
- 例如"钱局召集某某处长研究工作"：attendees=["钱局","某某处长"]，title="研究工作会议"

【document】办文情况字段：
- title: 文件标题（必填）
- docNumber: 文号/文件类型
- source: 来文单位
- progress: 办理进度（pending/processing/completed，默认pending）
- attachment: 附件链接

当前日期：${new Date().toISOString().split('T')[0]}

【返回格式】
对于新增操作：
{
  "action": "add",
  "type": "todo|meeting|document",
  "data": { 相应字段 },
  "confidence": 0.0-1.0 的置信度,
  "isRecurring": true/false,
  "recurringRule": { type, day/nthWorkDay/weekDay, skipWeekends },
  "recurringCount": 6
}

对于删除操作：
{
  "action": "delete",
  "filter": {
    "titleMatch": "标题关键词",
    "itemType": "todo|meeting|document|all",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "isRecurring": true/false,
    "completed": true/false
  },
  "description": "将要删除的事项描述",
  "confidence": 0.0-1.0
}

对于修改操作：
{
  "action": "edit",
  "filter": {
    "titleMatch": "标题关键词",
    "itemType": "todo|meeting|document|all",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "updates": {
    "要更新的字段": "新值"
  },
  "updateFuture": true/false,  // 是否更新后续周期
  "description": "将要修改的内容描述",
  "confidence": 0.0-1.0
}

相对日期处理规则：
- "今天" = 当前日期
- "明天" = 当前日期+1天
- "后天" = 当前日期+2天
- "下周X" = 下周一到周日的对应日期
- "下月X号" = 下月对应日期
- "X号到Y号" = startDate和endDate`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
        ];

        const response = await this.request(messages);

        try {
            const result = JSON.parse(response);
            return this.validateAndNormalizeCommand(result);
        } catch (error) {
            console.error('解析响应失败:', error);
            throw new Error('无法解析AI响应，请重试');
        }
    }

    /**
     * 验证和规范化命令结果
     */
    validateAndNormalizeCommand(result) {
        // 确定操作类型，默认为新增
        const action = result.action || 'add';
        
        if (action === 'delete') {
            return {
                action: 'delete',
                filter: result.filter || {},
                description: result.description || '删除匹配的事项',
                confidence: result.confidence || 0.8
            };
        }
        
        if (action === 'edit') {
            return {
                action: 'edit',
                filter: result.filter || {},
                updates: result.updates || {},
                updateFuture: result.updateFuture || false,
                description: result.description || '修改匹配的事项',
                confidence: result.confidence || 0.8
            };
        }
        
        if (action === 'query') {
            return {
                action: 'query',
                filter: result.filter || {},
                description: result.description || '查询事项',
                confidence: result.confidence || 0.8
            };
        }
        
        // 默认是新增操作，使用原来的验证逻辑
        return this.validateAndNormalize({ ...result, action: 'add' });
    }

    /**
     * 验证和规范化解析结果（新增操作）
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
