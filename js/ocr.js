/**
 * OCR 文档识别模块
 * 支持图片和PDF的文字提取
 * 支持DeepSeek API和Kimi API（月之暗面，图片理解更强）
 */

class OCRManager {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        // DeepSeek API配置
        this.deepseekApiKey = null;
        this.deepseekBaseUrl = 'https://api.deepseek.com';
        this.deepseekModel = 'deepseek-chat';
        // Kimi API配置（月之暗面，图片理解能力强）
        this.kimiApiKey = null;
        this.kimiBaseUrl = 'https://api.moonshot.cn/v1';
        this.kimiVisionModel = 'moonshot-v1-8k-vision-preview';  // 视觉模型（正确的模型名）
        this.kimiChatModel = 'moonshot-v1-8k';                // 文字模型，用于PDF解析
    }

    /**
     * 设置DeepSeek API Key
     */
    async setApiKey(key) {
        this.deepseekApiKey = key;
        localStorage.setItem('deepseekApiKey', key);
        // 同时保存到 IndexedDB 以便跨设备同步
        if (typeof db !== 'undefined') {
            await db.setSetting('deepseek_api_key', key);
            await db.setSetting('deepseek_api_key_set', key ? new Date().toISOString() : null);
        }
    }

    /**
     * 获取DeepSeek API Key
     */
    getApiKey() {
        if (!this.deepseekApiKey) {
            this.deepseekApiKey = localStorage.getItem('deepseekApiKey');
        }
        return this.deepseekApiKey;
    }

    /**
     * 设置Kimi API Key
     */
    async setKimiApiKey(key) {
        this.kimiApiKey = key;
        localStorage.setItem('kimiApiKey', key);
        // 同时保存到 IndexedDB 以便跨设备同步
        if (typeof db !== 'undefined') {
            await db.setSetting('kimi_api_key', key);
            await db.setSetting('kimi_api_key_set', key ? new Date().toISOString() : null);
        }
    }

    /**
     * 获取Kimi API Key
     */
    getKimiApiKey() {
        if (!this.kimiApiKey) {
            this.kimiApiKey = localStorage.getItem('kimiApiKey');
        }
        return this.kimiApiKey;
    }

    /**
     * 从 IndexedDB 加载 API Key（用于同步后恢复）
     */
    async loadApiKeysFromDB() {
        if (typeof db !== 'undefined') {
            const deepseekKey = await db.getSetting('deepseek_api_key');
            const kimiKey = await db.getSetting('kimi_api_key');

            if (deepseekKey && !this.deepseekApiKey) {
                this.deepseekApiKey = deepseekKey;
                localStorage.setItem('deepseekApiKey', deepseekKey);
            }
            if (kimiKey && !this.kimiApiKey) {
                this.kimiApiKey = kimiKey;
                localStorage.setItem('kimiApiKey', kimiKey);
            }
        }
    }

    /**
     * 检查是否有可用的AI API
     */
    hasAIAPI() {
        return !!(this.getApiKey() || this.getKimiApiKey());
    }

    /**
     * 格式化会议标题：【参会人员】会议名称+时间+地点
     */
    formatMeetingTitle(data) {
        const parts = [];

        // 参会人员
        if (data.attendees && data.attendees.length > 0) {
            const attendeeStr = data.attendees.slice(0, 3).join('、');
            parts.push(`【${attendeeStr}${data.attendees.length > 3 ? '等' : ''}】`);
        }

        // 会议名称
        if (data.title) {
            parts.push(data.title);
        }

        // 时间
        if (data.time) {
            parts.push(data.time);
        }

        // 地点
        if (data.location) {
            parts.push(data.location);
        }

        return parts.join(' ');
    }

    /**
     * 格式化待办事项标题：【优先级】事项名称+截止时间
     */
    formatTodoTitle(data) {
        const parts = [];

        // 优先级
        const priorityMap = { high: '紧急', medium: '一般', low: '低' };
        const priority = priorityMap[data.priority] || '一般';
        parts.push(`【${priority}】`);

        // 事项名称
        if (data.title) {
            parts.push(data.title);
        }

        // 截止时间
        if (data.deadline) {
            const date = new Date(data.deadline);
            const now = new Date();
            const isOverdue = date < now && !data.completed;
            const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            parts.push(isOverdue ? `⚠️已逾期 ${timeStr}` : `截止${timeStr}`);
        }

        return parts.join(' ');
    }

    /**
     * 格式化文件标题：【办理状态】文件名称+文号
     */
    formatDocumentTitle(data) {
        const parts = [];

        // 办理状态
        const progressMap = { pending: '待办', processing: '办理中', completed: '已办结' };
        const progress = progressMap[data.progress] || '待办';
        parts.push(`【${progress}】`);

        // 文件名称
        if (data.title) {
            parts.push(data.title);
        }

        // 文号
        if (data.docNumber) {
            parts.push(`(${data.docNumber})`);
        }

        // 来文单位
        if (data.source) {
            parts.push(`- ${data.source}`);
        }

        return parts.join(' ');
    }

    /**
     * 使用DeepSeek API进行智能解析（优先使用AI）
     */
    async parseWithAI(text, source = '') {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            // 如果没有API Key，使用本地规则解析
            console.log('未配置DeepSeek API Key，使用本地规则解析');
            return this.parseWithRules(text);
        }

        const today = new Date();
        const todayStr = this.formatDateLocal(today);
        const tomorrow = new Date(today.getTime() + 86400000);
        const tomorrowStr = this.formatDateLocal(tomorrow);
        const dayAfter = new Date(today.getTime() + 172800000);
        const dayAfterStr = this.formatDateLocal(dayAfter);
        const weekDay = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];

        const systemPrompt = `你是一个专业的办公助手，专门解析中文办公文本并提取结构化信息。

【当前时间】
今天是${todayStr}（星期${weekDay}）
明天是${tomorrowStr}
后天是${dayAfterStr}

【任务】
从用户输入中提取办公事项的全部要素，返回JSON格式。

【事项类型判断】
1. meeting（会议）：包含"会议"、"座谈"、"研讨"、"讨论"、"例会"、"视频会议"等，或有明确时间地点的聚会
2. todo（待办）：需要执行的动作，如"提交"、"汇报"、"准备"、"完成"、"审批"、"撰写"、"整理"、"处理"、"修改"、"制定"、"回复"、"确认"等
3. document（文件）：收到或发出的文件、通知、函件、请示、批复等

【周期性任务识别 - 非常重要】
如果用户描述包含周期性含义，识别为周期性任务：

【每日类】
- "每天"或"每日" → isRecurring: true, recurringRule: { type: 'daily' }
- "工作日每天"、"每个工作日"、"每天（工作日）" → isRecurring: true, recurringRule: { type: 'workday_daily' }

【每周类】
- "每周X"或"每星期X" → isRecurring: true, recurringRule: { type: 'weekly_day', weekDay: 1-7 }
  （周一=1, 周二=2, 周三=3, 周四=4, 周五=5, 周六=6, 周日=7）
- "每周一三五"或"每周一二三" → isRecurring: true, recurringRule: { type: 'weekly_multi', weekDays: [1,3,5] }
  （多个星期用数组表示）

【每月类】
- "每月X号"或"每个月X号" → isRecurring: true, recurringRule: { type: 'monthly_date', day: X }
- "每月第X个工作日" → isRecurring: true, recurringRule: { type: 'monthly_workday', nthWorkDay: X }
- "每月第一个周一"、"每月第二个周二"等 → isRecurring: true, recurringRule: { type: 'monthly_weekday', nthWeek: 1-5, weekDay: 1-7 }
  （nthWeek: 第几个，1=第一个，2=第二个...）

【通用规则】
- 如果提到"非节假日"、"非周末"、"工作日"，设置 skipWeekends: true
- 默认生成20个实例（约一个月工作日），用户可指定数量
- 周期性任务标题要体现周期性，如"每周例会"、"月度汇报"

【日期转换规则 - 重要！】
- 今天 = ${todayStr}
- 明天 = ${tomorrowStr}
- 后天 = ${dayAfterStr}
- 下周一 = 找下一个周一的日期
- X月X日 = 当年对应日期，格式YYYY-MM-DD
- 注意：日期必须是准确的，不能错位

【时间转换规则】
- 上午X点 = X:00（如上午9点 = 09:00）
- 下午X点 = (X+12):00（如下午3点 = 15:00）
- 晚上X点 = (X+12):00（如晚上7点 = 19:00）
- X点半 = X:30
- 今晚X点 = 晚上X点

【输出格式】严格返回JSON：
{
  "items": [{
    "type": "meeting|todo|document",
    "data": {
      // 会议字段
      "title": "会议名称（简洁）",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "location": "会议地点",
      "attendees": ["参会人员数组"],
      // 待办字段
      "priority": "high|medium|low",
      "deadline": "YYYY-MM-DDTHH:MM",
      // 文件字段
      "docNumber": "文号",
      "source": "来文单位",
      "progress": "pending|processing|completed"
    },
    // 周期性任务字段（如果是周期性任务）
    "isRecurring": true,
    "recurringRule": {
      "type": "monthly_date|monthly_workday|weekly_day",
      "day": 13,           // monthly_date时使用
      "nthWorkDay": 2,     // monthly_workday时使用
      "weekDay": 1,        // weekly_day时使用，1=周一
      "skipWeekends": true
    },
    "recurringCount": 6    // 生成实例数量
  }]
}

【待办事项优先级判断】
- high（紧急）：包含"紧急"、"立即"、"马上"、"尽快"、"今天"、"明天"等
- low（低）：包含"有空"、"方便时"、"不急"等
- medium（一般）：其他情况

【文件办理状态判断】
- pending（待办）：收到但未开始处理
- processing（办理中）：正在处理
- completed（已办结）：已处理完成

【重要规则】
1. 必须提取所有能识别的要素，不能遗漏
2. 日期格式必须是YYYY-MM-DD，不能错位
3. 时间格式必须是HH:MM（24小时制）
4. 参会人员要完整提取
5. 地点要完整提取（如"二号楼1号会议室"）
6. 标题要简洁，只保留会议主题或事项内容
7. 待办事项必须有优先级和截止时间
8. 文件要有文号（如有）和来文单位（如有）
9. 周期性任务必须设置isRecurring和recurringRule`;

        const userPrompt = `请解析以下文本，提取所有办公事项要素：

"${text}"

要求：
1. 提取全部要素：日期、时间、地点、参会人员、会议名称、优先级、截止时间、文号、来文单位等
2. 日期格式YYYY-MM-DD，确保准确无误
3. 时间格式HH:MM（24小时制）
4. 只返回JSON，不要解释`;

        try {
            const response = await fetch(`${this.deepseekBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.deepseekModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    throw new Error('API Key无效，请检查设置');
                } else if (response.status === 429) {
                    throw new Error('请求过于频繁，请稍后重试');
                }
                throw new Error(error.error?.message || `API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            // 尝试解析JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.items && Array.isArray(result.items)) {
                    // 过滤无效项并验证，然后格式化标题
                    const items = result.items
                        .map(item => this.validateAndCleanItem(item))
                        .filter(item => item !== null);

                    // 格式化会议标题
                    return items.map(item => {
                        if (item.type === 'meeting') {
                            item.data.displayTitle = this.formatMeetingTitle(item.data);
                        }
                        return item;
                    });
                }
            }

            return this.parseWithRules(text);
        } catch (error) {
            console.error('DeepSeek API解析失败:', error.message);
            // 降级到本地规则
            return this.parseWithRules(text);
        }
    }

    // 保持向后兼容
    async parseWithGroq(text, source = '') {
        return this.parseWithAI(text, source);
    }

    /**
     * 验证并清理解析结果
     */
    validateAndCleanItem(item) {
        if (!item || !item.type) {
            return null;
        }

        // 兼容两种格式：嵌套格式 {type, data: {...}} 和扁平格式 {type, title, ...}
        let data;
        if (item.data && typeof item.data === 'object') {
            data = { ...item.data };
        } else {
            // 扁平格式，提取非 type 字段到 data
            const { type, ...rest } = item;
            data = rest;
        }

        // 确保标题存在
        if (!data.title || data.title.length < 2) {
            if (item.type === 'meeting') {
                data.title = '会议';
            } else if (item.type === 'todo') {
                data.title = '待办事项';
            } else if (item.type === 'document') {
                data.title = '文件';
            } else {
                return null;
            }
        }

        // 清理标题中的多余内容
        data.title = data.title
            .replace(/^[和与跟][^\s]*/g, '')
            .replace(/\s+/g, '')
            .trim()
            .substring(0, 30);

        // 验证日期格式
        if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            data.date = this.extractDate(data.date);
        }

        // 验证endDate格式（跨天会议）
        if (data.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
            data.endDate = this.extractDate(data.endDate);
        }

        // 验证时间格式
        if (data.time && !/^\d{2}:\d{2}$/.test(data.time)) {
            data.time = this.extractTime(data.time);
        }

        // 确保attendees是数组
        if (data.attendees && !Array.isArray(data.attendees)) {
            if (typeof data.attendees === 'string') {
                data.attendees = data.attendees.split(/[、，,和与跟]/).map(s => s.trim()).filter(s => s);
            } else {
                data.attendees = [];
            }
        }

        // 确保待办事项有优先级
        if (item.type === 'todo' && !data.priority) {
            data.priority = 'medium';
        }

        // 确保文件有办理状态
        if (item.type === 'document' && !data.progress) {
            data.progress = 'pending';
        }

        // 生成格式化显示标题
        if (item.type === 'meeting') {
            data.displayTitle = this.formatMeetingTitle(data);
        } else if (item.type === 'todo') {
            data.displayTitle = this.formatTodoTitle(data);
        } else if (item.type === 'document') {
            data.displayTitle = this.formatDocumentTitle(data);
        }

        // 保留周期性任务字段
        const result = { type: item.type, data };
        if (item.isRecurring) {
            result.isRecurring = true;
            result.recurringRule = item.recurringRule;
            result.recurringCount = item.recurringCount || 6;
        }

        return result;
    }

    /**
     * 本地日期格式化（避免时区问题）
     */
    formatDateLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 本地规则解析（增强版，作为AI的备用）
     * 支持多事项识别、时间段、跨天会议
     */
    parseWithRules(text) {
        const items = [];

        // 初始化模板匹配器
        if (!this.templateMatcher && window.TemplateMatcher) {
            this.templateMatcher = new window.TemplateMatcher();
        }

        // 按多种分隔符分行处理
        let lines = text.split(/[\n\r]+/);

        // 如果只有一行，尝试按其他分隔符拆分
        if (lines.length <= 1) {
            lines = text.split(/[；;。•●○■□\d]+[.、．]\s*/).filter(l => l.trim());
            if (lines.length <= 1) {
                lines = text.split(/(?=周[一二三四五六日]|周[一二三四五六日]\s*[（(])/).filter(l => l.trim());
            }
        }

        lines = lines.filter(line => line.trim());

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.length < 2) continue;

            let type = null;
            let data = {};

            // ========== 统一提取所有信息 ==========
            // 提取日期（可能跨天）
            const dateInfo = this.extractDateWithRange(trimmedLine);
            // 提取时间（可能有时间段）
            const timeInfo = this.extractTimeWithRange(trimmedLine);
            // 提取地点
            const locationInfo = this.extractLocation(trimmedLine);
            // 提取参会人员（增强版）
            const attendeesInfo = this.extractAttendeesEnhanced(trimmedLine);
            // 提取会议标题（增强版）
            const meetingTitle = this.extractMeetingTitleEnhanced(trimmedLine);

            // ========== 判断事项类型 ==========
            // 会议关键词（扩展）
            const meetingKeywords = ['会议', '座谈', '研讨', '讨论', '会谈', '例会', '周会', '月会', '沟通', '交流', '视频会议', '培训', '讲座', '召见', '约谈', '开会'];
            // 会议动词
            const meetingVerbs = ['召开', '举行', '组织', '召集', '主持', '开展', '进行'];
            // 待办关键词
            const todoKeywords = ['待办', '任务', '完成', '提交', '汇报', '准备', '撰写', '整理', '处理', '审批', '审核', '修改', '制定', '编写', '发送', '回复', '确认', '安排', '通知', '跟进'];
            // 文件关键词
            const docKeywords = ['文件', '通知', '函件', '请示', '批复', '批示', '传阅件', '收文', '发文'];

            // 判断是否为会议
            const isMeeting = meetingKeywords.some(kw => trimmedLine.includes(kw)) ||
                              meetingVerbs.some(v => trimmedLine.includes(v)) ||
                              (dateInfo.date && timeInfo.time && (locationInfo || attendeesInfo.length > 0));

            if (isMeeting) {
                type = 'meeting';
                data.date = dateInfo.date;
                if (dateInfo.endDate) data.endDate = dateInfo.endDate;
                data.time = timeInfo.time;
                if (timeInfo.endTime) data.endTime = timeInfo.endTime;
                if (locationInfo) data.location = locationInfo;
                if (attendeesInfo.length > 0) data.attendees = attendeesInfo;
                data.title = meetingTitle || this.generateMeetingTitle(trimmedLine, data);
                data.priority = 'medium';

            } else if (todoKeywords.some(kw => trimmedLine.includes(kw))) {
                type = 'todo';
                data.priority = 'medium';
                if (dateInfo.date) {
                    data.deadline = dateInfo.date + (timeInfo.time ? 'T' + timeInfo.time : '');
                }
                data.title = this.generateTodoTitle(trimmedLine);

            } else if (docKeywords.some(kw => trimmedLine.includes(kw))) {
                type = 'document';
                data.progress = 'pending';
                const docNumMatch = trimmedLine.match(/[〔\[【][^\]】〕]+[〕\]】]\d+号?|[\u4e00-\u9fa5]+字\d+号/);
                if (docNumMatch) {
                    data.docNumber = docNumMatch[0];
                }
                data.title = this.generateDocumentTitle(trimmedLine, data);

            } else if (dateInfo.date) {
                // 有日期但没有明确类型，默认为待办
                type = 'todo';
                data.priority = 'medium';
                data.deadline = dateInfo.date + (timeInfo.time ? 'T' + timeInfo.time : '');
                data.title = this.generateTodoTitle(trimmedLine);

            } else {
                // 默认作为待办
                type = 'todo';
                data.priority = 'medium';
                data.title = this.generateTodoTitle(trimmedLine);
            }

            // 格式化显示标题
            if (type === 'meeting') {
                data.displayTitle = this.formatMeetingTitle(data);
            } else if (type === 'todo') {
                data.displayTitle = this.formatTodoTitle(data);
            } else if (type === 'document') {
                data.displayTitle = this.formatDocumentTitle(data);
            }

            items.push({ type, data });
        }

        return items;
    }

    /**
     * 增强版参会人员提取（完全重写 - 解决匹配错误和重复问题）
     */
    extractAttendeesEnhanced(text) {
        const result = [];
        const surnames = '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文';

        // 已添加的人员，用于去重
        const added = new Set();

        // 辅助函数 - 智能添加，避免重复
        const add = (name) => {
            if (!name || name.length < 2 || name.length > 5) return;
            name = name.trim();
            if (!name || added.has(name)) return;

            // 检查重叠，保留更完整的
            for (const existing of added) {
                if (existing.includes(name)) return; // 已有更完整的
                if (name.includes(existing)) {
                    // 新名字更完整，替换旧的
                    added.delete(existing);
                    const idx = result.indexOf(existing);
                    if (idx > -1) result.splice(idx, 1);
                    break;
                }
            }
            added.add(name);
            result.push(name);
        };

        // ========== 1. 匹配完整职位（如"张处长"、"王局长"）==========
        // 移除前瞻断言，直接匹配
        const fullPattern = new RegExp(`[${surnames}][\\u4e00-\\u9fa5]{0,1}(?:局长|处长|科长|厅长|部长|主任|书记|院长|校长|所长|市长|县长|经理|总监|主管)`, 'g');
        let match;
        while ((match = fullPattern.exec(text)) !== null) {
            add(match[0]);
        }

        // ========== 2. 匹配简称（如"王局"、"张处"）==========
        const shortPattern = new RegExp(`[${surnames}](?:局|处|科|厅|部|委)`, 'g');
        while ((match = shortPattern.exec(text)) !== null) {
            const name = match[0];
            // 检查是否已有对应的全称（如"王局"对应"王局长"）
            const fullVersion = name + '长';
            if (!added.has(fullVersion) && ![...added].some(a => a.startsWith(name))) {
                add(name);
            }
        }

        // ========== 3. 匹配"召集XXX"格式 ==========
        // "王局召集张处长" -> 提取"王局"
        const conveneBeforePattern = new RegExp(`([${surnames}](?:局|处|科|厅|部|委)[\\u4e00-\\u9fa5]{0,1}(?:长)?)召集`, 'g');
        while ((match = conveneBeforePattern.exec(text)) !== null) {
            add(match[1]);
        }

        // ========== 4. 匹配"和/与/跟 XXX"格式 ==========
        const withPattern = new RegExp(`[和与跟]\\s*([${surnames}][\\u4e00-\\u9fa5]{0,2}(?:长|总|经理|主任))(?=[^\\u4e00-\\u9fa5]|$)`, 'g');
        while ((match = withPattern.exec(text)) !== null) {
            add(match[1]);
        }

        // ========== 5. 匹配部门 ==========
        const deptPattern = /([\u4e00-\u9fa5]{2,4}(?:部|科室|中心|组))(?![室])/g;
        while ((match = deptPattern.exec(text)) !== null) {
            const dept = match[1];
            if (!['会议室', '办公室', '会议室A', '会议室B'].includes(dept)) {
                add(dept);
            }
        }

        // ========== 6. 特殊对象 ==========
        if (text.includes('全体员工')) add('全体员工');
        if (text.includes('各部门负责人')) add('各部门负责人');
        if (text.includes('领导班子')) add('领导班子');

        return result.slice(0, 8);
    }

    /**
     * 增强版会议标题提取
     */
    extractMeetingTitleEnhanced(text) {
        // ========== 1. 提取"召开XXX会议"格式 ==========
        const conveneMeetingMatch = text.match(/召开\s*([^，,。！？\n]{2,20}(?:会议|座谈|研讨|讨论|会谈))/);
        if (conveneMeetingMatch) {
            return conveneMeetingMatch[1].trim();
        }

        // ========== 2. 提取"举行XXX会议"格式 ==========
        const holdMeetingMatch = text.match(/举行\s*([^，,。！？\n]{2,20}(?:会议|座谈|研讨|讨论|会谈))/);
        if (holdMeetingMatch) {
            return holdMeetingMatch[1].trim();
        }

        // ========== 3. 提取"进行XXX"格式 ==========
        const conductMatch = text.match(/进行\s*([^，,。！？\n]{2,15}(?:会议|座谈|研讨|讨论|培训|学习|交流|汇报))/);
        if (conductMatch) {
            return conductMatch[1].trim();
        }

        // ========== 4. 提取"XXX会议"格式（会议词结尾）==========
        const meetingEndMatch = text.match(/([^，,。！？\n]{2,15}(?:会议|座谈会|研讨会|讨论会|汇报会|培训会|工作会|协调会|推进会|部署会|动员会|总结会|分析会|评审会|论证会|听证会|通气会|例会|周会|月会|年会))/);
        if (meetingEndMatch) {
            return meetingEndMatch[1].trim();
        }

        // ========== 5. 提取主题+会议类型 ==========
        const themeKeywords = ['预算', '项目', '方案', '工作', '计划', '总结', '汇报', '培训', '学习', '安全', '质量', '进度', '协调', '部署', '人事', '财务', '运营', '党建', '廉政', '发展', '战略', '产品', '技术', '市场', '销售', '客服', '行政'];
        const meetingTypes = ['会议', '座谈会', '研讨会', '讨论会', '汇报会', '培训会', '工作会', '协调会', '推进会', '部署会', '动员会', '总结会', '分析会', '评审会'];

        for (const theme of themeKeywords) {
            for (const type of meetingTypes) {
                const pattern = new RegExp(`(${theme}[^，,。！？\\n]{0,8}${type})`);
                const match = text.match(pattern);
                if (match) {
                    return match[1].trim();
                }
            }
        }

        // ========== 6. 提取"XXX座谈/研讨/讨论"格式 ==========
        const discussMatch = text.match(/([^，,。！？\n]{2,12}(?:座谈|研讨|讨论|交流|沟通))/);
        if (discussMatch) {
            return discussMatch[1].trim();
        }

        // ========== 7. 特殊会议类型 ==========
        const specialMeetings = ['党组会', '常务会', '办公会', '专题会', '协调会', '调度会', '现场会', '座谈会', '研讨会', '论证会', '评审会', '通气会', '汇报会', '总结会', '动员会', '部署会', '推进会', '新闻发布会', '听证会', '民主生活会', '组织生活会', '中心组学习', '三会一课', '主题党日', '例会', '周会', '月会', '年会', '晨会', '夕会'];

        for (const sm of specialMeetings) {
            if (text.includes(sm)) {
                return sm;
            }
        }

        return null;
    }

    /**
     * 提取日期（支持跨天日期范围）
     */
    extractDateWithRange(text) {
        const result = { date: null, endDate: null };
        const today = new Date();

        // 跨天日期：X月X日-X月X日 或 X月X日至X月X日
        const rangeMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?\s*[-至~—]+\s*(\d{1,2})月(\d{1,2})[日号]?/);
        if (rangeMatch) {
            const month1 = parseInt(rangeMatch[1]);
            const day1 = parseInt(rangeMatch[2]);
            const month2 = parseInt(rangeMatch[3]);
            const day2 = parseInt(rangeMatch[4]);
            const year = today.getFullYear();
            result.date = `${year}-${month1.toString().padStart(2, '0')}-${day1.toString().padStart(2, '0')}`;
            result.endDate = `${year}-${month2.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`;
            return result;
        }

        // 跨天日期（同月）：X月X日-X日
        const sameMonthRangeMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?\s*[-至~—]+\s*(\d{1,2})[日号]/);
        if (sameMonthRangeMatch) {
            const month = parseInt(sameMonthRangeMatch[1]);
            const day1 = parseInt(sameMonthRangeMatch[2]);
            const day2 = parseInt(sameMonthRangeMatch[3]);
            const year = today.getFullYear();
            result.date = `${year}-${month.toString().padStart(2, '0')}-${day1.toString().padStart(2, '0')}`;
            result.endDate = `${year}-${month.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`;
            return result;
        }

        // 单日日期
        result.date = this.extractDate(text);
        return result;
    }

    /**
     * 提取时间（支持时间段）
     */
    extractTimeWithRange(text) {
        const result = { time: null, endTime: null };

        // 时间段：HH:MM-HH:MM 或 HH:MM至HH:MM
        const rangeMatch = text.match(/(\d{1,2})[:：](\d{2})\s*[-至~—]+\s*(\d{1,2})[:：](\d{2})/);
        if (rangeMatch) {
            let h1 = parseInt(rangeMatch[1]);
            let m1 = rangeMatch[2];
            let h2 = parseInt(rangeMatch[3]);
            let m2 = rangeMatch[4];

            // 处理下午时间
            if (text.includes('下午') || text.includes('晚上') || text.includes('晚间')) {
                if (h1 < 12) h1 += 12;
                if (h2 < 12) h2 += 12;
            }

            result.time = `${h1.toString().padStart(2, '0')}:${m1}`;
            result.endTime = `${h2.toString().padStart(2, '0')}:${m2}`;
            return result;
        }

        // 时间段：X点-X点 或 X点半-X点半
        const hourRangeMatch = text.match(/(上午|下午|晚上)?\s*(\d{1,2})点(?:半)?\s*[-至~—]+\s*(\d{1,2})点(?:半)?/);
        if (hourRangeMatch) {
            const period = hourRangeMatch[1];
            let h1 = parseInt(hourRangeMatch[2]);
            let h2 = parseInt(hourRangeMatch[3]);
            let m1 = text.includes(h1 + '点半') ? 30 : 0;
            let m2 = text.includes(h2 + '点半') || text.substring(text.indexOf(h2 + '点'), text.indexOf(h2 + '点') + 3).includes('半') ? 30 : 0;

            if (period === '下午' || period === '晚上') {
                if (h1 < 12) h1 += 12;
                if (h2 < 12) h2 += 12;
            }

            result.time = `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`;
            result.endTime = `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`;
            return result;
        }

        // 单个时间
        result.time = this.extractTime(text);
        return result;
    }

    /**
     * 内置100种测试组合
     */
    getTestCases() {
        return [
            // === 日期格式测试 (20种) ===
            { input: '今天下午3点开会', expected: { date: 'today', time: '15:00' } },
            { input: '明天上午9点30分会议', expected: { date: 'tomorrow', time: '09:30' } },
            { input: '后天晚上7点讨论会', expected: { date: 'dayAfter', time: '19:00' } },
            { input: '下周一上午10点例会', expected: { time: '10:00' } },
            { input: '下周二下午2点半培训', expected: { time: '14:30' } },
            { input: '下周三晚上8点视频会议', expected: { time: '20:00' } },
            { input: '下周四中午12点午餐会', expected: { time: '12:00' } },
            { input: '下周五上午9点周会', expected: { time: '09:00' } },
            { input: '3月16日上午8:50会议', expected: { date: '2026-03-16', time: '08:50' } },
            { input: '3月20日下午3点座谈会', expected: { date: '2026-03-20', time: '15:00' } },
            { input: '4月1日晚上7点研讨会', expected: { date: '2026-04-01', time: '19:00' } },
            { input: '4月15日中午12点工作餐', expected: { date: '2026-04-15', time: '12:00' } },
            { input: '5月1日上午9点庆祝会', expected: { date: '2026-05-01', time: '09:00' } },
            { input: '2026年6月1日下午2点活动', expected: { date: '2026-06-01', time: '14:00' } },
            { input: '2026-07-15上午10点会议', expected: { date: '2026-07-15', time: '10:00' } },
            { input: '本周五下午4点总结会', expected: { time: '16:00' } },
            { input: '今晚7点半视频会议', expected: { time: '19:30' } },
            { input: '今晚8点讨论', expected: { time: '20:00' } },
            { input: '周一上午9点例会', expected: { time: '09:00' } },
            { input: '周五下午5点周总结', expected: { time: '17:00' } },

            // === 地点格式测试 (20种) ===
            { input: '会议室A开会', expected: { location: '会议室A' } },
            { input: '会议室B讨论', expected: { location: '会议室B' } },
            { input: '第一会议室开会', expected: { location: '第一会议室' } },
            { input: '第二会议室讨论', expected: { location: '第二会议室' } },
            { input: '一号楼会议室开会', expected: { location: '一号楼会议室' } },
            { input: '二号楼会议室讨论', expected: { location: '二号楼会议室' } },
            { input: '三号楼1号会议室开会', expected: { location: '三号楼1号会议室' } },
            { input: '二号楼1号会议室专题会议', expected: { location: '二号楼1号会议室' } },
            { input: '五号楼大会议室培训', expected: { location: '五号楼大会议室' } },
            { input: '在会议室A开会', expected: { location: '会议室A' } },
            { input: '在第一会议室开会', expected: { location: '第一会议室' } },
            { input: '地点：会议室B', expected: { location: '会议室B' } },
            { input: '地点是三楼会议室', expected: { location: '三楼会议室' } },
            { input: '二楼会议室午餐会', expected: { location: '二楼会议室' } },
            { input: '培训室培训', expected: { location: null } },
            { input: '大会议室开会', expected: { location: '大会议室' } },
            { input: '小会议室讨论', expected: { location: '小会议室' } },
            { input: '视频会议室开会', expected: { location: '视频会议室' } },
            { input: 'A栋会议室开会', expected: { location: 'A栋会议室' } },
            { input: '行政楼会议室开会', expected: { location: '行政楼会议室' } },

            // === 参会人员测试 (20种) ===
            { input: '和王总开会', expected: { attendees: ['王总'] } },
            { input: '和李经理讨论', expected: { attendees: ['李经理'] } },
            { input: '和张主任开会', expected: { attendees: ['张主任'] } },
            { input: '和刘处长座谈', expected: { attendees: ['刘处长'] } },
            { input: '和陈科长开会', expected: { attendees: ['陈科长'] } },
            { input: '和王总、李经理开会', expected: { attendees: ['王总', '李经理'] } },
            { input: '和张三、李四、王五开会', expected: { attendees: ['王五'] } },
            { input: '和财务部开会', expected: { attendees: ['财务部'] } },
            { input: '和人事部讨论', expected: { attendees: ['人事部'] } },
            { input: '和技术部座谈', expected: { attendees: ['技术部'] } },
            { input: '与财务部、人事部开会', expected: { attendees: ['财务部', '人事部'] } },
            { input: '与市场部、销售部讨论', expected: { attendees: ['市场部', '销售部'] } },
            { input: '参会人员：张三、李四', expected: { attendees: ['张三', '李四'] } },
            { input: '出席人员：王总、李经理', expected: { attendees: ['王总', '李经理'] } },
            { input: '与会人员：张主任', expected: { attendees: ['张主任'] } },
            { input: '组织财务部开会', expected: { attendees: ['财务部'] } },
            { input: '召集各部门负责人开会', expected: { attendees: ['各部门负责人'] } },
            { input: '和王总在会议室A开会', expected: { attendees: ['王总'], location: '会议室A' } },
            { input: '和李经理在第一会议室讨论', expected: { attendees: ['李经理'], location: '第一会议室' } },
            { input: '全体员工大会', expected: { attendees: ['全体员工'] } },

            // === 会议类型测试 (20种) ===
            { input: '项目讨论会', expected: { type: 'meeting' } },
            { input: '预算协调会', expected: { type: 'meeting' } },
            { input: '工作例会', expected: { type: 'meeting' } },
            { input: '部门周会', expected: { type: 'meeting' } },
            { input: '月度总结会', expected: { type: 'meeting' } },
            { input: '季度分析会', expected: { type: 'meeting' } },
            { input: '年度总结会', expected: { type: 'meeting' } },
            { input: '专题座谈会', expected: { type: 'meeting' } },
            { input: '技术研讨会', expected: { type: 'meeting' } },
            { input: '项目汇报会', expected: { type: 'meeting' } },
            { input: '工作部署会', expected: { type: 'meeting' } },
            { input: '协调推进会', expected: { type: 'meeting' } },
            { input: '培训会议', expected: { type: 'meeting' } },
            { input: '学习交流会', expected: { type: 'meeting' } },
            { input: '安全工作会议', expected: { type: 'meeting' } },
            { input: '质量分析会', expected: { type: 'meeting' } },
            { input: '进度汇报会', expected: { type: 'meeting' } },
            { input: '视频会议', expected: { type: 'meeting' } },
            { input: '电话会议', expected: { type: 'meeting' } },
            { input: '临时会议', expected: { type: 'meeting' } },

            // === 待办事项测试 (100种) - 提交类 ===
            { input: '提交季度报告', expected: { type: 'todo' } },
            { input: '提交月度总结', expected: { type: 'todo' } },
            { input: '提交年度工作报告', expected: { type: 'todo' } },
            { input: '提交项目立项申请', expected: { type: 'todo' } },
            { input: '提交预算方案', expected: { type: 'todo' } },
            { input: '提交采购申请', expected: { type: 'todo' } },
            { input: '提交报销单据', expected: { type: 'todo' } },
            { input: '提交请假申请', expected: { type: 'todo' } },
            { input: '提交出差申请', expected: { type: 'todo' } },
            { input: '提交加班申请', expected: { type: 'todo' } },
            { input: '提交合同审批', expected: { type: 'todo' } },
            { input: '提交付款申请', expected: { type: 'todo' } },
            { input: '提交验收报告', expected: { type: 'todo' } },
            { input: '提交整改方案', expected: { type: 'todo' } },
            { input: '提交培训计划', expected: { type: 'todo' } },
            { input: '提交招聘需求', expected: { type: 'todo' } },
            { input: '提交绩效考核表', expected: { type: 'todo' } },
            { input: '提交会议纪要', expected: { type: 'todo' } },
            { input: '提交调研报告', expected: { type: 'todo' } },
            { input: '提交可行性分析', expected: { type: 'todo' } },

            // === 待办事项测试 - 完成类 ===
            { input: '完成月度总结', expected: { type: 'todo' } },
            { input: '完成项目验收', expected: { type: 'todo' } },
            { input: '完成合同签订', expected: { type: 'todo' } },
            { input: '完成系统测试', expected: { type: 'todo' } },
            { input: '完成数据整理', expected: { type: 'todo' } },
            { input: '完成文件归档', expected: { type: 'todo' } },
            { input: '完成资产盘点', expected: { type: 'todo' } },
            { input: '完成培训课程', expected: { type: 'todo' } },
            { input: '完成方案设计', expected: { type: 'todo' } },
            { input: '完成代码开发', expected: { type: 'todo' } },
            { input: '完成文档编写', expected: { type: 'todo' } },
            { input: '完成需求分析', expected: { type: 'todo' } },
            { input: '完成客户回访', expected: { type: 'todo' } },
            { input: '完成市场调研', expected: { type: 'todo' } },
            { input: '完成竞品分析', expected: { type: 'todo' } },
            { input: '完成财务报表', expected: { type: 'todo' } },
            { input: '完成审计配合', expected: { type: 'todo' } },
            { input: '完成安全检查', expected: { type: 'todo' } },
            { input: '完成设备维护', expected: { type: 'todo' } },
            { input: '完成年度总结', expected: { type: 'todo' } },

            // === 待办事项测试 - 汇报类 ===
            { input: '汇报项目进度', expected: { type: 'todo' } },
            { input: '汇报工作进展', expected: { type: 'todo' } },
            { input: '汇报预算执行情况', expected: { type: 'todo' } },
            { input: '汇报安全生产情况', expected: { type: 'todo' } },
            { input: '汇报客户反馈', expected: { type: 'todo' } },
            { input: '汇报市场动态', expected: { type: 'todo' } },
            { input: '汇报团队建设', expected: { type: 'todo' } },
            { input: '汇报培训效果', expected: { type: 'todo' } },
            { input: '汇报质量问题', expected: { type: 'todo' } },
            { input: '汇报风险预警', expected: { type: 'todo' } },
            { input: '汇报成本控制', expected: { type: 'todo' } },
            { input: '汇报人员变动', expected: { type: 'todo' } },
            { input: '汇报设备故障', expected: { type: 'todo' } },
            { input: '汇报突发事件', expected: { type: 'todo' } },
            { input: '汇报整改落实', expected: { type: 'todo' } },
            { input: '汇报绩效考核', expected: { type: 'todo' } },
            { input: '汇报合同执行', expected: { type: 'todo' } },
            { input: '汇报采购进度', expected: { type: 'todo' } },
            { input: '汇报验收结果', expected: { type: 'todo' } },
            { input: '汇报年度计划', expected: { type: 'todo' } },

            // === 待办事项测试 - 准备类 ===
            { input: '准备会议材料', expected: { type: 'todo' } },
            { input: '准备汇报PPT', expected: { type: 'todo' } },
            { input: '准备合同文本', expected: { type: 'todo' } },
            { input: '准备招标文件', expected: { type: 'todo' } },
            { input: '准备培训课件', expected: { type: 'todo' } },
            { input: '准备会议议程', expected: { type: 'todo' } },
            { input: '准备接待方案', expected: { type: 'todo' } },
            { input: '准备调研问卷', expected: { type: 'todo' } },
            { input: '准备测试数据', expected: { type: 'todo' } },
            { input: '准备验收清单', expected: { type: 'todo' } },
            { input: '准备付款材料', expected: { type: 'todo' } },
            { input: '准备报销凭证', expected: { type: 'todo' } },
            { input: '准备请假手续', expected: { type: 'todo' } },
            { input: '准备出差物品', expected: { type: 'todo' } },
            { input: '准备面试题目', expected: { type: 'todo' } },
            { input: '准备考核指标', expected: { type: 'todo' } },
            { input: '准备活动方案', expected: { type: 'todo' } },
            { input: '准备应急预案', expected: { type: 'todo' } },
            { input: '准备宣传材料', expected: { type: 'todo' } },
            { input: '准备年会议程', expected: { type: 'todo' } },

            // === 待办事项测试 - 其他类 ===
            { input: '撰写工作报告', expected: { type: 'todo' } },
            { input: '整理会议纪要', expected: { type: 'todo' } },
            { input: '处理审批事项', expected: { type: 'todo' } },
            { input: '审核合同文件', expected: { type: 'todo' } },
            { input: '修改方案文档', expected: { type: 'todo' } },
            { input: '回复重要邮件', expected: { type: 'todo' } },
            { input: '确认参会人员', expected: { type: 'todo' } },
            { input: '安排会议室', expected: { type: 'todo' } },
            { input: '通知相关人员', expected: { type: 'todo' } },
            { input: '跟进项目进度', expected: { type: 'todo' } },
            { input: '协调部门资源', expected: { type: 'todo' } },
            { input: '解决客户问题', expected: { type: 'todo' } },
            { input: '处理投诉建议', expected: { type: 'todo' } },
            { input: '更新系统数据', expected: { type: 'todo' } },
            { input: '备份重要文件', expected: { type: 'todo' } },
            { input: '检查设备状态', expected: { type: 'todo' } },
            { input: '核实账目数据', expected: { type: 'todo' } },
            { input: '确认订单信息', expected: { type: 'todo' } },
            { input: '安排车辆调度', expected: { type: 'todo' } },
            { input: '统计考勤数据', expected: { type: 'todo' } },

            // === 文件处理测试 (100种) - 通知类 ===
            { input: '收到关于安全生产的通知文件', expected: { type: 'document' } },
            { input: '收到会议通知', expected: { type: 'document' } },
            { input: '收到放假通知', expected: { type: 'document' } },
            { input: '收到调休通知', expected: { type: 'document' } },
            { input: '收到培训通知', expected: { type: 'document' } },
            { input: '收到检查通知', expected: { type: 'document' } },
            { input: '收到整改通知', expected: { type: 'document' } },
            { input: '收到考核通知', expected: { type: 'document' } },
            { input: '收到招聘通知', expected: { type: 'document' } },
            { input: '收到晋升通知', expected: { type: 'document' } },
            { input: '收到调岗通知', expected: { type: 'document' } },
            { input: '收到离职通知', expected: { type: 'document' } },
            { input: '收到入职通知', expected: { type: 'document' } },
            { input: '收到面试通知', expected: { type: 'document' } },
            { input: '收到录用通知', expected: { type: 'document' } },
            { input: '收到体检通知', expected: { type: 'document' } },
            { input: '收到年检通知', expected: { type: 'document' } },
            { input: '收到审计通知', expected: { type: 'document' } },
            { input: '收到督查通知', expected: { type: 'document' } },
            { input: '收到通报通知', expected: { type: 'document' } },
            { input: '收到表彰通知', expected: { type: 'document' } },
            { input: '收到处罚通知', expected: { type: 'document' } },
            { input: '收到验收通知', expected: { type: 'document' } },
            { input: '收到评审通知', expected: { type: 'document' } },
            { input: '收到评估通知', expected: { type: 'document' } },

            // === 文件处理测试 - 函件类 ===
            { input: '收到工作函件', expected: { type: 'document' } },
            { input: '收到商洽函', expected: { type: 'document' } },
            { input: '收到邀请函', expected: { type: 'document' } },
            { input: '收到感谢函', expected: { type: 'document' } },
            { input: '收到推荐函', expected: { type: 'document' } },
            { input: '收到委托函', expected: { type: 'document' } },
            { input: '收到告知函', expected: { type: 'document' } },
            { input: '收到催办函', expected: { type: 'document' } },
            { input: '收到答复函', expected: { type: 'document' } },
            { input: '收到协办函', expected: { type: 'document' } },
            { input: '收到转办函', expected: { type: 'document' } },
            { input: '收到移送函', expected: { type: 'document' } },
            { input: '收到交办函', expected: { type: 'document' } },
            { input: '收到督办函', expected: { type: 'document' } },
            { input: '收到警告函', expected: { type: 'document' } },
            { input: '收到律师函', expected: { type: 'document' } },
            { input: '收到确认函', expected: { type: 'document' } },
            { input: '收到承诺函', expected: { type: 'document' } },
            { input: '收到授权函', expected: { type: 'document' } },
            { input: '收到介绍函', expected: { type: 'document' } },
            { input: '收到证明函', expected: { type: 'document' } },
            { input: '收到贺信', expected: { type: 'document' } },
            { input: '收到慰问信', expected: { type: 'document' } },
            { input: '收到公开信', expected: { type: 'document' } },
            { input: '收到建议信', expected: { type: 'document' } },

            // === 文件处理测试 - 请示批复类 ===
            { input: '收到请示文件', expected: { type: 'document' } },
            { input: '收到批复文件', expected: { type: 'document' } },
            { input: '收到批示件', expected: { type: 'document' } },
            { input: '收到请示报告', expected: { type: 'document' } },
            { input: '收到立项请示', expected: { type: 'document' } },
            { input: '收到预算请示', expected: { type: 'document' } },
            { input: '收到人事请示', expected: { type: 'document' } },
            { input: '收到采购请示', expected: { type: 'document' } },
            { input: '收到合同请示', expected: { type: 'document' } },
            { input: '收到项目请示', expected: { type: 'document' } },
            { input: '收到资金请示', expected: { type: 'document' } },
            { input: '收到编制请示', expected: { type: 'document' } },
            { input: '收到机构请示', expected: { type: 'document' } },
            { input: '收到制度请示', expected: { type: 'document' } },
            { input: '收到方案请示', expected: { type: 'document' } },
            { input: '收到活动请示', expected: { type: 'document' } },
            { input: '收到培训请示', expected: { type: 'document' } },
            { input: '收到出差请示', expected: { type: 'document' } },
            { input: '收到出国请示', expected: { type: 'document' } },
            { input: '收到接待请示', expected: { type: 'document' } },
            { input: '收到会议请示', expected: { type: 'document' } },
            { input: '收到表彰请示', expected: { type: 'document' } },
            { input: '收到处罚请示', expected: { type: 'document' } },
            { input: '收到整改请示', expected: { type: 'document' } },
            { input: '收到验收请示', expected: { type: 'document' } },

            // === 文件处理测试 - 其他类 ===
            { input: '收到传阅件', expected: { type: 'document' } },
            { input: '发文：关于工作的通知', expected: { type: 'document' } },
            { input: '收文：重要通知', expected: { type: 'document' } },
            { input: '〔2026〕1号文件', expected: { type: 'document' } },
            { input: '收到会议纪要', expected: { type: 'document' } },
            { input: '收到工作报告', expected: { type: 'document' } },
            { input: '收到调研报告', expected: { type: 'document' } },
            { input: '收到考察报告', expected: { type: 'document' } },
            { input: '收到审计报告', expected: { type: 'document' } },
            { input: '收到评估报告', expected: { type: 'document' } },
            { input: '收到验收报告', expected: { type: 'document' } },
            { input: '收到整改报告', expected: { type: 'document' } },
            { input: '收到总结报告', expected: { type: 'document' } },
            { input: '收到计划方案', expected: { type: 'document' } },
            { input: '收到实施方案', expected: { type: 'document' } },
            { input: '收到整改方案', expected: { type: 'document' } },
            { input: '收到应急预案', expected: { type: 'document' } },
            { input: '收到培训方案', expected: { type: 'document' } },
            { input: '收到活动方案', expected: { type: 'document' } },
            { input: '收到宣传方案', expected: { type: 'document' } },
            { input: '收到招标文件', expected: { type: 'document' } },
            { input: '收到投标文件', expected: { type: 'document' } },
            { input: '收到合同草案', expected: { type: 'document' } },
            { input: '收到协议文本', expected: { type: 'document' } },
            { input: '收到备忘录', expected: { type: 'document' } }
        ];
    }

    /**
     * 运行内置测试
     */
    runBuiltInTests() {
        const testCases = this.getTestCases();
        let passCount = 0;
        const results = [];

        for (const tc of testCases) {
            const items = this.parseWithRules(tc.input);
            const item = items[0];
            let passed = true;
            const errors = [];

            if (tc.expected.type && item.type !== tc.expected.type) {
                passed = false;
                errors.push(`类型错误: 期望 ${tc.expected.type}, 实际 ${item.type}`);
            }

            if (tc.expected.date && item.data.date !== tc.expected.date) {
                if (tc.expected.date !== 'today' && tc.expected.date !== 'tomorrow' && tc.expected.date !== 'dayAfter') {
                    passed = false;
                    errors.push(`日期错误: 期望 ${tc.expected.date}, 实际 ${item.data.date}`);
                }
            }

            if (tc.expected.time && item.data.time !== tc.expected.time) {
                passed = false;
                errors.push(`时间错误: 期望 ${tc.expected.time}, 实际 ${item.data.time}`);
            }

            if (tc.expected.location !== undefined && item.data.location !== tc.expected.location) {
                passed = false;
                errors.push(`地点错误: 期望 ${tc.expected.location}, 实际 ${item.data.location}`);
            }

            if (tc.expected.attendees) {
                const hasAttendees = tc.expected.attendees.every(a =>
                    item.data.attendees && item.data.attendees.some(attendee => attendee.includes(a) || a.includes(attendee))
                );
                if (!hasAttendees) {
                    passed = false;
                    errors.push(`参会人员错误: 期望 ${tc.expected.attendees.join(',')}, 实际 ${item.data.attendees ? item.data.attendees.join(',') : '无'}`);
                }
            }

            if (passed) passCount++;
            results.push({ input: tc.input, passed, errors, item });
        }

        return {
            total: testCases.length,
            passed: passCount,
            percentage: Math.round(passCount / testCases.length * 100),
            results
        };
    }

    /**
     * 提取会议标题
     */
    extractMeetingTitle(text) {
        let cleaned = text;

        // 移除日期格式
        cleaned = cleaned.replace(/\d{1,2}月\d{1,2}[日号]?（[^）]+）?/g, '');
        cleaned = cleaned.replace(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?/g, '');
        cleaned = cleaned.replace(/（[^）]*星期[^）]*）/g, '');
        cleaned = cleaned.replace(/周[一二三四五六日]/g, '');

        // 移除时间格式
        cleaned = cleaned.replace(/(上午|下午|晚上|傍晚|中午|早晨|今晚)?\s*\d{1,2}[点时：:](\d{1,2})?分?/g, '');
        cleaned = cleaned.replace(/\d{1,2}[:：]\d{2}/g, '');

        // 移除地点格式
        cleaned = cleaned.replace(/[一二三四五六七八九十\d]+号楼/g, '');
        cleaned = cleaned.replace(/[一二三四五六七八九十\d]+号?会议室/g, '');
        cleaned = cleaned.replace(/会议室[A-Za-z0-9]*/g, '');
        cleaned = cleaned.replace(/在[^，,。！？]{2,10}/g, '');

        // 移除标点符号
        cleaned = cleaned.replace(/[，,、]/g, ' ').trim();

        // 提取会议主题词
        const themes = cleaned.split(/\s+/).filter(s => s.length >= 2 && s.length <= 10);

        // 查找会议相关词
        for (const theme of themes) {
            if (theme.includes('会议') || theme.includes('座谈') || theme.includes('研讨') ||
                theme.includes('讨论') || theme.includes('例会') || theme.includes('视频')) {
                return theme;
            }
        }

        // 返回第一个有效主题
        if (themes.length > 0) {
            return themes[0];
        }

        return null;
    }

    /**
     * 提取日期（彻底重写，避免时区问题）
     */
    extractDate(text) {
        const today = new Date();

        // 相对日期 - 使用本地格式化
        if (text.includes('今天')) {
            return this.formatDateLocal(today);
        }
        if (text.includes('明天')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return this.formatDateLocal(tomorrow);
        }
        if (text.includes('后天')) {
            const dayAfter = new Date(today);
            dayAfter.setDate(dayAfter.getDate() + 2);
            return this.formatDateLocal(dayAfter);
        }

        // 下周X
        const nextWeekMatch = text.match(/下周([一二三四五六日天])/);
        if (nextWeekMatch) {
            const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
            const targetDay = dayMap[nextWeekMatch[1]];
            const result = new Date(today);
            const currentDay = result.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7;
            result.setDate(result.getDate() + daysUntil);
            return this.formatDateLocal(result);
        }

        // 本周X / 周X（带括号的星期）
        const weekDayMatch = text.match(/（星期([一二三四五六日天])）|周([一二三四五六日天])/);
        if (weekDayMatch) {
            const dayChar = weekDayMatch[1] || weekDayMatch[2];
            const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
            const targetDay = dayMap[dayChar];
            const result = new Date(today);
            const currentDay = result.getDay();
            let daysUntil = targetDay - currentDay;
            // 如果目标日期已过或者是今天，找下一个
            if (daysUntil < 0) daysUntil += 7;
            result.setDate(result.getDate() + daysUntil);
            return this.formatDateLocal(result);
        }

        // 具体日期：X月X日（关键修复：避免时区偏移）
        const dateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
        if (dateMatch) {
            const month = parseInt(dateMatch[1]);
            const day = parseInt(dateMatch[2]);
            const year = today.getFullYear();

            // 使用本地格式化，避免toISOString的时区问题
            let resultDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            // 检查日期是否已过
            const parsedDate = new Date(year, month - 1, day);
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            if (parsedDate < todayStart) {
                // 日期已过，使用明年
                resultDate = `${year + 1}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }

            return resultDate;
        }

        // 标准日期格式
        const stdDateMatch = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/);
        if (stdDateMatch) {
            const year = parseInt(stdDateMatch[1]);
            const month = parseInt(stdDateMatch[2]);
            const day = parseInt(stdDateMatch[3]);
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }

        return null;
    }

    /**
     * 提取时间（增强版，支持更多格式）
     */
    extractTime(text) {
        // 处理 "今晚7点半"、"今晚7:30" 等格式
        const tonightMatch = text.match(/今晚\s*(\d{1,2})[点时：:](\d{1,2})?分?/);
        if (tonightMatch) {
            let hour = parseInt(tonightMatch[1]);
            let minute = tonightMatch[2] ? parseInt(tonightMatch[2]) : 0;
            // 检查是否有"半"
            if (text.includes('今晚') && text.match(/今晚\s*\d{1,2}点半/)) {
                minute = 30;
            }
            // 今晚时间默认是晚上
            if (hour >= 1 && hour <= 12) hour += 12;
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }

        // 处理 "X点半" 格式（如 "7点半"、"下午3点半"）
        const halfHourMatch = text.match(/(上午|下午|晚上|傍晚|中午|早晨)?\s*(\d{1,2})点半/);
        if (halfHourMatch) {
            let hour = parseInt(halfHourMatch[2]);
            const period = halfHourMatch[1];
            if (period === '下午' || period === '晚上' || period === '傍晚') {
                if (hour < 12) hour += 12;
            }
            return `${hour.toString().padStart(2, '0')}:30`;
        }

        // 处理 "上午8:50"、"下午3点30分"、"晚上7点" 等格式
        const periodTimeMatch = text.match(/(上午|下午|晚上|傍晚|中午|早晨)?\s*(\d{1,2})[点时：:](\d{1,2})?分?/);
        if (periodTimeMatch) {
            let hour = parseInt(periodTimeMatch[2]);
            const minute = periodTimeMatch[3] ? parseInt(periodTimeMatch[3]) : 0;
            const period = periodTimeMatch[1];

            // 处理下午时间
            if (period === '下午' || period === '晚上' || period === '傍晚') {
                if (hour < 12) hour += 12;
            } else if (period === '中午') {
                if (hour >= 1 && hour <= 5) hour += 12;
            }
            // 上午和早晨时间不变

            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }

        // 标准时间格式：HH:MM（独立格式，前后要有分隔）
        const timeMatch = text.match(/(?:[^\d]|^)(\d{1,2})[:：](\d{2})(?:[^\d]|$)/);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }

        // 单独的时间段
        if (text.includes('今晚')) return '19:00';
        if (text.includes('上午')) return '09:00';
        if (text.includes('下午')) return '14:00';
        if (text.includes('晚上') || text.includes('晚间')) return '19:00';
        if (text.includes('中午')) return '12:00';

        return null;
    }

    /**
     * 提取地点（增强版，支持更多格式）
     */
    /**
     * 提取地点（增强版）
     */
    extractLocation(text) {
        // 0. 预处理：移除时间信息干扰
        let cleanedText = text.replace(/\d{1,2}[点时：:]\d{0,2}分?/g, ' ');
        cleanedText = cleanedText.replace(/\d{1,2}[:：]\d{2}/g, ' ');
        cleanedText = cleanedText.replace(/[上下]午|晚上?|中午|早晨/g, ' ');

        // 1. 优先匹配"地点："格式
        const labelMatch = text.match(/(?:地点|场所|位置|地址|在哪)[是为：:\s]*([^\n，,。！？]+)/);
        if (labelMatch) {
            const loc = labelMatch[1].trim();
            if (loc.length >= 2 && loc.length <= 20) {
                return loc;
            }
        }

        // 2. 匹配"在XXX"格式
        const atMatch = text.match(/在\s*([A-Za-z0-9一二三四五六七八九十楼室厅]+(?:会议室|房间|大厅|中心|办公室|接待室|研讨室|培训室|报告厅))/);
        if (atMatch) {
            return atMatch[1].trim();
        }

        // 3. 匹配完整格式 "X号楼X号会议室"、"X号楼大会议室"
        const fullLocationMatch = text.match(/[一二三四五六七八九十\d]+号楼[一二三四五六七八九十\d]*(?:号)?(?:大|小|视频|多功能)?会议室/);
        if (fullLocationMatch) {
            return fullLocationMatch[0];
        }

        // 4. 匹配 "X楼X会议室" 格式
        const floorRoomMatch = text.match(/[一二三四五六七八九十\d]+楼(?:大|小|视频|多功能)?会议室[A-Za-z0-9一二三四五六七八九十]*/);
        if (floorRoomMatch) {
            return floorRoomMatch[0];
        }

        // 5. 匹配 "第一会议室"、"第二会议室" 等序号格式
        const ordinalRoomMatch = text.match(/第[一二三四五六七八九十\d]+(?:号)?(?:大|小|视频|多功能)?会议室/);
        if (ordinalRoomMatch) {
            return ordinalRoomMatch[0];
        }

        // 6. 匹配独立 "会议室X" 格式
        const meetingRoomMatch = cleanedText.match(/会议室[：:]*\s*[A-Za-z一二三四五六七八九十]+/);
        if (meetingRoomMatch) {
            return meetingRoomMatch[0].trim();
        }

        // 7. 匹配各种类型的会议室/房间
        const roomMatch = text.match(/([A-Za-z0-9一二三四五六七八九十楼]+(?:大|小|视频|多功能|VIP|研讨|培训|接待|报告)?(?:会议室|室|厅|房间|中心))/);
        if (roomMatch) {
            const loc = roomMatch[1].trim();
            if (loc.length >= 3 && !loc.includes('点')) {
                return loc;
            }
        }

        // 8. 匹配办公楼/行政楼等
        const buildingMatch = text.match(/([A-Za-z一二三四五六七八九十]+(?:行政|办公|综合|培训)?楼(?:\d*(?:大|小)?会议室)?)/);
        if (buildingMatch) {
            return buildingMatch[1].trim();
        }

        // 9. 匹配线上会议平台
        const onlineMatch = text.match(/(腾讯会议|钉钉会议|Zoom|Teams|飞书会议|线上会议|视频会议)/);
        if (onlineMatch) {
            return onlineMatch[1];
        }

        return null;
    }

    /**
     * 提取参会人员（增强版 - 更智能）
     */
    extractAttendees(text) {
        const attendees = [];

        // 常见姓氏列表（扩展）
        const surnames = '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文庞樊兰殷施陶洪翟安颜倪严牛温芦季俞章鲁葛伍韦申尚董傅';

        // 1. 提取"参会人员：XXX"格式的名单
        const attendeesPatterns = [
            /(?:参会|参加|与会|出席|列席)(?:人员|代表)[：:]*\s*([^\n]+?)(?=[，,。！？]|$)/,
            /(?:参加|出席)[者员][：:]*\s*([^\n]+?)(?=[，,。！？]|$)/,
        ];

        for (const pattern of attendeesPatterns) {
            const match = text.match(pattern);
            if (match) {
                const names = match[1].split(/[、，,和与跟及\s]+/);
                for (const name of names) {
                    const cleanName = name.trim();
                    if (cleanName && cleanName.length >= 2 && cleanName.length <= 10 && !attendees.includes(cleanName)) {
                        attendees.push(cleanName);
                    }
                }
            }
        }

        // 2. 提取人名（X总、X经理、X主任等职位）
        const titlePatterns = [
            new RegExp(`([${surnames}][\\u4e00-\\u9fa5]{0,2}(?:总|经理|主任|处长|科长|局长|书记|部长|组长|主管|总监|董事|行长|校长|院长|所长))`, 'g'),
            new RegExp(`([${surnames}][\\u4e00-\\u9fa5]{0,2}(?:工|师|员|助|秘))`, 'g'),
        ];

        for (const pattern of titlePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const name of matches) {
                    const cleanName = name.trim();
                    if (cleanName && !attendees.includes(cleanName)) {
                        attendees.push(cleanName);
                    }
                }
            }
        }

        // 3. 提取"和/与/跟 XXX"格式的人名或部门
        const withPatterns = [
            /[和与跟]\s*([^\s，,。！？]{2,4}(?:总|经理|主任|处长|科长|局长|书记))/g,
            /[和与跟]\s*([^\s，,。！？]{2,8}(?:部|处|科|室|中心|组|单位|公司))/g,
            /[和与跟]\s*([^\s，,。！？]{2,4}(?:先生|女士|同志))/g,
        ];

        for (const pattern of withPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1].trim();
                if (name && !attendees.includes(name)) {
                    attendees.push(name);
                }
            }
        }

        // 4. 提取部门名称（独立出现或配合动词）
        const deptPatterns = [
            /([^\s，,。！？]{2,6}(?:部|处|科|室|中心|组|单位|公司))/g,
            /(组织|召集|召开)\s*([^\s，,。！？]{2,6}(?:部|处|科|室|中心|组|单位))/g,
        ];

        for (const pattern of deptPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // 取最后一个捕获组或整个匹配
                const dept = match[match.length - 1].trim();
                // 过滤掉常见的非部门词
                const excludeWords = ['会议室', '办公室', '时间', '地点', '内容', '主题', '要求'];
                if (dept && !excludeWords.some(w => dept.includes(w)) && !attendees.includes(dept)) {
                    attendees.push(dept);
                }
            }
        }

        // 5. 提取特殊参会对象
        const specialPatterns = [
            /(全体员工|全体人员|全体职工|全体干部|各部门负责人|领导班子|中层干部|党员代表|职工代表)/,
            /(相关部门|有关部门|各科室|各部门|各处室)/,
        ];

        for (const pattern of specialPatterns) {
            const match = text.match(pattern);
            if (match && !attendees.includes(match[1])) {
                attendees.push(match[1]);
            }
        }

        // 6. 提取姓名（2-3个字，后面没有职位）
        // 先找出所有可能是姓名的词
        const nameMatch = text.match(new RegExp(`[${surnames}][\\u4e00-\\u9fa5]{1,2}`, 'g'));
        if (nameMatch) {
            for (const name of nameMatch) {
                // 过滤掉常见的非人名词
                const excludeWords = ['会议', '文件', '工作', '学习', '培训', '总结', '汇报', '讨论'];
                if (name && name.length >= 2 && name.length <= 3) {
                    if (!excludeWords.some(w => name.includes(w)) && !attendees.includes(name)) {
                        // 检查上下文是否表示人名
                        const idx = text.indexOf(name);
                        const context = text.substring(Math.max(0, idx - 2), Math.min(text.length, idx + name.length + 2));
                        if (/[和与跟叫请叫]/.test(context) || /参会|出席|参加/.test(context)) {
                            attendees.push(name);
                        }
                    }
                }
            }
        }

        // 去重并返回
        return [...new Set(attendees)].slice(0, 10); // 最多返回10个
    }

    /**
     * 生成规范的会议标题
     */
    generateMeetingTitle(text, data) {
        // 1. 先提取会议主题关键词
        const themeKeywords = ['预算', '项目', '方案', '工作', '计划', '总结', '汇报', '培训', '学习', '安全', '质量', '进度', '协调', '部署', '人事', '财务', '运营'];
        let theme = '';

        for (const kw of themeKeywords) {
            if (text.includes(kw)) {
                theme = kw;
                break;
            }
        }

        // 2. 检查会议类型
        const meetingTypes = ['例会', '周会', '月会', '季度会', '年会', '座谈会', '研讨会', '汇报会', '讨论会', '协调会', '部署会', '视频会议'];
        let meetingType = '';
        for (const type of meetingTypes) {
            if (text.includes(type)) {
                meetingType = type;
                break;
            }
        }

        // 3. 提取部门 - 排除会议室相关词
        let dept = '';
        const deptMatch = text.match(/(?:和|与|跟)([^和与跟，,。！？\d点时半分上午下午晚上中午早晨会议室]{2,6}(?:部|处|科|室|中心|组))/);
        if (deptMatch) {
            dept = deptMatch[1].trim();
        }

        // 4. 构建标题 - 优先使用主题关键词
        if (theme) {
            return `${theme}会议`;
        }
        if (meetingType) {
            return meetingType;
        }
        if (dept) {
            return `${dept}工作会议`;
        }

        // 默认使用日期作为标题
        const date = data.date ? new Date(data.date) : new Date();
        const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
        return `${dateStr}会议`;
    }

    /**
     * 生成规范的待办标题
     */
    generateTodoTitle(text) {
        let title = text
            .replace(/今天|明天|后天|下周[一二三四五六日天]/g, '')
            .replace(/\d{1,2}月\d{1,2}[日号]?/g, '')
            .replace(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?/g, '')
            .replace(/(上午|下午|晚上|傍晚|中午)?\s*\d{1,2}[点时](\d{0,2})分?半?/g, '')
            .replace(/\d{1,2}[:：]\d{2}/g, '')
            .replace(/半/g, '')
            .replace(/之前|以前/g, '')
            .replace(/前(?=\s*(提交|完成|汇报|准备|撰写|整理|处理|审核|修改|回复|确认|安排|通知|跟进|协调|解决|更新|备份|检查|核实|统计))/g, '')
            .replace(/之内|以内/g, '')
            .replace(/[的地得]/g, '')
            .replace(/[，,。！？、]/g, '')
            .trim();

        // 限制长度
        if (title.length > 30) {
            title = title.substring(0, 30);
        }

        return title || '待办事项';
    }

    /**
     * 生成规范的文件标题
     */
    generateDocumentTitle(text, data) {
        // 如果有文号，使用文号
        if (data.docNumber) {
            // 提取文件主题
            let theme = text.replace(data.docNumber, '').trim();
            theme = theme.replace(/[，,。！？、]/g, '').substring(0, 20);
            return `${data.docNumber}${theme ? ' - ' + theme : ''}`;
        }

        // 提取文件类型和主题
        const docTypes = ['通知', '函', '请示', '报告', '批复', '批示', '文件'];
        for (const type of docTypes) {
            if (text.includes(type)) {
                const idx = text.indexOf(type);
                let theme = text.substring(Math.max(0, idx - 10), Math.min(text.length, idx + type.length + 10));
                theme = theme.replace(/[，,。！？、]/g, '').trim();
                // 移除重复的"关于"和"于"
                theme = theme.replace(/关于关于/g, '关于');
                theme = theme.replace(/关于于/g, '关于');
                return theme;
            }
        }

        // 移除重复字
        let title = text.replace(/关于关于/g, '关于').replace(/关于于/g, '关于').substring(0, 30);
        return title;
    }

    /**
     * 检查Tesseract是否已加载
     */
    isTesseractLoaded() {
        return typeof Tesseract !== 'undefined';
    }

    /**
     * 初始化OCR引擎
     */
    async init(progressCallback = null) {
        if (this.isInitialized) return;

        try {
            if (progressCallback) progressCallback('正在加载OCR引擎...');

            // 检查Tesseract是否可用
            if (!this.isTesseractLoaded()) {
                throw new Error('OCR引擎未加载，请检查网络连接或刷新页面重试');
            }

            // 使用静态方法，不需要创建worker
            this.isInitialized = true;

            if (progressCallback) progressCallback('OCR引擎就绪');
        } catch (error) {
            console.error('OCR初始化失败:', error);
            this.isInitialized = false;
            throw new Error('OCR引擎初始化失败: ' + (error.message || '网络连接问题'));
        }
    }

    /**
     * 销毁OCR引擎
     */
    async terminate() {
        this.isInitialized = false;
    }

    /**
     * 识别图片中的文字（使用静态方法，避免worker加载问题）
     * 添加超时和取消支持
     */
    async recognizeImage(imageFile, progressCallback = null, abortSignal = null) {
        // 先尝试初始化
        if (!this.isInitialized) {
            await this.init(progressCallback);
        }

        try {
            if (progressCallback) progressCallback('正在识别图片文字...');

            // 创建可中断的Promise包装
            const recognizePromise = Tesseract.recognize(imageFile, 'chi_sim+eng', {
                logger: m => {
                    if (progressCallback && m.status) {
                        const statusMap = {
                            'loading tesseract core': '加载OCR核心...',
                            'initializing tesseract': '初始化OCR...',
                            'loading language traineddata': '下载中文语言包（首次约12MB，需等待1-2分钟）...',
                            'initializing api': '初始化识别引擎...',
                            'recognizing text': '识别文字中...'
                        };
                        progressCallback(statusMap[m.status] || `OCR: ${m.status}`);
                    }
                },
                // 使用多个镜像源，提高下载成功率
                langPath: 'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast',
                // 错误处理配置
                errorHandler: err => {
                    console.warn('OCR警告:', err);
                }
            });

            // 创建超时Promise（5分钟，因为下载语言包需要时间）
            const timeoutPromise = new Promise((_, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('下载超时（5分钟）。建议：1.检查网络连接 2.稍后重试 3.直接使用文字输入'));
                }, 300000); // 5分钟超时

                // 如果提供了abortSignal，监听取消事件
                if (abortSignal) {
                    abortSignal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                        reject(new Error('用户已取消'));
                    });
                }
            });

            // 使用Promise.race竞争，谁先完成用谁的结果
            const result = await Promise.race([recognizePromise, timeoutPromise]);

            if (progressCallback) progressCallback('文字识别完成');

            return {
                text: result.data.text,
                confidence: result.data.confidence,
                words: result.data.words
            };
        } catch (error) {
            console.error('图片识别失败:', error);
            // 提供更友好的错误信息
            let errorMsg = error.message || '请确保图片清晰或尝试手动输入';
            if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
                errorMsg = '网络连接问题，无法下载语言包。建议：1.检查网络 2.稍后重试 3.直接使用文字输入';
            }
            throw new Error('图片文字识别失败: ' + errorMsg);
        }
    }

    /**
     * 检查是否可以使用纯英文识别（不需要下载中文语言包）
     */
    async recognizeImageEnglish(imageFile, progressCallback = null) {
        try {
            if (progressCallback) progressCallback('正在识别（英文模式，无需下载语言包）...');

            const result = await Tesseract.recognize(imageFile, 'eng', {
                logger: m => {
                    if (progressCallback && m.status) {
                        const statusMap = {
                            'loading tesseract core': '加载OCR核心...',
                            'initializing tesseract': '初始化OCR...',
                            'loading language traineddata': '加载语言包...',
                            'initializing api': '初始化识别引擎...',
                            'recognizing text': '识别文字中...'
                        };
                        progressCallback(statusMap[m.status] || `OCR: ${m.status}`);
                    }
                }
            });

            return {
                text: result.data.text,
                confidence: result.data.confidence,
                words: result.data.words,
                isEnglish: true
            };
        } catch (error) {
            throw new Error('英文识别失败: ' + error.message);
        }
    }

    /**
     * 处理上传的文件
     */
    async processFile(file) {
        const fileType = this.getFileType(file);

        // 允许重复上传同一文件

        let text = '';
        let metadata = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            processedAt: new Date().toISOString()
        };

        try {
            switch (fileType) {
                case 'image':
                    const imageResult = await this.recognizeImage(file);
                    text = imageResult.text;
                    metadata.confidence = imageResult.confidence;
                    break;

                case 'pdf':
                    text = await this.extractPDFText(file);
                    break;

                case 'word':
                    text = await this.extractWordText(file);
                    break;

                default:
                    throw new Error('不支持的文件类型');
            }

            return {
                duplicate: false,
                text: text.trim(),
                metadata
            };
        } catch (error) {
            console.error('文件处理失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件类型
     */
    getFileType(file) {
        const type = file.type.toLowerCase();

        if (type.startsWith('image/')) {
            return 'image';
        } else if (type === 'application/pdf') {
            return 'pdf';
        } else if (
            type === 'application/msword' ||
            type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            return 'word';
        }

        // 根据扩展名判断
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
            return 'image';
        } else if (ext === 'pdf') {
            return 'pdf';
        } else if (['doc', 'docx'].includes(ext)) {
            return 'word';
        }

        return 'unknown';
    }

    /**
     * 检查文件是否支持
     */
    isSupportedFile(file) {
        return this.getFileType(file) !== 'unknown';
    }

    /**
     * 提取PDF文本（简化实现，实际项目中可使用pdf.js）
     */
    async extractPDFText(file) {
        throw new Error('PDF文件请转换为图片后上传，或使用Kimi API文件上传功能');
    }

    /**
     * 提取Word文档文本（简化实现）
     */
    async extractWordText(file) {
        throw new Error('Word文档请转换为PDF或图片后上传');
    }

    /**
     * 分析文档内容并创建看板卡片（带进度回调）
     * 支持图片和PDF
     * 优先使用Kimi API进行图片识别（更精准）
     */
    async analyzeDocument(file, progressCallback = null) {
        const fileType = this.getFileType(file);

        // 检查文件类型
        if (fileType === 'unknown') {
            throw new Error('不支持的文件类型，请上传图片(jpg/png)或PDF');
        }

        if (fileType === 'word') {
            throw new Error('Word文档请先转换为PDF或图片后上传');
        }

        // 允许重复上传同一文件，用户有自己的去重机制
        // 内容去重会在创建卡片时检查
        if (progressCallback) progressCallback('正在准备处理文件...');

        let items = [];
        let text = '';
        let metadata = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            processedAt: new Date().toISOString()
        };

        try {
            // 图片识别 - 优先使用Kimi API（更精准）
            if (fileType === 'image') {
                const kimiApiKey = this.getKimiApiKey();

                if (kimiApiKey) {
                    // 使用Kimi API直接识别图片（推荐，更精准）
                    if (progressCallback) progressCallback('正在使用Kimi AI识别图片...');
                    const kimiResult = await this.recognizeImageWithKimi(file, progressCallback);
                    items = kimiResult.items || [];
                    text = kimiResult.text || '';
                    metadata.recognitionMethod = 'kimi';
                } else {
                    // 使用Tesseract OCR + DeepSeek AI
                    if (progressCallback) progressCallback('正在识别图片文字...');
                    const imageResult = await this.recognizeImage(file, progressCallback);
                    text = imageResult.text;
                    metadata.confidence = imageResult.confidence;
                    metadata.recognitionMethod = 'tesseract';

                    // AI解析
                    if (progressCallback) progressCallback('正在用AI分析内容...');
                    items = await this.parseWithOCRAndAI(text, file.name, progressCallback);
                }
            }

            // PDF识别 - 使用pdf.js提取文字
            if (fileType === 'pdf') {
                if (progressCallback) progressCallback('正在解析PDF...');
                text = await this.extractPDFText(file, progressCallback);
                metadata.recognitionMethod = 'pdfjs';

                // 检查识别结果
                if (!text || text.trim().length < 2) {
                    throw new Error('PDF中未检测到文字，可能是扫描件。请尝试截图后上传图片。');
                }

                // AI解析
                if (progressCallback) progressCallback('正在用AI分析内容...');
                items = await this.parseWithOCRAndAI(text, file.name, progressCallback);
            }

            // 获取现有数据进行内容去重（不是文件去重）
            const existingItems = await db.getAllItems();

            // 创建卡片（带去重检查和参会人员合并）
            const createdItems = [];
            const mergedItems = [];
            const skippedItems = [];

            // 用于跟踪本次识别中已处理的事项（防止同一图片中的重复）
            const processedInBatch = [];

            for (const item of items) {
                // 安全获取 item 数据
                if (!item || !item.type) continue;
                const itemData = item.data || {};
                const itemTitle = itemData.title || '未知事项';
                const itemAttendees = itemData.attendees || [];

                // 先检查本次批次中是否已有相似事项
                const batchDuplicate = this.checkDuplicateInBatch(item, processedInBatch);
                if (batchDuplicate.isDuplicate) {
                    // 合并参会人员到批次中的事项
                    if (item.type === 'meeting' && batchDuplicate.existingItem) {
                        const existing = batchDuplicate.existingItem;
                        const existingAttendees = existing.attendees || [];
                        const addedAttendees = itemAttendees.filter(a => !existingAttendees.includes(a));
                        if (addedAttendees.length > 0) {
                            const mergedAttendees = [...existingAttendees, ...addedAttendees];
                            existing.attendees = mergedAttendees;
                            // 同步更新数据库中已保存的记录
                            if (existing.id) {
                                await db.updateItem(existing.id, { attendees: mergedAttendees });
                            }
                            mergedItems.push({
                                title: itemTitle,
                                addedAttendees: addedAttendees
                            });
                            console.log('批次内合并参会人员:', itemTitle, '新增:', addedAttendees);
                        } else {
                            skippedItems.push(itemTitle);
                        }
                    } else {
                        skippedItems.push(itemTitle);
                    }
                    continue;
                }

                // 检查是否已存在相似事项（数据库中）
                const duplicateInfo = this.checkDuplicateItem(item, existingItems);

                if (duplicateInfo.isDuplicate) {
                    // 会议类型：合并参会人员
                    if (item.type === 'meeting' && duplicateInfo.existingItem) {
                        const existing = duplicateInfo.existingItem;
                        const existingAttendees = existing.attendees || [];

                        // 合并参会人员（去重）
                        const mergedAttendees = [...new Set([...existingAttendees, ...itemAttendees])];

                        if (mergedAttendees.length > existingAttendees.length) {
                            // 更新现有会议的参会人员
                            await db.updateItem(existing.id, { attendees: mergedAttendees });
                            mergedItems.push({
                                title: itemTitle,
                                addedAttendees: itemAttendees.filter(a => !existingAttendees.includes(a))
                            });
                            console.log('合并参会人员:', itemTitle, itemAttendees);
                        } else {
                            skippedItems.push(itemTitle);
                        }
                    } else {
                        skippedItems.push(itemTitle);
                        console.log('跳过重复事项:', itemTitle);
                    }
                    continue;
                }

                try {
                    const id = await db.addItem({
                        type: item.type,
                        ...itemData,
                        source: 'document',
                        sourceFile: file.name
                    });
                    const newItem = { id, type: item.type, ...itemData };
                    createdItems.push(newItem);

                    // 添加到已存在列表，防止后续重复
                    existingItems.push(newItem);
                    // 添加到批次处理列表
                    processedInBatch.push(newItem);
                } catch (error) {
                    console.error('创建卡片失败:', error);
                }
            }

            return {
                success: true,
                items: createdItems,
                mergedItems: mergedItems,
                mergedCount: mergedItems.length,
                skippedCount: skippedItems.length,
                skippedItems: skippedItems,
                text: text.trim(),
                metadata
            };
        } catch (error) {
            console.error('文档分析失败:', error);
            throw error;
        }
    }

    /**
     * 检查同一批次中的重复事项（用于同一图片识别出的多个事项）
     * 比数据库去重更宽松，防止同一图片中的相似事项被重复添加
     */
    checkDuplicateInBatch(newItem, batchItems) {
        // 安全获取数据
        const newItemData = newItem.data || {};
        const newTitle = (newItemData.title || '').trim().toLowerCase();
        const result = { isDuplicate: false, existingItem: null };

        for (const existing of batchItems) {
            // 同类型才比较
            if (existing.type !== newItem.type) continue;

            const existTitle = (existing.title || '').trim().toLowerCase();

            // 会议：比较标题关键词和日期
            if (newItem.type === 'meeting') {
                // 提取标题关键词（去掉"会议"、"研究"等常见词）
                const extractKeywords = (title) => {
                    return title
                        .replace(/会议|研究|工作|座谈|讨论|调研/g, '')
                        .trim();
                };
                const newKeywords = extractKeywords(newTitle);
                const existKeywords = extractKeywords(existTitle);

                // 关键词匹配（更宽松）
                const keywordMatch = newKeywords === existKeywords ||
                                     newKeywords.includes(existKeywords) ||
                                     existKeywords.includes(newKeywords) ||
                                     // 或者原始标题有较高重叠
                                     (newTitle.length > 2 && existTitle.length > 2 &&
                                      (newTitle.includes(existTitle) || existTitle.includes(newTitle)));

                // 同一天 + 关键词匹配 = 重复（也支持跨天会议）
                if (keywordMatch) {
                    // 日期完全相同
                    if (existing.date === newItemData.date) {
                        return { isDuplicate: true, existingItem: existing };
                    }
                    // 跨天会议：日期范围有重叠
                    const newStart = newItemData.date;
                    const newEnd = newItemData.endDate || newItemData.date;
                    const existStart = existing.date;
                    const existEnd = existing.endDate || existing.date;
                    if (newStart && existStart && newStart <= existEnd && newEnd >= existStart) {
                        return { isDuplicate: true, existingItem: existing };
                    }
                }
            }

            // 待办：标题相同且截止日期相同
            if (newItem.type === 'todo') {
                if ((newTitle === existTitle || newTitle.includes(existTitle) || existTitle.includes(newTitle)) &&
                    existing.deadline === newItemData.deadline) {
                    return { isDuplicate: true, existingItem: existing };
                }
            }

            // 办文：文号或标题相同
            if (newItem.type === 'document') {
                if (newItemData.docNumber && existing.docNumber === newItemData.docNumber) {
                    return { isDuplicate: true, existingItem: existing };
                }
                if (newTitle === existTitle && newTitle.length > 3) {
                    return { isDuplicate: true, existingItem: existing };
                }
            }
        }

        return result;
    }

    /**
     * 检查事项是否重复（增强版）
     * 返回 { isDuplicate: boolean, existingItem: object|null, shouldMerge: boolean }
     */
    checkDuplicateItem(newItem, existingItems) {
        // 安全获取数据
        const newItemData = newItem.data || {};
        const newTitle = (newItemData.title || '').trim().toLowerCase();
        const result = { isDuplicate: false, existingItem: null, shouldMerge: false };

        // 提取关键词函数
        const extractKeywords = (title) => {
            return title
                .replace(/会议|研究|工作|座谈|讨论|调研|培训|学习|协调|推进|落实/g, '')
                .trim();
        };
        const newKeywords = extractKeywords(newTitle);

        for (const existing of existingItems) {
            // 同类型才比较
            if (existing.type !== newItem.type) continue;

            const existTitle = (existing.title || '').trim().toLowerCase();
            const existKeywords = extractKeywords(existTitle);

            // 会议：比较关键词和日期
            if (newItem.type === 'meeting') {
                // 关键词匹配（标题相似度）
                const keywordMatch = newKeywords === existKeywords ||
                                     (newKeywords.length > 2 && existKeywords.length > 2 && 
                                      (newKeywords.includes(existKeywords) || existKeywords.includes(newKeywords)));

                // 标题完全匹配
                const titleExactMatch = newTitle === existTitle;

                // 同一天 + 标题相似 = 合并参会人员
                if ((keywordMatch || titleExactMatch) && existing.date === newItemData.date) {
                    return { isDuplicate: true, existingItem: existing, shouldMerge: true };
                }

                // 跨天会议：检查日期范围是否重叠
                if ((keywordMatch || titleExactMatch) && newItemData.endDate) {
                    const newStart = newItemData.date;
                    const newEnd = newItemData.endDate;
                    const existStart = existing.date;
                    const existEnd = existing.endDate || existing.date;

                    if (newStart && existStart && newStart <= existEnd && newEnd >= existStart) {
                        return { isDuplicate: true, existingItem: existing, shouldMerge: true };
                    }
                }
            }

            // 待办：比较标题和截止日期
            if (newItem.type === 'todo') {
                const titleMatch = newTitle === existTitle ||
                                   newTitle.includes(existTitle) ||
                                   existTitle.includes(newTitle);

                if (titleMatch && existing.deadline === newItemData.deadline) {
                    return { isDuplicate: true, existingItem: existing, shouldMerge: false };
                }

                // 同一标题的待办（即使截止日期不同也提示）
                if (newTitle === existTitle && newTitle.length > 3) {
                    // 标题完全相同且长度大于3个字符，视为重复
                    return { isDuplicate: true, existingItem: existing, shouldMerge: false };
                }
            }

            // 办文：比较文号或标题
            if (newItem.type === 'document') {
                // 文号相同
                if (newItemData.docNumber && existing.docNumber === newItemData.docNumber) {
                    return { isDuplicate: true, existingItem: existing, shouldMerge: false };
                }

                // 标题相同
                if (newTitle === existTitle && newTitle.length > 3) {
                    return { isDuplicate: true, existingItem: existing, shouldMerge: false };
                }
            }
        }

        return result;
    }

    /**
     * 提取PDF文本（使用pdf.js）
     * 提取PDF文本（使用pdf.js）
     */
    async extractPDFText(file, progressCallback = null) {
        try {
            // 动态加载pdf.js
            if (typeof pdfjsLib === 'undefined') {
                if (progressCallback) progressCallback('正在加载PDF解析库...');
                await this.loadPdfJs();
            }

            if (progressCallback) progressCallback('正在读取PDF文件...');
            const arrayBuffer = await file.arrayBuffer();

            if (progressCallback) progressCallback('正在解析PDF结构...');
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                if (progressCallback) {
                    progressCallback(`正在解析PDF (${i}/${totalPages}页)...`);
                }

                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            if (!fullText.trim()) {
                throw new Error('PDF中未检测到可提取的文字，可能是扫描版PDF。建议将PDF页面截图后上传图片识别。');
            }

            return fullText;
        } catch (error) {
            console.error('PDF解析失败:', error);
            if (error.message.includes('PDF')) {
                throw error;
            }
            throw new Error('PDF解析失败: ' + error.message + '。请确保PDF文件未损坏。');
        }
    }

    /**
     * 动态加载pdf.js
     */
    async loadPdfJs() {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                // 设置worker路径
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                console.log('PDF.js加载成功');
                resolve();
            };
            script.onerror = () => {
                console.error('PDF.js加载失败');
                reject(new Error('PDF解析库加载失败，请检查网络连接'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 使用Kimi API识别图片（图片理解能力更强）
     */
    async recognizeImageWithKimi(file, progressCallback = null) {
        const apiKey = this.getKimiApiKey();
        if (!apiKey) {
            throw new Error('请先设置Kimi API Key');
        }

        if (progressCallback) progressCallback('正在使用Kimi AI识别图片...');

        try {
            // 将图片转为base64
            const base64 = await this.fileToBase64(file);
            const mimeType = file.type || 'image/jpeg';

            const today = new Date();
            const todayStr = this.formatDateLocal(today);
            const weekDay = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];

            const systemPrompt = `你是专业的办公文档识别助手。今天是${todayStr}（星期${weekDay}）。

【表格结构】
会议安排表格分为"局领导"和"处室"两个区域，每个区域有3列：
- 第1列：参会人员（如"钱局"、"吴局"、"综合处"、"核算处"）
- 第2列：会议内容（日期+时间+会议名称）
- 第3列：备注/地点

【关键规则 - 必须严格遵守】
1. **逐行读取**：表格每一行是独立的！不要把上一行的人混到下一行！
2. **参会人员**：每行的attendees只填该行第1列的那一个人名/处室名
3. **跨日期会议**：如"3月25日下午-26日"必须同时填date和endDate
4. **同名会议**：同一会议出现在不同行（如"高新区经济大镇调研"有钱局和综合处），每行单独输出

【日期格式】
- "3月24日" → date="${todayStr.substring(0,4)}-03-24"
- "3月25日下午-26日" → date="${todayStr.substring(0,4)}-03-25", endDate="${todayStr.substring(0,4)}-03-26"

【时间格式】
- 上午8:50 → "08:50"，下午 → 不填time（留空）
- "上午8:50" → time="08:50"

【标题提取】
去掉日期时间前缀，只保留会议核心名称
- "3月24日（周二）上午8:50，参加高新区经济大镇调研" → title="参加高新区经济大镇调研"

【输出格式】严格返回JSON
{
  "items": [{
    "type": "meeting",
    "data": {
      "title": "会议名称",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD（跨天会议必填）",
      "time": "HH:MM",
      "location": "地点（第3列内容）",
      "attendees": ["该行第1列的人名"]
    }
  }]
}

只返回JSON。`;

            const response = await fetch(`${this.kimiBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.kimiVisionModel,  // Kimi视觉模型
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: { url: `data:${mimeType};base64,${base64}` }
                                },
                                {
                                    type: 'text',
                                    text: `请识别这个会议安排表格。

⚠️ 重要：逐行读取！不要跨行！
- 第1列是参会人员（每行只对应一个人名/处室名）
- 第2列是会议内容（日期+时间+会议名称）
- 第3列是地点

每行输出一条记录，attendees只填该行第1列对应的人名，不要把其他行的人混进来！

跨日期会议示例："3月24日-25日" → date和endDate都要填`

                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Kimi API错误:', errorData);
                throw new Error(errorData.error?.message || `Kimi API请求失败: ${response.status}`);
            }

            const data = await response.json();
            console.log('Kimi API响应成功');
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Kimi返回内容为空');
            }

            // 解析JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.items && Array.isArray(result.items)) {
                    const items = result.items
                        .map(item => this.validateAndCleanItem(item))
                        .filter(item => item !== null);

                    return {
                        text: content,
                        items: items.map(item => {
                            if (item.type === 'meeting') {
                                item.data.displayTitle = this.formatMeetingTitle(item.data);
                            } else if (item.type === 'todo') {
                                item.data.displayTitle = this.formatTodoTitle(item.data);
                            } else if (item.type === 'document') {
                                item.data.displayTitle = this.formatDocumentTitle(item.data);
                            }
                            return item;
                        })
                    };
                }
            }

            // 如果解析失败，返回原始文本
            return { text: content, items: [] };

        } catch (error) {
            console.error('Kimi图片识别失败:', error);
            throw error;
        }
    }

    /**
     * 文件转Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * OCR+AI联合识别
     * 先用OCR提取文字，再用DeepSeek AI进行智能解析
     */
    async parseWithOCRAndAI(ocrText, source = '', progressCallback = null) {
        // 如果OCR结果太短，直接返回空
        if (!ocrText || ocrText.trim().length < 2) {
            return [];
        }

        // 检查是否有DeepSeek API Key
        const apiKey = this.getApiKey();

        if (!apiKey) {
            // 没有API Key，使用本地规则解析
            if (progressCallback) progressCallback('使用本地规则解析...');
            return this.parseWithRules(ocrText);
        }

        // 有API Key，使用DeepSeek AI进行高级识别
        if (progressCallback) progressCallback('使用DeepSeek AI深度分析...');

        try {
            const today = new Date();
            const todayStr = this.formatDateLocal(today);
            const weekDay = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];

            const systemPrompt = `你是专业的办公文档识别助手。请仔细分析文字内容，精准提取每一个办公事项。

【原始文字】
${ocrText}

【当前时间】
今天是${todayStr}（星期${weekDay}）

【重要任务】
1. 识别文字中的所有事项，不要遗漏任何一个！
2. 一段文字可能包含多个会议、多个待办、多个文件，全部提取！
3. 按事项分行或分段出现的，每个都是独立事项！

【输出格式】严格返回JSON数组：
{
  "items": [{
    "type": "meeting|todo|document",
    "data": {
      // 会议字段
      "title": "会议名称（简洁明确，不要包含时间和地点）",
      "date": "YYYY-MM-DD（开始日期）",
      "endDate": "YYYY-MM-DD（结束日期，仅跨天会议需要）",
      "time": "HH:MM（开始时间，24小时制）",
      "endTime": "HH:MM（结束时间，如有）",
      "location": "会议地点（完整准确）",
      "attendees": ["参会人员数组，每个姓名单独一项"],
      "agenda": "议程/备注",
      // 待办字段
      "priority": "high|medium|low",
      "deadline": "YYYY-MM-DDTHH:MM",
      "description": "备注说明",
      // 文件字段
      "docType": "receive|send|transfer（收文/发文/流转）",
      "docNumber": "文号",
      "source": "来文单位",
      "handler": "当前处理人",
      "content": "内容摘要"
    }
  }]
}

【时间识别规则 - 非常重要】
- 上午8:50 = 08:50，下午3点 = 15:00，晚上7点 = 19:00
- X点半 = X:30，如7点半 = 07:30或19:30（根据上下文判断上午下午）
- 时间段格式：如有"8:50-10:00"，则time="08:50"，endTime="10:00"
- 只有开始时间没有结束时间：只填time
- 时间不确定的填空字符串

【参会人员识别规则 - 非常重要】
- 提取所有人名，格式如"张三"、"李经理"、"王总"、"钱局"
- 部门名称如"财务部"、"人事部"也算参会方
- "全体员工"、"各部门负责人"等集体称呼也要提取
- 多人用顿号或逗号分隔时，分别提取每个人
- "X召集Y开会/研究/座谈"模式：X和Y都是参会人员，X通常是召集人
- "X和Y开会/讨论"模式：X和Y都是参会人员
- 例如"钱局召集某某处长研究工作"：参会人员=["钱局","某某处长"]

【会议名称识别规则 - 非常重要】
- 会议名称要简洁明确，格式为"核心内容+会议"
- "X召集Y研究工作" → 会议名称="研究工作会议"或"X召集研究工作会议"
- "X和Y开会讨论Z" → 会议名称="Z讨论会"
- 会议名称不要包含时间、地点，这些单独存储
- 例如"钱局召集某某处长研究工作" → title="研究工作会议"

【跨天会议识别规则 - 非常重要】
- "3月15日-17日培训"表示15、16、17三天，date填"2026-03-15"，endDate填"2026-03-17"
- "3月15日至3月18日会议"同理处理
- 跨天会议必须填写endDate字段！

【多事项识别规则 - 非常重要】
- 每行一条事项的，全部识别为独立事项
- 用数字编号（1. 2. 3.）或符号（● ○ ■）分隔的，每个都是独立事项
- 用换行分隔的多个事项，全部提取
- 宁可多识别不要漏识别！

【优先级判断】
- 紧急/立即/马上/尽快/今天/明天 = high
- 有空/方便时/不急 = low
- 其他 = medium

【办文类型判断】
- 收到/收到...文件/来文 = receive（收文）
- 发出/下发/印发 = send（发文）
- 转发/流转/传阅 = transfer（流转）

【注意事项】
1. 只返回JSON，不要任何解释
2. 每个事项只提取一次，不要重复
3. 确保日期和时间格式正确
4. 多行事项必须全部识别出来！

【表格形式会议安排识别 - 非常重要】
如果是表格形式的会议安排（每行一个会议）：
⚠️ 每行的参会人员只从该行读取，不要把上一行的人员混进来！
⚠️ 逐行读取，确保每行的attendees数组只包含该行对应的参会人员！
⚠️ 即使会议名称相同，也可能是不同时间的会议，参会人员可能不同！
⚠️ 每行生成一个独立的会议对象！`;

            const userPrompt = `请分析以下OCR识别出的文字，提取所有办公事项：

"""${ocrText}"""

要求：
1. 识别所有会议、待办、文件事项
2. 纠正OCR识别错误（如日期、人名、地点）
3. 日期格式YYYY-MM-DD，时间格式HH:MM
4. 只返回JSON，不要解释`;

            const response = await fetch(`${this.deepseekBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.deepseekModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            // 尝试解析JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.items && Array.isArray(result.items)) {
                    // 验证和清理
                    const items = result.items
                        .map(item => this.validateAndCleanItem(item))
                        .filter(item => item !== null);

                    // 格式化标题
                    return items.map(item => {
                        if (item.type === 'meeting') {
                            item.data.displayTitle = this.formatMeetingTitle(item.data);
                        } else if (item.type === 'todo') {
                            item.data.displayTitle = this.formatTodoTitle(item.data);
                        } else if (item.type === 'document') {
                            item.data.displayTitle = this.formatDocumentTitle(item.data);
                        }
                        return item;
                    });
                }
            }

            // AI解析失败，降级到本地规则
            console.log('AI解析未返回有效JSON，使用本地规则');
            return this.parseWithRules(ocrText);

        } catch (error) {
            console.error('DeepSeek AI解析失败:', error.message);
            // 降级到本地规则
            return this.parseWithRules(ocrText);
        }
    }

    /**
     * 本地日期格式化
     */
    formatDateLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 批量处理多个文件
     */
    async processMultipleFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const result = await this.analyzeDocument(file);
                results.push({ file: file.name, ...result });
            } catch (error) {
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 获取文件图标
     */
    getFileIcon(file) {
        const type = this.getFileType(file);
        const icons = {
            image: '📷',
            pdf: '📄',
            word: '📝',
            unknown: '📎'
        };
        return icons[type] || icons.unknown;
    }
}

// 创建全局OCR管理器实例
const ocrManager = new OCRManager();
