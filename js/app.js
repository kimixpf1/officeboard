/**
 * 办公室智能工作面板 - 主应用
 * 整合所有模块，处理用户交互
 * 
 * 版权声明：Copyright © 2024-2026 kimixpf1. All Rights Reserved.
 * 用户可免费使用本软件，但不得用于商业用途。
 */

// ========== 全局常量 ==========
const OfficeConstants = window.OfficeConstants || {};
const ITEM_TYPES = OfficeConstants.ITEM_TYPES || {
    TODO: 'todo',
    MEETING: 'meeting',
    DOCUMENT: 'document'
};
const RECURRING_TYPES = OfficeConstants.RECURRING_TYPES || {
    DAILY: 'daily',
    WORKDAY_DAILY: 'workday_daily',
    WEEKLY_DAY: 'weekly_day',
    WEEKLY_MULTI: 'weekly_multi',
    BIWEEKLY_DAY: 'biweekly_day',
    BIWEEKLY_MULTI: 'biweekly_multi',
    MONTHLY_DATE: 'monthly_date',
    MONTHLY_WORKDAY: 'monthly_workday',
    MONTHLY_WEEKDAY: 'monthly_weekday'
};
const DOCUMENT_PROGRESS = OfficeConstants.DOCUMENT_PROGRESS || {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed'
};
const RECURRING_OPTION_GROUPS = OfficeConstants.RECURRING_OPTION_GROUPS || [];
const WEEKDAY_OPTIONS = OfficeConstants.WEEKDAY_OPTIONS || [];
const NTH_WEEK_OPTIONS = OfficeConstants.NTH_WEEK_OPTIONS || [];

// ========== 安全工具函数 ==========
const SecurityUtils = {
    /**
     * XSS防护：转义HTML特殊字符
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return str.replace(/[&<>"'\/]/g, char => escapeMap[char]);
    },

    /**
     * 输入验证：检查是否包含危险字符
     */
    sanitizeInput(str, maxLength = 1000) {
        if (typeof str !== 'string') return '';
        // 截断过长输入
        str = str.slice(0, maxLength);
        // 移除潜在的脚本注入
        str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        str = str.replace(/javascript:/gi, '');
        str = str.replace(/on\w+\s*=/gi, '');
        return str.trim();
    },

    /**
     * URL验证：只允许http/https协议
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    },

    /**
     * 生成安全的随机ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    },

    safeGetStorage(key) { return SafeStorage.get(key); },
    safeSetStorage(key, value) { return SafeStorage.set(key, value); },
    safeRemoveStorage(key) { SafeStorage.remove(key); },

    /**
     * 内容安全策略检查
     */
    checkContentSafety(content) {
        const dangerousPatterns = [
            /<script\b/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /data:\s*text\/html/i,
            /vbscript:/i
        ];
        return !dangerousPatterns.some(pattern => pattern.test(content));
    }
};

class OfficeDashboard {
    constructor() {
        this.currentView = 'board';
        this.currentDate = new Date();
        this.selectedDate = this.formatDateLocal(new Date()); // 选中的日期
        this.draggedItem = null;
        this.deleteItemId = null;
        this.loadItemsRequestSeq = 0;
        this.dateViewController = new OfficeDateViewController(this);
        this.weatherPresetCities = [
            { name: '苏州', lat: 31.292622, lon: 120.599489 },
            { name: '上海', lat: 31.2304, lon: 121.4737 },
            { name: '南京', lat: 32.0603, lon: 118.7969 },
            { name: '北京', lat: 39.9042, lon: 116.4074 },
            { name: '杭州', lat: 30.2741, lon: 120.1551 },
            { name: '广州', lat: 23.1291, lon: 113.2644 },
            { name: '深圳', lat: 22.5431, lon: 114.0579 },
            { name: '成都', lat: 30.5728, lon: 104.0668 },
            { name: '武汉', lat: 30.5928, lon: 114.3055 },
            { name: '无锡', lat: 31.4912, lon: 120.3119 },
            { name: '常州', lat: 31.8106, lon: 119.9741 },
            { name: '昆山', lat: 31.3848, lon: 120.9580 }
        ];

        const urlParams = new URLSearchParams(window.location.search);
        const restoreDate = urlParams.get('restoreDate');
        const restoreView = urlParams.get('restoreView');
        if (restoreDate) {
            this.selectedDate = restoreDate;
            this.currentDate = new Date(`${restoreDate}T00:00:00`);
        }
        if (restoreView) {
            this.currentView = restoreView;
        }

        this.meetingLeaderPriorityGroups = [
            ['钱局'],
            ['吴局'],
            ['盛局'],
            ['房局'],
            ['陈局', '陈主任']
        ];

        // 多选功能状态
        this.selectedItems = new Set(); // 选中的事项ID
        this.batchMode = false; // 是否处于批量模式

        // 撤回历史
        this.undoHistory = [];
        this.redoStack = [];
        this.maxUndoSteps = 20;

        this.todoReminderRefreshTimer = null;
        this.todoReminderNoticeIndex = 0;
        this.items = [];

        this.init();
    }

    /**
     * 格式化日期为本地格式
     */
    formatDateLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    normalizeMeetingSortText(value) {
        return (value || '')
            .toString()
            .replace(/[（）()【】\[\]\s]/g, '')
            .replace(/[，,、；;。.!！?？]/g, '')
            .trim();
    }

    getMeetingLeaderRankFromText(text) {
        const normalized = this.normalizeMeetingSortText(text);
        if (!normalized) {
            return Number.MAX_SAFE_INTEGER;
        }

        for (let index = 0; index < this.meetingLeaderPriorityGroups.length; index++) {
            const aliases = this.meetingLeaderPriorityGroups[index];
            if (aliases.some(alias => normalized.includes(this.normalizeMeetingSortText(alias)))) {
                return index + 1;
            }
        }

        if (/局|主任/.test(text || '')) {
            return this.meetingLeaderPriorityGroups.length + 1;
        }

        if (/处|室|科/.test(text || '')) {
            return this.meetingLeaderPriorityGroups.length + 10;
        }

        return this.meetingLeaderPriorityGroups.length + 20;
    }

    sortMeetingAttendeesForDisplay(attendees = []) {
        const uniqueAttendees = [];
        const seen = new Set();

        for (const attendee of Array.isArray(attendees) ? attendees : []) {
            const normalized = this.normalizeMeetingSortText(attendee);
            if (!normalized || seen.has(normalized)) {
                continue;
            }
            seen.add(normalized);
            uniqueAttendees.push(attendee);
        }

        return uniqueAttendees.sort((a, b) => {
            const rankA = this.getMeetingLeaderRankFromText(a);
            const rankB = this.getMeetingLeaderRankFromText(b);
            if (rankA !== rankB) {
                return rankA - rankB;
            }
            return a.localeCompare(b, 'zh-CN');
        });
    }

    /**
     * 判断日期是否为工作日（跳过周末和法定节假日）
     * @param {string} dateStr - 日期字符串 YYYY-MM-DD
     * @returns {boolean}
     */
    isWorkday(dateStr) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();

        if (HolidayData.isHoliday(dateStr)) return false;
        if (HolidayData.isMakeupDay(dateStr)) return true;

        return dayOfWeek !== 0 && dayOfWeek !== 6;
    }

    /**
     * 初始化应用
     */
    async init() {
        // Mixin: 将拆分出的模块方法混入 OfficeDashboard 原型
        Object.assign(OfficeDashboard.prototype, CountdownPanel);
        Object.assign(OfficeDashboard.prototype, LinksPanel);
        Object.assign(OfficeDashboard.prototype, ContactsPanel);
        Object.assign(OfficeDashboard.prototype, ToolsPanel);
        Object.assign(OfficeDashboard.prototype, SidePanels);
        Object.assign(OfficeDashboard.prototype, WeatherPanel);
        Object.assign(OfficeDashboard.prototype, RecurringCore);
        Object.assign(OfficeDashboard.prototype, CrossDateCore);
        Object.assign(OfficeDashboard.prototype, BackupCore);
        Object.assign(OfficeDashboard.prototype, ContextMenuCore);
        Object.assign(OfficeDashboard.prototype, IdleBarManager);
        Object.assign(OfficeDashboard.prototype, AlarmManager);

        try {
            window.addEventListener('unhandledrejection', (e) => {
                console.warn('未捕获的Promise异常:', e.reason?.message || e.reason);
            });
            window.addEventListener('error', (e) => {
                console.warn('未捕获的运行时错误:', e.message);
            });
            await db.init();

            this.initializeRecurringFieldOptions();
            this.bindEvents();

            await this.loadItems();

            const skeleton = document.getElementById('appSkeleton');
            if (skeleton) skeleton.remove();
            document.getElementById('app').style.display = '';

            this.initDatePicker();

            this.updateDateDisplay();

            const _ric = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : (fn) => setTimeout(fn, 0);
            _ric(() => {
                this.startTodoReminderLoop();
                this.bindTodoReminderComplete();
                this.initHeaderClock();
                this.initHeaderWeather();
                this.initCountdownSystem();
                this.startMeetingAutoCompleteCheck();
                this.startDailyBackupSchedule();
                this.updateDeployVersionBadge();
            });

            syncManager.waitForInit().then(async () => {
                if (syncManager.isLoggedIn()) {
                    await this.loadItems();
                }
            }).catch(error => {
                console.warn('同步初始化未完全完成，已跳过阻塞等待:', error?.message || error);
            });

            setTimeout(() => {
                this.checkApiKey().catch(err => {
                    console.warn('API密钥检查失败:', err.message);
                });
            }, 1000);
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message + '。请刷新页面重试。');
        }
    }

    /**
     * 检查API Key（可选，不再强制要求）
     */
    async checkApiKey() {
        if (typeof ocrManager !== 'undefined' && typeof ocrManager.loadApiKeysFromDB === 'function') {
            await ocrManager.loadApiKeysFromDB();
        }
        this.updateApiKeyStatus();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // API Key设置
        document.getElementById('saveApiKey')?.addEventListener('click', () => this.saveApiKey());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openApiKeyModal());

        // 关闭API Key弹窗
        document.getElementById('closeApiKeyModal')?.addEventListener('click', () => this.hideModal('apiKeyModal'));

        // 切换API Key显示/隐藏
        document.getElementById('toggleApiKeyVisibility')?.addEventListener('click', () => this.toggleApiKeyVisibility());
        document.getElementById('toggleKimiApiKeyVisibility')?.addEventListener('click', () => this.toggleKimiApiKeyVisibility());
        document.getElementById('toggleQweatherApiKeyVisibility')?.addEventListener('click', () => this.toggleQweatherApiKeyVisibility());

        // 测试API Key连接
        document.getElementById('testApiKey')?.addEventListener('click', () => this.testApiKeyConnection());

        // NLP输入
        document.getElementById('parseBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.parseNaturalLanguage();
        });
        document.getElementById('nlpInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.parseNaturalLanguage();
        });

        // NLP折叠功能
        document.getElementById('nlpToggleBar')?.addEventListener('click', () => this.toggleNlpSection());
        document.getElementById('nlpToggleBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNlpSection();
        });

        // 文件上传
        document.getElementById('uploadBtn')?.addEventListener('click', (e) => this.triggerFilePicker(e));
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));

        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.dateViewController.switchView(e.target.dataset.view));
        });

        // 日期导航
        document.getElementById('prevDate')?.addEventListener('click', () => this.dateViewController.navigateDate(-1));
        document.getElementById('nextDate')?.addEventListener('click', () => this.dateViewController.navigateDate(1));
        document.getElementById('todayBtn')?.addEventListener('click', () => this.dateViewController.goToToday());

        // 日期选择器
        document.getElementById('datePicker')?.addEventListener('change', (e) => this.dateViewController.onDatePickerChange(e));

        // 添加按钮
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', (e) => this.showAddModal(e.target.closest('.btn-add').dataset.type));
        });

        // 表单提交
        document.getElementById('itemForm')?.addEventListener('submit', (e) => this.saveItem(e));
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.hideModal('itemModal'));

        // 报告生成
        document.getElementById('reportBtn')?.addEventListener('click', () => this.showModal('reportModal'));
        document.getElementById('generateReport')?.addEventListener('click', () => this.generateReport());
        document.getElementById('cancelReport')?.addEventListener('click', () => this.hideModal('reportModal'));
        document.getElementById('boardScreenshotBtn')?.addEventListener('click', () => {
            const dateSpan = document.querySelector('.board-date-label-date');
            const weekSpan = document.querySelector('.board-date-label-week');
            const title = (dateSpan?.textContent?.trim() || '') + ' ' + (weekSpan?.textContent?.trim() || '') || '日视图';
            this.shareCalendarScreenshot(document.getElementById('boardView'), title);
        });

        // 撤回按钮
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undoLastAction());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redoLastAction());

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undoLastAction();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redoLastAction();
            }
        });

        // 删除确认
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());

        // 拖拽功能
        this.initDragAndDrop();

        // 右键/长按上下文菜单
        this.initContextMenu();

        // 空闲态通知栏 + 闹钟系统
        this.initIdleBar();
        this.initAlarmSystem();

        // 主题切换
        document.getElementById('themeBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleThemeMenu();
        });

        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });

        // 点击其他地方关闭主题菜单
        document.addEventListener('click', () => {
            const menu = document.getElementById('themeMenu');
            if (menu) menu.classList.remove('active');
        });

        // 加载保存的主题
        this.loadTheme();

        // 同步功能
        this.bindSyncEvents();

        // 流转功能
        this.bindTransferEvents();

        // 多选功能
        this.bindBatchSelectionEvents();
        this.bindBoardCardEvents();

        // 监听跳转到日期事件
        document.addEventListener('gotoDate', (e) => {
            this.goToDateView(e.detail.date);
        });

        // 监听日历空白处快速新增事件
        document.addEventListener('calendarQuickAdd', (e) => {
            this.handleCalendarQuickAdd(e.detail?.date);
        });

        // 初始化右侧折叠面板
        this.initSidePanels();
    }

    triggerFilePicker(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (this.isWeChatBrowser()) {
            const returnParams = new URLSearchParams();
            returnParams.set('restoreDate', this.selectedDate || this.formatDateLocal(new Date()));
            returnParams.set('restoreView', this.currentView || 'board');
            const returnUrl = `index.html?${returnParams.toString()}`;
            window.location.href = `wechat-upload.html?return=${encodeURIComponent(returnUrl)}`;
            return;
        }

        const fileInput = document.getElementById('fileInput');
        if (!fileInput) {
            return;
        }

        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }

        fileInput.value = '';

        window.setTimeout(() => {
            fileInput.click();
        }, 0);
    }

    isWeChatBrowser() {
        return /MicroMessenger/i.test(navigator.userAgent);
    }

    checkWeChatCapabilities() {
        const ua = navigator.userAgent;
        const isWeChat = /MicroMessenger/i.test(ua);
        if (!isWeChat) return null;

        const capabilities = {
            indexedDB: !!window.indexedDB,
            fileReader: !!window.FileReader,
            camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            wechatVersion: (ua.match(/MicroMessenger\/([\d.]+)/) || [])[1] || 'unknown'
        };
        return capabilities;
    }

    /**
     * 初始化所有右侧折叠面板
     */
    initSidePanels() {
        this.initCountdownPanel();
        this.initSchedulePanel();
        this.initToolsPanel();
        this.initLinksPanel();
        this.initContactsPanel();
        this.initMemoPanel();
        this.initToolModals();
    }

    initHeaderClock() {
        const clockEl = document.getElementById('headerClock');
        if (!clockEl) {
            return;
        }

        const renderClock = () => {
            const now = new Date();
            const timePart = now.toLocaleTimeString('zh-CN', { hour12: false });
            const timeEl = clockEl.querySelector('.clock-time');
            if (timeEl) timeEl.textContent = timePart;
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const weekday = now.toLocaleDateString('zh-CN', { weekday: 'short' });
            clockEl.title = `当前时间：${y}-${m}-${d} ${weekday} ${timePart}`;
        };

        renderClock();
        if (this.headerClockTimer) {
            clearInterval(this.headerClockTimer);
        }
        this.headerClockTimer = setInterval(renderClock, 1000);
    }

    initHeaderWeather() {
        const weatherBtn = document.getElementById('headerWeather');
        if (!weatherBtn) {
            return;
        }

        weatherBtn.addEventListener('click', () => {
            this.openTool('weather');
        });
        this.updateHeaderWeatherDisplay();
        this.refreshHeaderWeather(true).catch(error => {
            console.warn('顶部天气初始化失败:', error?.message || error);
        });

        if (this.headerWeatherTimer) {
            clearInterval(this.headerWeatherTimer);
        }

        this.headerWeatherTimer = setInterval(() => {
            this.refreshHeaderWeather().catch(error => {
                console.warn('顶部天气自动刷新失败:', error?.message || error);
            });
        }, 10 * 60 * 1000);
    }

    async refreshHeaderWeather(forceRefresh = false) {
        const now = Date.now();
        const hasRecentWeather = this.currentWeatherData && this.lastWeatherUpdatedAt && (now - this.lastWeatherUpdatedAt < 10 * 60 * 1000);

        if (!forceRefresh && hasRecentWeather) {
            this.updateHeaderWeatherDisplay();
            return;
        }

        await this.loadWeather({ skipGlobalLoading: true });
    }

    updateHeaderWeatherDisplay() {
        const weatherBtn = document.getElementById('headerWeather');
        if (!weatherBtn) {
            return;
        }

        const current = this.currentWeatherData || null;
        const forecast = Array.isArray(this.weatherForecastSummary) ? this.weatherForecastSummary : [];
        const today = forecast[0] || null;
        const tomorrow = forecast[1] || null;
        const dayAfterTomorrow = forecast[2] || null;

        const currentCity = weatherBtn.querySelector('.weather-current-city');
        const currentIcon = weatherBtn.querySelector('.weather-current-icon');
        const currentTemp = weatherBtn.querySelector('.weather-current-temp');
        const todayIcon = weatherBtn.querySelector('.weather-today-icon');
        const todayRange = weatherBtn.querySelector('.weather-today .weather-temp-range');
        const tomorrowLabel = weatherBtn.querySelector('.weather-tomorrow .weather-day-label');
        const tomorrowIcon = weatherBtn.querySelector('.weather-tomorrow .weather-day-icon');
        const tomorrowTemp = weatherBtn.querySelector('.weather-tomorrow .weather-day-temp');
        const dayafterLabel = weatherBtn.querySelector('.weather-dayafter .weather-day-label');
        const dayafterIcon = weatherBtn.querySelector('.weather-dayafter .weather-day-icon');
        const dayafterTemp = weatherBtn.querySelector('.weather-dayafter .weather-day-temp');

        const city = localStorage.getItem('office_weather_city') || '苏州';
        if (currentCity) {
            currentCity.textContent = city;
        }

        if (currentIcon) {
            currentIcon.textContent = current?.icon || '🌤️';
        }

        if (currentTemp) {
            currentTemp.textContent = current?.temperature ? `${current.temperature}°` : '--°';
        }

        if (todayIcon) {
            todayIcon.textContent = today ? this.getWeatherIcon(today.code) : '🌤️';
        }

        if (todayRange) {
            todayRange.textContent = today ? `${today.min}~${today.max}°` : '--~--°';
        }

        const getWeekday = (offset) => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return d.toLocaleDateString('zh-CN', { weekday: 'short' }).replace('星期', '周');
        };

        if (tomorrowLabel) {
            tomorrowLabel.textContent = getWeekday(1);
        }

        if (tomorrowIcon) {
            tomorrowIcon.textContent = tomorrow ? this.getWeatherIcon(tomorrow.code) : '🌦️';
        }

        if (tomorrowTemp) {
            tomorrowTemp.textContent = tomorrow ? `${tomorrow.min}~${tomorrow.max}°` : '--~--°';
        }

        if (dayafterLabel) {
            dayafterLabel.textContent = getWeekday(2);
        }

        if (dayafterIcon) {
            dayafterIcon.textContent = dayAfterTomorrow ? this.getWeatherIcon(dayAfterTomorrow.code) : '☁️';
        }

        if (dayafterTemp) {
            dayafterTemp.textContent = dayAfterTomorrow ? `${dayAfterTomorrow.min}~${dayAfterTomorrow.max}°` : '--~--°';
        }

        const parts = [];
        if (current?.temperature) parts.push(`当前 ${current.temperature}°`);
        if (today) parts.push(`今天 ${today.min}~${today.max}°`);
        if (tomorrow) parts.push(`${getWeekday(1)} ${this.getWeatherIcon(tomorrow.code)} ${tomorrow.min}~${tomorrow.max}°`);
        if (dayAfterTomorrow) parts.push(`${getWeekday(2)} ${this.getWeatherIcon(dayAfterTomorrow.code)} ${dayAfterTomorrow.min}~${dayAfterTomorrow.max}°`);
        weatherBtn.title = `天气城市：${city}，点击切换\n${parts.join('\n') || '天气加载中'}`;
    }


    /**
     * 绑定多选功能事件
     */
    bindBatchSelectionEvents() {
        // 全选/取消全选
        document.querySelectorAll('.select-all-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const type = e.target.dataset.type;
                const container = document.getElementById(type + 'List');
                const itemCheckboxes = container.querySelectorAll('.item-select-checkbox');

                itemCheckboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const itemId = cb.dataset.id;
                    if (e.target.checked) {
                        this.selectedItems.add(itemId);
                    } else {
                        this.selectedItems.delete(itemId);
                    }
                });

                this.updateBatchButtons(type);
            });
        });

        // 批量完成按钮
        document.querySelectorAll('.btn-batch-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.closest('.btn-batch-complete').dataset.type;
                this.batchComplete(type);
            });
        });

        // 批量删除按钮
        document.querySelectorAll('.btn-batch-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.closest('.btn-batch-delete').dataset.type;
                this.batchDelete(type);
            });
        });

        // 事项选择复选框（事件委托）
        ['todoList', 'meetingList', 'documentList'].forEach(listId => {
            const container = document.getElementById(listId);
            if (container) {
                container.addEventListener('change', (e) => {
                    if (e.target.classList.contains('item-select-checkbox')) {
                        const itemId = e.target.dataset.id;
                        const type = e.target.dataset.type;

                        if (e.target.checked) {
                            this.selectedItems.add(itemId);
                        } else {
                            this.selectedItems.delete(itemId);
                        }

                        this.updateBatchButtons(type);
                        this.updateSelectAllCheckbox(type);
                    }
                });
            }
        });
    }

    bindBoardCardEvents() {
        [ITEM_TYPES.TODO, ITEM_TYPES.MEETING, ITEM_TYPES.DOCUMENT].forEach(type => {
            const container = document.getElementById(type + 'List');
            if (!container) return;

            container.addEventListener('click', async (e) => {
                const card = e.target.closest('.card');
                if (!card) return;

                const itemId = parseInt(card.dataset.id);
                const itemType = card.dataset.type;

                if (Number.isNaN(itemId) || itemType !== type) {
                    return;
                }

                if (e.target.closest('.expand-btn')) {
                    e.stopPropagation();
                    this.toggleCardDetail(card);
                    return;
                }

                if (e.target.closest('.complete-btn')) {
                    e.stopPropagation();
                    await this.toggleItemComplete(itemId, itemType, card.dataset.completed !== 'true');
                    return;
                }

                if (e.target.closest('.pin-btn')) {
                    e.stopPropagation();
                    await this.toggleItemPin(itemId, itemType, card.dataset.pinned !== 'true');
                    return;
                }

                if (e.target.closest('.sink-btn')) {
                    e.stopPropagation();
                    await this.toggleItemSink(itemId, itemType, card.dataset.sunk !== 'true');
                    return;
                }

                if (e.target.closest('.delete-btn')) {
                    e.stopPropagation();
                    await this.showDeleteConfirm(itemId);
                    return;
                }

                if (e.target.closest('.edit-btn') || e.target.closest('.card-title')) {
                    e.stopPropagation();
                    const item = await this.getEffectiveDocumentItemById(itemId);
                    if (item) {
                        await this.editItem(item);
                    }
                }
            });
        });
    }







    _createSvgIcon(pathsData) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        pathsData.forEach(({ tag, attrs }) => {
            const el = document.createElementNS(svgNS, tag);
            Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
            svg.appendChild(el);
        });
        return svg;
    }

    createPinIcon(filled) {
        return this._createSvgIcon([
            { tag: 'path', attrs: { d: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z', fill: filled ? 'currentColor' : 'none' } }
        ]);
    }

    createSinkIcon(filled) {
        return this._createSvgIcon([
            { tag: 'path', attrs: { d: 'M12 22L8.91 15.74L2 14.73L7 9.86L5.82 2.98L12 6.23L18.18 2.98L17 9.86L22 14.73L15.09 15.74L12 22Z', fill: filled ? 'currentColor' : 'none' } }
        ]);
    }

    createCheckIcon() {
        return this._createSvgIcon([
            { tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }
        ]);
    }

    createEditIcon() {
        return this._createSvgIcon([
            { tag: 'path', attrs: { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' } },
            { tag: 'path', attrs: { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' } }
        ]);
    }

    createDeleteIcon() {
        return this._createSvgIcon([
            { tag: 'polyline', attrs: { points: '3 6 5 6 21 6' } },
            { tag: 'path', attrs: { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' } }
        ]);
    }

    createExpandIcon(isExpanded) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');

        const polyline = document.createElementNS(svgNS, 'polyline');
        polyline.setAttribute('points', isExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9');
        svg.appendChild(polyline);

        return svg;
    }

    updateExpandButtonIcon(expandBtn, isExpanded) {
        if (!expandBtn) return;
        expandBtn.replaceChildren(this.createExpandIcon(isExpanded));
    }



    renderSimpleSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.replaceChildren();
        const fragment = document.createDocumentFragment();

        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            fragment.appendChild(optionEl);
        });

        select.appendChild(fragment);
    }

    renderWeekdayCheckboxes(containerId, inputName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.replaceChildren();

        const fragment = document.createDocumentFragment();

        WEEKDAY_OPTIONS.forEach(option => {
            const label = document.createElement('label');
            label.className = 'checkbox-inline';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = inputName;
            input.value = option.value;

            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${option.shortLabel || option.label}`));
            fragment.appendChild(label);
        });

        container.appendChild(fragment);
    }

    toggleCardDetail(card) {
        const expandBtn = card.querySelector('.expand-btn');
        const detailEl = card.querySelector('.card-detail');
        if (!expandBtn || !detailEl) {
            return;
        }

        const isExpanded = detailEl.style.display !== 'none';
        detailEl.style.display = isExpanded ? 'none' : 'block';
        this.updateExpandButtonIcon(expandBtn, !isExpanded);
    }

    /**
     * 更新批量操作按钮显示状态
     */
    updateBatchButtons(type) {
        const container = document.querySelector(`.board-column[data-type="${type}"]`);
        if (!container) return;

        const completeBtn = container.querySelector('.btn-batch-complete');
        const deleteBtn = container.querySelector('.btn-batch-delete');
        const containerElement = document.getElementById(type + 'List');

        // 计算该类型的选中项数量
        const selectedCount = Array.from(containerElement?.querySelectorAll('.item-select-checkbox:checked') || []).length;

        if (selectedCount > 0) {
            completeBtn.style.display = 'inline-flex';
            deleteBtn.style.display = 'inline-flex';
            completeBtn.title = `完成选中项 (${selectedCount})`;
            deleteBtn.title = `删除选中项 (${selectedCount})`;
        } else {
            completeBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
        }
    }

    /**
     * 更新全选复选框状态
     */
    updateSelectAllCheckbox(type) {
        const selectAllCheckbox = document.querySelector(`.select-all-checkbox[data-type="${type}"]`);
        if (!selectAllCheckbox) return;

        const container = document.getElementById(type + 'List');
        const itemCheckboxes = container?.querySelectorAll('.item-select-checkbox') || [];
        const checkedCheckboxes = container?.querySelectorAll('.item-select-checkbox:checked') || [];

        if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === itemCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    /**
     * 批量完成
     */
    async batchComplete(type) {
        const container = document.getElementById(type + 'List');
        const selectedCheckboxes = container?.querySelectorAll('.item-select-checkbox:checked') || [];

        if (selectedCheckboxes.length === 0) {
            this.showError('请先选择要完成的项');
            return;
        }

        const itemIds = Array.from(selectedCheckboxes).map(cb => {
            const id = parseInt(cb.dataset.id);
            if (isNaN(id)) {
                console.error('无效的ID:', cb.dataset.id);
            }
            return id;
        }).filter(id => !isNaN(id));

        if (itemIds.length === 0) {
            this.showError('未找到有效的事项');
            return;
        }

        try {
            for (const itemId of itemIds) {
                const result = await db.updateItem(itemId, {
                    completed: true,
                    completedAt: new Date().toISOString(),
                            ...(type === ITEM_TYPES.DOCUMENT && { progress: DOCUMENT_PROGRESS.COMPLETED })
                });

            }

            // 强制重新加载数据
            await this.loadItems();


            // 同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }

            // 清除选中状态
            this.selectedItems.clear();
            this.updateBatchButtons(type);
            this.updateSelectAllCheckbox(type);

            this.showSuccess(`已完成 ${itemIds.length} 个事项`);
        } catch (error) {
            console.error('批量完成失败:', error);
            this.showError('批量完成失败: ' + error.message);
        }
    }

    /**
     * 批量删除
     */
    async batchDelete(type) {
        const container = document.getElementById(type + 'List');
        const selectedCheckboxes = container?.querySelectorAll('.item-select-checkbox:checked') || [];

        if (selectedCheckboxes.length === 0) {
            this.showError('请先选择要删除的项');
            return;
        }

        const itemIds = Array.from(selectedCheckboxes).map(cb => {
            const id = parseInt(cb.dataset.id);
            if (isNaN(id)) {
                console.error('无效的ID:', cb.dataset.id);
            }
            return id;
        }).filter(id => !isNaN(id));

        if (itemIds.length === 0) {
            this.showError('未找到有效的事项');
            return;
        }

        if (!confirm(`确定要删除选中的 ${itemIds.length} 个事项吗？此操作不可恢复。`)) {
            return;
        }

        try {
            // 保存删除的项目用于撤回
            const deletedItems = [];
            for (const itemId of itemIds) {
                const item = await db.getItem(itemId);
                if (item) deletedItems.push(item);
                await db.deleteItem(itemId);

            }

            // 保存历史用于撤回
            if (deletedItems.length > 0) {
                this.saveUndoHistory('delete', { items: deletedItems });
                if (syncManager.isLoggedIn()) {
                    deletedItems.forEach(item => syncManager.markItemDeleted(item));
                }
            }

            // 强制重新加载数据
            await this.loadItems();


            // 同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }

            // 清除选中状态
            this.selectedItems.clear();
            this.updateBatchButtons(type);
            this.updateSelectAllCheckbox(type);

            this.showSuccess(`已删除 ${itemIds.length} 个事项`);
        } catch (error) {
            console.error('批量删除失败:', error);
            this.showError('批量删除失败: ' + error.message);
        }
    }

    /**
     * 跳转到指定日期的日视图
     */
    goToDateView(dateStr) {
        return this.dateViewController.goToDateView(dateStr);
    }

    /**
     * 绑定同步功能事件
     */
    bindSyncEvents() {
        // 打开同步弹窗
        document.getElementById('syncBtn')?.addEventListener('click', () => this.openSyncModal());
        document.getElementById('closeSyncModal')?.addEventListener('click', () => this.hideModal('syncModal'));

        // 登录注册
        document.getElementById('loginBtn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('registerBtn')?.addEventListener('click', () => this.handleRegister());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('toggleLoginPassword')?.addEventListener('click', () => this.toggleLoginPasswordVisibility());

        // 修改密码
        document.getElementById('showChangePasswordBtn')?.addEventListener('click', () => this.showChangePasswordPanel());
        document.getElementById('cancelChangePasswordBtn')?.addEventListener('click', () => this.hideChangePasswordPanel());
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.handleChangePassword());

        // 同步操作
        document.getElementById('syncUploadBtn')?.addEventListener('click', () => this.syncToCloud());
        document.getElementById('syncDownloadBtn')?.addEventListener('click', () => this.syncFromCloud());

        // 文件导入导出
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('exportDataBtn2')?.addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput')?.click();
        });
        document.getElementById('importDataBtn2')?.addEventListener('click', () => {
            document.getElementById('importFileInput')?.click();
        });
        document.getElementById('importFileInput')?.addEventListener('change', (e) => this.importData(e));

        document.getElementById('exportBackupFileBtn')?.addEventListener('click', () => this.handleExportBackupFile());
        document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.handleRestoreBackup());

        // 监听登录状态变化
        document.addEventListener('syncLoginStatusChanged', (e) => {
            this.updateLoginUI(e.detail);
        });

        // 监听云端数据同步完成（恢复会话时 / 实时同步）
        document.addEventListener('syncDataLoaded', async (e) => {

            await this.loadItems();
            if (e.detail.syncResult && e.detail.syncResult.itemCount > 0) {
                this.showSuccess(`已从云端同步 ${e.detail.syncResult.itemCount} 个事项`);
            }
        });

        // 监听远程数据变更（实时同步）
        document.addEventListener('syncRemoteDataChanged', async (e) => {

            if (!syncManager.isSyncing) {
                const result = await syncManager.silentSyncFromCloud();
                if (result?.success) {
                    await this.loadItems();
                }
            }
        });

        // 页面获得焦点时执行智能同步
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && syncManager.isLoggedIn()) {

                await syncManager.smartSync();
            }
        });

        document.addEventListener('syncError', (e) => {
            const msg = e.detail?.message || '同步失败';
            this.showMessage(msg, 'info');
        });

        window.addEventListener('offline', () => {
            this.showMessage('网络已断开，部分功能暂不可用', 'info');
        });

        window.addEventListener('online', () => {
            this.showMessage('网络已恢复', 'success');
            if (syncManager.isLoggedIn()) {
                syncManager.smartSync();
            }
        });
    }

    /**
     * 打开同步弹窗
     */
    async openSyncModal() {
        this.updateLoginUI({
            isLoggedIn: syncManager.isLoggedIn(),
            username: syncManager.getUsername()
        });
        this.showModal('syncModal');

        await this.loadRememberedLogin();
    }

    /**
     * 加载记住的登录信息
     */
    async loadRememberedLogin() {
        const remembered = SecurityUtils.safeGetStorage('office_remembered_login');
        if (!remembered) return;

        const data = safeJsonParse(remembered, null);
        if (!data) return;

        const currentDevice = navigator.userAgent.slice(0, 50);
        if (data.device !== currentDevice) return;

        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const rememberCheckbox = document.getElementById('rememberPassword');

        if (usernameInput) usernameInput.value = data.username || '';
        if (passwordInput) {
            if (data.password) {
                if (data.enc === 'v2' && typeof cryptoManager !== 'undefined') {
                    try {
                        passwordInput.value = await cryptoManager.decrypt(data.password);
                    } catch (e) {
                        console.warn('记住密码解密失败，请重新输入');
                        if (rememberCheckbox) rememberCheckbox.checked = false;
                    }
                } else {
                    if (rememberCheckbox) rememberCheckbox.checked = false;
                }
            } else {
                passwordInput.value = '';
            }
        }
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    /**
     * 更新登录UI
     */
    updateLoginUI(detail) {
        const loginPanel = document.getElementById('loginPanel');
        const loggedInPanel = document.getElementById('loggedInPanel');
        const statusEl = document.getElementById('loginStatus');
        const modalTitle = document.getElementById('syncModalTitle');

        if (detail.isLoggedIn) {
            if (loginPanel) loginPanel.style.display = 'none';
            if (loggedInPanel) loggedInPanel.style.display = 'block';
            if (statusEl) {
                statusEl.querySelector('.sync-status-icon').classList.add('enabled');
                statusEl.querySelector('.sync-status-text').textContent = '已登录';
            }
            if (modalTitle) modalTitle.textContent = '数据同步';

            const usernameEl = document.getElementById('loggedInUsername');
            if (usernameEl) usernameEl.textContent = detail.username;

            const lastSyncEl = document.getElementById('lastSyncInfo');
            if (lastSyncEl && syncManager.lastSyncTime) {
                const date = new Date(syncManager.lastSyncTime);
                lastSyncEl.textContent = `上次同步: ${date.toLocaleString()}`;
            }
        } else {
            if (loginPanel) loginPanel.style.display = 'block';
            if (loggedInPanel) loggedInPanel.style.display = 'none';
            if (statusEl) {
                statusEl.querySelector('.sync-status-icon').classList.remove('enabled');
                statusEl.querySelector('.sync-status-text').textContent = '未登录';
            }
            if (modalTitle) modalTitle.textContent = '登录同步';
        }
    }

    /**
     * 处理登录
     */
    async handleLogin() {
        if (this._loginBusy) return;
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberPassword = document.getElementById('rememberPassword')?.checked;

        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }

        this._loginBusy = true;
        this.showLoading(true, '登录中...');

        try {
            const result = await syncManager.login(username, password);
            this.showSuccess(result.message);
            this.updateLoginUI({ isLoggedIn: true, username: username });

            // 处理记住密码
            if (rememberPassword) {
                try {
                    if (typeof cryptoManager !== 'undefined') {
                        const encPassword = await cryptoManager.encrypt(password);
                        SecurityUtils.safeSetStorage('office_remembered_login', JSON.stringify({
                            username: username,
                            password: encPassword,
                            enc: 'v2',
                            device: navigator.userAgent.slice(0, 50)
                        }));
                    }
                } catch (e) {
                    console.warn('记住密码加密失败，跳过记住');
                }
            } else {
                SecurityUtils.safeRemoveStorage('office_remembered_login');
            }

            // 登录成功后立即从云端同步数据
            this.showLoading(true, '正在同步数据...');
            const syncResult = await syncManager.syncFromCloud((progress) => {
                this.updateLoadingText(progress);
            });


            await this.loadItems(); // 刷新数据
            this.showSuccess(`登录成功！${syncResult.message}`);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
            this._loginBusy = false;
        }
    }

    /**
     * 处理注册
     */
    async handleRegister() {
        if (this._loginBusy) return;
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }

        if (password.length < 6) {
            this.showError('密码至少需要6位');
            return;
        }

        this._loginBusy = true;
        this.showLoading(true, '注册中...');

        try {
            const result = await syncManager.register(username, password);
            this.showSuccess(result.message);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
            this._loginBusy = false;
        }
    }

    /**
     * 处理退出登录
     */
    async handleLogout() {
        this.showLoading(true, '正在退出...');

        try {
            await syncManager.logout();
            // 清除本地数据
            await db.clearAllItems();
            // 清除本地附属数据
            [
                'office_links',
                'office_tools',
                'office_weather_city',
                'office_contacts',
                'office_schedule_content',
                'office_memo_content',
                'office_countdown_events',
                'office_countdown_type_colors',
                'office_countdown_sort_order'
            ].forEach(key => SecurityUtils.safeRemoveStorage(key));
            this.contacts = [];
            this.currentWeatherData = null;
            this.weatherForecastSummary = [];
            this.lastWeatherUpdatedAt = null;
            // 清除记住的登录信息（退出时不删除，让用户下次还能免输入）
            // localStorage.removeItem('office_remembered_login');
            // 清空登录表单
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const rememberCheckbox = document.getElementById('rememberPassword');
            // 如果记住了密码，保留填充；否则清空
            const remembered = SecurityUtils.safeGetStorage('office_remembered_login');
            if (!remembered) {
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (rememberCheckbox) rememberCheckbox.checked = false;
            }
            // 重新加载默认数据
            this.loadLinks();
            this.loadTools();
            this.loadContacts();
            this.renderCountdownPanel();
            this.updateCountdownNotice();
            this.updateHeaderWeatherDisplay();
            const weatherBody = document.getElementById('weatherBody');
            if (weatherBody) {
                this.renderWeatherStatus('正在获取天气...', 'weather-loading');
            }
            this.refreshHeaderWeather(true).catch(error => {
                console.warn('退出后天气重置失败:', error?.message || error);
            });
            const scheduleText = document.getElementById('scheduleText');
            const scheduleStatus = document.getElementById('scheduleStatus');
            if (scheduleText) scheduleText.value = '';
            if (scheduleStatus) scheduleStatus.textContent = '登录后可同步云端';
            const memoText = document.getElementById('memoText');
            const memoStatus = document.getElementById('memoStatus');
            if (memoText) memoText.value = '';
            if (memoStatus) memoStatus.textContent = '登录后可同步云端';
            // 刷新显示
            await this.loadItems();
            this.showSuccess('已退出登录');
            this.updateLoginUI({ isLoggedIn: false });
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 切换登录密码显示
     */
    toggleInputVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    toggleLoginPasswordVisibility() { this.toggleInputVisibility('loginPassword'); }

    /**
     * 显示修改密码面板
     */
    showChangePasswordPanel() {
        const panel = document.getElementById('changePasswordPanel');
        if (panel) {
            panel.style.display = 'block';
            // 预填充当前用户名
            const usernameInput = document.getElementById('loginUsername');
            const cpUsernameInput = document.getElementById('cpUsername');
            if (usernameInput && cpUsernameInput) {
                cpUsernameInput.value = usernameInput.value;
            }
        }
    }

    /**
     * 隐藏修改密码面板
     */
    hideChangePasswordPanel() {
        const panel = document.getElementById('changePasswordPanel');
        if (panel) {
            panel.style.display = 'none';
            // 清空输入
            document.getElementById('cpUsername').value = '';
            document.getElementById('cpOldPassword').value = '';
            document.getElementById('cpNewPassword').value = '';
            document.getElementById('cpConfirmPassword').value = '';
        }
    }

    /**
     * 处理修改密码
     */
    async handleChangePassword() {
        const username = document.getElementById('cpUsername').value.trim();
        const oldPassword = document.getElementById('cpOldPassword').value;
        const newPassword = document.getElementById('cpNewPassword').value;
        const confirmPassword = document.getElementById('cpConfirmPassword').value;

        if (!username || !oldPassword || !newPassword || !confirmPassword) {
            this.showError('请填写完整信息');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('两次输入的新密码不一致');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('新密码至少需要6位');
            return;
        }

        this.showLoading(true, '正在修改密码...');

        try {
            const result = await syncManager.changePassword(username, oldPassword, newPassword);
            this.showSuccess(result.message);
            this.hideChangePasswordPanel();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 同步到云端
     */
    async syncToCloud() {
        if (this._syncBusy) {
            this.showMessage('正在同步中，请稍后再试', 'info');
            return;
        }
        this._syncBusy = true;
        this.showLoading(true, '正在上传...');

        try {
            const result = await syncManager.syncToCloud((progress) => {
                this.updateLoadingText(progress);
            });

            if (result?.success) {
                this.showSuccess(result.message || '上传成功');
            } else {
                this.showError(result?.message || '上传失败');
            }
            this.updateLoginUI({ isLoggedIn: true, username: syncManager.getUsername() });
        } catch (error) {
            this.showError('上传失败: ' + error.message);
        } finally {
            this.showLoading(false);
            this._syncBusy = false;
        }
    }

    /**
     * 从云端同步
     */
    async syncFromCloud() {
        if (this._syncBusy) {
            this.showMessage('正在同步中，请稍后再试', 'info');
            return;
        }
        this._syncBusy = true;
        this.showLoading(true, '正在下载...');

        try {
            const result = await syncManager.syncFromCloud((progress) => {
                this.updateLoadingText(progress);
            });

            if (result?.success) {
                this.showSuccess(result.message || '下载成功');
                await this.loadItems();
            } else {
                this.showError(result?.message || '下载失败');
            }
            this.updateLoginUI({ isLoggedIn: true, username: syncManager.getUsername() });
        } catch (error) {
            this.showError('下载失败: ' + error.message);
        } finally {
            this.showLoading(false);
            this._syncBusy = false;
        }
    }

    /**
     * 更新加载文字
     */
    updateLoadingText(text) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * 旧的同步方法（保留兼容性）
     */
    updateSyncStatus() {
        // 兼容性方法，不再使用
    }

    loadSyncConfig() {
        // 兼容性方法，不再使用
    }

    switchSyncTab(tab) {
        // 兼容性方法，不再使用
    }

    async saveSyncConfig() {
        // 兼容性方法，不再使用
    }

    async testSyncConfig() {
        // 兼容性方法，不再使用
    }

    toggleSupabaseKeyVisibility() {}

    toggleExportPasswordVisibility() {}

    async syncBidirectional() {
        // 兼容性方法，使用新的同步方法
        await this.syncToCloud();
        await this.syncFromCloud();
    }

    /**
     * 切换主题菜单
     */
    toggleThemeMenu() {
        const menu = document.getElementById('themeMenu');
        if (menu) {
            menu.classList.toggle('active');
        }
    }

    /**
     * 切换NLP输入区域折叠/展开
     */
    toggleNlpSection() {
        const section = document.getElementById('nlpSection');
        if (section) {
            if (section.classList.contains('collapsed')) {
                section.classList.remove('collapsed');
                section.classList.add('expanded');
                // 自动聚焦输入框
                setTimeout(() => document.getElementById('nlpInput')?.focus(), 100);
            } else {
                section.classList.remove('expanded');
                section.classList.add('collapsed');
            }
        }
    }

    /**
     * 设置主题
     */
    setTheme(theme, { sync = true } = {}) {
        document.documentElement.setAttribute('data-theme', theme);
        SecurityUtils.safeSetStorage('theme', theme);

        // 更新选中状态
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        // 关闭菜单
        const menu = document.getElementById('themeMenu');
        if (menu) menu.classList.remove('active');

        // 用户主动切换时同步云端，避免旧值覆盖；加载时跳过
        if (sync && typeof syncManager !== 'undefined' && syncManager.isLoggedIn?.()) {
            syncManager.immediateSyncToCloud?.();
        }
    }

    /**
     * 加载保存的主题
     */
    loadTheme() {
        const savedTheme = SecurityUtils.safeGetStorage('theme') || 'default';
        this.setTheme(savedTheme, { sync: false });
    }

    /**
     * 初始化日期选择器
     */
    initDatePicker() {
        return this.dateViewController.initDatePicker();
    }

    onDatePickerChange(e) {
        return this.dateViewController.onDatePickerChange(e);
    }

    applySelectedDate(dateStr, shouldLoadItems = true) {
        return this.dateViewController.applySelectedDate(dateStr, shouldLoadItems);
    }

    /**
     * 打开API Key设置弹窗
     */
    async openApiKeyModal() {
        const deepseekInput = document.getElementById('apiKeyInput');
        const kimiInput = document.getElementById('kimiApiKeyInput');
        const qweatherInput = document.getElementById('qweatherApiKeyInput');

        if (deepseekInput) {
            deepseekInput.value = ocrManager.getApiKey() || '';
            deepseekInput.type = 'password';
        }

        if (kimiInput) {
            kimiInput.value = ocrManager.getKimiApiKey() || '';
            kimiInput.type = 'password';
        }

        if (qweatherInput) {
            qweatherInput.value = await cryptoManager.secureGetSecret('qweather_api_key') || '';
            qweatherInput.type = 'password';
        }

        await this.updateApiKeyStatus();
        this.showModal('apiKeyModal');
    }

    /**
     * 更新API Key状态显示
     */
    async updateApiKeyStatus() {
        const statusEl = document.getElementById('apiKeyStatus');
        if (!statusEl) return;

        const deepseekKey = ocrManager.getApiKey();
        const kimiKey = ocrManager.getKimiApiKey();
        const qweatherKey = await cryptoManager.secureGetSecret('qweather_api_key');

        const aiConfigured = [];
        if (kimiKey) aiConfigured.push('Kimi');
        if (deepseekKey) aiConfigured.push('DeepSeek');

        const hasWeatherKey = !!qweatherKey;
        const hasAnyConfig = aiConfigured.length > 0 || hasWeatherKey;

        statusEl.className = hasAnyConfig
            ? 'api-key-status configured'
            : 'api-key-status';

        const icon = document.createElement('span');
        icon.className = 'status-icon';
        icon.textContent = hasAnyConfig ? '✅' : '○';

        const text = document.createElement('span');
        text.className = 'status-text';

        const aiText = aiConfigured.length > 0
            ? `AI增强已启用（${aiConfigured.join(' + ')}）`
            : '使用基础解析';
        const weatherText = hasWeatherKey
            ? '天气使用和风天气'
            : '天气使用免费服务';
        text.textContent = `${aiText}  ${weatherText}`;

        statusEl.replaceChildren(icon, text);
    }

    toggleApiKeyVisibility() { this.toggleInputVisibility('apiKeyInput'); }

    toggleKimiApiKeyVisibility() { this.toggleInputVisibility('kimiApiKeyInput'); }

    toggleQweatherApiKeyVisibility() { this.toggleInputVisibility('qweatherApiKeyInput'); }

    /**
     * 测试API Key连接
     */
    async testApiKeyConnection() {
        const deepseekKey = document.getElementById('apiKeyInput')?.value?.trim();
        const kimiKey = document.getElementById('kimiApiKeyInput')?.value?.trim();
        const qweatherKey = document.getElementById('qweatherApiKeyInput')?.value?.trim();

        if (!deepseekKey && !kimiKey && !qweatherKey) {
            this.showError('请输入至少一个 API Key');
            return;
        }

        this.showLoading(true, '正在测试连接...');

        let successCount = 0;
        const messages = [];

        if (deepseekKey) {
            try {
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${deepseekKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-v4-flash',
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 5
                    })
                });

                if (response.ok) {
                    messages.push('DeepSeek ✓');
                    successCount++;
                } else {
                    messages.push('DeepSeek ✗');
                }
            } catch (e) {
                messages.push('DeepSeek ✗');
            }
        }

        if (kimiKey) {
            try {
                const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${kimiKey}`
                    },
                    body: JSON.stringify({
                        model: 'moonshot-v1-8k',
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 5
                    })
                });

                if (response.ok) {
                    messages.push('Kimi ✓');
                    successCount++;
                } else {
                    messages.push('Kimi ✗');
                }
            } catch (e) {
                messages.push('Kimi ✗');
            }
        }

        if (qweatherKey) {
            try {
                const response = await fetch(`https://n55ctw84yb.re.qweatherapi.com/v7/weather/now?location=120.60,31.29&lang=zh&unit=m&key=${encodeURIComponent(qweatherKey)}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    messages.push('和风天气 ✗');
                } else {
                    const data = await response.json();
                    if (data.code === '200' && data.now) {
                        messages.push('和风天气 ✓');
                        successCount++;
                    } else {
                        messages.push('和风天气 ✗');
                    }
                }
            } catch (e) {
                messages.push('和风天气 ✗');
            }
        }

        this.showLoading(false);

        if (successCount > 0) {
            this.showSuccess(`连接成功: ${messages.join('，')}`);
        } else {
            this.showError(`连接失败: ${messages.join('，')}`);
        }
    }

    /**
     * 保存API Key
     */
    async saveApiKey() {
        const deepseekInput = document.getElementById('apiKeyInput');
        const kimiInput = document.getElementById('kimiApiKeyInput');
        const qweatherInput = document.getElementById('qweatherApiKeyInput');
        const deepseekKey = deepseekInput?.value?.trim();
        const kimiKey = kimiInput?.value?.trim();
        const qweatherKey = qweatherInput?.value?.trim();

        if (!deepseekKey && !kimiKey && !qweatherKey) {
            this.showError('请至少填写一个 Key');
            return;
        }

        this.showLoading(true, '正在保存...');

        try {
            if (deepseekKey) {
                const ok = await ocrManager.setApiKey(deepseekKey);
            }

            if (kimiKey) {
                await ocrManager.setKimiApiKey(kimiKey);
            }

            if (qweatherKey) {
                const ok = await cryptoManager.secureStoreSecret('qweather_api_key', qweatherKey);
                if (!ok) {
                    this.showWarning('和风天气 Key 加密存储失败，已保存到本地');
                }
                if (typeof db !== 'undefined') {
                    await db.setSetting('qweather_api_key_set', qweatherKey ? new Date().toISOString() : null);
                }
            }

            if (syncManager.isLoggedIn()) {
                syncManager.recordLocalModify();
                syncManager.immediateSyncToCloud().catch(e => console.warn('Key保存后同步失败:', e));
            }

            this.hideModal('apiKeyModal');
            if (deepseekInput) {
                deepseekInput.value = '';
                deepseekInput.type = 'password';
            }
            if (kimiInput) {
                kimiInput.value = '';
                kimiInput.type = 'password';
            }
            if (qweatherInput) {
                qweatherInput.value = '';
                qweatherInput.type = 'password';
            }

            const saved = [];
            if (deepseekKey) saved.push('DeepSeek');
            if (kimiKey) saved.push('Kimi');
            if (qweatherKey) saved.push('和风天气');

            this.showSuccess(`${saved.join('、')} Key 已保存`);
            await this.updateApiKeyStatus();
            await this.refreshHeaderWeather(true);
        } catch (error) {
            console.error('保存API Key失败:', error);
            this.showError('保存失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 解析自然语言
     * 支持新增、编辑、删除操作
     */
    async parseNaturalLanguage() {
        const input = document.getElementById('nlpInput');
        const text = input?.value?.trim();

        if (!text) {
            this.showError('请输入描述内容');
            return;
        }

        // 使用AI状态显示，不阻塞页面
        const parseBtn = document.getElementById('parseBtn');
        const showStatus = (msg) => {
            if (parseBtn) parseBtn.classList.add('btn-loading');
        };
        const hideStatus = () => {
            if (parseBtn) parseBtn.classList.remove('btn-loading');
        };

        // 异步处理，不阻塞UI
        (async () => {
            try {
                let result = null;

                // 优先使用Kimi API（如果已配置）
                const hasKimiKey = await cryptoManager.hasApiKey();

                if (hasKimiKey) {
                    try {
                        showStatus('🔄');
                        result = await kimiAPI.parseNaturalLanguage(text);
                    } catch (error) {
                        console.warn('Kimi AI解析失败，将使用内置解析:', error.message);
                    }
                }

                // 如果Kimi API不可用或失败，使用内置解析
                if (!result) {
                    showStatus('🔄');
                    const items = await ocrManager.parseWithGroq(text);
                    if (items && items.length > 0) {
                        const firstItem = items[0];
                        result = {
                            action: 'add',
                            type: firstItem.type,
                            data: firstItem.data,
                            confidence: 0.7,
                            isRecurring: firstItem.isRecurring,
                            recurringRule: firstItem.recurringRule,
                            recurringCount: firstItem.recurringCount
                        };
                    }
                }

                if (!result) {
                    this.showError('无法解析输入内容，请尝试更详细的描述');
                    hideStatus();
                    return;
                }



                // 根据操作类型执行不同的处理
                const action = result.action || 'add';
                
                let addCommitted = false;

                switch (action) {
                    case 'delete':
                        await this.executeAIDeleteCommand(result);
                        break;
                    case 'edit':
                        await this.executeAIEditCommand(result);
                        break;
                    case 'query':
                        await this.executeAIQueryCommand(result);
                        break;
                    case 'add':
                    default:
                        addCommitted = (await this.executeAIAddCommand(result)) === 'committed';
                        break;
                }

                // 仅当实际写入时才刷新和同步（用户取消预览时不处理）
                if (addCommitted || action !== 'add') {
                    input.value = '';
                    await this.loadItems();
                    if (syncManager.isLoggedIn()) {
                        await syncManager.immediateSyncToCloud();
                    }
                }

            } catch (error) {
                console.error('解析失败:', error);
                this.showError('解析失败: ' + error.message);
            } finally {
                hideStatus();
            }
        })();
    }

    /**
     * 执行AI新增命令（v5.53：走预览确认管道，与文件上传识别一致）
     * @returns {Promise<'committed'|'cancelled'|'skipped'>}
     */
    async executeAIAddCommand(result) {
        const rawItem = { type: result.type, ...result.data, source: 'nlp' };

        let newItems = [];
        if (result.isRecurring && result.recurringRule) {
            newItems = this.generateRecurringItems(rawItem, result.recurringRule, result.recurringCount || 6);
        } else {
            newItems = [rawItem];
        }

        const normalizedItems = newItems
            .map(item => ocrManager.validateAndCleanItem(item))
            .filter(item => item !== null);

        if (normalizedItems.length === 0) {
            this.showError('无法解析为有效事项');
            return 'cancelled';
        }

        const existingItems = await db.getAllItems();
        const actionPlan = ocrManager.buildRecognitionActionPlan(normalizedItems, existingItems, '自然语言输入');

        if (actionPlan.createItems.length === 0 && actionPlan.mergeUpdates.length === 0) {
            this.showSuccess(`所有 ${actionPlan.skippedItems.length} 个事项已存在，无需重复添加`);
            return 'skipped';
        }

        const previewResult = {
            success: true,
            previewOnly: true,
            actionPlan,
            items: actionPlan.createItems,
            mergedItems: actionPlan.mergeSummaries || [],
            mergedCount: actionPlan.mergeUpdates.length,
            skippedCount: actionPlan.skippedItems.length,
            text: '自然语言输入',
            metadata: { fileName: '自然语言输入', fileType: 'text', processedAt: new Date().toISOString(), recognitionMethod: 'NLP' }
        };

        const itemsSnapshot = await ocrManager.captureItemsSnapshot();
        const previewDecision = await this.showRecognitionPreview('自然语言输入', previewResult);

        if (!previewDecision?.confirmed) {
            await ocrManager.restoreItemsSnapshot(itemsSnapshot);
            return 'cancelled';
        }

        const finalResult = previewDecision.result || previewResult;
        await ocrManager.applyRecognitionActionPlan(finalResult.actionPlan, {
            text: finalResult.text || previewResult.text,
            metadata: finalResult.metadata || previewResult.metadata
        });

        const addedCount = finalResult.actionPlan.createItems.length;
        const mergedCount = finalResult.actionPlan.mergeUpdates?.length || 0;
        const total = addedCount + mergedCount;
        if (total > 1) {
            this.showSuccess(`已处理 ${total} 个事项（新增 ${addedCount}，合并 ${mergedCount}）`);
        } else {
            this.showSuccess('已添加到' + this.getTypeLabel(result.type));
        }

        return 'committed';
    }

    /**
     * 执行AI删除命令
     */
    async executeAIDeleteCommand(result) {
        const filter = result.filter || {};
        const allItems = await db.getAllItems();
        
        // 根据筛选条件找到匹配的事项
        const matchedItems = allItems.filter(item => {
            // 标题匹配
            if (filter.titleMatch) {
                const titleLower = (item.title || '').toLowerCase();
                const matchLower = filter.titleMatch.toLowerCase();
                if (!titleLower.includes(matchLower)) {
                    return false;
                }
            }
            
            // 事项类型匹配
            if (filter.itemType && filter.itemType !== 'all') {
                if (item.type !== filter.itemType) {
                    return false;
                }
            }
            
            // 日期范围匹配
            const itemDate = item.deadline?.split('T')[0] || item.date || item.docStartDate || item.docDate;
            if (filter.startDate && itemDate) {
                if (itemDate < filter.startDate) {
                    return false;
                }
            }
            if (filter.endDate && itemDate) {
                if (itemDate > filter.endDate) {
                    return false;
                }
            }
            
            // 周期性任务匹配
            if (filter.isRecurring !== undefined) {
                if (!!item.isRecurring !== filter.isRecurring) {
                    return false;
                }
            }
            
            // 完成状态匹配
            if (filter.completed !== undefined) {
                if (!!item.completed !== filter.completed) {
                    return false;
                }
            }
            
            return true;
        });

        if (matchedItems.length === 0) {
            this.showError('没有找到匹配的事项');
            return;
        }

        // 显示确认对话框
        const confirmed = await this.showAICommandConfirm(
            '删除确认',
            `将要删除 ${matchedItems.length} 个事项：`,
            matchedItems.slice(0, 10).map(item => item.title || '未命名'),
            matchedItems.length > 10 ? `...等共 ${matchedItems.length} 项` : ''
        );

        if (!confirmed) {
            this.showSuccess('已取消删除操作');
            return;
        }

        // 保存撤回历史
        this.saveUndoHistory('delete', { items: matchedItems });
        if (syncManager.isLoggedIn()) {
            matchedItems.forEach(item => syncManager.markItemDeleted(item));
        }

        // 执行删除
        for (const item of matchedItems) {
            await db.deleteItem(item.id);
        }

        this.showSuccess(`已删除 ${matchedItems.length} 个事项（可撤回）`);
    }

    /**
     * 执行AI编辑命令
     */
    async executeAIEditCommand(result) {
        const filter = result.filter || {};
        const updates = result.updates || {};
        const allItems = await db.getAllItems();
        
        // 根据筛选条件找到匹配的事项
        const matchedItems = allItems.filter(item => {
            // 标题匹配
            if (filter.titleMatch) {
                const titleLower = (item.title || '').toLowerCase();
                const matchLower = filter.titleMatch.toLowerCase();
                if (!titleLower.includes(matchLower)) {
                    return false;
                }
            }
            
            // 事项类型匹配
            if (filter.itemType && filter.itemType !== 'all') {
                if (item.type !== filter.itemType) {
                    return false;
                }
            }
            
            // 日期范围匹配
            const itemDate = item.deadline?.split('T')[0] || item.date || item.docStartDate || item.docDate;
            if (filter.startDate && itemDate) {
                if (itemDate < filter.startDate) {
                    return false;
                }
            }
            if (filter.endDate && itemDate) {
                if (itemDate > filter.endDate) {
                    return false;
                }
            }
            
            return true;
        });

        if (matchedItems.length === 0) {
            this.showError('没有找到匹配的事项');
            return;
        }

        if (Object.keys(updates).length === 0) {
            this.showError('没有指定要修改的内容');
            return;
        }

        // 构建更新描述
        const updateDesc = Object.entries(updates)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        // 显示确认对话框
        const confirmed = await this.showAICommandConfirm(
            '修改确认',
            `将要修改 ${matchedItems.length} 个事项的：${updateDesc}`,
            matchedItems.slice(0, 10).map(item => item.title || '未命名'),
            matchedItems.length > 10 ? `...等共 ${matchedItems.length} 项` : ''
        );

        if (!confirmed) {
            this.showSuccess('已取消修改操作');
            return;
        }

        // 保存撤回历史
        this.saveUndoHistory('update', { items: matchedItems.map(i => ({ ...i })) });

        // 执行更新
        for (const item of matchedItems) {
            // 清理更新字段，移除不应该更新的字段
            const cleanUpdates = { ...updates };
            delete cleanUpdates.id;
            delete cleanUpdates.createdAt;
            delete cleanUpdates.recurringGroupId;
            delete cleanUpdates.occurrenceIndex;
            
            await db.updateItem(item.id, cleanUpdates);
        }

        this.showSuccess(`已修改 ${matchedItems.length} 个事项（可撤回）`);
    }

    /**
     * 执行AI查询命令
     */
    async executeAIQueryCommand(result) {
        const filter = result.filter || {};
        const allItems = await db.getAllItems();
        
        // 根据筛选条件找到匹配的事项
        const matchedItems = allItems.filter(item => {
            if (filter.titleMatch) {
                const titleLower = (item.title || '').toLowerCase();
                const matchLower = filter.titleMatch.toLowerCase();
                if (!titleLower.includes(matchLower)) {
                    return false;
                }
            }
            
            if (filter.itemType && filter.itemType !== 'all') {
                if (item.type !== filter.itemType) {
                    return false;
                }
            }
            
            const itemDate = item.deadline?.split('T')[0] || item.date || item.docStartDate || item.docDate;
            if (filter.startDate && itemDate) {
                if (itemDate < filter.startDate) {
                    return false;
                }
            }
            if (filter.endDate && itemDate) {
                if (itemDate > filter.endDate) {
                    return false;
                }
            }
            
            return true;
        });

        if (matchedItems.length === 0) {
            this.showSuccess('没有找到匹配的事项');
        } else {
            // 显示查询结果
            this.showQueryResult(matchedItems, result.description);
        }
    }

    /**
     * 显示AI命令确认对话框
     */
    showAICommandConfirm(title, description, items, suffix = '') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'aiCommandConfirmModal';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '500px';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            const h3 = document.createElement('h3');
            h3.textContent = title;
            modalHeader.appendChild(h3);

            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            modalBody.style.padding = '20px';

            const descP = document.createElement('p');
            descP.style.cssText = 'margin-bottom: 15px; color: #666;';
            descP.textContent = description;
            modalBody.appendChild(descP);

            const listContainer = document.createElement('div');
            listContainer.style.cssText = 'max-height: 200px; overflow-y: auto; background: var(--card-bg, #f8fafc); padding: 10px; border-radius: 6px; margin-bottom: 15px;';
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin: 0; padding-left: 20px; font-size: 14px;';
            items.forEach(item => {
                const li = document.createElement('li');
                li.style.margin = '4px 0';
                li.textContent = item;
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);
            if (suffix) {
                const suffixP = document.createElement('p');
                suffixP.style.cssText = 'margin-top: 10px; color: #999; font-size: 12px;';
                suffixP.textContent = suffix;
                listContainer.appendChild(suffixP);
            }
            modalBody.appendChild(listContainer);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn-secondary';
            cancelBtn.style.padding = '8px 20px';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => { modal.remove(); resolve(false); });
            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'btn-danger';
            confirmBtn.style.cssText = 'padding: 8px 20px; background: #ef4444; color: white;';
            confirmBtn.textContent = '确认执行';
            confirmBtn.addEventListener('click', () => { modal.remove(); resolve(true); });
            btnRow.append(cancelBtn, confirmBtn);
            modalBody.appendChild(btnRow);

            modalContent.append(modalHeader, modalBody);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        });
    }

    /**
     * 显示查询结果
     */
    showQueryResult(items, description) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'queryResultModal';
        const typeLabels = { todo: '待办', meeting: '会议', document: '办文' };

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '600px';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const h3 = document.createElement('h3');
        h3.textContent = '查询结果';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'modal-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => modal.remove());
        modalHeader.append(h3, closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.padding = '20px';

        const countP = document.createElement('p');
        countP.style.cssText = 'margin-bottom: 15px; color: #666;';
        countP.textContent = `找到 ${items.length} 个匹配的事项：`;
        modalBody.appendChild(countP);

        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'max-height: 400px; overflow-y: auto;';
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 14px;';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        headRow.style.background = 'var(--header-bg, #f1f5f9)';
        ['类型', '标题', '日期'].forEach(text => {
            const th = document.createElement('th');
            th.style.cssText = 'padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);';
            th.textContent = text;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        items.forEach(item => {
            const date = item.deadline?.split('T')[0] || item.date || item.docStartDate || '-';
            const tr = document.createElement('tr');
            const tdType = document.createElement('td');
            tdType.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border-color);';
            tdType.textContent = typeLabels[item.type] || item.type;
            const tdTitle = document.createElement('td');
            tdTitle.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border-color);';
            tdTitle.textContent = item.title || '未命名';
            const tdDate = document.createElement('td');
            tdDate.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border-color);';
            tdDate.textContent = date;
            tr.append(tdType, tdTitle, tdDate);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        modalBody.appendChild(tableWrap);

        const footerDiv = document.createElement('div');
        footerDiv.style.cssText = 'margin-top: 15px; text-align: right;';
        const footerBtn = document.createElement('button');
        footerBtn.type = 'button';
        footerBtn.className = 'btn-primary';
        footerBtn.style.padding = '8px 20px';
        footerBtn.textContent = '关闭';
        footerBtn.addEventListener('click', () => modal.remove());
        footerDiv.appendChild(footerBtn);
        modalBody.appendChild(footerDiv);

        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    /**
     * 处理文件上传
     */
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const uploadBtnEl = document.getElementById('uploadBtn');
        const showStatus = (msg) => {
            if (uploadBtnEl) uploadBtnEl.classList.add('btn-loading');
        };
        const hideStatus = () => {
            if (uploadBtnEl) uploadBtnEl.classList.remove('btn-loading');
        };

        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) uploadBtn.disabled = true;

        const processFile = async (file) => {
            showStatus('准备处理文件...');

            try {
                const fileType = file.type.toLowerCase();
                const ext = file.name.split('.').pop().toLowerCase();
                const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
                const isPDF = fileType === 'application/pdf' || ext === 'pdf';

                if (!isImage && !isPDF) {
                    this.showError(`不支持的文件类型: ${file.name}，请上传图片(jpg/png)或PDF`);
                    return false;
                }

                let processedFile = file;
                if (isImage && typeof UploadFlowUtils !== 'undefined') {
                    processedFile = await UploadFlowUtils.compressImageIfNeeded(file);
                }

                const progressCallback = (msg) => showStatus(msg);
                const itemsSnapshot = await ocrManager.captureItemsSnapshot();
                const previewResult = await ocrManager.analyzeDocument(processedFile, progressCallback, { previewOnly: true });

                if (previewResult.duplicate) {
                    this.showError(`文件"${file.name}"已被处理过`);
                    return false;
                }

                const previewDecision = await this.showRecognitionPreview(file.name, previewResult);
                if (!previewDecision?.confirmed) {
                    await ocrManager.restoreItemsSnapshot(itemsSnapshot);
                    showStatus('已取消保存，本次识别结果未写入面板');
                    return false;
                }

                const finalPreviewResult = previewDecision.result || previewResult;

                showStatus('正在保存识别结果...');
                const result = await ocrManager.applyRecognitionActionPlan(finalPreviewResult.actionPlan, {
                    text: finalPreviewResult.text || previewResult.text,
                    metadata: finalPreviewResult.metadata || previewResult.metadata
                });

                this.showRecognitionLog('识别结果', this.buildRecognitionSummaryHtml(file.name, result, false));
                return true;

            } catch (error) {
                console.error('文件处理失败:', error);
                this._showRetryableError('文件处理失败: ' + error.message, () => processFile(file));
                return false;
            }
        };

        (async () => {
            let hasCommittedChanges = false;
            let shouldRefreshItems = false;

            for (const file of files) {
                const ok = await processFile(file);
                if (ok) {
                    hasCommittedChanges = true;
                    shouldRefreshItems = true;
                }
            }

            if (shouldRefreshItems) {
                await this.loadItems();
            }

            if (hasCommittedChanges && syncManager.isLoggedIn()) {

                await syncManager.immediateSyncToCloud();
            }

            hideStatus();
            event.target.value = '';
            if (uploadBtn) uploadBtn.disabled = false;
        })();
    }

    _showRetryableError(message, retryFn) {
        const color = { bg: '#ef4444', icon: '❌' };
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${color.bg}; color: white; padding: 12px 24px; border-radius: 8px;
            z-index: 9999; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideDown 0.3s ease; display: flex; align-items: center; gap: 10px;
            max-width: 90vw;
        `;
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '16px';
        iconSpan.textContent = color.icon;
        const textSpan = document.createElement('span');
        textSpan.style.flex = '1';
        textSpan.textContent = message;
        const retryBtn = document.createElement('button');
        retryBtn.style.cssText = 'background:rgba(255,255,255,0.25);color:white;border:1px solid rgba(255,255,255,0.5);padding:4px 14px;border-radius:4px;cursor:pointer;font-size:13px;white-space:nowrap;';
        retryBtn.textContent = '重试';
        retryBtn.addEventListener('click', () => {
            msgDiv.remove();
            retryFn();
        });
        msgDiv.append(iconSpan, textSpan, retryBtn);
        document.body.appendChild(msgDiv);
        setTimeout(() => {
            if (msgDiv.parentNode) {
                msgDiv.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => msgDiv.remove(), 300);
            }
        }, 8000);
    }

    /**
     * 切换视图
     */
    switchView(view) {
        return this.dateViewController.switchView(view);
    }

    /**
     * 导航日期
     */
    navigateDate(direction) {
        return this.dateViewController.navigateDate(direction);
    }

    /**
     * 回到今天
     */
    goToToday() {
        return this.dateViewController.goToToday();
    }

    /**
     * 更新日期显示
     */
    updateDateDisplay() {
        return this.dateViewController.updateDateDisplay();
    }

    async getBoardItemsForSelectedDate() {
        return this.dateViewController.getBoardItemsForSelectedDate();
    }

    getVisibleBoardItems(items) {
        return this.dateViewController.getVisibleBoardItems(items);
    }

    groupItemsByType(items) {
        return this.dateViewController.groupItemsByType(items);
    }

    /**
     * 加载事项列表
     */
    async loadItems() {
        const result = await this.dateViewController.loadItems();
        this.updateCountdownNotice();
        return result;
    }

    /**
     * 获取会议级别（用于排序）
     * 钱局 = 1（最高优先级）
     * 局长 = 2
     * 处室 = 3
     * 其他 = 4
     */
    getMeetingLevel(meeting) {
        const title = meeting.title || '';
        const attendees = meeting.attendees || [];
        let attendeeRank = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < attendees.length; i++) {
            const rank = this.getMeetingLeaderRankFromText(attendees[i]);
            if (rank < attendeeRank) attendeeRank = rank;
        }
        const titleRank = this.getMeetingLeaderRankFromText(title);
        return Math.min(attendeeRank, titleRank);
    }

    getComparableTimestamp(value) {
        const timestamp = new Date(value || 0).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    compareMeetingsByDefaultOrder(a, b) {
        const levelA = this.getMeetingLevel(a);
        const levelB = this.getMeetingLevel(b);
        if (levelA !== levelB) {
            return levelA - levelB;
        }

        const timeA = a.time || '99:99';
        const timeB = b.time || '99:99';
        if (timeA !== timeB) {
            return timeA.localeCompare(timeB);
        }

        return this.getComparableTimestamp(a.createdAt) - this.getComparableTimestamp(b.createdAt);
    }

    getCardPriorityBucket(item) {
        if (item.pinned) return 0;
        if (item.completed) return 3;
        if (item.sunk) return 2;
        return 1;
    }

    mergeMeetingListsByDefaultOrder(manualItems, insertItems) {
        const merged = [];
        let manualIndex = 0;
        let insertIndex = 0;

        while (manualIndex < manualItems.length && insertIndex < insertItems.length) {
            const manualItem = manualItems[manualIndex];
            const insertItem = insertItems[insertIndex];

            if (this.compareMeetingsByDefaultOrder(insertItem, manualItem) < 0) {
                merged.push(insertItem);
                insertIndex++;
            } else {
                merged.push(manualItem);
                manualIndex++;
            }
        }

        if (manualIndex < manualItems.length) {
            merged.push(...manualItems.slice(manualIndex));
        }

        if (insertIndex < insertItems.length) {
            merged.push(...insertItems.slice(insertIndex));
        }

        return merged;
    }

    sortMeetingItems(items, hasManualOrder) {
        const buckets = new Map([
            [0, []],
            [1, []],
            [2, []],
            [3, []]
        ]);

        items.forEach(item => {
            const bucket = this.getCardPriorityBucket(item);
            if (!buckets.has(bucket)) {
                buckets.set(bucket, []);
            }
            buckets.get(bucket).push(item);
        });

        const sortedItems = [];

        [0, 1, 2, 3].forEach(bucket => {
            const bucketItems = buckets.get(bucket) || [];
            const manualItems = bucketItems
                .filter(item => hasManualOrder(item))
                .sort((a, b) => {
                    if (a.order !== b.order) {
                        return a.order - b.order;
                    }
                    return this.getComparableTimestamp(a.createdAt) - this.getComparableTimestamp(b.createdAt);
                });
            const insertItems = bucketItems
                .filter(item => !hasManualOrder(item))
                .sort((a, b) => this.compareMeetingsByDefaultOrder(a, b));

            if (manualItems.length === 0) {
                sortedItems.push(...insertItems);
                return;
            }

            if (insertItems.length === 0) {
                sortedItems.push(...manualItems);
                return;
            }

            sortedItems.push(...this.mergeMeetingListsByDefaultOrder(manualItems, insertItems));
        });

        return sortedItems;
    }

    /**
     * 渲染列
     */
    renderColumn(type, items) {
        const container = document.getElementById(type + 'List');
        const countEl = document.getElementById(type + 'Count');

        if (!container) return;

        // 更新计数
        if (countEl) {
            countEl.textContent = items.length;
        }

        // 清空容器
        container.replaceChildren();

        // 排序逻辑
        const hasOrder = (item) => item.order !== undefined && item.order !== null;
        const hasManualOrder = (item) => hasOrder(item) && item.manualOrder === true;

        // 调试：打印排序前的状态（包含order值）


        if (type === ITEM_TYPES.MEETING) {
            items = this.sortMeetingItems(items, hasManualOrder);
        } else {
            items.sort((a, b) => {
                const priorityA = this.getCardPriorityBucket(a);
                const priorityB = this.getCardPriorityBucket(b);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                const pWeight = { high: 0, medium: 1, low: 2 };
                const pwA = pWeight[a.priority] ?? 1;
                const pwB = pWeight[b.priority] ?? 1;
                if (pwA !== pwB) return pwA - pwB;

                const aHasOrder = hasOrder(a);
                const bHasOrder = hasOrder(b);

                if (aHasOrder && bHasOrder) {
                    if (a.order !== b.order) return a.order - b.order;
                    return new Date(a.createdAt) - new Date(b.createdAt);
                }

                if (aHasOrder && !bHasOrder) return -1;
                if (bHasOrder && !aHasOrder) return 1;

                return new Date(a.createdAt) - new Date(b.createdAt);
            });
        }

        // 调试：打印排序后的项目状态


        // 渲染卡片
        items.forEach(item => {
            const card = this.createCard(item);
            container.appendChild(card);
        });
    }

    _createSelectCheckbox(itemId, itemType) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'item-select-checkbox';
        input.dataset.id = itemId;
        input.dataset.type = itemType;
        input.title = '选择';
        return input;
    }

    _createDetailSection(label, content) {
        const section = document.createElement('div');
        section.className = 'card-detail-section';
        const labelEl = document.createElement('div');
        labelEl.className = 'detail-label';
        labelEl.textContent = label;
        const contentEl = document.createElement('div');
        contentEl.className = 'detail-content';
        if (typeof content === 'string') {
            contentEl.textContent = content;
        } else {
            contentEl.appendChild(content);
        }
        section.append(labelEl, contentEl);
        return section;
    }

    _createCardActionBtn(className, title, svgIcon) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className;
        btn.title = title;
        btn.appendChild(svgIcon);
        return btn;
    }

    createCard(item) {
        const effectiveCompleted = item.type === ITEM_TYPES.DOCUMENT
            ? item.progress === DOCUMENT_PROGRESS.COMPLETED
            : !!item.completed;
        const card = document.createElement('div');
        card.className = `card ${item.type}-card${effectiveCompleted ? ' completed' : ''}${item.pinned ? ' pinned' : ''}${item.sunk ? ' sunk' : ''}`;
        card.dataset.id = item.id;
        card.dataset.type = item.type;
        card.dataset.completed = String(effectiveCompleted);
        card.dataset.pinned = String(!!item.pinned);
        card.dataset.sunk = String(!!item.sunk);
        card.draggable = true;

        const cardMain = document.createElement('div');
        cardMain.className = 'card-main';
        const cardDetail = document.createElement('div');
        cardDetail.className = 'card-detail';
        cardDetail.style.display = 'none';
        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';

        const headerRow = document.createElement('div');
        headerRow.className = 'card-header-row';
        headerRow.appendChild(this._createSelectCheckbox(item.id, item.type));

        const pinBtn = this._createCardActionBtn(
            `card-action-btn pin-btn${item.pinned ? ' pinned' : ''}`,
            item.pinned ? '取消置顶' : '置顶',
            this.createPinIcon(item.pinned)
        );
        const sinkBtn = this._createCardActionBtn(
            `card-action-btn sink-btn${item.sunk ? ' sunk' : ''}`,
            item.sunk ? '取消沉底' : '沉底',
            this.createSinkIcon(item.sunk)
        );
        const completeBtn = this._createCardActionBtn(
            `card-action-btn complete-btn${effectiveCompleted ? ' completed' : ''}`,
            effectiveCompleted ? '已完成' : '标记完成',
            this.createCheckIcon()
        );
        const expandBtn = this._createCardActionBtn('card-action-btn expand-btn', '展开/收起详情', this.createExpandIcon(false));
        const editBtn = this._createCardActionBtn('card-action-btn edit-btn', '编辑', this.createEditIcon());
        const deleteBtn = this._createCardActionBtn('card-action-btn delete-btn', '删除', this.createDeleteIcon());
        cardActions.append(pinBtn, sinkBtn, completeBtn, expandBtn, editBtn, deleteBtn);

        switch (item.type) {
            case ITEM_TYPES.TODO: {
                const priorityClass = `priority-${item.priority || 'medium'}`;
                const priorityText = { high: '急', medium: '中', low: '低' }[item.priority] || '中';
                const priorityTag = document.createElement('span');
                priorityTag.className = `priority-tag ${priorityClass}`;
                priorityTag.textContent = priorityText;
                headerRow.appendChild(priorityTag);
                if (item.isRecurring) {
                    const badge = document.createElement('span');
                    badge.className = 'recurring-badge';
                    badge.title = '周期性任务';
                    badge.textContent = '🔄';
                    headerRow.appendChild(badge);
                }
                cardMain.appendChild(headerRow);

                const titleEl = document.createElement('div');
                titleEl.className = `card-title${item.completed ? ' completed-text' : ''}`;
                titleEl.textContent = item.title;
                cardMain.appendChild(titleEl);

                const statusText = this.formatTodoCompletedTime(item.completedAt, effectiveCompleted);
                const deadlineText = !effectiveCompleted && item.deadlineManuallySet ? this.formatDeadline(item.deadline, false) : '';
                if (deadlineText) {
                    const deadlineEl = document.createElement('div');
                    deadlineEl.className = 'card-time todo-deadline';
                    deadlineEl.textContent = deadlineText;
                    cardMain.appendChild(deadlineEl);
                }
                if (statusText) {
                    const timeEl = document.createElement('div');
                    timeEl.className = 'card-time';
                    timeEl.textContent = statusText;
                    cardMain.appendChild(timeEl);
                }

                if (item.description) {
                    cardDetail.appendChild(this._createDetailSection('备注', item.description));
                }
                break;
            }

            case ITEM_TYPES.MEETING: {
                const sortedAttendees = this.sortMeetingAttendeesForDisplay(item.attendees || []);
                const attendeeStr = sortedAttendees.length > 0
                    ? (sortedAttendees.length > 3 ? sortedAttendees.slice(0, 3).join('、') + '等' : sortedAttendees.join('、'))
                    : '';

                let dateDisplay = '';
                if (item.endDate && item.endDate !== item.date) {
                    const startDate = item.date ? item.date.substring(5).replace('-', '/') : '';
                    const endDate = item.endDate.substring(5).replace('-', '/');
                    dateDisplay = `${startDate}-${endDate}`;
                }

                const meetingTitle = attendeeStr ? `【${attendeeStr}】${item.title}` : item.title;
                cardMain.appendChild(headerRow);

                const titleEl = document.createElement('div');
                titleEl.className = `card-title meeting-title${effectiveCompleted ? ' completed-text' : ''}`;
                titleEl.textContent = meetingTitle;
                cardMain.appendChild(titleEl);

                if (dateDisplay) {
                    const dateRangeEl = document.createElement('div');
                    dateRangeEl.className = 'card-date-range';
                    dateRangeEl.textContent = dateDisplay;
                    cardMain.appendChild(dateRangeEl);
                }

                const timeStr = item.endTime ? `${item.time}-${item.endTime}` : item.time;
                const timeLoc = [timeStr, item.location].filter(Boolean).join(' ');
                if (timeLoc) {
                    const timeEl = document.createElement('div');
                    timeEl.className = 'card-time';
                    timeEl.textContent = timeLoc;
                    cardMain.appendChild(timeEl);
                }

                if (sortedAttendees.length) {
                    cardDetail.appendChild(this._createDetailSection('参会人员', sortedAttendees.join('、')));
                }
                if (item.date) {
                    const dateContent = item.endDate && item.endDate !== item.date
                        ? `${item.date} 至 ${item.endDate}`
                        : item.date;
                    cardDetail.appendChild(this._createDetailSection('日期', dateContent));
                }
                if (item.agenda) {
                    cardDetail.appendChild(this._createDetailSection('议程/备注', item.agenda));
                }
                if (item.location) {
                    cardDetail.appendChild(this._createDetailSection('地点', item.location));
                }
                break;
            }

            case ITEM_TYPES.DOCUMENT: {
                const docTypeIcon = { receive: '收', send: '发', transfer: '转' }[item.docType] || '文';
                const docTypeClass = item.docType || 'receive';
                const isCompleted = item.progress === DOCUMENT_PROGRESS.COMPLETED;

                const docTypeTag = document.createElement('span');
                docTypeTag.className = `doc-type-tag ${docTypeClass}`;
                docTypeTag.textContent = docTypeIcon;
                headerRow.appendChild(docTypeTag);
                cardMain.appendChild(headerRow);

                const titleEl = document.createElement('div');
                titleEl.className = `card-title${effectiveCompleted ? ' completed-text' : ''}`;
                titleEl.textContent = item.title;
                cardMain.appendChild(titleEl);

                let docDateDisplay = '';
                const docStartDate = item.docStartDate || item.docDate;
                if (docStartDate && item.docEndDate) {
                    const start = docStartDate.substring(5).replace('-', '/');
                    const end = item.docEndDate.substring(5).replace('-', '/');
                    docDateDisplay = `${start}-${end}`;
                }
                if (docDateDisplay) {
                    const dateRangeEl = document.createElement('div');
                    dateRangeEl.className = 'card-date-range';
                    dateRangeEl.textContent = docDateDisplay;
                    cardMain.appendChild(dateRangeEl);
                }

                if (item.handler) {
                    const handlerEl = document.createElement('div');
                    handlerEl.className = 'card-handler';
                    handlerEl.textContent = `当前：${item.handler}`;
                    cardMain.appendChild(handlerEl);
                }

                if (item.docNumber) {
                    cardDetail.appendChild(this._createDetailSection('文号', item.docNumber));
                }
                if (item.source) {
                    cardDetail.appendChild(this._createDetailSection('来文单位', item.source));
                }
                if (docStartDate) {
                    const dateContent = item.docEndDate ? `${docStartDate} 至 ${item.docEndDate}` : docStartDate;
                    cardDetail.appendChild(this._createDetailSection('日期', dateContent));
                }
                if (item.handler) {
                    cardDetail.appendChild(this._createDetailSection('当前处理人', item.handler));
                }
                if (item.transferHistory?.length) {
                    const listContainer = document.createElement('div');
                    item.transferHistory.forEach(t => {
                        const row = document.createElement('div');
                        row.textContent = `${t.time} → ${t.to}`;
                        listContainer.appendChild(row);
                    });
                    const section = document.createElement('div');
                    section.className = 'card-detail-section';
                    const labelEl = document.createElement('div');
                    labelEl.className = 'detail-label';
                    labelEl.textContent = '流转记录';
                    const contentEl = document.createElement('div');
                    contentEl.className = 'detail-content transfer-list';
                    contentEl.appendChild(listContainer);
                    section.append(labelEl, contentEl);
                    cardDetail.appendChild(section);
                }
                if (item.content) {
                    cardDetail.appendChild(this._createDetailSection('内容摘要', item.content));
                }
                break;
            }
        }

        card.append(cardMain, cardDetail, cardActions);

        card.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return card;
    }

    /**
     * 编辑事项
     */
    async editItem(item) {
        const modal = document.getElementById('itemModal');
        const form = document.getElementById('itemForm');
        const titleEl = document.getElementById('modalTitle');

        // 设置标题
        const typeLabels = {
            [ITEM_TYPES.TODO]: '待办事项',
            [ITEM_TYPES.MEETING]: '会议活动',
            [ITEM_TYPES.DOCUMENT]: '办文情况'
        };
        titleEl.textContent = '编辑' + typeLabels[item.type];

        // 设置表单值
        document.getElementById('itemId').value = item.id;
        modal.dataset.mode = 'edit';
        modal.dataset.itemId = String(item.id);
        document.getElementById('itemType').value = item.type;
        document.getElementById('itemTitle').value = item.title || '';

        // 显示对应字段
        document.querySelectorAll('.type-fields').forEach(el => el.classList.remove('active'));
        document.getElementById(item.type + 'Fields')?.classList.add('active');

        // 根据类型填充字段
        switch (item.type) {
            case ITEM_TYPES.TODO:
                document.getElementById('todoPriority').value = item.priority || 'medium';
                document.getElementById('todoDeadline').value = item.deadline || '';
                document.getElementById('todoReminderAdvance').value = item.reminderAdvance || 3;
                const reminderTimeEl = document.getElementById('todoReminderTime');
                const reminderTimeGroup = document.getElementById('reminderTimeGroup');
                if (item.reminderTime) {
                    reminderTimeEl.value = item.reminderTime;
                } else {
                    reminderTimeEl.value = '09:00';
                }
                if (parseInt(document.getElementById('todoReminderAdvance').value) >= 1440) {
                    reminderTimeGroup.style.display = '';
                } else {
                    reminderTimeGroup.style.display = 'none';
                }
                
                // 周期性任务设置
                const isRecurringCheckbox = document.getElementById('isRecurring');
                const recurringFields = document.getElementById('recurringFields');
                const recurringTypeSelect = document.getElementById('recurringType');
                
                if (item.isRecurring && item.recurringRule) {
                    isRecurringCheckbox.checked = true;
                    recurringFields.style.display = 'block';
                    recurringTypeSelect.value = item.recurringRule.type || RECURRING_TYPES.WEEKLY_DAY;
                    document.getElementById('recurringCount').value = item.recurringCount || 20;
                    document.getElementById('skipWeekends').checked = item.recurringRule.skipWeekends || false;
                    document.getElementById('skipHolidays').checked = item.recurringRule.skipHolidays || false;
                    // 日期范围
                    document.getElementById('recurringStartDate').value = item.recurringRule.startDate || '';
                    document.getElementById('recurringEndDate').value = item.recurringRule.endDate || '';
                    
                    // 触发类型切换以显示对应字段
                    recurringTypeSelect.dispatchEvent(new Event('change'));
                    
                    // 填充具体的周期参数
                    setTimeout(() => {
                        if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_DATE) {
                            document.getElementById('recurringDay').value = item.recurringRule.day || '';
                        } else if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_WORKDAY) {
                            document.getElementById('nthWorkDay').value = item.recurringRule.nthWorkDay || '';
                        } else if (item.recurringRule.type === RECURRING_TYPES.WEEKLY_DAY || item.recurringRule.type === RECURRING_TYPES.BIWEEKLY_DAY) {
                            document.getElementById('weekDay').value = item.recurringRule.weekDay || 1;
                        } else if (item.recurringRule.type === RECURRING_TYPES.WEEKLY_MULTI || item.recurringRule.type === RECURRING_TYPES.BIWEEKLY_MULTI) {
                            const checkboxes = document.querySelectorAll('input[name="weekDays"]');
                            checkboxes.forEach(cb => {
                                cb.checked = (item.recurringRule.weekDays || []).includes(parseInt(cb.value));
                            });
                        } else if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_WEEKDAY) {
                            document.getElementById('monthlyNthWeek').value = item.recurringRule.nthWeek || 1;
                            document.getElementById('monthlyWeekDayValue').value = item.recurringRule.weekDay || 1;
                        }
                    }, 50);
                } else {
                    isRecurringCheckbox.checked = false;
                    recurringFields.style.display = 'none';
                }
                break;

            case ITEM_TYPES.MEETING:
                document.getElementById('meetingDate').value = item.date || '';
                document.getElementById('meetingEndDate').value = item.endDate || '';
                document.getElementById('meetingTime').value = item.time || '';
                document.getElementById('meetingEndTime').value = item.endTime || '';
                document.getElementById('meetingLocation').value = item.location || '';
                document.getElementById('meetingAttendees').value = item.attendees ? item.attendees.join('、') : '';
                document.getElementById('meetingAgenda').value = item.agenda || '';
                break;

            case ITEM_TYPES.DOCUMENT:
                document.getElementById('docType').value = item.docType || 'receive';
                document.getElementById('docNumber').value = item.docNumber || '';
                document.getElementById('docSource').value = item.source || '';
                document.getElementById('docHandler').value = item.handler || '';
                document.getElementById('docContent').value = item.content || '';
                document.getElementById('docStartDate').value = item.docStartDate || item.docDate || '';
                document.getElementById('docEndDate').value = item.docEndDate || '';
                document.getElementById('docSkipWeekend').checked = item.skipWeekend || false;
                
                // 办文周期性任务回填
                const docIsRecurringCb = document.getElementById('docIsRecurring');
                const docRecurringFieldsEl = document.getElementById('docRecurringFields');
                const docRecurringTypeEl = document.getElementById('docRecurringType');
                
                if (item.isRecurring && item.recurringRule && docIsRecurringCb && docRecurringFieldsEl) {
                    docIsRecurringCb.checked = true;
                    docRecurringFieldsEl.style.display = 'block';
                    docRecurringTypeEl.value = item.recurringRule.type || RECURRING_TYPES.WEEKLY_DAY;
                    document.getElementById('docRecurringCount').value = item.recurringCount || 20;
                    document.getElementById('docRecurringSkipWeekends').checked = item.recurringRule.skipWeekends || false;
                    document.getElementById('docRecurringSkipHolidays').checked = item.recurringRule.skipHolidays || false;
                    document.getElementById('docRecurringStartDate').value = item.recurringRule.startDate || '';
                    document.getElementById('docRecurringEndDate').value = item.recurringRule.endDate || '';
                    
                    // 触发类型切换以显示对应字段
                    this.updateDocRecurringFieldsVisibility(item.recurringRule.type);
                    
                    // 填充具体的周期参数
                    setTimeout(() => {
                        if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_DATE) {
                            document.getElementById('docRecurringDay').value = item.recurringRule.day || '';
                        } else if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_WORKDAY) {
                            document.getElementById('docNthWorkDay').value = item.recurringRule.nthWorkDay || '';
                        } else if (item.recurringRule.type === RECURRING_TYPES.WEEKLY_DAY || item.recurringRule.type === RECURRING_TYPES.BIWEEKLY_DAY) {
                            document.getElementById('docWeekDay').value = item.recurringRule.weekDay || 1;
                        } else if (item.recurringRule.type === RECURRING_TYPES.WEEKLY_MULTI || item.recurringRule.type === RECURRING_TYPES.BIWEEKLY_MULTI) {
                            const checkboxes = document.querySelectorAll('input[name="docWeekDays"]');
                            checkboxes.forEach(cb => {
                                cb.checked = (item.recurringRule.weekDays || []).includes(parseInt(cb.value));
                            });
                        } else if (item.recurringRule.type === RECURRING_TYPES.MONTHLY_WEEKDAY) {
                            document.getElementById('docMonthlyNthWeek').value = item.recurringRule.nthWeek || 1;
                            document.getElementById('docMonthlyWeekDayValue').value = item.recurringRule.weekDay || 1;
                        }
                    }, 50);
                } else if (docIsRecurringCb && docRecurringFieldsEl) {
                    docIsRecurringCb.checked = false;
                    docRecurringFieldsEl.style.display = 'none';
                }
                break;
        }

        // 存储周期性任务信息，用于编辑时判断
        const recurringGroupIdInput = document.getElementById('recurringGroupId');
        const occurrenceIndexInput = document.getElementById('occurrenceIndex');
        if (recurringGroupIdInput) recurringGroupIdInput.value = item.recurringGroupId || '';
        if (occurrenceIndexInput) occurrenceIndexInput.value = item.occurrenceIndex || '';

        this.showModal('itemModal');
        this.initRecurringEvents();
    }

    /**
     * 格式化截止时间显示
     * @param {string} deadline - 截止时间
     * @param {boolean} completed - 是否已完成
     */
    formatDeadline(deadline, completed = false) {
        if (!deadline) {
            return completed ? '✓ 已完成' : '';
        }
        
        const date = new Date(deadline);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        if (completed) {
            return `✓ 已完成 ${dateStr}`;
        }
        
        return `${dateStr}截止`;
    }

    getTodoReminderItems(items = []) {
        const now = Date.now();
        return items
            .filter(item => item?.type === ITEM_TYPES.TODO && item.deadline && !item.completed && item.deadlineManuallySet)
            .map(item => {
                const deadlineDate = new Date(item.deadline);
                if (Number.isNaN(deadlineDate.getTime())) {
                    return null;
                }
                const advanceMin = item.reminderAdvance || 3;
                let windowMs = advanceMin * 60000;
                if (item.reminderTime && advanceMin >= 1440) {
                    const advanceDays = Math.floor(advanceMin / 1440);
                    const [h, m] = item.reminderTime.split(':').map(Number);
                    const remindDate = new Date(deadlineDate);
                    remindDate.setDate(remindDate.getDate() - advanceDays);
                    remindDate.setHours(h, m, 0, 0);
                    if (!Number.isNaN(remindDate.getTime())) {
                        windowMs = deadlineDate.getTime() - remindDate.getTime();
                    }
                }
                return {
                    item,
                    deadlineDate,
                    overdueMs: now - deadlineDate.getTime(),
                    windowMs
                };
            })
            .filter(Boolean)
            .filter(entry => entry.overdueMs >= -entry.windowMs)
            .sort((a, b) => a.deadlineDate - b.deadlineDate);
    }

    getTodoReminderNoticeState() {
        const reminderItems = this.getTodoReminderItems(this.items || []);
        return {
            active: reminderItems.length > 0,
            items: reminderItems,
            currentIndex: reminderItems.length > 0
                ? this.todoReminderNoticeIndex % reminderItems.length
                : 0,
            flashing: reminderItems.length > 0 && Math.floor(Date.now() / 700) % 2 === 0
        };
    }

    formatTodoReminderRelative(deadlineDate) {
        if (!(deadlineDate instanceof Date) || Number.isNaN(deadlineDate.getTime())) {
            return '已到截止时间';
        }

        const diffMs = Date.now() - deadlineDate.getTime();
        const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) {
            return `已超时 ${days}天${hours}小时`;
        }
        if (hours > 0) {
            return `已超时 ${hours}小时${minutes}分钟`;
        }
        return `已超时 ${minutes}分钟`;
    }

    updateTodoReminderNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) {
            return false;
        }

        const badgeEl = noticeEl.querySelector('.countdown-notice-badge');
        const titleEl = noticeEl.querySelector('.countdown-notice-title');
        const descEl = noticeEl.querySelector('.countdown-notice-desc');
        const completeBtn = document.getElementById('todoReminderCompleteBtn');
        const state = this.getTodoReminderNoticeState();

        noticeEl.classList.toggle('todo-reminder-active', state.active);
        noticeEl.classList.toggle('todo-reminder-flashing', state.active && state.flashing);

        if (state.active) {
            noticeEl.classList.remove('idle-mode', 'alarm-active');
        }

        if (!state.active) {
            this.todoReminderNoticeIndex = 0;
            if (completeBtn) completeBtn.style.display = 'none';
            return false;
        }

        const current = state.items[state.currentIndex];
        if (!current) {
            if (completeBtn) completeBtn.style.display = 'none';
            return false;
        }

        if (badgeEl) {
            badgeEl.textContent = state.items.length > 1 ? `待办 ${state.currentIndex + 1}/${state.items.length}` : '待办';
        }
        if (titleEl) {
            const title = current.item.title || '';
            const overdue = current.overdueMs >= 0;
            const label = overdue ? '已到期' : '即将到期';
            titleEl.textContent = `${title} ${label}`;
            titleEl.title = `${title} ${label}`;
        }
        if (descEl) {
            const relative = this.formatTodoReminderRelative(current.deadlineDate);
            descEl.textContent = relative;
            descEl.title = relative;
        }
        if (completeBtn) {
            completeBtn.style.display = '';
            completeBtn.dataset.itemId = current.item.id;
        }

        noticeEl.hidden = false;
        return true;
    }

    startTodoReminderLoop() {
        if (this.todoReminderRefreshTimer) {
            clearInterval(this.todoReminderRefreshTimer);
            this.todoReminderRefreshTimer = null;
        }

        const tick = () => {
            if (this.checkAlarms && this.checkAlarms()) {
                return;
            }
            const state = this.getTodoReminderNoticeState();
            if (state.items.length > 1) {
                this.todoReminderNoticeIndex = (this.todoReminderNoticeIndex + 1) % state.items.length;
            } else {
                this.todoReminderNoticeIndex = 0;
            }
            this.updateCountdownNotice();
        };

        this.updateCountdownNotice();
        this.todoReminderRefreshTimer = window.setInterval(tick, 1000);
    }

    bindTodoReminderComplete() {
        const btn = document.getElementById('todoReminderCompleteBtn');
        if (!btn) return;

        let completing = false;
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (completing) return;

            const itemId = parseInt(btn.dataset.itemId);
            if (!itemId) return;

            completing = true;
            btn.textContent = '...';
            btn.style.pointerEvents = 'none';

            try {
                await this.toggleTodoComplete(itemId, true);
                this.updateCountdownNotice();
            } catch (err) {
                console.warn('通知栏完成待办失败:', err);
            } finally {
                completing = false;
                btn.textContent = '✓';
                btn.style.pointerEvents = '';
            }
        });
    }

    formatTodoCompletedTime(completedAt, completed = false) {
        if (!completed || !completedAt) {
            return '';
        }

        const date = new Date(completedAt);
        if (Number.isNaN(date.getTime())) {
            return '已完成';
        }

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes} 已完成`;
    }

    /**
     * 切换办文完成状态
     */
    async toggleDocumentComplete(id, completed) {
        try {
            const item = await db.getItem(id);
            if (!item) return;

            item.progress = completed ? DOCUMENT_PROGRESS.COMPLETED : DOCUMENT_PROGRESS.PENDING;
            item.completed = completed;
            item.completedAt = completed ? new Date().toISOString() : null;

            await db.updateItem(id, item);
            await this.loadItems();
        } catch (error) {
            console.error('更新办文状态失败:', error);
            this.showError('更新失败: ' + error.message);
        }
    }

    /**
     * 初始化拖拽功能
     */
    initDragAndDrop() {
        const columns = document.querySelectorAll('.column-content');

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => this.handleDragOver(e));
            column.addEventListener('drop', (e) => this.handleDrop(e));
            column.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    /**
     * 拖拽开始
     */
    handleDragStart(e, item) {
        const dragSource = e.currentTarget;
        this.draggedItem = item;
        this.draggedElement = dragSource;
        dragSource.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id.toString());
    }

    /**
     * 拖拽结束
     * 注意：drop事件先于dragend触发。handleDrop已处理了状态清理，
     * 这里只需清理handleDrop未涉及的样式（如拖拽取消的情况）
     */
    handleDragEnd(e) {
        const dragSource = e.currentTarget;
        dragSource.classList.remove('dragging');
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drag-above', 'drag-below');
        });
        if (this._dragOverRAF) {
            cancelAnimationFrame(this._dragOverRAF);
            this._dragOverRAF = null;
        }
        setTimeout(() => {
            if (this.draggedItem) {
                this.draggedItem = null;
                this.draggedElement = null;
            }
        }, 0);
    }

    /**
     * 拖拽悬停 - 实时移动卡片预览
     * 使用 requestAnimationFrame 优化，确保每帧都更新到最新鼠标位置
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');

        // 记录最新的鼠标位置和容器（不节流，始终记录最新位置）
        this._dragOverContainer = e.currentTarget;
        this._dragOverY = e.clientY;

        // 用 rAF 保证每帧最多执行一次 DOM 操作，且使用最新鼠标位置
        if (!this._dragOverRAF) {
            this._dragOverRAF = requestAnimationFrame(() => {
                this._dragOverRAF = null;
                const container = this._dragOverContainer;
                const y = this._dragOverY;
                if (!container || !this.draggedElement) return;

                const afterElement = this.getDragAfterElement(container, y);
                const draggedCard = this.draggedElement;

                if (afterElement) {
                    if (draggedCard.nextSibling !== afterElement) {
                        container.insertBefore(draggedCard, afterElement);
                    }
                } else {
                    if (draggedCard !== container.lastElementChild) {
                        container.appendChild(draggedCard);
                    }
                }
            });
        }
    }

    /**
     * 拖拽离开
     */
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * 获取拖拽后的元素位置
     * 返回：插入位置之后的那张卡片（鼠标在其上半部分时返回它）
     * 核心逻辑：鼠标在卡片上半部分=插入到它前面；下半部分=继续往下找
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            // 使用 <= 0 确保鼠标在卡片中心时也能正确识别
            if (offset <= 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * 放置
     * 核心策略：
     * - 同列拖动：DOM已经是正确位置（handleDragOver实时移动了），只需保存顺序到DB，不重新渲染
     * - 跨列拖动：需要更新类型并重新渲染
     */
    async handleDrop(e) {

        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedItem) {

            return;
        }


        if (this._dragOverRAF) {
            cancelAnimationFrame(this._dragOverRAF);
            this._dragOverRAF = null;
        }

        const container = e.currentTarget;
        const newType = container.id.replace('List', '');
        const isSameColumn = newType === this.draggedItem.type;
        const draggedId = this.draggedItem.id;
        const draggedCard = this.draggedElement;

        const originalItem = await db.getItem(draggedId);

        if (draggedCard && draggedCard.parentElement !== container) {
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement) {
                container.insertBefore(draggedCard, afterElement);
            } else {
                container.appendChild(draggedCard);
            }
        }

        const allCards = [...container.querySelectorAll('.card')];
        let orderedIds = allCards.map(card => parseInt(card.dataset.id));

        if (!orderedIds.includes(draggedId)) {
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const afterId = afterElement ? parseInt(afterElement.dataset.id) : null;
            let insertIndex = orderedIds.length;
            if (afterId !== null) {
                const idx = orderedIds.indexOf(afterId);
                if (idx !== -1) insertIndex = idx;
            }
            orderedIds.splice(insertIndex, 0, draggedId);
        }

        orderedIds = [...new Set(orderedIds)];

        try {
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }

            if (!isSameColumn) {
                const updates = { type: newType };
                if (originalItem) {
                    const oldType = originalItem.type;
                    const selDate = this.selectedDate;
                    if (oldType === 'todo' && newType === 'meeting') {
                        updates.date = originalItem.deadline?.split('T')[0] || selDate;
                        if (originalItem.deadline?.includes('T')) {
                            updates.time = originalItem.deadline.split('T')[1]?.substring(0, 5) || '';
                        }
                    } else if (oldType === 'todo' && newType === 'document') {
                        const dateStr = originalItem.deadline?.split('T')[0] || selDate;
                        updates.docDate = dateStr;
                        updates.docStartDate = dateStr;
                        updates.docEndDate = dateStr;
                        updates.progress = 'pending';
                    } else if (oldType === 'meeting' && newType === 'todo') {
                        const timeStr = originalItem.time || '09:00';
                        updates.deadline = `${originalItem.date || selDate}T${timeStr}`;
                    } else if (oldType === 'meeting' && newType === 'document') {
                        const dateStr = originalItem.date || selDate;
                        updates.docDate = dateStr;
                        updates.docStartDate = dateStr;
                        updates.docEndDate = dateStr;
                        updates.progress = 'pending';
                    } else if (oldType === 'document' && newType === 'todo') {
                        const dateStr = originalItem.docStartDate || originalItem.docDate || selDate;
                        updates.deadline = `${dateStr}T09:00`;
                    } else if (oldType === 'document' && newType === 'meeting') {
                        updates.date = originalItem.docStartDate || originalItem.docDate || selDate;
                    }
                }
                await db.updateItem(draggedId, updates);
            }

            await db.updateItemOrder(newType, orderedIds);

            if (isSameColumn) {
                if (draggedCard) {
                    draggedCard.classList.remove('dragging');
                }
            } else {
                await this.loadItems();
            }

            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(err => {
                    console.error('云端同步失败:', err);
                });
            }

        } catch (error) {
            console.error('移动失败:', error);
            this.showError('移动失败，请重试');
            try { await this.loadItems(); } catch(e) { console.warn('移动后刷新列表失败:', e.message); }
        }

        this.draggedItem = null;
        this.draggedElement = null;
    }

    async moveItemToDateFromCalendar(targetDate) {
        if (!this.draggedItem || !targetDate) {
            return;
        }

        const draggedId = this.draggedItem.id;
        const originalItem = await db.getItem(draggedId);
        if (!originalItem) {
            return;
        }

        const updates = {};
        if (originalItem.type === ITEM_TYPES.TODO) {
            const currentTime = originalItem.deadline?.split('T')[1] || '09:00';
            updates.deadline = `${targetDate}T${currentTime}`;
        } else if (originalItem.type === ITEM_TYPES.MEETING) {
            updates.date = targetDate;
        } else if (originalItem.type === ITEM_TYPES.DOCUMENT) {
            updates.docDate = targetDate;
            if (originalItem.docStartDate && originalItem.docEndDate) {
                updates.docStartDate = targetDate;
                updates.docEndDate = targetDate;
            } else if (originalItem.docStartDate) {
                updates.docStartDate = targetDate;
            }
        }

        try {
            this.saveUndoHistory('update', { item: originalItem });
            await db.updateItem(draggedId, updates);
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(err => {
                    console.error('云端同步失败:', err);
                });
            }
        } catch (error) {
            console.error('拖拽调整日期失败:', error);
            this.showError('拖拽调整日期失败，请重试');
            try { await this.loadItems(); } catch (refreshError) { console.warn('拖拽后刷新失败:', refreshError.message); }
        } finally {
            this.draggedItem = null;
            this.draggedElement = null;
        }
    }

    async saveCalendarItemOrder(orderedIds) {
        if (!orderedIds || orderedIds.length === 0) return;
        try {
            const itemsByType = {};
            for (const id of orderedIds) {
                const item = await db.getItem(id);
                if (!item) continue;
                if (!itemsByType[item.type]) itemsByType[item.type] = [];
                itemsByType[item.type].push(id);
            }
            for (const [type, typeIds] of Object.entries(itemsByType)) {
                if (typeIds.length > 0) {
                    await db.updateItemOrder(type, typeIds);
                }
            }
        } catch (error) {
            console.error('日历排序保存失败:', error);
        }
    }

    updateDeployVersionBadge() {
        const badge = document.getElementById('deployVersionBadge');
        if (!badge) {
            return;
        }

        const version = '2026-05-12 v5.2.82';
        const scriptVersions = ['utils.js?v=5', 'ocr.js?v=51', 'upload-flow.js?v=9', 'calendar.js?v=41', 'sync.js?v=68', 'app-date-view.js?v=13', 'countdown.js?v=3', 'links.js?v=1', 'contacts.js?v=1', 'tools.js?v=1', 'side-panels.js?v=1', 'weather.js?v=1', 'recurring.js?v=1', 'cross-date.js?v=1', 'app.js?v=216', 'db.js?v=29', 'base.css?v=1', 'layout.css?v=1', 'themes.css?v=2', 'components.css?v=1', 'responsive.css?v=1', 'crypto.js?v=17'];
        badge.textContent = `部署版本：${version}`;
        badge.dataset.version = version;
        badge.title = `当前页面部署版本：${version}\n资源：${scriptVersions.join(' / ')}`;    }

    /**
     * 获取事项的状态组（用于拖拽排序分组）
     * 返回: 'pinned' | 'active' | 'completed'
     */
    getItemGroup(item) {
        if (item.pinned) return 'pinned';
        if (item.completed) return 'completed';
        return 'active';
    }

    /**
     * 显示添加弹窗
     */
    showAddModal(type, selectedDate = this.selectedDate) {
        const modal = document.getElementById('itemModal');
        const form = document.getElementById('itemForm');
        const titleEl = document.getElementById('modalTitle');

        // 重置表单
        form.reset();
        document.getElementById('itemId').value = '';
        modal.dataset.mode = 'add';
        modal.dataset.itemId = '';
        document.getElementById('itemType').value = type;
        
        // 清除周期性任务的隐藏字段（防止编辑后残留）
        const recurringGroupIdInput = document.getElementById('recurringGroupId');
        const occurrenceIndexInput = document.getElementById('occurrenceIndex');
        if (recurringGroupIdInput) recurringGroupIdInput.value = '';
        if (occurrenceIndexInput) occurrenceIndexInput.value = '';

        // 设置标题
        const typeLabels = { todo: '待办事项', meeting: '会议活动', document: '办文情况' };
        titleEl.textContent = '添加' + typeLabels[type];

        // 显示对应字段
        document.querySelectorAll('.type-fields').forEach(el => el.classList.remove('active'));
        document.getElementById(type + 'Fields')?.classList.add('active');

        // 使用用户选择的日期作为默认日期
        const dateStr = selectedDate || this.selectedDate;
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);

        if (type === ITEM_TYPES.TODO) {
            const deadlineEl = document.getElementById('todoDeadline');

            if (deadlineEl) deadlineEl.value = `${dateStr}T${timeStr}`;
            this._todoDeadlineInitial = `${dateStr}T${timeStr}`;

            // 重置周期性选项
            const recurringFields = document.getElementById('recurringFields');
            const isRecurring = document.getElementById('isRecurring');
            if (recurringFields) recurringFields.style.display = 'none';
            if (isRecurring) isRecurring.checked = false;
        } else if (type === ITEM_TYPES.MEETING) {
            const dateEl = document.getElementById('meetingDate');
            const timeEl = document.getElementById('meetingTime');

            if (dateEl) dateEl.value = dateStr;
            if (timeEl) timeEl.value = timeStr;
        } else if (type === ITEM_TYPES.DOCUMENT) {
            // 重置办文周期性选项
            const docRecurringFields = document.getElementById('docRecurringFields');
            const docIsRecurring = document.getElementById('docIsRecurring');
            if (docRecurringFields) docRecurringFields.style.display = 'none';
            if (docIsRecurring) docIsRecurring.checked = false;
            
            // 设置默认开始日期
            const docStartDateEl = document.getElementById('docStartDate');
            if (docStartDateEl) docStartDateEl.value = dateStr;
        }

        this.showModal('itemModal');
        this.initRecurringEvents();
    }

    async handleCalendarQuickAdd(dateStr) {
        const targetDate = dateStr || this.selectedDate;
        const type = await this.showCalendarQuickAddTypeChoice(targetDate);
        if (type === 'cancel') {
            return;
        }
        this.showAddModal(type, targetDate);
    }

    showCalendarQuickAddTypeChoice(dateStr) {
        return this._createChoiceModal({
            title: '快速新增事项',
            description: `${dateStr} 要新增什么类型的事项？`,
            maxWidth: '420px',
            buttons: [
                { label: '待办事项', subLabel: '默认带入该日期和当前时间', className: 'btn-primary', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: ITEM_TYPES.TODO },
                { label: '会议活动', subLabel: '默认带入该日期和当前时间', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: ITEM_TYPES.MEETING },
                { label: '办文情况', subLabel: '默认带入该日期作为开始日期', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: ITEM_TYPES.DOCUMENT },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }

    /**
     * 初始化周期性任务相关事件
     */
    initRecurringEvents() {
        // === 待办事项的周期性选项 ===
        const isRecurring = document.getElementById('isRecurring');
        const recurringFields = document.getElementById('recurringFields');

        if (isRecurring && recurringFields) {
            isRecurring.onchange = (e) => {
                recurringFields.style.display = e.target.checked ? 'block' : 'none';
            };
        }

        // 周期类型切换
        const recurringType = document.getElementById('recurringType');
        if (recurringType) {
            recurringType.onchange = (e) => {
                const type = e.target.value;
                const monthlyDateGroup = document.getElementById('monthlyDateGroup');
                const nthWorkDayGroup = document.getElementById('nthWorkDayGroup');
                const weekDayGroup = document.getElementById('weekDayGroup');
                const weekMultiGroup = document.getElementById('weekMultiGroup');
                const monthlyWeekDayGroup = document.getElementById('monthlyWeekDayGroup');

                // 隐藏所有组
                if (monthlyDateGroup) monthlyDateGroup.style.display = 'none';
                if (nthWorkDayGroup) nthWorkDayGroup.style.display = 'none';
                if (weekDayGroup) weekDayGroup.style.display = 'none';
                if (weekMultiGroup) weekMultiGroup.style.display = 'none';
                if (monthlyWeekDayGroup) monthlyWeekDayGroup.style.display = 'none';

                // 根据类型显示对应组
                switch (type) {
                    case 'monthly_date':
                        if (monthlyDateGroup) monthlyDateGroup.style.display = 'block';
                        break;
                    case 'monthly_workday':
                        if (nthWorkDayGroup) nthWorkDayGroup.style.display = 'block';
                        break;
                    case 'weekly_day':
                    case 'biweekly_day':
                        if (weekDayGroup) weekDayGroup.style.display = 'block';
                        break;
                    case 'weekly_multi':
                    case 'biweekly_multi':
                        if (weekMultiGroup) weekMultiGroup.style.display = 'block';
                        break;
                    case 'monthly_weekday':
                        if (monthlyWeekDayGroup) monthlyWeekDayGroup.style.display = 'block';
                        break;
                }
            };
        }
        
        // === 办文的周期性选项 ===
        const docIsRecurring = document.getElementById('docIsRecurring');
        const docRecurringFields = document.getElementById('docRecurringFields');
        const docRecurringType = document.getElementById('docRecurringType');

        if (docIsRecurring && docRecurringFields) {
            docIsRecurring.onchange = (e) => {
                docRecurringFields.style.display = e.target.checked ? 'block' : 'none';
            };
        }

        if (docRecurringType) {
            docRecurringType.onchange = (e) => {
                this.updateDocRecurringFieldsVisibility(e.target.value);
            };
        }

        // === 待办提前提醒 → 条件显示提醒时刻 ===
        const todoReminderAdvance = document.getElementById('todoReminderAdvance');
        const reminderTimeGroup = document.getElementById('reminderTimeGroup');
        if (todoReminderAdvance && reminderTimeGroup) {
            todoReminderAdvance.onchange = (e) => {
                reminderTimeGroup.style.display = parseInt(e.target.value) >= 1440 ? '' : 'none';
            };
        }
    }

    /**
     * 保存事项
     */
    async saveItem(e) {
        e.preventDefault();

        let id = document.getElementById('itemId').value;
        const modal = document.getElementById('itemModal');
        if (!id && modal?.dataset?.mode === 'edit' && modal.dataset.itemId) {
            id = modal.dataset.itemId;
        }
        const type = document.getElementById('itemType').value;

        const item = { type };

        // 基础字段
        item.title = document.getElementById('itemTitle').value.trim();

        // 类型特定字段
        switch (type) {
            case ITEM_TYPES.TODO:
                item.priority = document.getElementById('todoPriority').value;
                const newDeadline = document.getElementById('todoDeadline').value;
                if (id) {
                    const originalItem = await db.getItem(parseInt(id));
                    if (originalItem && originalItem.deadline !== newDeadline) {
                        item.deadlineManuallySet = true;
                    } else if (originalItem) {
                        item.deadlineManuallySet = originalItem.deadlineManuallySet || false;
                    }
                } else {
                    if (this._todoDeadlineInitial && this._todoDeadlineInitial !== newDeadline) {
                        item.deadlineManuallySet = true;
                    }
                }
                item.deadline = newDeadline;
                item.reminderAdvance = parseInt(document.getElementById('todoReminderAdvance').value) || 3;
                const reminderTimeVal = document.getElementById('todoReminderTime').value;
                if (item.reminderAdvance >= 1440 && reminderTimeVal) {
                    item.reminderTime = reminderTimeVal;
                } else {
                    item.reminderTime = null;
                }
                item.completed = false;

                // 周期性任务处理
                const isRecurring = document.getElementById('isRecurring')?.checked;
                if (isRecurring) {
                    const recurringType = document.getElementById('recurringType').value;
                    const recurringCount = parseInt(document.getElementById('recurringCount').value) || 20;
                    const skipWeekends = document.getElementById('skipWeekends')?.checked || false;
                    const skipHolidays = document.getElementById('skipHolidays')?.checked || false;
                    const recurringStartDate = document.getElementById('recurringStartDate')?.value || null;
                    const recurringEndDate = document.getElementById('recurringEndDate')?.value || null;

                    const rule = {
                        type: recurringType,
                        skipWeekends: skipWeekends,
                        skipHolidays: skipHolidays,
                        startDate: recurringStartDate,
                        endDate: recurringEndDate
                    };

                    if (recurringType === RECURRING_TYPES.MONTHLY_DATE) {
                        const day = parseInt(document.getElementById('recurringDay').value);
                        if (!day || day < 1 || day > 31) {
                            alert('请输入有效的日期（1-31）');
                            return;
                        }
                        rule.day = day;
                    } else if (recurringType === RECURRING_TYPES.MONTHLY_WORKDAY) {
                        const nthWorkDay = parseInt(document.getElementById('nthWorkDay').value);
                        if (!nthWorkDay || nthWorkDay < 1 || nthWorkDay > 23) {
                            alert('请输入有效的工作日序号（1-23）');
                            return;
                        }
                        rule.nthWorkDay = nthWorkDay;
                    } else if (recurringType === RECURRING_TYPES.WEEKLY_DAY || recurringType === RECURRING_TYPES.BIWEEKLY_DAY) {
                        rule.weekDay = parseInt(document.getElementById('weekDay').value);
                    } else if (recurringType === RECURRING_TYPES.WEEKLY_MULTI || recurringType === RECURRING_TYPES.BIWEEKLY_MULTI) {
                        const checkedDays = Array.from(document.querySelectorAll('input[name="weekDays"]:checked')).map(cb => parseInt(cb.value));
                        if (checkedDays.length === 0) {
                            alert('请至少选择一个星期');
                            return;
                        }
                        rule.weekDays = checkedDays.sort((a, b) => a - b);
                    } else if (recurringType === RECURRING_TYPES.MONTHLY_WEEKDAY) {
                        rule.nthWeek = parseInt(document.getElementById('monthlyNthWeek').value);
                        rule.weekDay = parseInt(document.getElementById('monthlyWeekDayValue').value);
                    }
                    // daily 和 workday_daily 不需要额外参数

                    item.isRecurring = true;
                    item.recurringRule = rule;
                    item.recurringCount = recurringCount;


                }
                break;

            case ITEM_TYPES.MEETING:
                item.date = document.getElementById('meetingDate').value;
                item.endDate = document.getElementById('meetingEndDate').value || null;
                item.time = document.getElementById('meetingTime').value;
                item.endTime = document.getElementById('meetingEndTime').value || null;
                item.location = document.getElementById('meetingLocation').value.trim();
                const attendeesStr = document.getElementById('meetingAttendees').value.trim();
                item.attendees = attendeesStr
                    ? this.sortMeetingAttendeesForDisplay(attendeesStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean))
                    : [];
                item.agenda = document.getElementById('meetingAgenda').value.trim();
                item.manualOrder = false;
                delete item.order;
                break;

            case ITEM_TYPES.DOCUMENT:
                item.docType = document.getElementById('docType').value;
                item.docNumber = document.getElementById('docNumber').value.trim();
                item.source = document.getElementById('docSource').value.trim();
                item.handler = document.getElementById('docHandler').value.trim();
                item.content = document.getElementById('docContent').value.trim();
                item.progress = item.handler ? DOCUMENT_PROGRESS.PROCESSING : DOCUMENT_PROGRESS.PENDING;
                // 办文日期范围
                item.docStartDate = document.getElementById('docStartDate').value || this.selectedDate;
                item.docEndDate = document.getElementById('docEndDate').value || null;
                item.docDate = item.docStartDate; // 兼容旧数据
                // 跳过周末和节假日
                item.skipWeekend = document.getElementById('docSkipWeekend').checked;
                // 流转历史
                const existingItemId = document.getElementById('itemId').value;
                const effectiveExistingItem = existingItemId ? await this.getEffectiveDocumentItemById(existingItemId) : null;
                item.transferHistory = effectiveExistingItem?.transferHistory || [];
                
                // 办文周期性任务设置
                const docIsRecurring = document.getElementById('docIsRecurring')?.checked;
                if (docIsRecurring) {
                    const docRecurringType = document.getElementById('docRecurringType').value;
                    const docRecurringCount = parseInt(document.getElementById('docRecurringCount').value) || 20;
                    const rule = {
                        type: docRecurringType,
                        skipWeekends: document.getElementById('docRecurringSkipWeekends')?.checked || false,
                        skipHolidays: document.getElementById('docRecurringSkipHolidays')?.checked || false,
                        startDate: document.getElementById('docRecurringStartDate')?.value || null,
                        endDate: document.getElementById('docRecurringEndDate')?.value || null,
                    };
                    // 根据周期类型添加额外参数
                    if (docRecurringType === RECURRING_TYPES.MONTHLY_DATE) {
                        rule.day = parseInt(document.getElementById('docRecurringDay').value) || 1;
                    } else if (docRecurringType === RECURRING_TYPES.MONTHLY_WORKDAY) {
                        rule.nthWorkDay = parseInt(document.getElementById('docNthWorkDay').value) || 1;
                    } else if (docRecurringType === RECURRING_TYPES.WEEKLY_DAY || docRecurringType === RECURRING_TYPES.BIWEEKLY_DAY) {
                        rule.weekDay = parseInt(document.getElementById('docWeekDay').value) || 1;
                    } else if (docRecurringType === RECURRING_TYPES.WEEKLY_MULTI || docRecurringType === RECURRING_TYPES.BIWEEKLY_MULTI) {
                        const docWeekDays = [];
                        document.querySelectorAll('input[name="docWeekDays"]:checked').forEach(cb => {
                            docWeekDays.push(parseInt(cb.value));
                        });
                        rule.weekDays = docWeekDays;
                    } else if (docRecurringType === RECURRING_TYPES.MONTHLY_WEEKDAY) {
                        rule.nthWeek = parseInt(document.getElementById('docMonthlyNthWeek').value) || 1;
                        rule.weekDay = parseInt(document.getElementById('docMonthlyWeekDayValue').value) || 1;
                    }
                    item.isRecurring = true;
                    item.recurringRule = rule;
                    item.recurringCount = docRecurringCount;

                }
                break;
        }

        try {
            if (id) {
                // 编辑模式 - 先保存原始数据用于撤回
                let originalItem = await db.getItem(parseInt(id));
                if (!originalItem) {
                    const allItems = await db.getAllItems();
                    const formTitle = item.title?.trim();
                    const formType = item.type;
                    if (formTitle && formType) {
                        originalItem = allItems.find(i => 
                            i.type === formType && (i.title || '').trim() === formTitle
                        ) || null;
                    }
                    if (originalItem) {
                        document.getElementById('itemId').value = originalItem.id;
                        id = String(originalItem.id);
                    }
                }
                const recurringGroupId = document.getElementById('recurringGroupId')?.value;
                const occurrenceIndex = parseInt(document.getElementById('occurrenceIndex')?.value) || 0;



                // 检查是否是编辑已有的周期性任务
                if (recurringGroupId && originalItem && originalItem.isRecurring) {
                    // 弹出选择框
                    const choice = await this.showRecurringEditChoice();



                    if (choice === 'cancel') {
                        return; // 用户取消
                    }

                    if (choice === 'future') {
                        await this.updateRecurringGroup(originalItem, item, recurringGroupId, occurrenceIndex);
                        this.hideModal('itemModal');
                        this.showSuccess('已更新本项及未来所有周期性任务');
                        requestAnimationFrame(() => {
                            this.runPostSaveRefresh().catch(error => {
                                console.error('刷新或同步失败:', error);
                            });
                        });
                        return;
                    } else if (choice === 'this_detach') {
                        if (originalItem) {
                            this.saveUndoHistory('update', { item: originalItem });
                        }
                        item.isRecurring = false;
                        item.recurringGroupId = null;
                        item.occurrenceIndex = null;
                        item.recurringRule = null;
                        await db.updateItem(parseInt(id), item);
                        this.hideModal('itemModal');
                        this.showSuccess('事项已更新并脱离周期组');
                        requestAnimationFrame(() => {
                            this.runPostSaveRefresh().catch(error => {
                                console.error('刷新或同步失败:', error);
                            });
                        });
                        return;
                    } else {
                        if (originalItem) {
                            this.saveUndoHistory('update', { item: originalItem });
                        }
                        item.isRecurring = true;
                        item.recurringGroupId = originalItem.recurringGroupId;
                        item.occurrenceIndex = originalItem.occurrenceIndex;
                        item.recurringRule = originalItem.recurringRule;
                        
                        if (originalItem.date) {
                            item.date = originalItem.date;
                        }
                        if (originalItem.endDate) {
                            item.endDate = originalItem.endDate;
                        }
                        if (originalItem.docStartDate) {
                            item.docStartDate = originalItem.docStartDate;
                            item.docDate = originalItem.docStartDate;
                        }
                        if (originalItem.docEndDate) {
                            item.docEndDate = originalItem.docEndDate;
                        }
                        
                        await db.updateItem(parseInt(id), item);
                        this.hideModal('itemModal');
                        this.showSuccess('事项已更新（保留周期性）');
                        requestAnimationFrame(() => {
                            this.runPostSaveRefresh().catch(error => {
                                console.error('刷新或同步失败:', error);
                            });
                        });
                        return;
                    }
                } else if (originalItem && this.isCrossDateDocument(originalItem)) {
                    const choice = await this.showCrossDateDocChoice('编辑', '修改');
                    if (choice === 'cancel') return;
                    
                    const titleUpdates = {
                        title: item.title,
                        content: item.content,
                        handler: item.handler,
                        progress: item.progress,
                        docType: item.docType,
                        docNumber: item.docNumber,
                        source: item.source,
                        skipWeekend: item.skipWeekend
                    };
                    const contentFields = ['title', 'content', 'handler', 'progress'];
                    const contentDayStateUpdates = {
                        title: item.title,
                        content: item.content,
                        handler: item.handler,
                        progress: item.progress
                    };

                    if (choice === 'this') {
                        await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                            fields: contentFields,
                            dayStateUpdates: contentDayStateUpdates
                        });
                        this.hideModal('itemModal');
                        this.showSuccess('已修改当天内容');
                        requestAnimationFrame(() => {
                            this.runPostSaveRefresh().catch(error => {
                                console.error('刷新或同步失败:', error);
                            });
                        });
                        return;
                    }
                    
                    if (choice === 'future') {
                        await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                            fields: contentFields,
                            globalUpdates: titleUpdates
                        });
                        this.hideModal('itemModal');
                        this.showSuccess('已修改今天及之后所有日期的内容');
                        requestAnimationFrame(() => {
                            this.runPostSaveRefresh().catch(error => {
                                console.error('刷新或同步失败:', error);
                            });
                        });
                        return;
                    }
                    
                    await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                        fields: contentFields,
                        globalUpdates: titleUpdates
                    });
                    this.hideModal('itemModal');
                    this.showSuccess('已修改全部日期内容');
                    requestAnimationFrame(() => {
                        this.runPostSaveRefresh().catch(error => {
                            console.error('刷新或同步失败:', error);
                        });
                    });
                    return;
                } else if (item.isRecurring && item.recurringRule) {
                    // 编辑时转为周期性任务，询问用户
                    const confirm = window.confirm('将此事项转为周期性任务将删除当前事项并生成多个周期性任务，是否继续？');
                    if (!confirm) {
                        return;
                    }

                    // 保存原始数据用于撤回
                    if (originalItem) {
                        this.saveUndoHistory('update', { item: originalItem });
                    }

                    // 删除原事项
                    await db.deleteItem(parseInt(id));

                    // 生成周期性任务
                    const recurringItems = this.generateRecurringItems(item, item.recurringRule, item.recurringCount || 20);
                    if (recurringItems.length > 0) {
                        const addedIds = [];
                        for (const recurringItem of recurringItems) {
                            const added = await db.addItem(recurringItem);
                            if (added && added.id) addedIds.push(added.id);
                        }
                        // 追加到撤回历史（替换之前的update，用delete+add组合）
                        this.undoHistory[this.undoHistory.length - 1] = {
                            action: 'update',
                            data: { originalItem: originalItem, addedIds: addedIds },
                            timestamp: Date.now()
                        };
                        this.showSuccess(`已生成 ${recurringItems.length} 个周期性任务`);
                    }
                } else {
                    // 普通编辑，保存原始数据用于撤回
                    if (originalItem) {
                        this.saveUndoHistory('update', { item: originalItem });
                    }
                    try {
                        await db.updateItem(parseInt(id), item);
                        this.showSuccess('事项已更新');
                    } catch (updateErr) {
                        console.warn('按ID更新失败，尝试按标题查找后更新:', updateErr);
                        const allItems = await db.getAllItems();
                        const matchByTitle = allItems.find(i =>
                            i.type === item.type && (i.title || '').trim() === (item.title || '').trim()
                        );
                        if (matchByTitle) {
                            await db.updateItem(matchByTitle.id, { ...item, id: undefined });
                            this.showSuccess('事项已更新');
                        } else {
                            throw updateErr;
                        }
                    }
                }
            } else {
                // 新建模式
                // 检查是否是周期性任务


                if (item.isRecurring && item.recurringRule) {

                    const recurringItems = this.generateRecurringItems(item, item.recurringRule, item.recurringCount || 20);



                    if (recurringItems.length > 0) {
                        const addedIds = [];
                        for (const recurringItem of recurringItems) {

                            const addedItem = await db.addItem(recurringItem);
                            if (addedItem && addedItem.id) {
                                addedIds.push(addedItem.id);
                            }
                        }
                        // 保存历史用于撤回
                        this.saveUndoHistory('add', { ids: addedIds });
                        this.showSuccess(`已生成 ${recurringItems.length} 个周期性任务`);
                    } else {
                        console.error('未生成任何周期性任务');
                        this.showError('周期性任务生成失败，请检查参数');
                        return;
                    }
                } else {
                    const addedItem = await db.addItem(item);
                    // 保存历史用于撤回
                    if (addedItem && addedItem.id) {
                        this.saveUndoHistory('add', { id: addedItem.id });
                    }
                }
            }

            this.hideModal('itemModal');
            await this.loadItems();

            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => console.warn('后台同步失败:', e));
            }

        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    async runPostSaveRefresh() {
        await this.loadItems();
        if (syncManager.isLoggedIn()) {
            syncManager.immediateSyncToCloud().catch(e => console.warn('后台同步失败:', e));
        }
    }

    _createChoiceModal({ title, description, maxWidth, buttons }) {
        return new Promise((resolve) => {
            if (this._activeChoiceModal) {
                this._activeChoiceModal.remove();
                this._activeChoiceModal = null;
            }

            const modal = document.createElement('div');
            modal.className = 'modal active';
            this._activeChoiceModal = modal;
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.maxWidth = maxWidth || '400px';
            const header = document.createElement('div');
            header.className = 'modal-header';
            const h3 = document.createElement('h3');
            h3.textContent = title;
            header.appendChild(h3);
            const body = document.createElement('div');
            body.className = 'modal-body';
            body.style.padding = '20px';
            const p = document.createElement('p');
            p.style.cssText = 'margin-bottom: 20px; color: #666;';
            p.textContent = description;
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
            const closeModal = (value) => {
                if (this._activeChoiceModal === modal) {
                    this._activeChoiceModal = null;
                }
                modal.remove();
                resolve(value);
            };
            for (const cfg of buttons) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = cfg.className || 'btn-secondary';
                btn.style.cssText = cfg.style || 'width: 100%; padding: 12px;';
                btn.textContent = cfg.label;
                if (cfg.subLabel) {
                    const sub = document.createElement('div');
                    sub.style.cssText = cfg.subStyle || 'font-size: 12px; color: #666; margin-top: 4px;';
                    sub.textContent = cfg.subLabel;
                    btn.appendChild(sub);
                }
                btn.addEventListener('click', () => closeModal(cfg.value));
                btnContainer.appendChild(btn);
            }
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal('cancel');
                }
            });
            body.append(p, btnContainer);
            content.append(header, body);
            modal.appendChild(content);
            document.body.appendChild(modal);
        });
    }

    showRecurringEditChoice() {
        return this._createChoiceModal({
            title: '修改周期性任务',
            description: '这是一个周期性任务，您想如何修改？',
            maxWidth: '450px',
            buttons: [
                { label: '仅修改本项（保留周期性）', subLabel: '独立记录当天的内容，不影响其他周期任务', className: 'btn-primary', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: 'this' },
                { label: '修改本项及未来所有周期', subLabel: '同步更新标题、经办人等信息到后续所有周期（日期保持不变）', className: 'btn-secondary', value: 'future' },
                { label: '仅修改本项（脱离周期）', subLabel: '将此项变为独立任务，不再属于周期组', className: 'btn-secondary', style: 'width: 100%; padding: 12px; border-color: #f59e0b; color: #f59e0b;', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: 'this_detach' },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }

    /**
     * 批量更新周期性任务组
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     * @param {string} groupId - 周期性任务组ID
     * @param {number} fromIndex - 从第几个开始更新
     */

    /**
     * 显示周期性任务状态变更选择弹窗
     * @param {string} actionType - 操作类型描述
     * @param {string} actionName - 操作名称
     */
    showRecurringChoice(actionType, actionName) {
        return this._createChoiceModal({
            title: '周期性任务 - ' + actionType,
            description: '这是周期性任务，您想如何操作？',
            maxWidth: '450px',
            buttons: [
                { label: '仅本项' + actionName, subLabel: '独立记录当天的状态，不影响其他周期任务', className: 'btn-secondary', subStyle: 'font-size: 12px; color: #999; margin-top: 4px;', value: 'this' },
                { label: '本项及之后所有周期都' + actionName, subLabel: '同步更新当前及后续所有周期的状态（日期保持不变）', className: 'btn-primary', subStyle: 'font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;', value: 'all' },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }















    /**
     * 批量更新周期性任务组的状态（用于置顶、沉底、完成等）
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     */

    /**
     * 切换待办完成状态
     */
    async toggleTodoComplete(id, completed) {
        try {
            await db.updateItem(id, {
                completed,
                completedAt: completed ? new Date().toISOString() : null
            });
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => console.warn('后台同步失败:', e));
            }
        } catch (error) {
            console.error('更新失败:', error);
        }
    }

    /**
     * 通用切换完成状态（所有类型）
     */
    async toggleItemComplete(id, type, completed) {
        try {
            // 检查是否为周期性任务
            const originalItem = await db.getItem(id);
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('完成状态', completed ? '标记完成' : '取消完成');
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    await this.updateRecurringGroupStatus(originalItem, { 
                        completed, 
                        completedAt: completed ? new Date().toISOString() : null,
                        ...(type === ITEM_TYPES.DOCUMENT && { progress: completed ? DOCUMENT_PROGRESS.COMPLETED : DOCUMENT_PROGRESS.PENDING })
                    });
                    return;
                }
            }
            
            if (type === ITEM_TYPES.DOCUMENT && this.isCrossDateDocument(originalItem)) {
                const choice = await this.showCrossDateDocChoice('完成状态', completed ? '标记完成' : '取消完成');
                if (choice === 'cancel') return;

                const completedAt = completed ? new Date().toISOString() : null;
                const progress = completed ? DOCUMENT_PROGRESS.COMPLETED : DOCUMENT_PROGRESS.PENDING;
                const statusFields = ['completed', 'completedAt', 'progress'];

                if (choice === 'this') {
                    await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                        fields: statusFields,
                        dayStateUpdates: {
                            completed,
                            completedAt,
                            progress
                        }
                    });
                    await this.runPostSaveRefresh();
                    this.showSuccess(completed ? '已标记当天完成' : '已取消当天完成');
                    return;
                }

                await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                    fields: statusFields,
                    globalUpdates: {
                        completed,
                        completedAt,
                        progress
                    }
                });
                await this.runPostSaveRefresh();
                this.showSuccess(
                    choice === 'future'
                        ? (completed ? '已标记今天及之后完成' : '已取消今天及之后完成')
                        : (completed ? '已标记全部日期完成' : '已取消全部日期完成')
                );
                return;
            }

            if (type === ITEM_TYPES.MEETING && this.isCrossDateMeeting(originalItem)) {
                const choice = await this.showCrossDateDocChoice('完成状态', completed ? '标记完成' : '取消完成');
                if (choice === 'cancel') return;

                const completedAt = completed ? new Date().toISOString() : null;
                const statusFields = ['completed', 'completedAt'];

                if (choice === 'this') {
                    await this.applyCrossDateMeetingScopedUpdate(id, originalItem, choice, {
                        fields: statusFields,
                        dayStateUpdates: {
                            completed,
                            completedAt
                        }
                    });
                    await this.loadItems();
                    this.showSuccess(completed ? '已标记当天完成' : '已取消当天完成');
                    return;
                }

                await this.applyCrossDateMeetingScopedUpdate(id, originalItem, choice, {
                    fields: statusFields,
                    globalUpdates: {
                        completed,
                        completedAt
                    }
                });
                await this.loadItems();
                this.showSuccess(
                    choice === 'future'
                        ? (completed ? '已标记今天及之后完成' : '已取消今天及之后完成')
                        : (completed ? '已标记全部日期完成' : '已取消全部日期完成')
                );
                return;
            }
            
            // 保存原始数据用于撤回
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }
            
            const result = await db.updateItem(id, {
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                ...(type === ITEM_TYPES.DOCUMENT && { progress: completed ? DOCUMENT_PROGRESS.COMPLETED : DOCUMENT_PROGRESS.PENDING })
            });
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => console.warn('后台同步失败:', e));
            }
        } catch (error) {
            console.error('更新完成状态失败:', error);
            this.showError('更新失败: ' + error.message);
        }
    }

    /**
     * 通用切换置顶状态（所有类型）
     */
    async toggleItemPin(id, type, pinned) {
        try {
            // 检查是否为周期性任务
            const originalItem = await db.getItem(id);
            
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('置顶状态', pinned ? '置顶' : '取消置顶');
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    await this.updateRecurringGroupStatus(originalItem, { 
                        pinned, 
                        sunk: pinned ? false : undefined
                    });
                    this.showSuccess(pinned ? '已置顶所有后续周期' : '已取消所有后续周期置顶');
                    return;
                }
            }
            
            if (this.isCrossDateDocument(originalItem)) {
                const choice = await this.showCrossDateDocChoice('置顶状态', pinned ? '置顶' : '取消置顶');
                if (choice === 'cancel') return;

                const pinFields = ['pinned', 'sunk'];
                const nextSunk = pinned ? false : originalItem.sunk;

                if (choice === 'this') {
                    await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                        fields: pinFields,
                        dayStateUpdates: {
                            pinned,
                            sunk: pinned ? false : (originalItem.dayStates?.[this.selectedDate]?.sunk ?? originalItem.sunk ?? false)
                        }
                    });
                    this.showSuccess(pinned ? '已置顶当天' : '已取消当天置顶');
                    return;
                }

                await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                    fields: pinFields,
                    globalUpdates: {
                        pinned,
                        sunk: nextSunk
                    }
                });
                this.showSuccess(
                    choice === 'future'
                        ? (pinned ? '已置顶今天及之后' : '已取消今天及之后置顶')
                        : (pinned ? '已置顶全部日期' : '已取消全部日期置顶')
                );
                return;
            }
            
            // 保存原始数据用于撤回
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }
            
            // 如果置顶，先取消沉底（互斥）
            if (pinned) {
                await db.updateItem(id, { pinned: true, sunk: false });
            } else {
                await db.updateItem(id, { pinned: false });
            }
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => {});
            }
            this.showSuccess(pinned ? '已置顶' : '已取消置顶');
        } catch (error) {
            console.error('更新置顶状态失败:', error);
            this.showError('更新失败: ' + error.message);
        }
    }

    /**
     * 通用切换沉底状态（所有类型）
     */
    async toggleItemSink(id, type, sunk) {
        try {
            // 检查是否为周期性任务
            const originalItem = await db.getItem(id);
            
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('沉底状态', sunk ? '沉底' : '取消沉底');
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    await this.updateRecurringGroupStatus(originalItem, { 
                        sunk, 
                        pinned: sunk ? false : undefined
                    });
                    this.showSuccess(sunk ? '已沉底所有后续周期' : '已取消所有后续周期沉底');
                    return;
                }
            }
            
            if (this.isCrossDateDocument(originalItem)) {
                const choice = await this.showCrossDateDocChoice('沉底状态', sunk ? '沉底' : '取消沉底');
                if (choice === 'cancel') return;

                const sinkFields = ['pinned', 'sunk'];
                const nextPinned = sunk ? false : originalItem.pinned;

                if (choice === 'this') {
                    await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                        fields: sinkFields,
                        dayStateUpdates: {
                            sunk,
                            pinned: sunk ? false : (originalItem.dayStates?.[this.selectedDate]?.pinned ?? originalItem.pinned ?? false)
                        }
                    });
                    this.showSuccess(sunk ? '已沉底当天' : '已取消当天沉底');
                    return;
                }

                await this.applyCrossDateDocumentScopedUpdate(id, originalItem, choice, {
                    fields: sinkFields,
                    globalUpdates: {
                        sunk,
                        pinned: nextPinned
                    }
                });
                this.showSuccess(
                    choice === 'future'
                        ? (sunk ? '已沉底今天及之后' : '已取消今天及之后沉底')
                        : (sunk ? '已沉底全部日期' : '已取消全部日期沉底')
                );
                return;
            }
            
            // 保存原始数据用于撤回
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }
            
            // 如果沉底，先取消置顶（互斥）
            if (sunk) {
                await db.updateItem(id, { sunk: true, pinned: false });
            } else {
                await db.updateItem(id, { sunk: false });
            }
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => {});
            }
            this.showSuccess(sunk ? '已沉底' : '已取消沉底');
        } catch (error) {
            console.error('更新沉底状态失败:', error);
            this.showError('更新失败: ' + error.message);
        }
    }

    /**
     * 保存操作历史（用于撤回）
     */
    saveUndoHistory(action, data) {
        this.undoHistory.push({
            action,
            data: JSON.parse(JSON.stringify(data)),
            timestamp: Date.now()
        });

        this.redoStack = [];

        // 限制历史记录数量
        if (this.undoHistory.length > this.maxUndoSteps) {
            this.undoHistory.shift();
        }

        this.updateUndoBtnState();
    }

    /**
     * 撤回上一步操作
     */
    async undoLastAction() {
        if (this.undoHistory.length === 0) {
            this.showError('没有可撤回的操作');
            return;
        }

        const lastAction = this.undoHistory.pop();
        this.redoStack.push(lastAction);

        try {
            switch (lastAction.action) {
                case 'add':
                    // 撤回添加：删除添加的项目
                    if (Array.isArray(lastAction.data.ids)) {
                        for (const id of lastAction.data.ids) {
                            await db.deleteItem(id);
                        }
                        this.showSuccess(`已撤回：删除了 ${lastAction.data.ids.length} 个事项`);
                    } else {
                        await db.deleteItem(lastAction.data.id);
                        this.showSuccess('已撤回：删除了添加的事项');
                    }
                    break;

                case 'delete':
                    // 撤回删除：恢复删除的项目
                    if (Array.isArray(lastAction.data.items)) {
                        for (const item of lastAction.data.items) {
                            await db.addItem(item);
                            if (syncManager.isLoggedIn()) {
                                syncManager.clearDeletedMarker(item);
                            }
                        }
                        this.showSuccess(`已撤回：恢复了 ${lastAction.data.items.length} 个事项`);
                    } else {
                        await db.addItem(lastAction.data.item);
                        if (syncManager.isLoggedIn()) {
                            syncManager.clearDeletedMarker(lastAction.data.item);
                        }
                        this.showSuccess('已撤回：恢复了删除的事项');
                    }
                    break;

                case 'update':
                    // 撤回更新：恢复原来的值
                    if (Array.isArray(lastAction.data.items)) {
                        for (const item of lastAction.data.items) {
                            await db.updateItem(item.id, item);
                        }
                        this.showSuccess('已撤回：恢复了修改');
                    } else {
                        await db.updateItem(lastAction.data.item.id, lastAction.data.item);
                        this.showSuccess('已撤回：恢复了修改');
                    }
                    break;

                case 'complete':
                    // 撤回完成：恢复未完成状态
                    await db.updateItem(lastAction.data.id, { completed: false, completedAt: null });
                    this.showSuccess('已撤回：取消完成状态');
                    break;

                case 'pin':
                    // 撤回置顶
                    await db.updateItem(lastAction.data.id, { pinned: lastAction.data.oldValue });
                    this.showSuccess('已撤回：取消置顶');
                    break;

                case 'sink':
                    // 撤回沉底
                    await db.updateItem(lastAction.data.id, { sunk: lastAction.data.oldValue });
                    this.showSuccess('已撤回：取消沉底');
                    break;

                default:
                    this.showError('无法撤回此操作');
            }

            await this.loadItems();

            // 同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }

        } catch (error) {
            console.error('撤回失败:', error);
            this.showError('撤回失败: ' + error.message);
        }

        // 如果没有更多历史，禁用撤回按钮
        if (this.undoHistory.length === 0) {
            const undoBtn = document.getElementById('undoBtn');
            if (undoBtn) {
                undoBtn.disabled = true;
                undoBtn.style.opacity = '0.4';
                undoBtn.style.cursor = 'not-allowed';
            }
        }

        this.updateRedoBtnState();
    }

    async redoLastAction() {
        if (this.redoStack.length === 0) {
            this.showError('没有可恢复的操作');
            return;
        }

        const action = this.redoStack.pop();
        this.undoHistory.push(action);

        try {
            switch (action.action) {
                case 'add':
                    if (Array.isArray(action.data.ids)) {
                        for (const item of action.data.items || []) {
                            await db.addItem(item);
                            if (syncManager.isLoggedIn()) {
                                syncManager.clearDeletedMarker(item);
                            }
                        }
                    } else {
                        await db.addItem(action.data.item);
                        if (syncManager.isLoggedIn()) {
                            syncManager.clearDeletedMarker(action.data.item);
                        }
                    }
                    this.showSuccess('已恢复：重新添加事项');
                    break;
                case 'delete':
                    if (Array.isArray(action.data.items)) {
                        for (const item of action.data.items) {
                            if (syncManager.isLoggedIn()) {
                                syncManager.markItemDeleted(item);
                            }
                            await db.deleteItem(item.id);
                        }
                    } else {
                        if (syncManager.isLoggedIn()) {
                            syncManager.markItemDeleted(action.data.item);
                        }
                        await db.deleteItem(action.data.item.id);
                    }
                    this.showSuccess('已恢复：重新删除事项');
                    break;
                case 'update':
                    if (Array.isArray(action.data.items)) {
                        const currentItems = [];
                        for (const item of action.data.items) {
                            const current = await db.getItem(item.id);
                            if (current) currentItems.push(current);
                            await db.updateItem(item.id, item);
                        }
                    } else {
                        await db.updateItem(action.data.item.id, action.data.item);
                    }
                    this.showSuccess('已恢复：重新应用修改');
                    break;
                case 'complete':
                    await db.updateItem(action.data.id, { completed: true, completedAt: new Date().toISOString() });
                    this.showSuccess('已恢复：标记完成');
                    break;
                case 'pin':
                    await db.updateItem(action.data.id, { pinned: !action.data.oldValue });
                    this.showSuccess('已恢复：置顶状态');
                    break;
                case 'sink':
                    await db.updateItem(action.data.id, { sunk: !action.data.oldValue });
                    this.showSuccess('已恢复：沉底状态');
                    break;
                default:
                    this.showError('无法恢复此操作');
            }

            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(e => {});
            }
        } catch (error) {
            console.error('恢复失败:', error);
            this.showError('恢复失败: ' + error.message);
        }

        this.updateUndoBtnState();
        this.updateRedoBtnState();
    }

    updateUndoBtnState() {
        const undoBtn = document.getElementById('undoBtn');
        if (!undoBtn) return;
        const hasHistory = this.undoHistory.length > 0;
        undoBtn.disabled = !hasHistory;
        undoBtn.style.opacity = hasHistory ? '1' : '0.4';
        undoBtn.style.cursor = hasHistory ? 'pointer' : 'not-allowed';
    }

    updateRedoBtnState() {
        const redoBtn = document.getElementById('redoBtn');
        if (!redoBtn) return;
        const hasRedo = this.redoStack.length > 0;
        redoBtn.disabled = !hasRedo;
        redoBtn.style.opacity = hasRedo ? '1' : '0.4';
        redoBtn.style.cursor = hasRedo ? 'pointer' : 'not-allowed';
    }

    /**
     * 启动会议自动完成检查
     * 会议开始后30分钟自动标记为已完成
     */
    startMeetingAutoCompleteCheck() {
        if (this._meetingAutoCompleteTimer) {
            clearInterval(this._meetingAutoCompleteTimer);
        }
        this.checkMeetingAutoComplete();

        this._meetingAutoCompleteTimer = setInterval(() => {
            this.checkMeetingAutoComplete();
        }, 60000);
    }

    /**
     * 检查是否有会议需要自动完成
     */
    async checkMeetingAutoComplete() {
        try {
            const now = new Date();
            const allItems = await db.getAllItems();
            const todayStr = this.formatDateLocal(now);

            const incompleteMeetings = allItems.filter(item =>
                item.type === ITEM_TYPES.MEETING && !item.completed
            );

            const batchUpdates = [];

            for (const meeting of incompleteMeetings) {
                let shouldComplete = false;
                let updatePayload = null;

                if (meeting.date && meeting.time) {
                    const meetingStart = new Date(`${meeting.date}T${meeting.time}`);
                    const autoCompleteTime = new Date(meetingStart.getTime() + 30 * 60 * 1000);
                    if (now >= autoCompleteTime) {
                        shouldComplete = true;
                        updatePayload = {
                            completed: true,
                            completedAt: now.toISOString()
                        };
                    }
                } else if (meeting.date && !meeting.time) {
                    const meetingDate = meeting.date;
                    const endDate = meeting.endDate || meetingDate;
                    const isMultiDay = endDate > meetingDate;
                    const isToday = meetingDate <= todayStr && endDate >= todayStr;

                    if (isToday && now.getHours() >= 16) {
                        if (isMultiDay) {
                            const dayStates = { ...(meeting.dayStates || {}) };
                            const todayState = dayStates[todayStr] || {};
                            if (!todayState.completed) {
                                shouldComplete = true;
                                dayStates[todayStr] = {
                                    ...todayState,
                                    completed: true,
                                    completedAt: now.toISOString()
                                };
                                updatePayload = { dayStates };
                            }
                        } else {
                            shouldComplete = true;
                            updatePayload = {
                                completed: true,
                                completedAt: now.toISOString()
                            };
                        }
                    }
                }

                if (shouldComplete && updatePayload) {
                    batchUpdates.push({ ...meeting, ...updatePayload, updatedAt: now.toISOString() });
                }
            }

            if (batchUpdates.length > 0) {
                await db.batchPutItems(batchUpdates);
                if (syncManager.isLoggedIn()) {
                    syncManager.immediateSyncToCloud();
                }
                await this.loadItems();
            }
        } catch (error) {
            console.error('检查会议自动完成失败:', error);
        }
    }

    /**
     * 生成周期性任务实例
     */

    /**
     * 初始化办文周期性字段事件
     */
    initDocRecurringEvents() {
        const docIsRecurring = document.getElementById('docIsRecurring');
        const docRecurringFields = document.getElementById('docRecurringFields');
        const docRecurringType = document.getElementById('docRecurringType');

        if (docIsRecurring && docRecurringFields) {
            docIsRecurring.addEventListener('change', (e) => {
                docRecurringFields.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        if (docRecurringType) {
            docRecurringType.addEventListener('change', (e) => {
                this.updateDocRecurringFieldsVisibility(e.target.value);
            });
        }
    }

    /**
     * 更新办文周期性字段显示
     */
    updateDocRecurringFieldsVisibility(type) {
        // 隐藏所有组
        const groups = ['docMonthlyDateGroup', 'docNthWorkDayGroup', 'docWeekDayGroup', 'docWeekMultiGroup', 'docMonthlyWeekDayGroup'];
        groups.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 根据类型显示对应组
        switch (type) {
            case RECURRING_TYPES.MONTHLY_DATE:
                document.getElementById('docMonthlyDateGroup').style.display = 'block';
                break;
            case RECURRING_TYPES.MONTHLY_WORKDAY:
                document.getElementById('docNthWorkDayGroup').style.display = 'block';
                break;
            case RECURRING_TYPES.WEEKLY_DAY:
            case RECURRING_TYPES.BIWEEKLY_DAY:
                document.getElementById('docWeekDayGroup').style.display = 'block';
                break;
            case RECURRING_TYPES.WEEKLY_MULTI:
            case RECURRING_TYPES.BIWEEKLY_MULTI:
                document.getElementById('docWeekMultiGroup').style.display = 'block';
                break;
            case RECURRING_TYPES.MONTHLY_WEEKDAY:
                document.getElementById('docMonthlyWeekDayGroup').style.display = 'block';
                break;
        }
    }


    /**
     * 创建单个周期性任务项
     * @param {Object} baseItem - 基础任务数据
     * @param {Date} date - 周期日期
     * @param {Object} rule - 周期规则
     * @param {string} groupId - 周期组ID
     * @param {number} index - 周期序号
     * @returns {Object} 周期性任务项
     */

    /**
     * 获取每月固定日期（支持跳过周末）
     */

    /**
     * 获取每月天数
     */

    /**
     * 获取每月第N个工作日
     */
    getNthWorkDayOfMonth(baseDate, monthsAhead, n) {
        const date = new Date(baseDate);
        // 先设置日期为1号，避免月份溢出问题
        date.setDate(1);
        date.setMonth(date.getMonth() + monthsAhead);
        date.setHours(12, 0, 0, 0);

        let workDayCount = 0;
        while (workDayCount < n) {
            if (!this.isWeekend(date)) {
                workDayCount++;
            }
            if (workDayCount < n) {
                date.setDate(date.getDate() + 1);
            }
        }
        return date;
    }

    /**
     * 获取每周固定星期
     * @param {Date} baseDate - 基准日期
     * @param {number} weeksAhead - 周数偏移（0=本周，1=下周，以此类推）
     * @param {number} weekDay - 目标星期几（0=周日，1=周一，...，6=周六）
     * @returns {Date} 目标日期
     */
    getWeeklyDay(baseDate, weeksAhead, weekDay) {
        const date = new Date(baseDate);
        const currentDay = date.getDay();
        
        // 计算到目标星期几的偏移量
        // 如果今天是周三(3)，目标是周五(5)，偏移量是 5-3=2
        // 如果今天是周六(6)，目标是周五(5)，偏移量是 5-6+7=6（下周）
        let diff = weekDay - currentDay;
        
        // 加上周数偏移
        diff += weeksAhead * 7;
        
        date.setDate(date.getDate() + diff);
        date.setHours(12, 0, 0, 0);

        return date;
    }

    /**
     * 判断是否周末
     */
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    /**
     * 判断是否中国法定节假日
     * 包含：元旦、春节、清明、劳动节、端午、中秋、国庆
     */
    isHoliday(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return HolidayData.isHoliday(dateStr);
    }

    /**
     * 获取每月第N个工作日（支持跳过节假日）
     */
    getNthWorkDayOfMonth(baseDate, monthsAhead, n, skipHolidays = false) {
        const date = new Date(baseDate);
        date.setDate(1);
        date.setMonth(date.getMonth() + monthsAhead);
        date.setHours(12, 0, 0, 0);

        let workDayCount = 0;
        while (workDayCount < n) {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (this.isWorkday(dateStr)) {
                workDayCount++;
            }
            if (workDayCount < n) {
                date.setDate(date.getDate() + 1);
            }
        }
        return date;
    }

    /**
     * 获取每月第N个星期X（如每月第一个周一）
     * @param {Date} baseDate - 基准日期
     * @param {number} monthsAhead - 月数偏移
     * @param {number} nthWeek - 第几个（1-5）
     * @param {number} weekDay - 星期几（1-7，1=周一，7=周日）
     * @returns {Date} 目标日期
     */
    getNthWeekDayOfMonth(baseDate, monthsAhead, nthWeek, weekDay) {
        const date = new Date(baseDate);
        date.setDate(1);
        date.setMonth(date.getMonth() + monthsAhead);
        date.setHours(12, 0, 0, 0);

        // 找到该月第一个目标星期几
        const firstDayOfMonth = date.getDay();
        // 将JS的周日=0转换为我们的周一=1...周日=7
        const jsWeekDay = weekDay === 7 ? 0 : weekDay;
        
        // 计算第一个目标星期几的日期
        let daysUntilFirst = jsWeekDay - firstDayOfMonth;
        if (daysUntilFirst < 0) daysUntilFirst += 7;
        
        date.setDate(1 + daysUntilFirst);
        
        // 加上 (nthWeek - 1) 周
        date.setDate(date.getDate() + (nthWeek - 1) * 7);

        return date;
    }

    /**
     * 格式化日期为datetime-local格式
     */
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    /**
     * 显示删除确认
     */
    async showDeleteConfirm(id) {
        // 先检查是否是周期性任务
        const item = await db.getItem(id);
        
        if (this.isCrossDateDocument(item)) {
            const choice = await this.showCrossDateDocDeleteChoice();
            if (choice === 'cancel') {
                return;
            }

            await this.applyCrossDateDocumentDelete(id, item, choice);
            if (choice === 'this') {
                this.showSuccess('已从当天移除');
            } else if (choice === 'future') {
                this.showSuccess('已从今天及之后移除');
            }
            return;
        }
        
        if (item && item.isRecurring && item.recurringGroupId) {
            this.deleteItemId = id;
            this.deleteItem = item;
            const choice = await this.showRecurringDeleteChoice();
            
            if (choice === 'cancel') {
                this.deleteItemId = null;
                this.deleteItem = null;
                return;
            }
            
            if (choice === 'all') {
                await this.deleteRecurringGroup(item);
            } else {
                // 仅删除本项
                await this.confirmDelete();
            }
        } else {
            // 普通任务：显示确认弹窗
            this.deleteItemId = id;
            this.deleteItem = null;
            this.showModal('confirmModal');
        }
    }

    /**
     * 显示周期性任务删除选择框
     */
    showRecurringDeleteChoice() {
        return this._createChoiceModal({
            title: '删除周期性任务',
            description: '这是一个周期性任务，您想如何删除？',
            buttons: [
                { label: '仅删除本项', className: 'btn-secondary', value: 'this' },
                { label: '删除本项及后续所有周期', className: 'btn-danger', style: 'width: 100%; padding: 12px; background: #ef4444; color: white; border-color: #ef4444;', value: 'all' },
                { label: '取消', className: 'btn-text', style: 'width: 100%; padding: 8px;', value: 'cancel' }
            ]
        });
    }


    /**
     * 删除周期性任务组（本项及后续所有）
     */
    async deleteRecurringGroup(item) {
        try {
            const allItems = await db.getAllItems();
            // 使用 String 转换确保类型一致
            const targetGroupId = String(item.recurringGroupId);
            const currentIndex = parseInt(item.occurrenceIndex) || 0;
            
            const groupItems = allItems.filter(i => 
                String(i.recurringGroupId) === targetGroupId && 
                (parseInt(i.occurrenceIndex) || 0) >= currentIndex
            );

            this.saveUndoHistory('delete', { items: groupItems });
            if (syncManager.isLoggedIn()) {
                groupItems.forEach(item => syncManager.markItemDeleted(item));
            }

            // 批量删除
            for (const groupItem of groupItems) {
                await db.deleteItem(groupItem.id);
            }

            await this.loadItems();
            
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }
            
            this.showSuccess(`已删除${groupItems.length}个周期性任务（可撤回）`);
        } catch (error) {
            console.error('批量删除失败:', error);
            this.showError('删除失败: ' + error.message);
        }

        this.deleteItemId = null;
        this.deleteItem = null;
    }

    /**
     * 确认删除
     */
    async confirmDelete() {
        if (!this.deleteItemId) return;

        try {
            // 保存删除的项目用于撤回
            const itemToDelete = await db.getItem(this.deleteItemId);
            if (itemToDelete) {
                this.saveUndoHistory('delete', { item: itemToDelete });
                if (syncManager.isLoggedIn()) {
                    syncManager.markItemDeleted(itemToDelete);
                }
            }

            await db.deleteItem(this.deleteItemId);
            this.hideModal('confirmModal');
            await this.loadItems();
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }
            this.showSuccess('已删除（可撤回）');
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }

        this.deleteItemId = null;
    }

    /**
     * 绑定流转弹窗事件
     */
    bindTransferEvents() {
        document.getElementById('transferBtn')?.addEventListener('click', () => this.openTransferModal());
        document.getElementById('cancelTransfer')?.addEventListener('click', () => this.hideModal('transferModal'));
        document.getElementById('confirmTransfer')?.addEventListener('click', () => this.handleTransfer());
    }

    /**
     * 打开流转弹窗
     */
    openTransferModal() {
        document.getElementById('transferTo').value = '';
        document.getElementById('transferNote').value = '';
        this.showModal('transferModal');
    }

    /**
     * 处理文件流转
     */
    async handleTransfer() {
        const transferTo = document.getElementById('transferTo').value.trim();
        const note = document.getElementById('transferNote').value.trim();

        if (!transferTo) {
            this.showError('请输入接手人姓名');
            return;
        }

        const itemId = document.getElementById('itemId').value;
        if (!itemId) {
            this.showError('请先保存文件信息');
            return;
        }

        try {
            const originalItem = await db.getItem(parseInt(itemId));
            if (!originalItem) return;

            const selectedItem = this.getDocumentItemForSelectedDate(originalItem);
            const transferRecord = {
                from: selectedItem.handler || '待分配',
                to: transferTo,
                time: new Date().toLocaleString('zh-CN'),
                note
            };

            if (this.isCrossDateDocument(originalItem)) {
                const choice = await this.showCrossDateDocChoice('流转', '流转');
                if (choice === 'cancel') return;

                if (choice === 'this') {
                    const dayStates = { ...(originalItem.dayStates || {}) };
                    dayStates[this.selectedDate] = {
                        ...(dayStates[this.selectedDate] || {}),
                        handler: transferTo,
                        progress: DOCUMENT_PROGRESS.PROCESSING,
                        transferHistory: [...(selectedItem.transferHistory || []), transferRecord]
                    };

                    this.saveUndoHistory('update', { item: originalItem });
                    await db.updateItem(parseInt(itemId), { dayStates });
                } else if (choice === 'future') {
                    this.saveUndoHistory('update', { item: originalItem });
                    const dayStates = this._freezeBeforeAndClearFrom(originalItem, this.selectedDate, ['handler', 'progress', 'transferHistory'], [originalItem.handler, originalItem.progress, originalItem.transferHistory]);
                    await db.updateItem(parseInt(itemId), {
                        handler: transferTo,
                        progress: DOCUMENT_PROGRESS.PROCESSING,
                        transferHistory: [...(selectedItem.transferHistory || []), transferRecord],
                        dayStates
                    });
                } else {
                    const clearedDayStates = this.clearDayStatesFields(originalItem.dayStates, ['handler', 'progress', 'transferHistory']);
                    this.saveUndoHistory('update', { item: originalItem });
                    await db.updateItem(parseInt(itemId), {
                        handler: transferTo,
                        progress: DOCUMENT_PROGRESS.PROCESSING,
                        transferHistory: [...(selectedItem.transferHistory || []), transferRecord],
                        dayStates: clearedDayStates
                    });
                }
            } else {
                const item = { ...originalItem };
                item.transferHistory = [...(item.transferHistory || []), transferRecord];
                item.handler = transferTo;
                item.progress = DOCUMENT_PROGRESS.PROCESSING;

                this.saveUndoHistory('update', { item: originalItem });
                await db.updateItem(parseInt(itemId), item);
            }

            document.getElementById('docHandler').value = transferTo;
            this.hideModal('transferModal');
            await this.loadItems();
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }
            this.showSuccess('流转成功');
        } catch (error) {
            console.error('流转失败:', error);
            this.showError('流转失败: ' + error.message);
        }
    }

    /**
     * 生成报告
     */
    async generateReport() {
        const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'daily';
        const customStart = document.getElementById('reportStartDate')?.value;
        const customEnd = document.getElementById('reportEndDate')?.value;

        if (reportType === 'custom') {
            if (!customStart || !customEnd) {
                alert('请选择自定义时间段的开始和结束日期');
                return;
            }
            if (customStart > customEnd) {
                alert('开始日期不能晚于结束日期');
                return;
            }
        }

        const { start, end } = reportGenerator.getDateRange(reportType, new Date(), customStart, customEnd);

        this.showLoading(true);

        try {
            await reportGenerator.exportToImage(reportType, start, end);
            this.hideModal('reportModal');

        } catch (error) {
            console.error('生成报告失败:', error);
            alert('生成报告失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 切换自定义日期范围显示
     */
    toggleCustomDateRange() {
        const reportType = document.querySelector('input[name="reportType"]:checked')?.value;
        const customGroup = document.getElementById('customDateRangeGroup');
        
        if (customGroup) {
            customGroup.style.display = reportType === 'custom' ? 'block' : 'none';
        }
    }

    /**
     * 显示弹窗
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * 隐藏弹窗
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * 显示/隐藏加载中
     */
    showLoading(show, message = '处理中...') {
        const overlay = document.getElementById('loadingOverlay');
        const textEl = overlay?.querySelector('.loading-text');
        if (overlay) {
            overlay.classList.toggle('active', show);
            if (textEl) {
                textEl.textContent = message;
            }
        }
    }

    /**
     * 获取类型标签
     */
    getTypeLabel(type) {
        const labels = { todo: '待办', meeting: '会议', document: '文件' };
        return labels[type] || type;
    }

    /**
     * 显示消息（非阻塞式）
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型: 'error' | 'success' | 'info'
     */
    showMessage(message, type = 'error') {
        const colors = {
            error: { bg: '#ef4444', icon: '✗' },
            success: { bg: '#10b981', icon: '✓' },
            info: { bg: '#3b82f6', icon: 'ℹ' }
        };

        const color = colors[type] || colors.error;

        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color.bg};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideDown 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '16px';
        iconSpan.textContent = color.icon;
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        msgDiv.append(iconSpan, textSpan);
        document.body.appendChild(msgDiv);

        setTimeout(() => {
            msgDiv.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => msgDiv.remove(), 300);
        }, 3000);
    }

    /**
     * 显示错误信息（兼容旧调用）
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * 显示识别日志弹窗
     */
    buildRecognitionSummaryHtml(fileName, result, isPreview = false) {
        return window.UploadFlowUtils.buildRecognitionSummaryHtml(fileName, result, isPreview, 'detailed');
    }

    showRecognitionPreview(fileName, result) {
        return window.UploadFlowUtils.showRecognitionPreviewModal(fileName, result, {
            layout: 'detailed',
            overlayClassName: 'modal active',
            overlayId: 'recognitionPreviewModal',
            dialogClassName: 'modal-content',
            dialogStyle: 'max-width: 680px;',
            headerClassName: 'modal-header',
            headerHtml: '<h3>识别前预览确认</h3>',
            closeButtonClass: 'btn-close',
            bodyClassName: 'modal-body',
            bodyStyle: 'padding: 16px;',
            footerClassName: 'modal-actions',
            cancelButtonClass: 'btn-secondary',
            confirmButtonClass: 'btn-primary'
        });
    }

    showPasswordPrompt(title, placeholder) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            const mc = document.createElement('div');
            mc.className = 'modal-content';
            mc.style.maxWidth = '400px';
            const hdr = document.createElement('div');
            hdr.className = 'modal-header';
            const h3 = document.createElement('h3');
            h3.textContent = title || '请输入密码';
            const cb = document.createElement('button');
            cb.type = 'button';
            cb.className = 'btn-close';
            cb.textContent = '×';
            cb.addEventListener('click', () => { modal.remove(); resolve(null); });
            hdr.append(h3, cb);
            const body = document.createElement('div');
            body.className = 'modal-body';
            body.style.padding = '16px';
            const inp = document.createElement('input');
            inp.type = 'password';
            inp.className = 'form-input';
            inp.placeholder = placeholder || '请输入密码（无密码请留空）';
            inp.style.width = '100%';
            body.appendChild(inp);
            const acts = document.createElement('div');
            acts.className = 'modal-actions';
            const cbtn = document.createElement('button');
            cbtn.type = 'button';
            cbtn.className = 'btn-secondary';
            cbtn.textContent = '取消';
            cbtn.addEventListener('click', () => { modal.remove(); resolve(null); });
            const obtn = document.createElement('button');
            obtn.type = 'button';
            obtn.className = 'btn-primary';
            obtn.textContent = '确定';
            obtn.addEventListener('click', () => { modal.remove(); resolve(inp.value || ''); });
            acts.append(cbtn, obtn);
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { modal.remove(); resolve(inp.value || ''); }
            });
            mc.append(hdr, body, acts);
            modal.appendChild(mc);
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) { modal.remove(); resolve(null); }
            });
            inp.focus();
        });
    }

    showRecognitionLog(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'recognitionLogModal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '500px';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => modal.remove());
        modalHeader.append(h3, closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.padding = '16px';
        if (typeof content === 'string') {
            modalBody.textContent = content;
        } else {
            modalBody.appendChild(content);
        }

        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        modalActions.style.justifyContent = 'center';
        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn-primary';
        okBtn.textContent = '确定';
        okBtn.addEventListener('click', () => modal.remove());
        modalActions.appendChild(okBtn);

        modalContent.append(modalHeader, modalBody, modalActions);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new OfficeDashboard();
    window.officeDashboard = window.dashboard;
});

