/**
 * 办公室智能工作面板 - 主应用
 * 整合所有模块，处理用户交互
 * 
 * 版权声明：Copyright © 2024-2026 kimixpf1. All Rights Reserved.
 * 用户可免费使用本软件，但不得用于商业用途。
 */

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
     * 安全的JSON解析
     */
    safeJsonParse(str, defaultValue = null) {
        if (!str || typeof str !== 'string') return defaultValue;
        try {
            return JSON.parse(str);
        } catch {
            console.warn('JSON解析失败');
            return defaultValue;
        }
    },

    /**
     * 生成安全的随机ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    },

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

        // 多选功能状态
        this.selectedItems = new Set(); // 选中的事项ID
        this.batchMode = false; // 是否处于批量模式

        // 撤回历史
        this.undoHistory = [];
        this.maxUndoSteps = 20;

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

    /**
     * 判断日期是否为工作日（跳过周末和法定节假日）
     * @param {string} dateStr - 日期字符串 YYYY-MM-DD
     * @returns {boolean}
     */
    isWorkday(dateStr) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        
        // 周六(6)和周日(0)不是工作日
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
        
        // 2024-2025年法定节假日列表（可根据需要扩展）
        const holidays = [
            // 2024年
            '2024-01-01', // 元旦
            '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17', // 春节
            '2024-04-04', '2024-04-05', '2024-04-06', // 清明节
            '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05', // 劳动节
            '2024-06-08', '2024-06-09', '2024-06-10', // 端午节
            '2024-09-15', '2024-09-16', '2024-09-17', // 中秋节
            '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07', // 国庆节
            // 2025年
            '2025-01-01', // 元旦
            '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', // 春节
            '2025-04-04', '2025-04-05', '2025-04-06', // 清明节
            '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // 劳动节
            '2025-05-31', '2025-06-01', '2025-06-02', // 端午节
            '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 国庆+中秋
        ];
        
        // 检查是否为节假日
        if (holidays.includes(dateStr)) {
            return false;
        }
        
        return true;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            console.log('开始初始化应用...');

            // 初始化数据库
            console.log('正在连接本地数据库...');
            await db.init();
            console.log('数据库连接成功');

            // 等待同步管理器初始化完成
            await syncManager.waitForInit();

            // 检查登录状态，未登录则清除本地数据
            if (!syncManager.isLoggedIn()) {
                console.log('未登录，清除本地数据...');
                await db.clearAllItems();
            }

            // 绑定事件（先绑定事件，让用户可以交互）
            console.log('绑定用户交互事件...');
            this.bindEvents();

            // 加载数据
            console.log('加载本地数据...');
            await this.loadItems();

            // 初始化日期选择器
            this.initDatePicker();

            // 更新日期显示
            this.updateDateDisplay();

            // 延迟检查API Key（避免阻塞界面）
            setTimeout(() => {
                this.checkApiKey().catch(err => {
                    console.log('API Key检查失败（不影响基本功能）:', err);
                });
            }, 1000);

            console.log('智能工作面板初始化完成');

            // 启动会议自动完成检查
            this.startMeetingAutoCompleteCheck();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message + '。请刷新页面重试。');
        }
    }

    /**
     * 检查API Key（可选，不再强制要求）
     */
    async checkApiKey() {
        // API Key现在是可选的，不再强制显示设置弹窗
        // 用户可以直接使用内置的本地规则解析
        this.updateApiKeyStatus();
    }

    /**
     * 更新API Key状态显示
     */
    async updateApiKeyStatus() {
        const statusEl = document.getElementById('apiKeyStatus');
        if (!statusEl) return;

        const deepseekKey = ocrManager.getApiKey();
        const kimiKey = ocrManager.getKimiApiKey();

        const configured = [];
        if (kimiKey) configured.push('Kimi');
        if (deepseekKey) configured.push('DeepSeek');

        if (configured.length > 0) {
            statusEl.className = 'api-key-status configured';
            statusEl.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text">AI增强已启用（${configured.join(' + ')}）</span>
            `;
        } else {
            statusEl.className = 'api-key-status';
            statusEl.innerHTML = `
                <span class="status-icon">○</span>
                <span class="status-text">使用基础解析</span>
            `;
        }
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

        // 测试API Key连接
        document.getElementById('testApiKey')?.addEventListener('click', () => this.testApiKeyConnection());

        // NLP输入
        document.getElementById('parseBtn')?.addEventListener('click', () => this.parseNaturalLanguage());
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
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            document.getElementById('fileInput')?.click();
        });
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));

        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // 日期导航
        document.getElementById('prevDate')?.addEventListener('click', () => this.navigateDate(-1));
        document.getElementById('nextDate')?.addEventListener('click', () => this.navigateDate(1));
        document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());

        // 日期选择器
        document.getElementById('datePicker')?.addEventListener('change', (e) => this.onDatePickerChange(e));

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

        // 撤回按钮
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undoLastAction());

        // 键盘快捷键：Ctrl+Z 撤回
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undoLastAction();
            }
        });

        // 删除确认
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());

        // 拖拽功能
        this.initDragAndDrop();

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

        // 监听跳转到日期事件
        document.addEventListener('gotoDate', (e) => {
            this.goToDateView(e.detail.date);
        });

        // 初始化右侧折叠面板
        this.initSidePanels();
    }

    /**
     * 初始化所有右侧折叠面板
     */
    initSidePanels() {
        this.initToolsPanel();
        this.initLinksPanel();
        this.initContactsPanel();
        this.initMemoPanel();
        this.initToolModals();
    }

    /**
     * 初始化工具面板
     */
    initToolsPanel() {
        const panel = document.getElementById('toolsPanel');
        const toggle = document.getElementById('toolsToggle');
        const close = document.getElementById('toolsClose');

        if (!panel || !toggle) return;

        // 加载并渲染工具
        this.loadTools();

        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }
    }

    /**
     * 获取默认工具列表
     */
    getDefaultTools() {
        return [
            { id: 'kimi', name: 'Kimi', icon: 'K', type: 'link', url: 'https://kimi.moonshot.cn/', iconClass: 'ai' },
            { id: 'deepseek', name: 'DeepSeek', icon: 'D', type: 'link', url: 'https://chat.deepseek.com/', iconClass: 'ai' },
            { id: 'doubao', name: '豆包', icon: '豆', type: 'link', url: 'https://www.doubao.com/chat/', iconClass: 'ai' },
            { id: 'calculator', name: '计算器', icon: '计', type: 'tool', iconClass: 'calc' },
            { id: 'weather', name: '天气', icon: '天', type: 'tool', iconClass: 'weather' },
            { id: 'timer', name: '倒计时', icon: '时', type: 'tool', iconClass: 'timer' }
        ];
    }

    /**
     * 加载工具列表
     */
    loadTools() {
        let tools;
        const saved = localStorage.getItem('office_tools');
        if (saved) {
            try {
                tools = JSON.parse(saved);
                if (!Array.isArray(tools) || tools.length === 0) {
                    tools = this.getDefaultTools();
                }
            } catch (e) {
                tools = this.getDefaultTools();
            }
        } else {
            tools = this.getDefaultTools();
        }
        localStorage.setItem('office_tools', JSON.stringify(tools));
        this.renderTools(tools);
    }

    /**
     * 渲染工具列表
     */
    renderTools(tools) {
        const grid = document.getElementById('toolsGrid');
        if (!grid) return;

        grid.innerHTML = tools.map((tool, index) => {
            const isLink = tool.type === 'link';
            const tag = isLink ? 'a' : 'div';
            const linkAttrs = isLink ? `href="${tool.url}" target="_blank"` : `data-tool="${tool.id}"`;
            
            return `
                <${tag} ${linkAttrs} class="tool-item" data-index="${index}" draggable="true">
                    <span class="tool-drag" title="拖动排序">⋮⋮</span>
                    <div class="tool-icon ${tool.iconClass}">${tool.icon}</div>
                    <span>${tool.name}</span>
                </${tag}>
            `;
        }).join('');

        // 绑定工具点击事件（非链接类型）
        grid.querySelectorAll('.tool-item[data-tool]').forEach(item => {
            item.addEventListener('click', () => {
                const toolId = item.dataset.tool;
                this.openTool(toolId);
            });
        });

        // 初始化拖动排序
        this.initToolsDragSort(grid);
    }

    /**
     * 初始化工具拖动排序
     */
    initToolsDragSort(container) {
        let draggedItem = null;
        let currentTools = []; // 缓存当前工具列表

        // 获取当前工具列表
        const saved = localStorage.getItem('office_tools');
        if (saved) {
            try {
                currentTools = JSON.parse(saved);
            } catch (e) {
                currentTools = this.getDefaultTools();
            }
        }

        container.querySelectorAll('.tool-item').forEach(item => {
            // <a>标签需要设置draggable属性
            if (item.tagName === 'A') {
                item.setAttribute('draggable', 'true');
            }

            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                // 阻止<a>标签的默认点击行为
                e.stopPropagation();
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.tool-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const draggingItem = container.querySelector('.dragging');
                if (draggingItem && draggingItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        item.parentNode.insertBefore(draggingItem, item);
                    } else {
                        item.parentNode.insertBefore(draggingItem, item.nextSibling);
                    }
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                // 根据当前DOM顺序重新构建工具列表
                const newOrder = [];
                const items = container.querySelectorAll('.tool-item');
                
                items.forEach((el, newIdx) => {
                    const oldIdx = parseInt(el.dataset.index);
                    if (currentTools[oldIdx]) {
                        newOrder.push(currentTools[oldIdx]);
                    }
                    // 更新索引
                    el.dataset.index = newIdx;
                });
                
                // 更新缓存和localStorage
                currentTools = newOrder;
                localStorage.setItem('office_tools', JSON.stringify(newOrder));
            });
        });
    }

    /**
     * 初始化网站面板
     */
    initLinksPanel() {
        const panel = document.getElementById('linksPanel');
        const toggle = document.getElementById('linksToggle');
        const close = document.getElementById('linksClose');
        const linksList = document.getElementById('linksList');
        const addBtn = document.getElementById('addLinkBtn');
        const nameInput = document.getElementById('newLinkName');
        const urlInput = document.getElementById('newLinkUrl');

        if (!panel || !toggle) return;

        // 加载保存的网站
        this.loadLinks();

        // 切换面板
        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }

        // 添加网站的处理函数
        const handleAddLink = () => {
            const name = nameInput ? nameInput.value.trim() : '';
            let url = urlInput ? urlInput.value.trim() : '';

            if (!name || !url) {
                this.showError('请输入网站名称和网址');
                return;
            }

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            this.addLink(name, url);
            if (nameInput) nameInput.value = '';
            if (urlInput) urlInput.value = '';
            if (nameInput) nameInput.focus();
        };

        // 点击按钮添加
        if (addBtn) {
            addBtn.addEventListener('click', handleAddLink);
        }

        // 回车键添加
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                }
            });
        }
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (urlInput && !urlInput.value.trim()) {
                        urlInput.focus();
                    } else {
                        handleAddLink();
                    }
                }
            });
        }

        // 监听网站同步事件
        document.addEventListener('linksSynced', (e) => {
            this.renderLinks(e.detail.links);
        });
    }

    /**
     * 加载网站列表
     */
    loadLinks() {
        let links;
        const saved = localStorage.getItem('office_links');

        // 检查是否需要更新默认网站
        const needsUpdate = this.checkLinksNeedUpdate(saved);

        if (saved && !needsUpdate) {
            try {
                links = JSON.parse(saved);
                if (!Array.isArray(links) || links.length === 0) {
                    links = this.getDefaultLinks();
                }
            } catch (e) {
                console.error('解析网站数据失败:', e);
                links = this.getDefaultLinks();
            }
        } else if (saved && needsUpdate) {
            // 需要更新但保留用户添加的网站
            try {
                links = JSON.parse(saved);
                if (!Array.isArray(links)) {
                    links = this.getDefaultLinks();
                } else {
                    // 更新默认网站的图标，并添加缺失的默认网站
                    const defaultLinks = this.getDefaultLinks();
                    defaultLinks.forEach(defaultLink => {
                        const existingIndex = links.findIndex(l => l.url === defaultLink.url);
                        if (existingIndex >= 0) {
                            // 更新图标
                            links[existingIndex].icon = defaultLink.icon;
                            links[existingIndex].name = defaultLink.name;
                        } else {
                            // 添加缺失的默认网站
                            links.push(defaultLink);
                        }
                    });
                    // 移除旧的默认网站（微信读书、苏州统计局）
                    links = links.filter(l => !l.url || (!l.url.includes('weread.qq.com') && !l.url.includes('tjj.suzhou.gov.cn')));
                }
            } catch (e) {
                console.error('处理网站数据失败:', e);
                links = this.getDefaultLinks();
            }
        } else {
            // 无数据，使用新的默认列表
            links = this.getDefaultLinks();
        }

        // 确保数据保存到localStorage
        localStorage.setItem('office_links', JSON.stringify(links));
        this.renderLinks(links);
    }

    /**
     * 检查网站列表是否需要更新
     */
    checkLinksNeedUpdate(saved) {
        if (!saved) return true;

        try {
            const links = JSON.parse(saved);
            if (!Array.isArray(links) || links.length === 0) return true;

            // 检查是否包含旧的默认网站（微信读书）
            const hasOldDefault = links.some(l =>
                l.url && l.url.includes('weread.qq.com')
            );

            // 检查是否缺少新的默认网站
            const defaultLinks = this.getDefaultLinks();
            const hasNewDefaults = defaultLinks.every(defaultLink =>
                links.some(l => l.url === defaultLink.url)
            );

            // 检查默认网站的图标是否正确
            const hasWrongIcon = defaultLinks.some(defaultLink => {
                const existingLink = links.find(l => l.url === defaultLink.url);
                return existingLink && existingLink.icon !== defaultLink.icon;
            });

            // 如果有旧默认网站、缺少新默认网站、或图标不正确，需要更新
            return hasOldDefault || !hasNewDefaults || hasWrongIcon;
        } catch (e) {
            return true;
        }
    }

    /**
     * 获取默认网站
     */
    getDefaultLinks() {
        return [
            { name: '中国政府网', url: 'https://www.gov.cn/', icon: '🏢' },
            { name: '江苏政府网', url: 'https://www.jiangsu.gov.cn/', icon: '🏢' },
            { name: '苏州政府网', url: 'https://www.suzhou.gov.cn/', icon: '🏢' },
            { name: '百度', url: 'https://www.baidu.com/', icon: '🔎' }
        ];
    }

    /**
     * 根据URL自动识别图标
     */
    getAutoIcon(url) {
        if (!url) return '🔗';
        
        const urlLower = url.toLowerCase();
        
        // 政府网站 - 使用办公大楼图标
        if (urlLower.includes('.gov.') || urlLower.includes('政府')) {
            return '🏢';
        }
        
        // 统计、数据类
        if (urlLower.includes('stat') || urlLower.includes('统计') || urlLower.includes('data')) {
            return '📈';
        }
        
        // 搜索引擎
        if (urlLower.includes('baidu') || urlLower.includes('google') || urlLower.includes('bing') || 
            urlLower.includes('sogou') || urlLower.includes('360') || urlLower.includes('search')) {
            return '🔎';
        }
        
        // 社交媒体
        if (urlLower.includes('weibo') || urlLower.includes('微博')) {
            return '📱';
        }
        if (urlLower.includes('weixin') || urlLower.includes('微信') || urlLower.includes('wechat')) {
            return '💬';
        }
        if (urlLower.includes('douyin') || urlLower.includes('tiktok') || urlLower.includes('抖音')) {
            return '🎵';
        }
        
        // 视频网站
        if (urlLower.includes('bilibili') || urlLower.includes('哔哩')) {
            return '📺';
        }
        if (urlLower.includes('youku') || urlLower.includes('优酷') || urlLower.includes('iqiyi') || 
            urlLower.includes('爱奇艺') || urlLower.includes('video')) {
            return '🎬';
        }
        
        // 新闻资讯
        if (urlLower.includes('news') || urlLower.includes('新闻') || urlLower.includes('xinwen')) {
            return '📰';
        }
        
        // 购物电商
        if (urlLower.includes('taobao') || urlLower.includes('淘宝') || urlLower.includes('jd') || 
            urlLower.includes('京东') || urlLower.includes('shop') || urlLower.includes('商城')) {
            return '🛒';
        }
        
        // 邮箱
        if (urlLower.includes('mail') || urlLower.includes('邮箱') || urlLower.includes('email')) {
            return '📧';
        }
        
        // 文档/办公
        if (urlLower.includes('doc') || urlLower.includes('文档') || urlLower.includes('office')) {
            return '📄';
        }
        if (urlLower.includes('sheet') || urlLower.includes('表格') || urlLower.includes('excel')) {
            return '📊';
        }
        
        // 教育/学习
        if (urlLower.includes('edu') || urlLower.includes('学') || urlLower.includes('课')) {
            return '🎓';
        }
        
        // 银行/金融
        if (urlLower.includes('bank') || urlLower.includes('银行') || urlLower.includes('金融') || 
            urlLower.includes('fund') || urlLower.includes('基金')) {
            return '🏦';
        }
        
        // 工具/开发
        if (urlLower.includes('github') || urlLower.includes('git') || urlLower.includes('code')) {
            return '💻';
        }
        if (urlLower.includes('tool') || urlLower.includes('工具')) {
            return '🔧';
        }
        
        // AI相关
        if (urlLower.includes('ai') || urlLower.includes('gpt') || urlLower.includes('chat') || 
            urlLower.includes('kimi') || urlLower.includes('deepseek')) {
            return '🤖';
        }
        
        // 默认
        return '🔗';
    }

    /**
     * 渲染网站列表（支持拖动排序）
     */
    renderLinks(links) {
        const linksList = document.getElementById('linksList');
        if (!linksList) return;

        linksList.innerHTML = links.map((link, index) => `
            <div class="link-item" data-index="${index}" data-url="${SecurityUtils.escapeHtml(link.url)}" draggable="true">
                <span class="link-drag" title="拖动排序">⋮⋮</span>
                <span class="link-icon">${link.icon || '🔗'}</span>
                <span class="link-name">${SecurityUtils.escapeHtml(link.name)}</span>
                <button class="link-delete" data-index="${index}" title="删除">×</button>
            </div>
        `).join('');

        // 绑定点击跳转事件
        linksList.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('link-delete') || e.target.classList.contains('link-drag')) return;
                const url = item.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });

        // 绑定删除事件
        linksList.querySelectorAll('.link-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.deleteLink(index);
            });
        });

        // 绑定拖动排序事件
        this.initLinksDragSort(linksList);
    }

    /**
     * 初始化网站拖动排序
     */
    initLinksDragSort(container) {
        let draggedItem = null;
        let currentLinks = []; // 缓存当前链接列表

        // 获取当前链接列表
        const saved = localStorage.getItem('office_links');
        if (saved) {
            try {
                currentLinks = JSON.parse(saved);
            } catch (e) {
                currentLinks = [];
            }
        }

        container.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.link-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const draggingItem = container.querySelector('.dragging');
                if (draggingItem && draggingItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        item.parentNode.insertBefore(draggingItem, item);
                    } else {
                        item.parentNode.insertBefore(draggingItem, item.nextSibling);
                    }
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                // 根据当前DOM顺序重新构建链接列表
                const newOrder = [];
                const items = container.querySelectorAll('.link-item');
                
                items.forEach((el, newIdx) => {
                    const oldIdx = parseInt(el.dataset.index);
                    if (currentLinks[oldIdx]) {
                        newOrder.push(currentLinks[oldIdx]);
                    }
                    // 更新索引
                    el.dataset.index = newIdx;
                });
                
                // 更新缓存和localStorage
                currentLinks = newOrder;
                localStorage.setItem('office_links', JSON.stringify(newOrder));
                this.syncLinksToCloud(newOrder);
            });
        });
    }

    /**
     * 添加网站
     */
    addLink(name, url) {
        // 安全验证
        name = SecurityUtils.sanitizeInput(name, 50);
        url = SecurityUtils.sanitizeInput(url, 500);
        
        if (!name) {
            this.showError('请输入有效的网站名称');
            return;
        }
        
        if (!SecurityUtils.isValidUrl(url)) {
            this.showError('请输入有效的网址（以http://或https://开头）');
            return;
        }
        
        let links = [];
        try {
            const saved = localStorage.getItem('office_links');
            if (saved) {
                const parsed = SecurityUtils.safeJsonParse(saved, []);
                if (Array.isArray(parsed)) {
                    links = parsed;
                }
            }
        } catch (e) {
            console.error('读取网站列表失败:', e);
        }
        
        links.push({ name, url, icon: this.getAutoIcon(url) });
        localStorage.setItem('office_links', JSON.stringify(links));
        this.renderLinks(links);
        this.showSuccess('网站已添加: ' + name);

        // 云端同步
        this.syncLinksToCloud(links);
    }

    /**
     * 删除网站
     */
    deleteLink(index) {
        const saved = localStorage.getItem('office_links');
        let links = [];
        
        if (saved) {
            try {
                links = JSON.parse(saved);
            } catch (e) {
                links = [];
            }
        }
        
        links.splice(index, 1);
        localStorage.setItem('office_links', JSON.stringify(links));
        this.renderLinks(links);

        // 云端同步
        this.syncLinksToCloud(links);
    }

    /**
     * 同步网站到云端
     */
    async syncLinksToCloud(links) {
        if (syncManager.isLoggedIn()) {
            // 更新syncData中的links
            localStorage.setItem('office_links', JSON.stringify(links));
            await syncManager.immediateSyncToCloud();
        }
    }

    /**
     * 初始化工具弹窗
     */
    initToolModals() {
        // 关闭弹窗按钮
        document.querySelectorAll('.tool-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                if (modalId) {
                    document.getElementById(modalId).classList.remove('active');
                }
            });
        });

        // 点击遮罩关闭
        document.querySelectorAll('.tool-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // 工具项点击
        document.querySelectorAll('.tool-item[data-tool]').forEach(item => {
            item.addEventListener('click', () => {
                const tool = item.dataset.tool;
                this.openTool(tool);
            });
        });

        // 计算器按钮
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.calc;
                this.calcInput(val);
            });
        });

        // 计算器键盘支持
        document.addEventListener('keydown', (e) => {
            const calculatorModal = document.getElementById('calculatorModal');
            if (!calculatorModal || !calculatorModal.classList.contains('active')) return;

            const key = e.key;
            const keyMap = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
                '+': '+', '-': '-', '*': '*', '/': '/', '.': '.',
                'Enter': '=', '=': '=', 'Escape': 'C', 'c': 'C', 'C': 'C',
                'Backspace': 'backspace', '%': '%'
            };

            if (keyMap[key]) {
                e.preventDefault();
                if (keyMap[key] === 'backspace') {
                    // 退格删除最后一个字符
                    const display = document.getElementById('calcDisplay');
                    if (display) display.value = display.value.slice(0, -1);
                } else {
                    this.calcInput(keyMap[key]);
                }
            }
        });

        // 倒计时
        this.initTimer();
    }

    /**
     * 打开工具
     */
    openTool(tool) {
        const modal = document.getElementById(tool + 'Modal');
        if (modal) {
            modal.classList.add('active');
            
            if (tool === 'weather') {
                this.loadWeather();
            }
        }
    }

    /**
     * 计算器输入
     */
    calcInput(val) {
        const display = document.getElementById('calcDisplay');
        if (!display) return;

        let current = display.value;

        if (val === 'C') {
            display.value = '';
        } else if (val === '±') {
            if (current.startsWith('-')) {
                display.value = current.substring(1);
            } else if (current) {
                display.value = '-' + current;
            }
        } else if (val === '%') {
            try {
                display.value = parseFloat(eval(current)) / 100;
            } catch (e) {}
        } else if (val === '=') {
            try {
                display.value = eval(current);
            } catch (e) {
                display.value = 'Error';
            }
        } else {
            display.value = current + val;
        }
    }

    /**
     * 加载天气
     */
    async loadWeather() {
        const weatherBody = document.getElementById('weatherBody');
        if (!weatherBody) return;

        weatherBody.innerHTML = '<div class="weather-loading">正在获取天气...</div>';

        try {
            // 读取用户保存的城市设置，默认苏州
            const savedCity = localStorage.getItem('office_weather_city');
            let cityConfig;
            if (savedCity) {
                try {
                    cityConfig = JSON.parse(savedCity);
                } catch (e) {
                    cityConfig = null;
                }
            }
            if (!cityConfig) {
                cityConfig = { name: '苏州', lat: 31.2989, lon: 120.5853 };
            }

            await this.fetchWeather(cityConfig.lat, cityConfig.lon, cityConfig.name);
        } catch (e) {
            console.error('天气加载失败:', e);
            weatherBody.innerHTML = '<div class="weather-loading">获取天气失败</div>';
        }
    }

    /**
     * 获取天气数据
     */
    async fetchWeather(lat, lon, cityName) {
        const weatherBody = document.getElementById('weatherBody');
        
        try {
            weatherBody.innerHTML = '<div class="weather-loading">正在加载天气...</div>';
            
            // 使用 open-meteo 免费天气API（无需key，国内可访问）
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FShanghai&forecast_days=3`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeout);
            
            if (!response.ok) {
                throw new Error('API请求失败');
            }
            
            const data = await response.json();
            
            if (!data.current) {
                throw new Error('数据格式错误');
            }
            
            const temp = Math.round(data.current.temperature_2m);
            const humidity = data.current.relative_humidity_2m;
            const windSpeed = Math.round(data.current.wind_speed_10m);
            const code = data.current.weather_code;
            const desc = this.getWeatherDesc(code);
            const icon = this.getWeatherIcon(code);
            
            // 未来3天预报
            let forecastHtml = '';
            if (data.daily && data.daily.time) {
                forecastHtml = '<div class="weather-forecast">';
                const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                for (let i = 0; i < Math.min(3, data.daily.time.length); i++) {
                    const d = new Date(data.daily.time[i]);
                    const dayName = i === 0 ? '今天' : dayNames[d.getDay()];
                    const maxT = Math.round(data.daily.temperature_2m_max[i]);
                    const minT = Math.round(data.daily.temperature_2m_min[i]);
                    const dayIcon = this.getWeatherIcon(data.daily.weather_code[i]);
                    forecastHtml += `<div class="forecast-day"><span class="forecast-name">${dayName}</span><span class="forecast-icon">${dayIcon}</span><span class="forecast-temp">${minT}~${maxT}°</span></div>`;
                }
                forecastHtml += '</div>';
            }
            
            weatherBody.innerHTML = `
                <div class="weather-info">
                    <div class="weather-icon">${icon}</div>
                    <div class="weather-temp">${temp}°C</div>
                    <div class="weather-desc">${desc}</div>
                    <div class="weather-detail">湿度 ${humidity}% · 风速 ${windSpeed}km/h</div>
                    <div class="weather-city-row">
                        <span class="weather-city">${cityName}</span>
                        <button class="weather-change-btn" id="weatherChangeBtn">切换城市</button>
                    </div>
                    ${forecastHtml}
                </div>
            `;
            
            // 绑定切换城市按钮
            document.getElementById('weatherChangeBtn')?.addEventListener('click', () => {
                this.showCitySelector();
            });
        } catch (e) {
            console.error('天气获取失败:', e);
            weatherBody.innerHTML = `
                <div class="weather-error">
                    <div>🌤️</div>
                    <div>天气获取失败</div>
                    <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">请检查网络连接</div>
                    <button class="weather-change-btn" id="weatherRetryChangeBtn" style="margin-top:10px;">切换城市</button>
                </div>
            `;
            document.getElementById('weatherRetryChangeBtn')?.addEventListener('click', () => {
                this.showCitySelector();
            });
        }
    }

    /**
     * 显示城市选择器
     */
    showCitySelector() {
        const weatherBody = document.getElementById('weatherBody');
        if (!weatherBody) return;

        const cities = [
            { name: '苏州', lat: 31.2989, lon: 120.5853 },
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

        weatherBody.innerHTML = `
            <div class="city-selector">
                <div class="city-selector-title">选择城市</div>
                <div class="city-grid">
                    ${cities.map(c => `<button class="city-btn" data-city='${JSON.stringify(c)}'>${c.name}</button>`).join('')}
                </div>
                <div class="city-custom" style="margin-top:10px;">
                    <input type="text" id="customCityName" placeholder="自定义城市名" style="width:45%;padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;font-size:12px;">
                    <input type="text" id="customCityCoords" placeholder="纬度,经度" style="width:35%;padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;font-size:12px;">
                    <button class="city-btn" id="customCityBtn" style="width:18%;">确定</button>
                </div>
            </div>
        `;

        // 绑定城市按钮
        weatherBody.querySelectorAll('.city-btn[data-city]').forEach(btn => {
            btn.addEventListener('click', () => {
                const city = JSON.parse(btn.dataset.city);
                localStorage.setItem('office_weather_city', JSON.stringify(city));
                this.fetchWeather(city.lat, city.lon, city.name);
            });
        });

        // 自定义城市
        document.getElementById('customCityBtn')?.addEventListener('click', () => {
            const name = document.getElementById('customCityName')?.value.trim();
            const coords = document.getElementById('customCityCoords')?.value.trim();
            if (!name || !coords) {
                this.showError('请输入城市名和坐标（纬度,经度）');
                return;
            }
            const parts = coords.split(',').map(s => parseFloat(s.trim()));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                this.showError('坐标格式错误，请输入: 纬度,经度');
                return;
            }
            const city = { name, lat: parts[0], lon: parts[1] };
            localStorage.setItem('office_weather_city', JSON.stringify(city));
            this.fetchWeather(city.lat, city.lon, city.name);
        });
    }

    /**
     * 获取天气图标
     */
    getWeatherIcon(code) {
        if (code === 0 || code === 1) return '☀️';
        if (code === 2 || code === 3) return '⛅';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌦️';
        if (code >= 95 && code <= 99) return '⛈️';
        return '🌤️';
    }

    /**
     * 天气代码转描述
     */
    getWeatherDesc(code) {
        const map = {
            0: '晴', 1: '晴', 2: '少云', 3: '多云',
            45: '雾', 48: '雾凇',
            51: '小雨', 53: '小雨', 55: '中雨',
            61: '小雨', 63: '中雨', 65: '大雨',
            71: '小雪', 73: '中雪', 75: '大雪',
            80: '阵雨', 81: '阵雨', 82: '暴雨',
            95: '雷暴', 96: '雷暴冰雹', 99: '强雷暴'
        };
        return map[code] || '未知';
    }

    /**
     * 初始化倒计时
     */
    initTimer() {
        const display = document.getElementById('timerDisplay');
        const startBtn = document.getElementById('timerStart');
        const pauseBtn = document.getElementById('timerPause');
        const resetBtn = document.getElementById('timerReset');
        const hoursInput = document.getElementById('timerHours');
        const minutesInput = document.getElementById('timerMinutes');
        const secondsInput = document.getElementById('timerSeconds');

        if (!display || !startBtn) return;

        let timer = null;
        let remaining = 0;

        const updateDisplay = () => {
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            const s = remaining % 60;
            display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        startBtn.addEventListener('click', () => {
            if (timer) return;
            
            if (remaining === 0) {
                const h = parseInt(hoursInput.value) || 0;
                const m = parseInt(minutesInput.value) || 0;
                const s = parseInt(secondsInput.value) || 0;
                remaining = h * 3600 + m * 60 + s;
            }

            if (remaining <= 0) return;

            startBtn.disabled = true;
            pauseBtn.disabled = false;

            timer = setInterval(() => {
                remaining--;
                updateDisplay();

                if (remaining <= 0) {
                    clearInterval(timer);
                    timer = null;
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    alert('时间到！');
                }
            }, 1000);
        });

        pauseBtn.addEventListener('click', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        });

        resetBtn.addEventListener('click', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            remaining = 0;
            updateDisplay();
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        });
    }

    /**
     * 初始化通讯录面板
     */
    initContactsPanel() {
        const panel = document.getElementById('contactsPanel');
        const toggle = document.getElementById('contactsToggle');
        const close = document.getElementById('contactsClose');
        const searchInput = document.getElementById('contactsSearchInput');
        const searchBtn = document.getElementById('contactsSearchBtn');
        const clearSearchBtn = document.getElementById('contactsClearSearchBtn');
        const addBtn = document.getElementById('addContactBtn');
        const importFile = document.getElementById('importContactsFile');
        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');

        if (!panel || !toggle) return;

        // 切换面板
        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
            if (panel.classList.contains('expanded')) {
                this.loadContacts();
            }
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }

        // 添加联系人
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addContact();
            });
        }

        // 回车添加
        if (phoneInput) {
            phoneInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addContact();
                }
            });
        }

        // 搜索按钮
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.filterContacts(searchInput?.value || '');
            });
        }

        // 回车搜索
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filterContacts(searchInput.value);
                }
            });
            // 输入时显示/隐藏清除按钮
            searchInput.addEventListener('input', () => {
                if (searchInput.value && clearSearchBtn) {
                    clearSearchBtn.style.display = 'block';
                } else if (clearSearchBtn) {
                    clearSearchBtn.style.display = 'none';
                }
            });
        }

        // 清除搜索
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                this.renderContacts(this.contacts);
            });
        }

        // 导入Excel
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importContactsFromExcel(e.target.files[0]);
            });
        }

        // 批量删除按钮
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', () => {
                this.batchDeleteContacts();
            });
        }

        // 监听云端同步事件（其他设备更新时）
        document.addEventListener('contactsSynced', (e) => {
            const newContacts = e.detail.contacts;
            this.contacts = newContacts;
            this.renderContacts(newContacts);
            console.log('通讯录已从云端同步');
        });

        // 初始加载
        this.loadContacts();
    }

    /**
     * 加载通讯录
     */
    async loadContacts() {
        let contacts = [];
        
        // 从本地加载
        const saved = localStorage.getItem('office_contacts');
        if (saved) {
            try {
                contacts = JSON.parse(saved);
            } catch (e) {
                contacts = [];
            }
        }

        // 未登录时清空数据
        if (!syncManager.isLoggedIn()) {
            contacts = [];
        }

        this.contacts = contacts;
        this.renderContacts(contacts);
    }

    /**
     * 渲染通讯录列表
     * @param {Array} contacts - 联系人数组
     * @param {string} highlightKeyword - 高亮关键词（可选）
     */
    renderContacts(contacts, highlightKeyword = '') {
        const list = document.getElementById('contactsList');
        const status = document.getElementById('contactsStatus');

        if (!list) return;

        // 未登录提示
        if (!syncManager.isLoggedIn()) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">请登录后使用通讯录功能</div>';
            if (status) status.textContent = '请登录';
            return;
        }

        if (contacts.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">暂无联系人</div>';
            // 隐藏批量删除按钮
            const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
            if (batchDeleteBtn) batchDeleteBtn.style.display = 'none';
        } else {
            list.innerHTML = contacts.map((contact, index) => {
                // 高亮匹配的文字
                let displayName = this.escapeHtml(contact.name);
                let displayPhone = this.escapeHtml(contact.phone);

                if (highlightKeyword) {
                    // 高亮姓名中的匹配文字
                    const nameRegex = new RegExp(`(${this.escapeRegex(highlightKeyword)})`, 'gi');
                    displayName = displayName.replace(nameRegex, '<mark class="highlight">$1</mark>');

                    // 高亮电话号码中的匹配文字（包括后四位）
                    const phoneRegex = new RegExp(`(${this.escapeRegex(highlightKeyword)})`, 'gi');
                    displayPhone = displayPhone.replace(phoneRegex, '<mark class="highlight">$1</mark>');
                }

                const isMatched = highlightKeyword && (
                    contact.name.toLowerCase().includes(highlightKeyword.toLowerCase()) ||
                    contact.phone.includes(highlightKeyword) ||
                    (contact.phone.length >= 4 && contact.phone.slice(-4) === highlightKeyword)
                );

                return `
                    <div class="contact-item ${isMatched ? 'matched' : ''}" data-index="${index}" data-id="${contact.id || index}">
                        <input type="checkbox" class="contact-checkbox" data-id="${contact.id || index}">
                        <div class="contact-info" ondblclick="app.editContact('${contact.id || index}')">
                            <div class="contact-name">${displayName}</div>
                            <div class="contact-phone">${displayPhone}</div>
                        </div>
                        <div class="contact-actions">
                            <button class="contact-call" onclick="window.open('tel:${contact.phone}')">拨打</button>
                            <button class="contact-edit" data-id="${contact.id || index}">编辑</button>
                            <button class="contact-delete" data-id="${contact.id || index}">删除</button>
                        </div>
                    </div>
                `;
            }).join('');

            // 绑定删除事件
            list.querySelectorAll('.contact-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = e.target.dataset.id;
                    this.deleteContact(id);
                });
            });

            // 绑定编辑事件
            list.querySelectorAll('.contact-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = e.target.dataset.id;
                    this.editContact(id);
                });
            });

            // 绑定复选框事件
            list.querySelectorAll('.contact-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    this.updateBatchDeleteButton();
                });
            });
        }

        if (status) {
            status.textContent = `共 ${contacts.length} 个联系人`;
        }
    }

    /**
     * 更新批量删除按钮状态
     */
    updateBatchDeleteButton() {
        const checkedCount = document.querySelectorAll('.contact-checkbox:checked').length;
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.style.display = checkedCount > 0 ? 'inline-block' : 'none';
            batchDeleteBtn.textContent = `删除(${checkedCount})`;
        }
    }

    /**
     * 批量删除选中的联系人
     */
    async batchDeleteContacts() {
        const checkedBoxes = document.querySelectorAll('.contact-checkbox:checked');
        if (checkedBoxes.length === 0) return;

        if (!confirm(`确定删除选中的 ${checkedBoxes.length} 个联系人？`)) return;

        const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
        this.contacts = this.contacts.filter(c => !idsToDelete.includes(c.id) && !idsToDelete.includes(String(c.id)));

        await this.saveContacts();
        this.renderContacts(this.contacts);

        // 隐藏批量删除按钮
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) batchDeleteBtn.style.display = 'none';
    }

    /**
     * 添加/更新联系人
     */
    async addContact() {
        if (!syncManager.isLoggedIn()) {
            alert('请先登录');
            return;
        }

        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');
        const addBtn = document.getElementById('addContactBtn');

        const name = nameInput?.value.trim();
        const phone = phoneInput?.value.trim();

        if (!name) {
            alert('请输入姓名');
            return;
        }
        if (!phone) {
            alert('请输入电话号码');
            return;
        }

        // 检查是否是编辑模式
        const editId = addBtn?.dataset.editId;
        
        if (editId && addBtn?.classList.contains('editing')) {
            // 编辑模式：更新现有联系人
            const index = this.contacts.findIndex(c => c.id === editId || c.id === parseInt(editId));
            if (index >= 0) {
                this.contacts[index].name = name;
                this.contacts[index].phone = phone;
                this.contacts[index].updatedAt = new Date().toISOString();
            }
            // 重置按钮状态
            addBtn.textContent = '+ 添加';
            delete addBtn.dataset.editId;
            addBtn.classList.remove('editing');
        } else {
            // 新增模式
            const contact = {
                id: Date.now().toString(),
                name,
                phone,
                createdAt: new Date().toISOString()
            };
            this.contacts = this.contacts || [];
            this.contacts.push(contact);
        }

        // 保存
        await this.saveContacts();

        // 清空输入
        nameInput.value = '';
        phoneInput.value = '';

        // 刷新列表
        this.renderContacts(this.contacts);
    }

    /**
     * 删除联系人
     */
    async deleteContact(id) {
        if (!confirm('确定删除此联系人？')) return;

        this.contacts = this.contacts.filter(c => c.id !== id && c.id !== parseInt(id));
        await this.saveContacts();
        this.renderContacts(this.contacts);
    }

    /**
     * 编辑联系人
     */
    editContact(id) {
        const contact = this.contacts.find(c => c.id === id || c.id === parseInt(id));
        if (!contact) return;

        // 填充到输入框
        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');
        const addBtn = document.getElementById('addContactBtn');

        if (nameInput && phoneInput) {
            nameInput.value = contact.name;
            phoneInput.value = contact.phone;

            // 更改按钮状态为编辑模式
            if (addBtn) {
                addBtn.textContent = '保存';
                addBtn.dataset.editId = id;
                addBtn.classList.add('editing');
            }

            nameInput.focus();

            // 滚动到输入区域
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * 保存通讯录
     */
    async saveContacts() {
        const status = document.getElementById('contactsStatus');
        
        // 保存到本地
        localStorage.setItem('office_contacts', JSON.stringify(this.contacts));

        // 同步到云端
        if (syncManager.isLoggedIn()) {
            if (status) status.textContent = '同步中...';
            try {
                await syncManager.immediateSyncToCloud();
                console.log('通讯录已同步到云端');
                if (status) status.textContent = `共 ${this.contacts.length} 个联系人 ✓ 已同步`;
                setTimeout(() => {
                    if (status) status.textContent = `共 ${this.contacts.length} 个联系人`;
                }, 2000);
            } catch (e) {
                console.error('通讯录同步失败:', e);
                if (status) status.textContent = `共 ${this.contacts.length} 个联系人 (同步失败)`;
            }
        } else {
            if (status) status.textContent = `共 ${this.contacts.length} 个联系人`;
        }
    }

    /**
     * 搜索过滤通讯录
     * 支持：姓名模糊搜索、电话号码搜索、后四位尾号搜索
     */
    filterContacts(keyword) {
        if (!keyword) {
            this.renderContacts(this.contacts);
            return;
        }

        keyword = keyword.toLowerCase().trim();
        
        // 支持后四位尾号搜索
        const filtered = this.contacts.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(keyword);
            const phoneMatch = c.phone.includes(keyword);
            // 后四位尾号匹配
            const lastFourMatch = c.phone.length >= 4 && c.phone.slice(-4) === keyword;
            return nameMatch || phoneMatch || lastFourMatch;
        });
        
        // 渲染并滚动到第一个匹配项
        this.renderContacts(filtered, keyword);
        
        // 滚动到第一个匹配的联系人
        setTimeout(() => {
            const firstMatch = document.querySelector('.contact-item.matched');
            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * 从Excel导入通讯录
     * 支持自动识别姓名和电话列
     */
    async importContactsFromExcel(file) {
        if (!syncManager.isLoggedIn()) {
            alert('请先登录');
            return;
        }

        if (!file) return;

        try {
            // 使用SheetJS解析
            if (typeof XLSX === 'undefined') {
                // 动态加载SheetJS
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                alert('Excel文件为空或只有标题行');
                return;
            }

            // 智能识别姓名和电话列
            const headerRow = jsonData[0] || [];
            let nameColIndex = -1;
            let phoneColIndex = -1;

            // 遍历标题行查找姓名和电话列
            headerRow.forEach((cell, index) => {
                const cellText = String(cell || '').toLowerCase().trim();
                // 识别姓名列
                if (nameColIndex === -1 && (
                    cellText.includes('姓名') || 
                    cellText.includes('名字') || 
                    cellText === 'name' ||
                    cellText === '联系人'
                )) {
                    nameColIndex = index;
                }
                // 识别电话列
                if (phoneColIndex === -1 && (
                    cellText.includes('电话') || 
                    cellText.includes('手机') || 
                    cellText.includes('联系方式') ||
                    cellText === 'phone' ||
                    cellText === 'tel' ||
                    cellText === 'mobile'
                )) {
                    phoneColIndex = index;
                }
            });

            // 如果没有识别到标题，尝试自动检测数据类型
            if (nameColIndex === -1 || phoneColIndex === -1) {
                // 检查第二行数据，自动判断
                const secondRow = jsonData[1] || [];
                secondRow.forEach((cell, index) => {
                    const cellText = String(cell || '').trim();
                    // 检测是否为电话号码（包含数字，可能带横线或空格）
                    const phonePattern = /^[\d\s\-]+$/
                    const hasDigits = /\d{7,}/.test(cellText);
                    
                    if (phoneColIndex === -1 && hasDigits && phonePattern.test(cellText)) {
                        phoneColIndex = index;
                    } else if (nameColIndex === -1 && !hasDigits && cellText.length <= 20) {
                        nameColIndex = index;
                    }
                });
            }

            // 默认使用前两列
            if (nameColIndex === -1) nameColIndex = 0;
            if (phoneColIndex === -1) phoneColIndex = 1;

            console.log(`识别到姓名列: ${nameColIndex}, 电话列: ${phoneColIndex}`);

            // 解析数据
            let imported = 0;
            let updated = 0;
            let skipped = 0;
            const startRow = 1; // 跳过标题行

            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const name = String(row[nameColIndex] || '').trim();
                let phone = String(row[phoneColIndex] || '').trim();

                // 清理电话号码格式（移除空格、横线等）
                phone = phone.replace(/[\s\-]/g, '');

                if (name && phone && phone.length >= 7) {
                    // 检查是否已存在相同姓名的联系人
                    const existingIndex = this.contacts.findIndex(c =>
                        c.name === name
                    );

                    if (existingIndex >= 0) {
                        // 相同姓名，更新电话号码
                        const existingPhone = this.contacts[existingIndex].phone.replace(/[\s\-]/g, '');
                        if (existingPhone !== phone) {
                            this.contacts[existingIndex].phone = phone;
                            this.contacts[existingIndex].updatedAt = new Date().toISOString();
                            updated++;
                        } else {
                            skipped++; // 姓名和电话都相同，跳过
                        }
                    } else {
                        // 新联系人，添加
                        this.contacts.push({
                            id: Date.now().toString() + '_' + i,
                            name,
                            phone,
                            createdAt: new Date().toISOString()
                        });
                        imported++;
                    }
                } else if (name || phone) {
                    skipped++;
                    console.log(`跳过无效行 ${i}: 姓名="${name}", 电话="${phone}"`);
                }
            }

            // 清空文件选择
            document.getElementById('importContactsFile').value = '';

            const totalChanged = imported + updated;
            if (totalChanged > 0) {
                await this.saveContacts();
                this.renderContacts(this.contacts);
                let message = '';
                if (imported > 0) {
                    message += `新增 ${imported} 个联系人`;
                }
                if (updated > 0) {
                    message += (message ? '\n' : '') + `更新 ${updated} 个联系人电话`;
                }
                if (skipped > 0) {
                    message += `\n（跳过 ${skipped} 个重复或无效项）`;
                }
                alert(message);
            } else if (skipped > 0) {
                alert(`没有新的联系人可导入\n（跳过 ${skipped} 个重复或无效项）`);
            } else {
                alert('未找到有效的联系人数据\n\n请确保Excel包含"姓名"和"电话"两列');
            }

        } catch (e) {
            console.error('导入Excel失败:', e);
            alert('导入失败: ' + e.message);
        }
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 正则表达式特殊字符转义
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 初始化便签备忘录
     */
    initMemoPanel() {
        const memoPanel = document.getElementById('memoPanel');
        const memoToggle = document.getElementById('memoToggle');
        const memoClose = document.getElementById('memoClose');
        const memoText = document.getElementById('memoText');
        const memoStatus = document.getElementById('memoStatus');

        if (!memoPanel || !memoToggle || !memoText) return;

        // 加载保存的内容
        const savedMemo = localStorage.getItem('office_memo_content');
        if (savedMemo) {
            memoText.value = savedMemo;
        }

        // 切换面板展开/收起
        memoToggle.addEventListener('click', () => {
            if (memoPanel.classList.contains('expanded')) {
                memoPanel.classList.remove('expanded');
            } else {
                memoPanel.classList.add('expanded');
                memoText.focus();
            }
        });

        memoClose.addEventListener('click', () => {
            memoPanel.classList.remove('expanded');
        });

        // 自动保存（防抖）+ 云端同步
        let saveTimeout = null;
        
        memoText.addEventListener('input', () => {
            if (memoStatus) {
                memoStatus.textContent = '保存中...';
                memoStatus.classList.add('saving');
            }

            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }

            saveTimeout = setTimeout(async () => {
                // 1. 先保存到本地
                localStorage.setItem('office_memo_content', memoText.value);
                
                // 2. 检查是否已登录，已登录则同步到云端
                if (syncManager.isLoggedIn()) {
                    if (memoStatus) {
                        memoStatus.textContent = '同步中...';
                    }
                    
                    try {
                        const result = await syncManager.immediateSyncToCloud();
                        if (result && result.success) {
                            if (memoStatus) {
                                memoStatus.textContent = '已同步到云端';
                                memoStatus.classList.remove('saving');
                            }
                            console.log('备忘录已同步到云端');
                        } else {
                            if (memoStatus) {
                                memoStatus.textContent = '同步失败';
                            }
                            console.warn('备忘录同步失败:', result);
                        }
                    } catch (e) {
                        console.error('备忘录同步异常:', e);
                        if (memoStatus) {
                            memoStatus.textContent = '同步失败';
                        }
                    }
                    
                    // 3秒后恢复默认状态
                    setTimeout(() => {
                        if (memoStatus) {
                            memoStatus.textContent = '自动保存';
                        }
                    }, 3000);
                } else {
                    // 未登录，只保存本地
                    if (memoStatus) {
                        memoStatus.textContent = '已保存到本地';
                        memoStatus.classList.remove('saving');
                    }
                    setTimeout(() => {
                        if (memoStatus) {
                            memoStatus.textContent = '登录后可同步云端';
                        }
                    }, 2000);
                }
            }, 500);
        });

        // 监听云端同步事件（其他设备更新时）
        document.addEventListener('memoSynced', (e) => {
            const newContent = e.detail.content;
            if (newContent !== memoText.value) {
                memoText.value = newContent;
                localStorage.setItem('office_memo_content', newContent);
                if (memoStatus) {
                    memoStatus.textContent = '已从云端同步';
                    setTimeout(() => {
                        memoStatus.textContent = '自动保存';
                    }, 3000);
                }
            }
        });

        // 键盘快捷键：Escape 关闭面板
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 关闭所有面板
                document.querySelectorAll('.side-panel.expanded').forEach(p => {
                    p.classList.remove('expanded');
                });
                // 关闭所有弹窗
                document.querySelectorAll('.tool-modal.active').forEach(m => {
                    m.classList.remove('active');
                });
            }
        });
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
                    ...(type === 'document' && { progress: 'completed' })
                });
                console.log('更新事项成功:', itemId, result);
            }

            // 强制重新加载数据
            await this.loadItems();
            console.log('loadItems完成');

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
                console.log('删除事项成功:', itemId);
            }

            // 保存历史用于撤回
            if (deletedItems.length > 0) {
                this.saveUndoHistory('delete', { items: deletedItems });
            }

            // 强制重新加载数据
            await this.loadItems();
            console.log('loadItems完成');

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
        this.selectedDate = dateStr;
        this.switchView('board');
        const datePicker = document.getElementById('datePicker');
        if (datePicker) {
            datePicker.value = dateStr;
        }
        this.updateDateDisplay();
        this.loadItems();
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

        // 监听登录状态变化
        document.addEventListener('syncLoginStatusChanged', (e) => {
            this.updateLoginUI(e.detail);
        });

        // 监听云端数据同步完成（恢复会话时）
        document.addEventListener('syncDataLoaded', async (e) => {
            console.log('收到云端数据同步通知:', e.detail);
            await this.loadItems(); // 刷新数据
            if (e.detail.syncResult && e.detail.syncResult.itemCount > 0) {
                this.showSuccess(`已从云端同步 ${e.detail.syncResult.itemCount} 个事项`);
            }
        });

        // 监听远程数据变更（实时同步）
        // 使用智能同步，自动判断同步方向
        document.addEventListener('syncRemoteDataChanged', async (e) => {
            console.log('收到远程数据变更通知，执行智能同步...');
            if (!syncManager.isSyncing) {
                await syncManager.smartSync();
            }
        });

        // 页面获得焦点时执行智能同步
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && syncManager.isLoggedIn()) {
                console.log('页面获得焦点，执行智能同步...');
                await syncManager.smartSync();
            }
        });
    }

    /**
     * 打开同步弹窗
     */
    openSyncModal() {
        this.updateLoginUI({
            isLoggedIn: syncManager.isLoggedIn(),
            username: syncManager.getUsername()
        });
        this.showModal('syncModal');
        
        // 自动填充记住的密码
        this.loadRememberedLogin();
    }

    /**
     * 加载记住的登录信息
     */
    loadRememberedLogin() {
        const remembered = localStorage.getItem('office_remembered_login');
        if (remembered) {
            try {
                const data = JSON.parse(remembered);
                // 检查是否是相同设备
                const currentDevice = navigator.userAgent.slice(0, 50);
                if (data.device === currentDevice) {
                    const usernameInput = document.getElementById('loginUsername');
                    const passwordInput = document.getElementById('loginPassword');
                    const rememberCheckbox = document.getElementById('rememberPassword');
                    
                    if (usernameInput) usernameInput.value = data.username || '';
                    if (passwordInput) passwordInput.value = data.password ? atob(data.password) : '';
                    if (rememberCheckbox) rememberCheckbox.checked = true;
                }
            } catch (e) {
                console.warn('加载记住的登录信息失败:', e);
            }
        }
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
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberPassword = document.getElementById('rememberPassword')?.checked;

        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }

        this.showLoading(true, '登录中...');

        try {
            const result = await syncManager.login(username, password);
            this.showSuccess(result.message);
            this.updateLoginUI({ isLoggedIn: true, username: username });

            // 处理记住密码
            if (rememberPassword) {
                localStorage.setItem('office_remembered_login', JSON.stringify({
                    username: username,
                    password: btoa(password), // 简单编码，非加密
                    device: navigator.userAgent.slice(0, 50)
                }));
            } else {
                localStorage.removeItem('office_remembered_login');
            }

            // 登录成功后立即从云端同步数据
            this.showLoading(true, '正在同步数据...');
            const syncResult = await syncManager.syncFromCloud((progress) => {
                this.updateLoadingText(progress);
            });
            console.log('同步结果:', syncResult);

            await this.loadItems(); // 刷新数据
            this.showSuccess(`登录成功！${syncResult.message}`);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 处理注册
     */
    async handleRegister() {
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

        this.showLoading(true, '注册中...');

        try {
            const result = await syncManager.register(username, password);
            this.showSuccess(result.message);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
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
            // 清除网站和工具数据
            localStorage.removeItem('office_links');
            localStorage.removeItem('office_tools');
            localStorage.removeItem('office_weather_city');
            // 清除记住的登录信息（退出时不删除，让用户下次还能免输入）
            // localStorage.removeItem('office_remembered_login');
            // 清空登录表单
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const rememberCheckbox = document.getElementById('rememberPassword');
            // 如果记住了密码，保留填充；否则清空
            const remembered = localStorage.getItem('office_remembered_login');
            if (!remembered) {
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (rememberCheckbox) rememberCheckbox.checked = false;
            }
            // 重新加载默认数据
            this.loadLinks();
            this.loadTools();
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
    toggleLoginPasswordVisibility() {
        const input = document.getElementById('loginPassword');
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

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
        this.showLoading(true, '正在上传...');

        try {
            const result = await syncManager.syncToCloud((progress) => {
                this.updateLoadingText(progress);
            });

            this.showSuccess(result.message);
            this.updateLoginUI({ isLoggedIn: true, username: syncManager.getUsername() });
        } catch (error) {
            this.showError('上传失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 从云端同步
     */
    async syncFromCloud() {
        this.showLoading(true, '正在下载...');

        try {
            const result = await syncManager.syncFromCloud((progress) => {
                this.updateLoadingText(progress);
            });

            this.showSuccess(result.message);
            this.updateLoginUI({ isLoggedIn: true, username: syncManager.getUsername() });
            await this.loadItems(); // 刷新数据
        } catch (error) {
            this.showError('下载失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 导出数据
     */
    async exportData() {
        this.showLoading(true, '正在导出...');

        try {
            const result = await syncManager.exportToFile();
            this.showSuccess(result.message);
        } catch (error) {
            this.showError('导出失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 导入数据
     */
    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const password = prompt('如果文件有密码保护，请输入密码（无密码请留空）：');

        this.showLoading(true, '正在导入...');

        try {
            const result = await syncManager.importFromFile(file, password || null);
            this.showSuccess(result.message);
            await this.loadItems(); // 刷新数据
        } catch (error) {
            this.showError('导入失败: ' + error.message);
        } finally {
            this.showLoading(false);
            e.target.value = '';
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

    toggleSupabaseKeyVisibility() {
        // 兼容性方法，不再使用
    }

    toggleExportPasswordVisibility() {
        // 兼容性方法，不再使用
    }

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
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // 更新选中状态
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        // 关闭菜单
        const menu = document.getElementById('themeMenu');
        if (menu) menu.classList.remove('active');
    }

    /**
     * 加载保存的主题
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'default';
        this.setTheme(savedTheme);
    }

    /**
     * 初始化日期选择器
     */
    initDatePicker() {
        const datePicker = document.getElementById('datePicker');
        if (datePicker) {
            datePicker.value = this.selectedDate;
        }
    }

    /**
     * 日期选择器变化
     */
    onDatePickerChange(e) {
        this.selectedDate = e.target.value;
        this.updateDateDisplay();
        this.loadItems();
    }

    /**
     * 打开API Key设置弹窗
     */
    async openApiKeyModal() {
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

        const configured = [];
        if (kimiKey) configured.push('Kimi');
        if (deepseekKey) configured.push('DeepSeek');

        if (configured.length > 0) {
            statusEl.className = 'api-key-status configured';
            statusEl.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text">AI增强已启用（${configured.join(' + ')}）</span>
            `;
        } else {
            statusEl.className = 'api-key-status';
            statusEl.innerHTML = `
                <span class="status-icon">○</span>
                <span class="status-text">使用基础解析</span>
            `;
        }
    }

    /**
     * 切换API Key显示/隐藏
     */
    toggleApiKeyVisibility() {
        const input = document.getElementById('apiKeyInput');
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    /**
     * 切换Kimi API Key显示/隐藏
     */
    toggleKimiApiKeyVisibility() {
        const input = document.getElementById('kimiApiKeyInput');
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    /**
     * 测试API Key连接
     */
    async testApiKeyConnection() {
        const deepseekKey = document.getElementById('apiKeyInput')?.value?.trim();
        const kimiKey = document.getElementById('kimiApiKeyInput')?.value?.trim();

        if (!deepseekKey && !kimiKey) {
            this.showError('请输入至少一个API Key');
            return;
        }

        this.showLoading(true, '正在测试连接...');

        let successCount = 0;
        let messages = [];

        // 测试DeepSeek API
        if (deepseekKey) {
            try {
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${deepseekKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
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

        // 测试Kimi API
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

        this.showLoading(false);

        if (successCount > 0) {
            this.showSuccess(`连接成功: ${messages.join(', ')}`);
        } else {
            this.showError(`连接失败: ${messages.join(', ')}`);
        }
    }

    /**
     * 保存API Key
     */
    async saveApiKey() {
        const deepseekInput = document.getElementById('apiKeyInput');
        const kimiInput = document.getElementById('kimiApiKeyInput');
        const deepseekKey = deepseekInput?.value?.trim();
        const kimiKey = kimiInput?.value?.trim();

        if (!deepseekKey && !kimiKey) {
            this.showError('请输入至少一个API Key');
            return;
        }

        this.showLoading(true, '正在保存...');

        try {
            // 保存DeepSeek API Key
            if (deepseekKey) {
                await ocrManager.setApiKey(deepseekKey);
            }

            // 保存Kimi API Key
            if (kimiKey) {
                await ocrManager.setKimiApiKey(kimiKey);
            }

            // 如果已登录，同步到云端
            if (syncManager.isLoggedIn()) {
                syncManager.markLocalChange();  // 标记本地改动
                await syncManager.silentSyncToCloud();
            }

            this.hideModal('apiKeyModal');
            if (deepseekInput) deepseekInput.value = '';
            if (kimiInput) kimiInput.value = '';

            const saved = [];
            if (deepseekKey) saved.push('DeepSeek');
            if (kimiKey) saved.push('Kimi');
            this.showSuccess(`${saved.join('、')} API Key 已保存，AI识别已增强`);
            await this.updateApiKeyStatus();
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
        const statusEl = document.getElementById('aiStatus');
        const showStatus = (msg) => {
            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.style.display = 'inline-flex';
            }
        };
        const hideStatus = () => {
            if (statusEl) {
                statusEl.style.display = 'none';
            }
        };

        showStatus('正在解析...');

        // 异步处理，不阻塞UI
        (async () => {
            try {
                let result = null;

                // 优先使用Kimi API（如果已配置）
                const hasKimiKey = await cryptoManager.hasApiKey();

                if (hasKimiKey) {
                    try {
                        showStatus('正在使用AI解析...');
                        result = await kimiAPI.parseNaturalLanguage(text);
                    } catch (error) {
                        console.log('Kimi API解析失败，使用内置解析:', error.message);
                    }
                }

                // 如果Kimi API不可用或失败，使用内置解析
                if (!result) {
                    showStatus('正在分析内容...');
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

                console.log('AI解析结果:', result);

                // 根据操作类型执行不同的处理
                const action = result.action || 'add';
                
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
                        await this.executeAIAddCommand(result);
                        break;
                }

                // 清空输入
                input.value = '';

                // 刷新列表
                await this.loadItems();

                // 立即同步到云端
                if (syncManager.isLoggedIn()) {
                    console.log('自然语言解析后立即同步到云端...');
                    await syncManager.immediateSyncToCloud();
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
     * 执行AI新增命令
     */
    async executeAIAddCommand(result) {
        // 处理周期性任务
        if (result.isRecurring && result.recurringRule) {
            console.log('检测到周期性任务:', result.recurringRule);

            const recurringItems = this.generateRecurringItems(
                { type: result.type, ...result.data, source: 'nlp' },
                result.recurringRule,
                result.recurringCount || 6
            );

            console.log('生成的周期性任务数量:', recurringItems.length);

            for (const item of recurringItems) {
                await db.addItem(item);
            }

            this.showSuccess(`已生成 ${recurringItems.length} 个周期性任务`);
        } else {
            // 普通任务保存到数据库
            await db.addItem({
                type: result.type,
                ...result.data,
                source: 'nlp'
            });
            this.showSuccess('已添加到' + this.getTypeLabel(result.type));
        }
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
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin-bottom: 15px; color: #666;">${description}</p>
                        <div style="max-height: 200px; overflow-y: auto; background: var(--card-bg, #f8fafc); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                                ${items.map(item => `<li style="margin: 4px 0;">${this.escapeHtml(item)}</li>`).join('')}
                            </ul>
                            ${suffix ? `<p style="margin-top: 10px; color: #999; font-size: 12px;">${suffix}</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn-secondary" id="aiCmdCancel" style="padding: 8px 20px;">取消</button>
                            <button class="btn-danger" id="aiCmdConfirm" style="padding: 8px 20px; background: #ef4444; color: white;">确认执行</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('aiCmdCancel').onclick = () => {
                modal.remove();
                resolve(false);
            };
            document.getElementById('aiCmdConfirm').onclick = () => {
                modal.remove();
                resolve(true);
            };
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
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>查询结果</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p style="margin-bottom: 15px; color: #666;">找到 ${items.length} 个匹配的事项：</p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background: var(--header-bg, #f1f5f9);">
                                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">类型</th>
                                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">标题</th>
                                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">日期</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => {
                                    const date = item.deadline?.split('T')[0] || item.date || item.docStartDate || '-';
                                    return `
                                        <tr>
                                            <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${typeLabels[item.type] || item.type}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${this.escapeHtml(item.title || '未命名')}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${date}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 15px; text-align: right;">
                        <button class="btn-primary" onclick="this.closest('.modal').remove()" style="padding: 8px 20px;">关闭</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * 处理文件上传
     */
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // 使用AI状态显示，不阻塞页面
        const statusEl = document.getElementById('aiStatus');
        const showStatus = (msg) => {
            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.style.display = 'inline-flex';
            }
        };
        const hideStatus = () => {
            if (statusEl) {
                statusEl.style.display = 'none';
            }
        };

        showStatus('准备处理文件...');

        // 异步处理，不阻塞UI
        (async () => {
            try {
                for (const file of files) {
                    // 检查文件类型
                    const fileType = file.type.toLowerCase();
                    const ext = file.name.split('.').pop().toLowerCase();

                    // 支持图片和PDF
                    const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
                    const isPDF = fileType === 'application/pdf' || ext === 'pdf';

                    if (!isImage && !isPDF) {
                        this.showError(`不支持的文件类型: ${file.name}，请上传图片(jpg/png)或PDF`);
                        continue;
                    }

                    // 进度回调
                    const progressCallback = (msg) => {
                        showStatus(msg);
                    };

                    const result = await ocrManager.analyzeDocument(file, progressCallback);

                    if (result.duplicate) {
                        this.showError(`文件"${file.name}"已被处理过`);
                        continue;
                    }

                    // 显示结果 - 弹出详细的识别日志
                    let logHtml = `<div style="text-align:left; max-height:500px; overflow-y:auto;color:inherit;">`;
                    logHtml += `<h4 style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color,#eee);">📄 文件：${file.name}</h4>`;

                    // 汇总统计
                    const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
                    logHtml += `<div style="margin-bottom:16px;padding:10px;background:var(--card-bg,#f8fafc);border-radius:6px;">`;
                    logHtml += `<b>识别汇总：</b>共识别 ${totalCount} 条记录`;
                    logHtml += ` → <span style="color:#10b981;">新增 ${result.items?.length || 0}</span>`;
                    logHtml += ` | <span style="color:#f59e0b;">合并 ${result.mergedItems?.length || 0}</span>`;
                    logHtml += ` | <span style="color:#6b7280;">跳过 ${result.skippedItems?.length || 0}</span>`;
                    logHtml += `</div>`;

                    if (result.items && result.items.length > 0) {
                        logHtml += `<div style="margin-bottom:16px;">`;
                        logHtml += `<h5 style="color:#10b981;margin-bottom:10px;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:4px;">✅ 新增事项 (${result.items.length}个)</h5>`;
                        logHtml += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
                        logHtml += `<tr style="background:var(--header-bg,#f1f5f9);"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">类型</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">日期时间</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">事项名称</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">参会人员</th></tr>`;
                        result.items.forEach((item, idx) => {
                            if (!item) return;
                            const typeIcon = { meeting: '📅 会议', todo: '☑️ 待办', document: '📄 办文' }[item.type] || '📌';
                            const title = item.title || item.displayTitle || '未知事项';
                            // 日期显示
                            let dateStr = item.date || '';
                            if (item.endDate && item.endDate !== item.date) {
                                dateStr = `${item.date} 至 ${item.endDate}`;
                            }
                            // 时间显示
                            let timeStr = item.time || '';
                            if (item.endTime) {
                                timeStr = `${item.time}-${item.endTime}`;
                            }
                            const dateTime = dateStr + (timeStr ? ` ${timeStr}` : '');
                            const itemAttendees = item.attendees || [];
                            const attendeesStr = itemAttendees.length > 0 ? itemAttendees.join('、') : '-';
                            const bgColor = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                            logHtml += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${typeIcon}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);white-space:nowrap;color:inherit;">${dateTime || '-'}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${title}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${attendeesStr}</td></tr>`;
                        });
                        logHtml += `</table></div>`;
                    }

                    if (result.mergedItems && result.mergedItems.length > 0) {
                        logHtml += `<div style="margin-bottom:16px;">`;
                        logHtml += `<h5 style="color:#f59e0b;margin-bottom:10px;padding:6px 10px;background:rgba(245,158,11,0.1);border-radius:4px;">🔄 合并参会人员 (${result.mergedItems.length}个)</h5>`;
                        logHtml += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
                        logHtml += `<tr style="background:var(--header-bg,#f1f5f9);"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">事项名称</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">新增参会人员</th></tr>`;
                        result.mergedItems.forEach((item, idx) => {
                            const title = item.title || '未知事项';
                            const addedStr = item.addedAttendees?.length ? item.addedAttendees.join('、') : '-';
                            const bgColor = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                            logHtml += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">📅 ${title}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:#f59e0b;font-weight:500;">+${addedStr}</td></tr>`;
                        });
                        logHtml += `</table></div>`;
                    }

                    if (result.skippedItems && result.skippedItems.length > 0) {
                        logHtml += `<div style="margin-bottom:16px;">`;
                        logHtml += `<h5 style="color:#6b7280;margin-bottom:10px;padding:6px 10px;background:rgba(107,114,128,0.1);border-radius:4px;">⏭️ 跳过重复 (${result.skippedItems.length}个)</h5>`;
                        logHtml += `<ul style="margin:0;padding-left:20px;font-size:12px;opacity:0.7;">`;
                        result.skippedItems.forEach(title => {
                            logHtml += `<li style="margin:4px 0;">${title}</li>`;
                        });
                        logHtml += `</ul></div>`;
                    }

                    logHtml += `</div>`;

                    // 显示日志弹窗
                    this.showRecognitionLog('识别结果', logHtml);
                }

                // 刷新列表
                await this.loadItems();

                // OCR提取后立即同步到云端
                if (syncManager.isLoggedIn()) {
                    console.log('文件上传后立即同步到云端...');
                    await syncManager.immediateSyncToCloud();
                }

            } catch (error) {
                console.error('文件处理失败:', error);
                this.showError('文件处理失败: ' + error.message);
            } finally {
                hideStatus();
                event.target.value = '';
            }
        })();
    }

    /**
     * 切换视图
     */
    switchView(view) {
        try {
            this.currentView = view;

            // 更新按钮状态
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });

            // 切换视图显示
            const boardViewEl = document.getElementById('boardView');
            const calendarViewEl = document.getElementById('calendarView');

            if (view === 'board') {
                boardViewEl?.classList.add('active');
                calendarViewEl?.classList.remove('active');
                this.loadItems();
            } else {
                boardViewEl?.classList.remove('active');
                calendarViewEl?.classList.add('active');
                // 使用全局的 calendarView 实例（不是 DOM 元素）
                if (window.calendarView && typeof window.calendarView.setView === 'function') {
                    window.calendarView.setView(view);
                }
            }

            this.updateDateDisplay();
        } catch (error) {
            console.error('切换视图失败:', error);
            this.showError('切换视图失败: ' + error.message);
        }
    }

    /**
     * 导航日期
     */
    navigateDate(direction) {
        if (this.currentView === 'board') {
            // 日视图：按天导航
            const current = new Date(this.selectedDate);
            current.setDate(current.getDate() + direction);
            this.selectedDate = this.formatDateLocal(current);
            const datePicker = document.getElementById('datePicker');
            if (datePicker) {
                datePicker.value = this.selectedDate;
            }
            this.updateDateDisplay();
            this.loadItems();
            return;
        }

        if (window.calendarView) {
            if (direction < 0) {
                window.calendarView.prev();
            } else {
                window.calendarView.next();
            }
        }

        this.updateDateDisplay();
    }

    /**
     * 回到今天
     */
    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = this.formatDateLocal(new Date());

        if (this.currentView === 'board') {
            const datePicker = document.getElementById('datePicker');
            if (datePicker) {
                datePicker.value = this.selectedDate;
            }
            this.updateDateDisplay();
            this.loadItems();
            return;
        }

        if (window.calendarView) {
            window.calendarView.today();
        }
        this.updateDateDisplay();
    }

    /**
     * 更新日期显示
     */
    updateDateDisplay() {
        const datePicker = document.getElementById('datePicker');
        const boardDateTitle = document.getElementById('boardDateTitle');

        if (this.currentView === 'board') {
            // 更新日期选择器
            if (datePicker) {
                datePicker.value = this.selectedDate;
            }
            // 更新日视图标题
            if (boardDateTitle) {
                const date = new Date(this.selectedDate);
                const today = new Date();
                const isToday = this.formatDateLocal(today) === this.selectedDate;
                const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
                boardDateTitle.textContent = isToday ? `今日事项 (${dateStr})` : `${dateStr}事项`;
            }
        } else if (window.calendarView) {
            // 周视图和月视图使用日历组件的日期范围
        }
    }

    /**
     * 加载事项列表
     */
    async loadItems() {
        const allItems = await db.getAllItems();

        // 调试：打印会议的 completed 状态
        const meetings = allItems.filter(i => i.type === 'meeting');
        if (meetings.length > 0) {
            console.log('loadItems - 会议数据:', meetings.map(m => ({
                title: m.title,
                completed: m.completed,
                completedType: typeof m.completed,
                order: m.order
            })));
        }

        // 日视图：按选中日期筛选
        let items = allItems;
        if (this.currentView === 'board') {
            items = allItems.filter(item => {
                // 会议：按日期匹配（支持跨天会议）
                if (item.type === 'meeting' && item.date) {
                    // 跨天会议：检查选中日期是否在日期范围内
                    if (item.endDate) {
                        return this.selectedDate >= item.date && this.selectedDate <= item.endDate;
                    }
                    // 单天会议
                    return item.date === this.selectedDate;
                }
                // 待办：按截止日期匹配
                if (item.type === 'todo' && item.deadline) {
                    return item.deadline.startsWith(this.selectedDate);
                }
                // 文件：按办文日期范围匹配（支持跨天流转）
                if (item.type === 'document') {
                    const startDate = item.docStartDate || item.docDate;
                    const endDate = item.docEndDate;
                    
                    // 首先检查当前日期是否在办文日期范围内
                    let inRange = false;
                    if (startDate && endDate) {
                        // 跨天办文：检查选中日期是否在日期范围内
                        inRange = this.selectedDate >= startDate && this.selectedDate <= endDate;
                    } else if (startDate) {
                        // 单天办文
                        inRange = startDate === this.selectedDate;
                    } else if (item.createdAt) {
                        // 兼容旧数据
                        inRange = item.createdAt.startsWith(this.selectedDate);
                    }
                    
                    // 如果在范围内且启用了跳过周末和节假日
                    if (inRange && item.skipWeekend) {
                        return this.isWorkday(this.selectedDate);
                    }
                    
                    return inRange;
                }
                return false;
            });
        }

        // 按类型分组
        const grouped = {
            todo: [],
            meeting: [],
            document: []
        };

        items.forEach(item => {
            if (grouped[item.type]) {
                grouped[item.type].push(item);
            }
        });

        // 渲染各列（排序在renderColumn中处理）
        this.renderColumn('todo', grouped.todo);
        this.renderColumn('meeting', grouped.meeting);
        this.renderColumn('document', grouped.document);
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
        const allText = title + ' ' + attendees.join(' ');

        // 钱局 - 最高优先级（置顶）
        if (allText.includes('钱局') || allText.includes('钱某某')) {
            return 1;
        }
        // 局领导按特定顺序：吴局、盛局、陈主任/陈局、房局
        if (allText.includes('吴局')) return 2;
        if (allText.includes('盛局')) return 3;
        if (allText.includes('陈主任') || allText.includes('陈局')) return 4;
        if (allText.includes('房局')) return 5;
        // 其他局长
        if (/李局|王局|张局|刘局|杨局|赵局|黄局|周局/.test(allText)) {
            return 6;
        }
        // 处室
        if (allText.includes('处') || allText.includes('室') || allText.includes('科')) {
            return 7;
        }
        return 8;
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
        container.innerHTML = '';

        // 排序逻辑
        const hasOrder = (item) => item.order !== undefined && item.order !== null;

        // 调试：打印排序前的状态
        console.log('排序前项目:', items.map(i => ({
            title: i.title,
            pinned: !!i.pinned,
            sunk: !!i.sunk,
            completed: !!i.completed
        })));

        items.sort((a, b) => {
            // 计算优先级分数：分数小的排前面
            // 置顶=0, 正常=1, 沉底=2, 已完成=3
            const getPriority = (item) => {
                if (item.pinned) return 0;
                if (item.completed) return 3;
                if (item.sunk) return 2;
                return 1;
            };

            const priorityA = getPriority(a);
            const priorityB = getPriority(b);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // 会议特殊处理：按领导级别优先排序（钱局最优先）
            // 这里的排序不受 order 值影响，确保领导相关会议始终在最前面
            if (type === 'meeting') {
                const levelA = this.getMeetingLevel(a);
                const levelB = this.getMeetingLevel(b);

                // 如果级别不同，直接按级别排序（忽略order）
                if (levelA !== levelB) {
                    return levelA - levelB;
                }

                // 同级别按会议时间排序
                const timeA = a.time || '99:99';
                const timeB = b.time || '99:99';
                if (timeA !== timeB) {
                    return timeA.localeCompare(timeB);
                }
            }

            // 非会议类型，或同级别会议：有 order 值的按 order 排（用户拖拽的结果）
            const aHasOrder = hasOrder(a);
            const bHasOrder = hasOrder(b);

            if (aHasOrder && bHasOrder) {
                if (a.order !== b.order) return a.order - b.order;
                // order 相同（理论上不会出现），按创建时间兜底
                return new Date(a.createdAt) - new Date(b.createdAt);
            }

            // 有 order 的排在无 order 的前面（仅对非会议类型或同级别会议）
            if (aHasOrder && !bHasOrder) return -1;
            if (bHasOrder && !aHasOrder) return 1;

            // 按创建时间排序兜底
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // 调试：打印排序后的项目状态
        if (type === 'meeting' && items.length > 0) {
            console.log(`${type} 排序后顺序:`, items.map(i => `${i.title}(completed:${!!i.completed},order:${i.order})`));
        }

        // 渲染卡片
        items.forEach(item => {
            const card = this.createCard(item);
            container.appendChild(card);
        });
    }

    /**
     * 创建卡片
     */
    createCard(item) {
        const card = document.createElement('div');
        card.className = `card ${item.type}-card${item.completed ? ' completed' : ''}${item.pinned ? ' pinned' : ''}${item.sunk ? ' sunk' : ''}`;
        card.dataset.id = item.id;
        card.draggable = true;

        let contentHtml = '';
        let detailHtml = '';

        // 多选复选框（所有类型都显示）
        const selectCheckboxHtml = `
            <input type="checkbox" class="item-select-checkbox" data-id="${item.id}" data-type="${item.type}" title="选择">
        `;

        switch (item.type) {
            case 'todo':
                const priorityClass = `priority-${item.priority || 'medium'}`;
                const priorityText = { high: '急', medium: '中', low: '低' }[item.priority] || '中';
                // 周期性任务标志
                const recurringBadge = item.isRecurring ? '<span class="recurring-badge" title="周期性任务">🔄</span>' : '';
                contentHtml = `
                    <div class="card-header-row">
                        ${selectCheckboxHtml}
                        <span class="priority-tag ${priorityClass}">${priorityText}</span>
                        ${recurringBadge}
                    </div>
                    <div class="card-title ${item.completed ? 'completed-text' : ''}">${this.escapeHtml(item.title)}</div>
                    <div class="card-time">${this.formatDeadline(item.deadline, item.completed)}</div>
                `;
                detailHtml = `
                    ${item.description ? `<div class="card-detail-section"><div class="detail-label">备注</div><div class="detail-content">${this.escapeHtml(item.description)}</div></div>` : ''}
                `;
                break;

            case 'meeting':
                // 精简显示：【参会人员】会议名称+时间段+地点
                const attendeeStr = item.attendees && item.attendees.length > 0
                    ? (item.attendees.length > 3 ? item.attendees.slice(0, 3).join('、') + '等' : item.attendees.join('、'))
                    : '';

                // 跨天会议显示日期范围
                let dateDisplay = '';
                if (item.endDate && item.endDate !== item.date) {
                    // 跨天会议：显示开始-结束日期
                    const startDate = item.date ? item.date.substring(5).replace('-', '/') : '';
                    const endDate = item.endDate.substring(5).replace('-', '/');
                    dateDisplay = `${startDate}-${endDate}`;
                }

                const meetingTitle = attendeeStr ? `【${attendeeStr}】${item.title}` : item.title;
                const timeStr = item.endTime ? `${item.time}-${item.endTime}` : item.time;
                const timeLoc = [timeStr, item.location].filter(Boolean).join(' ');

                contentHtml = `
                    <div class="card-header-row">
                        ${selectCheckboxHtml}
                    </div>
                    <div class="card-title meeting-title ${item.completed ? 'completed-text' : ''}">${this.escapeHtml(meetingTitle)}</div>
                    ${dateDisplay ? `<div class="card-date-range">${dateDisplay}</div>` : ''}
                    ${timeLoc ? `<div class="card-time">${timeLoc}</div>` : ''}
                `;
                detailHtml = `
                    ${item.attendees?.length ? `<div class="card-detail-section"><div class="detail-label">参会人员</div><div class="detail-content">${item.attendees.join('、')}</div></div>` : ''}
                    ${item.date ? `<div class="card-detail-section"><div class="detail-label">日期</div><div class="detail-content">${item.date}${item.endDate && item.endDate !== item.date ? ' 至 ' + item.endDate : ''}</div></div>` : ''}
                    ${item.agenda ? `<div class="card-detail-section"><div class="detail-label">议程/备注</div><div class="detail-content">${this.escapeHtml(item.agenda)}</div></div>` : ''}
                    ${item.location ? `<div class="card-detail-section"><div class="detail-label">地点</div><div class="detail-content">${this.escapeHtml(item.location)}</div></div>` : ''}
                `;
                break;

            case 'document':
                // 办文新设计：收/发/流转 + 完成状态
                const docTypeIcon = { receive: '收', send: '发', transfer: '转' }[item.docType] || '文';
                const docTypeClass = item.docType || 'receive';
                const isCompleted = item.progress === 'completed';

                // 办文日期范围显示
                let docDateDisplay = '';
                const docStartDate = item.docStartDate || item.docDate;
                if (docStartDate && item.docEndDate) {
                    // 跨天办文
                    const start = docStartDate.substring(5).replace('-', '/');
                    const end = item.docEndDate.substring(5).replace('-', '/');
                    docDateDisplay = `${start}-${end}`;
                }

                contentHtml = `
                    <div class="card-header-row">
                        ${selectCheckboxHtml}
                        <span class="doc-type-tag ${docTypeClass}">${docTypeIcon}</span>
                    </div>
                    <div class="card-title ${isCompleted ? 'completed-text' : ''}">${this.escapeHtml(item.title)}</div>
                    ${docDateDisplay ? `<div class="card-date-range">${docDateDisplay}</div>` : ''}
                    ${item.handler ? `<div class="card-handler">当前：${this.escapeHtml(item.handler)}</div>` : ''}
                `;
                detailHtml = `
                    ${item.docNumber ? `<div class="card-detail-section"><div class="detail-label">文号</div><div class="detail-content">${this.escapeHtml(item.docNumber)}</div></div>` : ''}
                    ${item.source ? `<div class="card-detail-section"><div class="detail-label">来文单位</div><div class="detail-content">${this.escapeHtml(item.source)}</div></div>` : ''}
                    ${docStartDate ? `<div class="card-detail-section"><div class="detail-label">日期</div><div class="detail-content">${docStartDate}${item.docEndDate ? ' 至 ' + item.docEndDate : ''}</div></div>` : ''}
                    ${item.handler ? `<div class="card-detail-section"><div class="detail-label">当前处理人</div><div class="detail-content">${this.escapeHtml(item.handler)}</div></div>` : ''}
                    ${item.transferHistory?.length ? `<div class="card-detail-section"><div class="detail-label">流转记录</div><div class="detail-content transfer-list">${item.transferHistory.map(t => `<div>${t.time} → ${t.to}</div>`).join('')}</div></div>` : ''}
                    ${item.content ? `<div class="card-detail-section"><div class="detail-label">内容摘要</div><div class="detail-content">${this.escapeHtml(item.content)}</div></div>` : ''}
                `;
                break;
        }

        card.innerHTML = `
            <div class="card-main">${contentHtml}</div>
            <div class="card-detail" style="display: none;">${detailHtml}</div>
            <div class="card-actions">
                <button class="card-action-btn pin-btn ${item.pinned ? 'pinned' : ''}" title="${item.pinned ? '取消置顶' : '置顶'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${item.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                    </svg>
                </button>
                <button class="card-action-btn sink-btn ${item.sunk ? 'sunk' : ''}" title="${item.sunk ? '取消沉底' : '沉底'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${item.sunk ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M12 22L8.91 15.74L2 14.73L7 9.86L5.82 2.98L12 6.23L18.18 2.98L17 9.86L22 14.73L15.09 15.74L12 22Z"></path>
                    </svg>
                </button>
                <button class="card-action-btn complete-btn ${item.completed ? 'completed' : ''}" title="${item.completed ? '已完成' : '标记完成'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="card-action-btn expand-btn" title="展开/收起详情">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <button class="card-action-btn edit-btn" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="card-action-btn delete-btn" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        // 绑定展开/收起事件
        const expandBtn = card.querySelector('.expand-btn');
        const detailEl = card.querySelector('.card-detail');
        expandBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = detailEl.style.display !== 'none';
            detailEl.style.display = isExpanded ? 'none' : 'block';
            expandBtn.innerHTML = isExpanded
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        });

        // 绑定完成按钮事件（所有类型通用）
        const completeBtn = card.querySelector('.complete-btn');
        completeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleItemComplete(item.id, item.type, !item.completed);
        });

        // 绑定置顶按钮事件
        const pinBtn = card.querySelector('.pin-btn');
        pinBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleItemPin(item.id, item.type, !item.pinned);
        });

        // 绑定沉底按钮事件
        const sinkBtn = card.querySelector('.sink-btn');
        sinkBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleItemSink(item.id, item.type, !item.sunk);
        });

        // 绑定删除事件
        card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirm(item.id);
        });

        // 绑定拖拽事件
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        // 绑定编辑事件（点击标题）
        card.querySelector('.card-title')?.addEventListener('click', () => {
            this.editItem(item);
        });

        // 绑定编辑按钮事件（如果有编辑按钮）
        card.querySelector('.edit-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editItem(item);
        });

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
        const typeLabels = { todo: '待办事项', meeting: '会议活动', document: '办文情况' };
        titleEl.textContent = '编辑' + typeLabels[item.type];

        // 设置表单值
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemType').value = item.type;
        document.getElementById('itemTitle').value = item.title || '';

        // 显示对应字段
        document.querySelectorAll('.type-fields').forEach(el => el.classList.remove('active'));
        document.getElementById(item.type + 'Fields')?.classList.add('active');

        // 根据类型填充字段
        switch (item.type) {
            case 'todo':
                document.getElementById('todoPriority').value = item.priority || 'medium';
                document.getElementById('todoDeadline').value = item.deadline || '';
                
                // 周期性任务设置
                const isRecurringCheckbox = document.getElementById('isRecurring');
                const recurringFields = document.getElementById('recurringFields');
                const recurringTypeSelect = document.getElementById('recurringType');
                
                if (item.isRecurring && item.recurringRule) {
                    isRecurringCheckbox.checked = true;
                    recurringFields.style.display = 'block';
                    recurringTypeSelect.value = item.recurringRule.type || 'weekly_day';
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
                        if (item.recurringRule.type === 'monthly_date') {
                            document.getElementById('recurringDay').value = item.recurringRule.day || '';
                        } else if (item.recurringRule.type === 'monthly_workday') {
                            document.getElementById('nthWorkDay').value = item.recurringRule.nthWorkDay || '';
                        } else if (item.recurringRule.type === 'weekly_day') {
                            document.getElementById('weekDay').value = item.recurringRule.weekDay || 1;
                        } else if (item.recurringRule.type === 'weekly_multi') {
                            const checkboxes = document.querySelectorAll('input[name="weekDays"]');
                            checkboxes.forEach(cb => {
                                cb.checked = (item.recurringRule.weekDays || []).includes(parseInt(cb.value));
                            });
                        } else if (item.recurringRule.type === 'monthly_weekday') {
                            document.getElementById('monthlyNthWeek').value = item.recurringRule.nthWeek || 1;
                            document.getElementById('monthlyWeekDayValue').value = item.recurringRule.weekDay || 1;
                        }
                    }, 50);
                } else {
                    isRecurringCheckbox.checked = false;
                    recurringFields.style.display = 'none';
                }
                break;

            case 'meeting':
                document.getElementById('meetingDate').value = item.date || '';
                document.getElementById('meetingEndDate').value = item.endDate || '';
                document.getElementById('meetingTime').value = item.time || '';
                document.getElementById('meetingEndTime').value = item.endTime || '';
                document.getElementById('meetingLocation').value = item.location || '';
                document.getElementById('meetingAttendees').value = item.attendees ? item.attendees.join('、') : '';
                document.getElementById('meetingAgenda').value = item.agenda || '';
                break;

            case 'document':
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
                    docRecurringTypeEl.value = item.recurringRule.type || 'weekly_day';
                    document.getElementById('docRecurringCount').value = item.recurringCount || 20;
                    document.getElementById('docRecurringSkipWeekends').checked = item.recurringRule.skipWeekends || false;
                    document.getElementById('docRecurringSkipHolidays').checked = item.recurringRule.skipHolidays || false;
                    document.getElementById('docRecurringStartDate').value = item.recurringRule.startDate || '';
                    document.getElementById('docRecurringEndDate').value = item.recurringRule.endDate || '';
                    
                    // 触发类型切换以显示对应字段
                    this.updateDocRecurringFieldsVisibility(item.recurringRule.type);
                    
                    // 填充具体的周期参数
                    setTimeout(() => {
                        if (item.recurringRule.type === 'monthly_date') {
                            document.getElementById('docRecurringDay').value = item.recurringRule.day || '';
                        } else if (item.recurringRule.type === 'monthly_workday') {
                            document.getElementById('docNthWorkDay').value = item.recurringRule.nthWorkDay || '';
                        } else if (item.recurringRule.type === 'weekly_day') {
                            document.getElementById('docWeekDay').value = item.recurringRule.weekDay || 1;
                        } else if (item.recurringRule.type === 'weekly_multi') {
                            const checkboxes = document.querySelectorAll('input[name="docWeekDays"]');
                            checkboxes.forEach(cb => {
                                cb.checked = (item.recurringRule.weekDays || []).includes(parseInt(cb.value));
                            });
                        } else if (item.recurringRule.type === 'monthly_weekday') {
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
            return completed ? '<span class="status-completed">✓ 已完成</span>' : '';
        }
        
        const date = new Date(deadline);
        const now = new Date();
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        if (completed) {
            return `<span class="status-completed">✓ 已完成</span> ${dateStr}`;
        }
        
        return `${dateStr}截止`;
    }

    /**
     * 切换办文完成状态
     */
    async toggleDocumentComplete(id, completed) {
        try {
            const item = await db.getItem(id);
            if (!item) return;

            item.progress = completed ? 'completed' : 'pending';
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
        this.draggedItem = item;
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id.toString());
    }

    /**
     * 拖拽结束
     * 注意：drop事件先于dragend触发。handleDrop已处理了状态清理，
     * 这里只需清理handleDrop未涉及的样式（如拖拽取消的情况）
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drag-above', 'drag-below');
        });
        // 取消未执行的 rAF
        if (this._dragOverRAF) {
            cancelAnimationFrame(this._dragOverRAF);
            this._dragOverRAF = null;
        }
        this.draggedItem = null;
        this.draggedElement = null;
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

        if (!this.draggedItem) return;

        // 取消未执行的 rAF，确保用最终位置
        if (this._dragOverRAF) {
            cancelAnimationFrame(this._dragOverRAF);
            this._dragOverRAF = null;
        }

        // ====== 同步阶段：在任何await之前捕获所有必要数据 ======
        const container = e.currentTarget;
        const newType = container.id.replace('List', '');
        const isSameColumn = newType === this.draggedItem.type;
        const draggedId = this.draggedItem.id;
        const draggedCard = this.draggedElement;

        // 保存原始数据用于撤回（在async操作之前同步获取）
        const originalItem = await db.getItem(draggedId);
        const originalType = this.draggedItem.type;

        // 确保拖拽卡片在当前容器中（handleDragOver的rAF可能还没执行最后一帧）
        if (draggedCard && draggedCard.parentElement !== container) {
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement) {
                container.insertBefore(draggedCard, afterElement);
            } else {
                container.appendChild(draggedCard);
            }
        }

        // 读取当前 DOM 顺序 - 这就是用户看到的最终位置
        const allCards = [...container.querySelectorAll('.card')];
        let orderedIds = allCards.map(card => parseInt(card.dataset.id));

        // 确保 draggedId 在列表中（防御性检查）
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

        // 去重确保无重复ID
        orderedIds = [...new Set(orderedIds)];

        // ====== 异步阶段 ======
        try {
            // 保存原始数据用于撤回
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }

            // 跨列移动：先更新类型
            if (!isSameColumn) {
                await db.updateItem(draggedId, { type: newType });
            }

            // 批量更新排序
            await db.updateItemOrder(newType, orderedIds);

            if (isSameColumn) {
                // 同列拖动：DOM已经正确，不需要重新渲染
                // 只需移除 dragging 样式
                if (draggedCard) {
                    draggedCard.classList.remove('dragging');
                }
            } else {
                // 跨列拖动：需要重新渲染（类型变更，卡片需重建）
                await this.loadItems();
            }

            // 同步到云端（不阻塞UI）
            if (syncManager.isLoggedIn()) {
                syncManager.immediateSyncToCloud().catch(err => {
                    console.error('云端同步失败:', err);
                });
            }

        } catch (error) {
            console.error('移动失败:', error);
            this.showError('移动失败，请重试');
            try { await this.loadItems(); } catch(e) {}
        }

        this.draggedItem = null;
        this.draggedElement = null;
    }

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
    showAddModal(type) {
        const modal = document.getElementById('itemModal');
        const form = document.getElementById('itemForm');
        const titleEl = document.getElementById('modalTitle');

        // 重置表单
        form.reset();
        document.getElementById('itemId').value = '';
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
        console.log('showAddModal - selectedDate:', this.selectedDate);
        const dateStr = this.selectedDate;
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);

        if (type === 'todo') {
            const deadlineEl = document.getElementById('todoDeadline');
            console.log('设置待办截止时间:', `${dateStr}T${timeStr}`);
            if (deadlineEl) deadlineEl.value = `${dateStr}T${timeStr}`;

            // 重置周期性选项
            const recurringFields = document.getElementById('recurringFields');
            const isRecurring = document.getElementById('isRecurring');
            if (recurringFields) recurringFields.style.display = 'none';
            if (isRecurring) isRecurring.checked = false;
        } else if (type === 'meeting') {
            const dateEl = document.getElementById('meetingDate');
            const timeEl = document.getElementById('meetingTime');
            console.log('设置会议日期:', dateStr);
            if (dateEl) dateEl.value = dateStr;
            if (timeEl) timeEl.value = timeStr;
        } else if (type === 'document') {
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
                        if (weekDayGroup) weekDayGroup.style.display = 'block';
                        break;
                    case 'weekly_multi':
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
    }

    /**
     * 保存事项
     */
    async saveItem(e) {
        e.preventDefault();

        const id = document.getElementById('itemId').value;
        const type = document.getElementById('itemType').value;

        const item = { type };

        // 基础字段
        item.title = document.getElementById('itemTitle').value.trim();

        // 类型特定字段
        switch (type) {
            case 'todo':
                item.priority = document.getElementById('todoPriority').value;
                item.deadline = document.getElementById('todoDeadline').value;
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

                    if (recurringType === 'monthly_date') {
                        const day = parseInt(document.getElementById('recurringDay').value);
                        if (!day || day < 1 || day > 31) {
                            alert('请输入有效的日期（1-31）');
                            return;
                        }
                        rule.day = day;
                    } else if (recurringType === 'monthly_workday') {
                        const nthWorkDay = parseInt(document.getElementById('nthWorkDay').value);
                        if (!nthWorkDay || nthWorkDay < 1 || nthWorkDay > 23) {
                            alert('请输入有效的工作日序号（1-23）');
                            return;
                        }
                        rule.nthWorkDay = nthWorkDay;
                    } else if (recurringType === 'weekly_day') {
                        rule.weekDay = parseInt(document.getElementById('weekDay').value);
                    } else if (recurringType === 'weekly_multi') {
                        const checkedDays = Array.from(document.querySelectorAll('input[name="weekDays"]:checked')).map(cb => parseInt(cb.value));
                        if (checkedDays.length === 0) {
                            alert('请至少选择一个星期');
                            return;
                        }
                        rule.weekDays = checkedDays.sort((a, b) => a - b);
                    } else if (recurringType === 'monthly_weekday') {
                        rule.nthWeek = parseInt(document.getElementById('monthlyNthWeek').value);
                        rule.weekDay = parseInt(document.getElementById('monthlyWeekDayValue').value);
                    }
                    // daily 和 workday_daily 不需要额外参数

                    item.isRecurring = true;
                    item.recurringRule = rule;
                    item.recurringCount = recurringCount;

                    console.log('周期性任务配置:', { rule, recurringCount });
                }
                break;

            case 'meeting':
                item.date = document.getElementById('meetingDate').value;
                item.endDate = document.getElementById('meetingEndDate').value || null;
                item.time = document.getElementById('meetingTime').value;
                item.endTime = document.getElementById('meetingEndTime').value || null;
                item.location = document.getElementById('meetingLocation').value.trim();
                const attendeesStr = document.getElementById('meetingAttendees').value.trim();
                item.attendees = attendeesStr ? attendeesStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [];
                item.agenda = document.getElementById('meetingAgenda').value.trim();
                break;

            case 'document':
                item.docType = document.getElementById('docType').value;
                item.docNumber = document.getElementById('docNumber').value.trim();
                item.source = document.getElementById('docSource').value.trim();
                item.handler = document.getElementById('docHandler').value.trim();
                item.content = document.getElementById('docContent').value.trim();
                item.progress = item.handler ? 'processing' : 'pending';
                // 办文日期范围
                item.docStartDate = document.getElementById('docStartDate').value || this.selectedDate;
                item.docEndDate = document.getElementById('docEndDate').value || null;
                item.docDate = item.docStartDate; // 兼容旧数据
                // 跳过周末和节假日
                item.skipWeekend = document.getElementById('docSkipWeekend').checked;
                // 流转历史
                const existingItem = document.getElementById('itemId').value ? await db.getItem(parseInt(document.getElementById('itemId').value)) : null;
                item.transferHistory = existingItem?.transferHistory || [];
                
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
                    if (docRecurringType === 'monthly_date') {
                        rule.day = parseInt(document.getElementById('docRecurringDay').value) || 1;
                    } else if (docRecurringType === 'monthly_workday') {
                        rule.nthWorkDay = parseInt(document.getElementById('docNthWorkDay').value) || 1;
                    } else if (docRecurringType === 'weekly_day') {
                        rule.weekDay = parseInt(document.getElementById('docWeekDay').value) || 1;
                    } else if (docRecurringType === 'weekly_multi') {
                        const docWeekDays = [];
                        document.querySelectorAll('input[name="docWeekDays"]:checked').forEach(cb => {
                            docWeekDays.push(parseInt(cb.value));
                        });
                        rule.weekDays = docWeekDays;
                    } else if (docRecurringType === 'monthly_weekday') {
                        rule.nthWeek = parseInt(document.getElementById('docMonthlyNthWeek').value) || 1;
                        rule.weekDay = parseInt(document.getElementById('docMonthlyWeekDayValue').value) || 1;
                    }
                    item.isRecurring = true;
                    item.recurringRule = rule;
                    item.recurringCount = docRecurringCount;
                    console.log('办文周期性任务配置:', { rule, docRecurringCount });
                }
                break;
        }

        try {
            if (id) {
                // 编辑模式 - 先保存原始数据用于撤回
                const originalItem = await db.getItem(parseInt(id));
                const recurringGroupId = document.getElementById('recurringGroupId')?.value;
                const occurrenceIndex = parseInt(document.getElementById('occurrenceIndex')?.value) || 0;

                console.log('编辑模式检查周期性任务:', { recurringGroupId, occurrenceIndex, originalItem });

                // 检查是否是编辑已有的周期性任务
                if (recurringGroupId && originalItem && originalItem.isRecurring) {
                    // 弹出选择框
                    const choice = await this.showRecurringEditChoice();

                    console.log('用户选择:', choice);

                    if (choice === 'cancel') {
                        return; // 用户取消
                    }

                    if (choice === 'future') {
                        // 修改本项及未来所有周期性任务
                        await this.updateRecurringGroup(originalItem, item, recurringGroupId, occurrenceIndex);
                        this.showSuccess('已更新本项及未来所有周期性任务');
                    } else if (choice === 'this_detach') {
                        // 仅修改本项并脱离周期组
                        if (originalItem) {
                            this.saveUndoHistory('update', { item: originalItem });
                        }
                        // 清除周期性标识，变成普通任务
                        item.isRecurring = false;
                        item.recurringGroupId = null;
                        item.occurrenceIndex = null;
                        item.recurringRule = null;
                        await db.updateItem(parseInt(id), item);
                        this.showSuccess('事项已更新并脱离周期组');
                    } else {
                        // 仅修改本项（保留周期性标识）
                        if (originalItem) {
                            this.saveUndoHistory('update', { item: originalItem });
                        }
                        // 保留周期性标识，只更新内容
                        item.isRecurring = true;
                        item.recurringGroupId = originalItem.recurringGroupId;
                        item.occurrenceIndex = originalItem.occurrenceIndex;
                        item.recurringRule = originalItem.recurringRule;
                        await db.updateItem(parseInt(id), item);
                        this.showSuccess('事项已更新（保留周期性）');
                    }
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
                    await db.updateItem(parseInt(id), item);
                    this.showSuccess('事项已更新');
                }
            } else {
                // 新建模式
                // 检查是否是周期性任务
                console.log('检查周期性任务:', { isRecurring: item.isRecurring, recurringRule: item.recurringRule });

                if (item.isRecurring && item.recurringRule) {
                    console.log('开始生成周期性任务...');
                    const recurringItems = this.generateRecurringItems(item, item.recurringRule, item.recurringCount || 20);

                    console.log('生成的任务列表:', recurringItems);

                    if (recurringItems.length > 0) {
                        const addedIds = [];
                        for (const recurringItem of recurringItems) {
                            console.log('保存任务:', recurringItem);
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

            // 立即同步到云端（确保新数据上传）
            if (syncManager.isLoggedIn()) {
                console.log('保存事项后立即同步到云端...');
                const result = await syncManager.immediateSyncToCloud();
                if (result.success) {
                    console.log('同步成功，云端数据已更新');
                } else {
                    console.error('同步失败:', result.error);
                }
            }

        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    /**
     * 显示周期性任务编辑选择框
     * @returns {Promise<string>} 'this' | 'this_detach' | 'future' | 'cancel'
     */
    showRecurringEditChoice() {
        return new Promise((resolve) => {
            // 创建选择弹窗
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'recurringChoiceModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>修改周期性任务</h3>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin-bottom: 20px; color: #666;">这是一个周期性任务，您想如何修改？</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn-primary" id="recurringChoiceThis" style="width: 100%; padding: 12px;">
                                仅修改本项（保留周期性）
                                <div style="font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 4px;">独立记录当天的内容，不影响其他周期任务</div>
                            </button>
                            <button class="btn-secondary" id="recurringChoiceFuture" style="width: 100%; padding: 12px;">
                                修改本项及未来所有周期
                                <div style="font-size: 12px; color: #666; margin-top: 4px;">同步更新标题、经办人等信息到后续所有周期（日期保持不变）</div>
                            </button>
                            <button class="btn-secondary" id="recurringChoiceDetach" style="width: 100%; padding: 12px; border-color: #f59e0b; color: #f59e0b;">
                                仅修改本项（脱离周期）
                                <div style="font-size: 12px; color: #999; margin-top: 4px;">将此项变为独立任务，不再属于周期组</div>
                            </button>
                            <button class="btn-text" id="recurringChoiceCancel" style="width: 100%; padding: 8px;">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 绑定事件
            document.getElementById('recurringChoiceThis').onclick = () => {
                modal.remove();
                resolve('this');
            };
            document.getElementById('recurringChoiceFuture').onclick = () => {
                modal.remove();
                resolve('future');
            };
            document.getElementById('recurringChoiceDetach').onclick = () => {
                modal.remove();
                resolve('this_detach');
            };
            document.getElementById('recurringChoiceCancel').onclick = () => {
                modal.remove();
                resolve('cancel');
            };
        });
    }

    /**
     * 批量更新周期性任务组
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     * @param {string} groupId - 周期性任务组ID
     * @param {number} fromIndex - 从第几个开始更新
     */
    async updateRecurringGroup(originalItem, updates, groupId, fromIndex) {
        // 保存原始数据用于撤回
        const allItems = await db.getAllItems();
        // 使用 String 转换确保类型一致
        const targetGroupId = String(groupId);
        const groupItems = allItems.filter(item => 
            String(item.recurringGroupId) === targetGroupId && 
            parseInt(item.occurrenceIndex) >= parseInt(fromIndex)
        );

        // 保存所有原始数据
        this.saveUndoHistory('update', { items: groupItems.map(i => ({ ...i })) });

        // 提取需要同步更新的字段（排除周期性相关字段和各类型的日期字段）
        const fieldsToUpdate = { ...updates };
        // 周期性相关字段
        delete fieldsToUpdate.isRecurring;
        delete fieldsToUpdate.recurringRule;
        delete fieldsToUpdate.recurringCount;
        delete fieldsToUpdate.recurringGroupId;
        delete fieldsToUpdate.occurrenceIndex;
        // 待办事项日期
        delete fieldsToUpdate.deadline;
        // 办文日期（每个周期有自己的日期）
        delete fieldsToUpdate.docStartDate;
        delete fieldsToUpdate.docEndDate;
        delete fieldsToUpdate.docDate;
        // 会议日期
        delete fieldsToUpdate.date;
        delete fieldsToUpdate.endDate;
        // 其他不应同步的字段
        delete fieldsToUpdate.id;
        delete fieldsToUpdate.createdAt;
        delete fieldsToUpdate.completed;
        delete fieldsToUpdate.completedAt;
        delete fieldsToUpdate.hash;

        console.log('批量更新周期组:', { groupId, fromIndex, itemCount: groupItems.length, fieldsToUpdate });

        // 批量更新
        for (const groupItem of groupItems) {
            await db.updateItem(groupItem.id, fieldsToUpdate);
        }

        await this.loadItems();
    }

    /**
     * 显示周期性任务状态变更选择弹窗
     * @param {string} actionType - 操作类型描述
     * @param {string} actionName - 操作名称
     */
    showRecurringChoice(actionType, actionName) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'recurringStatusChoiceModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>周期性任务 - ${actionType}</h3>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin-bottom: 20px; color: #666;">这是周期性任务，您想如何操作？</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn-secondary" id="recurringStatusChoiceThis" style="width: 100%; padding: 12px;">
                                仅本项${actionName}
                            </button>
                            <button class="btn-primary" id="recurringStatusChoiceAll" style="width: 100%; padding: 12px;">
                                所有后续周期都${actionName}
                            </button>
                            <button class="btn-text" id="recurringStatusChoiceCancel" style="width: 100%; padding: 8px;">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('recurringStatusChoiceThis').onclick = () => {
                modal.remove();
                resolve('this');
            };
            document.getElementById('recurringStatusChoiceAll').onclick = () => {
                modal.remove();
                resolve('all');
            };
            document.getElementById('recurringStatusChoiceCancel').onclick = () => {
                modal.remove();
                resolve('cancel');
            };
        });
    }

    /**
     * 批量更新周期性任务组的状态（用于置顶、沉底、完成等）
     * @param {Object} originalItem - 原始任务数据
     * @param {Object} updates - 更新内容
     */
    async updateRecurringGroupStatus(originalItem, updates) {
        console.log('=== updateRecurringGroupStatus 开始 ===');
        console.log('原始任务:', originalItem);
        console.log('更新内容:', updates);
        console.log('recurringGroupId:', originalItem?.recurringGroupId);
        console.log('occurrenceIndex:', originalItem?.occurrenceIndex);
        
        // 获取所有事项
        const allItems = await db.getAllItems();
        console.log('数据库中所有事项数量:', allItems.length);
        
        // 检查周期性任务
        const allRecurringTasks = allItems.filter(i => i.recurringGroupId);
        console.log('所有周期性任务数量:', allRecurringTasks.length);
        console.log('所有周期性任务详情:', allRecurringTasks.map(i => ({
            id: i.id,
            title: i.title,
            recurringGroupId: i.recurringGroupId,
            occurrenceIndex: i.occurrenceIndex,
            sunk: i.sunk,
            pinned: i.pinned
        })));
        
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
        
        console.log('筛选条件 - targetGroupId:', targetGroupId, 'currentIndex:', currentIndex);
        
        const groupItems = allItems.filter(item => {
            if (!item.recurringGroupId) return false;
            
            const itemGroupId = String(item.recurringGroupId);
            const itemIndex = parseInt(item.occurrenceIndex) || 0;
            const matches = itemGroupId === targetGroupId && itemIndex >= currentIndex;
            
            console.log(`检查任务: id=${item.id}, title="${item.title}", groupId=${itemGroupId}, index=${itemIndex}, 匹配=${matches}`);
            
            return matches;
        });

        console.log('✅ 找到的周期任务数量:', groupItems.length);
        console.log('匹配的任务:', groupItems.map(i => ({
            id: i.id,
            title: i.title,
            occurrenceIndex: i.occurrenceIndex,
            sunk: i.sunk
        })));

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
            
            console.log(`更新任务 ${groupItem.id} (${groupItem.title}):`, updateData);
            
            try {
                await db.updateItem(groupItem.id, updateData);
                successCount++;
                console.log(`✅ 更新成功: ${groupItem.id}`);
            } catch (err) {
                console.error(`❌ 更新失败: ${groupItem.id}`, err);
            }
        }

        console.log(`=== 批量更新完成，成功 ${successCount}/${groupItems.length} 项 ===`);
        
        await this.loadItems();
        
        // 立即同步到云端
        if (syncManager.isLoggedIn()) {
            console.log('同步到云端...');
            await syncManager.immediateSyncToCloud();
        }
        
        this.showSuccess(`已更新 ${successCount} 个周期任务`);
    }

    /**
     * 切换待办完成状态
     */
    async toggleTodoComplete(id, completed) {
        try {
            await db.updateItem(id, { completed });
            await this.loadItems();
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }
        } catch (error) {
            console.error('更新失败:', error);
        }
    }

    /**
     * 通用切换完成状态（所有类型）
     */
    async toggleItemComplete(id, type, completed) {
        console.log(`toggleItemComplete: id=${id}, type=${type}, completed=${completed}`);
        try {
            // 检查是否为周期性任务
            const originalItem = await db.getItem(id);
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('完成状态', completed ? '标记完成' : '取消完成');
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    // 更新所有后续周期
                    await this.updateRecurringGroupStatus(originalItem, { 
                        completed, 
                        completedAt: completed ? new Date().toISOString() : null,
                        ...(type === 'document' && { progress: completed ? 'completed' : 'pending' })
                    });
                    return;
                }
            }
            
            // 保存原始数据用于撤回
            if (originalItem) {
                this.saveUndoHistory('update', { item: originalItem });
            }
            
            const result = await db.updateItem(id, {
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                // 办文类型额外更新progress字段
                ...(type === 'document' && { progress: completed ? 'completed' : 'pending' })
            });
            console.log('updateItem 结果:', result);
            await this.loadItems();
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
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
            console.log('toggleItemPin:', { id, pinned, recurringGroupId: originalItem?.recurringGroupId });
            
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('置顶状态', pinned ? '置顶' : '取消置顶');
                console.log('用户选择:', choice);
                
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    // 更新所有后续周期
                    console.log('执行批量置顶更新...');
                    await this.updateRecurringGroupStatus(originalItem, { 
                        pinned, 
                        sunk: pinned ? false : undefined // 置顶时取消沉底
                    });
                    this.showSuccess(pinned ? '已置顶所有后续周期' : '已取消所有后续周期置顶');
                    return;
                }
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
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
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
            console.log('toggleItemSink:', { id, sunk, recurringGroupId: originalItem?.recurringGroupId });
            
            if (originalItem && originalItem.recurringGroupId) {
                const choice = await this.showRecurringChoice('沉底状态', sunk ? '沉底' : '取消沉底');
                console.log('用户选择:', choice);
                
                if (choice === 'cancel') return;
                
                if (choice === 'all') {
                    // 更新所有后续周期
                    console.log('执行批量沉底更新...');
                    await this.updateRecurringGroupStatus(originalItem, { 
                        sunk, 
                        pinned: sunk ? false : undefined // 沉底时取消置顶
                    });
                    this.showSuccess(sunk ? '已沉底所有后续周期' : '已取消所有后续周期沉底');
                    return;
                }
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
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
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

        // 限制历史记录数量
        if (this.undoHistory.length > this.maxUndoSteps) {
            this.undoHistory.shift();
        }

        // 启用撤回按钮
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = false;
            undoBtn.style.opacity = '1';
            undoBtn.style.cursor = 'pointer';
        }
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
                        }
                        this.showSuccess(`已撤回：恢复了 ${lastAction.data.items.length} 个事项`);
                    } else {
                        await db.addItem(lastAction.data.item);
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
    }

    /**
     * 启动会议自动完成检查
     * 会议开始后30分钟自动标记为已完成
     */
    startMeetingAutoCompleteCheck() {
        // 立即检查一次
        this.checkMeetingAutoComplete();

        // 每分钟检查一次
        setInterval(() => {
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

            // 筛选未完成的会议
            const incompleteMeetings = allItems.filter(item =>
                item.type === 'meeting' && !item.completed
            );

            for (const meeting of incompleteMeetings) {
                if (meeting.date && meeting.time) {
                    // 构建会议开始时间
                    const meetingStart = new Date(`${meeting.date}T${meeting.time}`);

                    // 计算会议开始后30分钟的时间点
                    const autoCompleteTime = new Date(meetingStart.getTime() + 30 * 60 * 1000);

                    // 如果当前时间已经超过会议开始后30分钟
                    if (now >= autoCompleteTime) {
                        console.log(`会议 "${meeting.title}" 已自动完成`);
                        await db.updateItem(meeting.id, {
                            completed: true,
                            completedAt: now.toISOString()
                        });

                        // 立即同步到云端
                        if (syncManager.isLoggedIn()) {
                            await syncManager.immediateSyncToCloud();
                        }
                    }
                }
            }

            // 如果有会议被标记完成，刷新显示
            const updatedItems = await db.getAllItems();
            const hasNewCompleted = updatedItems.some(item =>
                item.type === 'meeting' &&
                item.completed &&
                item.completedAt &&
                new Date(item.completedAt) > new Date(now.getTime() - 120000) // 2分钟内完成的
            );

            if (hasNewCompleted) {
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
            case 'monthly_date':
                document.getElementById('docMonthlyDateGroup').style.display = 'block';
                break;
            case 'monthly_workday':
                document.getElementById('docNthWorkDayGroup').style.display = 'block';
                break;
            case 'weekly_day':
                document.getElementById('docWeekDayGroup').style.display = 'block';
                break;
            case 'weekly_multi':
                document.getElementById('docWeekMultiGroup').style.display = 'block';
                break;
            case 'monthly_weekday':
                document.getElementById('docMonthlyWeekDayGroup').style.display = 'block';
                break;
        }
    }

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

        console.log('生成周期性任务:', { baseItem, rule, count, startDate, endDate, firstDate });

        // 复制基础数据，移除周期相关字段和需要重新计算的字段
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
            case 'daily':
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

            case 'workday_daily':
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

            case 'weekly_day':
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

            case 'weekly_multi':
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

            case 'monthly_date':
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

            case 'monthly_workday':
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

            case 'monthly_weekday':
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

        console.log('生成的周期性任务:', items);
        return items;
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
        if (baseItem.type === 'document') {
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

    /**
     * 获取每月天数
     */
    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

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
        
        // 2024-2026年中国法定节假日（可根据需要扩展）
        const holidays = {
            // 2024年
            2024: [
                '2024-01-01', // 元旦
                '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17', // 春节
                '2024-04-04', '2024-04-05', '2024-04-06', // 清明
                '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05', // 劳动节
                '2024-06-08', '2024-06-09', '2024-06-10', // 端午
                '2024-09-15', '2024-09-16', '2024-09-17', // 中秋
                '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07', // 国庆
            ],
            // 2025年
            2025: [
                '2025-01-01', // 元旦
                '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', // 春节
                '2025-04-04', '2025-04-05', '2025-04-06', // 清明
                '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // 劳动节
                '2025-05-31', '2025-06-01', '2025-06-02', // 端午
                '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 国庆+中秋
            ],
            // 2026年
            2026: [
                '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
                '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
                '2026-04-05', '2026-04-06', '2026-04-07', // 清明
                '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
                '2026-05-31', '2026-06-01', '2026-06-02', // 端午
                '2026-09-25', '2026-09-26', '2026-09-27', // 中秋
                '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆
            ]
        };
        
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const yearHolidays = holidays[year] || [];
        
        return yearHolidays.includes(dateStr);
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
            const isWeekendDay = this.isWeekend(date);
            const isHolidayDay = skipHolidays && this.isHoliday(date);
            
            if (!isWeekendDay && !isHolidayDay) {
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
        
        if (item && item.isRecurring && item.recurringGroupId) {
            // 周期性任务：显示选择框
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
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'recurringDeleteModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>删除周期性任务</h3>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin-bottom: 20px; color: #666;">这是一个周期性任务，您想如何删除？</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn-secondary" id="recurringDeleteThis" style="width: 100%; padding: 12px;">
                                仅删除本项
                            </button>
                            <button class="btn-danger" id="recurringDeleteAll" style="width: 100%; padding: 12px; background: #ef4444; color: white; border-color: #ef4444;">
                                删除本项及后续所有周期
                            </button>
                            <button class="btn-text" id="recurringDeleteCancel" style="width: 100%; padding: 8px;">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('recurringDeleteThis').onclick = () => {
                modal.remove();
                resolve('this');
            };
            document.getElementById('recurringDeleteAll').onclick = () => {
                modal.remove();
                resolve('all');
            };
            document.getElementById('recurringDeleteCancel').onclick = () => {
                modal.remove();
                resolve('cancel');
            };
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

            console.log('删除周期组:', { targetGroupId, currentIndex, itemCount: groupItems.length });

            // 保存所有要删除的项目用于撤回
            this.saveUndoHistory('delete', { items: groupItems });

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
            const item = await db.getItem(parseInt(itemId));
            if (!item) return;

            // 记录流转历史
            if (!item.transferHistory) {
                item.transferHistory = [];
            }

            item.transferHistory.push({
                from: item.handler || '待分配',
                to: transferTo,
                time: new Date().toLocaleString('zh-CN'),
                note: note
            });

            // 更新当前处理人
            item.handler = transferTo;
            item.progress = 'processing';

            await db.updateItem(parseInt(itemId), item);

            // 更新表单显示
            document.getElementById('docHandler').value = transferTo;

            this.hideModal('transferModal');
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
        const exportFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';

        // 获取自定义日期
        const customStart = document.getElementById('reportStartDate')?.value;
        const customEnd = document.getElementById('reportEndDate')?.value;

        // 验证自定义日期
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
            if (exportFormat === 'pdf') {
                await reportGenerator.exportToPDF(reportType, start, end);
            } else if (exportFormat === 'word') {
                await reportGenerator.exportToWord(reportType, start, end);
            } else {
                await reportGenerator.exportToImage(reportType, start, end);
            }

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
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示消息（非阻塞式）
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型: 'error' | 'success' | 'info'
     */
    showMessage(message, type = 'error') {
        console.log(`[${type}] ${message}`);

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
        msgDiv.innerHTML = `<span style="font-size:16px">${color.icon}</span><span>${message}</span>`;
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
    showRecognitionLog(title, content) {
        // 创建日志弹窗
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'recognitionLogModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    ${content}
                </div>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 点击背景关闭
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
});
