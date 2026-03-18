/**
 * 办公室智能工作面板 - 主应用
 * 整合所有模块，处理用户交互
 */

class OfficeDashboard {
    constructor() {
        this.currentView = 'board';
        this.currentDate = new Date();
        this.selectedDate = this.formatDateLocal(new Date()); // 选中的日期
        this.draggedItem = null;
        this.deleteItemId = null;

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

        // 监听跳转到日期事件
        document.addEventListener('gotoDate', (e) => {
            this.goToDateView(e.detail.date);
        });
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

        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }

        this.showLoading(true, '登录中...');

        try {
            const result = await syncManager.login(username, password);
            this.showSuccess(result.message);
            this.updateLoginUI({ isLoggedIn: true, username: username });

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

                // 处理周期性任务
                if (result.isRecurring && result.recurringRule) {
                    console.log('检测到周期性任务:', result.recurringRule);

                    const recurringItems = this.generateRecurringItems(
                        { type: result.type, ...result.data, source: 'nlp', rawInput: text },
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
                    const id = await db.addItem({
                        type: result.type,
                        ...result.data,
                        source: 'nlp',
                        rawInput: text
                    });
                    this.showSuccess('已添加到' + this.getTypeLabel(result.type));
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

                    // 显示结果
                    let message = '';
                    if (result.items && result.items.length > 0) {
                        message = `从"${file.name}"提取了${result.items.length}个事项`;
                    }
                    if (result.mergedItems && result.mergedItems.length > 0) {
                        if (message) message += '，';
                        message += `合并了${result.mergedItems.length}个会议的参会人员`;
                    }

                    if (message) {
                        this.showSuccess(message);
                    } else if (result.skippedCount > 0) {
                        this.showSuccess(`已处理，跳过${result.skippedCount}个重复事项`);
                    } else {
                        this.showError(`未能从"${file.name}"提取到有效事项，请确保内容清晰`);
                    }
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
                const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
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
                // 文件：按创建日期匹配
                if (item.type === 'document') {
                    const createdDate = item.createdAt ? item.createdAt.split('T')[0] : null;
                    return createdDate === this.selectedDate;
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

        // 排序（按order字段，如果没有则按创建时间倒序）
        Object.keys(grouped).forEach(type => {
            grouped[type].sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        });

        // 会议特殊排序：已完成沉底，然后按级别排序（钱局 > 局长 > 处室），最后按时间
        grouped.meeting.sort((a, b) => {
            // 已完成的沉底
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            const levelA = this.getMeetingLevel(a);
            const levelB = this.getMeetingLevel(b);
            if (levelA !== levelB) {
                return levelA - levelB;
            }
            // 同级别按时间排序
            const timeA = a.time || '99:99';
            const timeB = b.time || '99:99';
            return timeA.localeCompare(timeB);
        });

        // 渲染各列
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
        // 局长们
        if (allText.includes('局长') || /李局|王局|张局|刘局|陈局|杨局|赵局|黄局|周局|吴局/.test(allText)) {
            return 2;
        }
        // 处室
        if (allText.includes('处') || allText.includes('室') || allText.includes('科')) {
            return 3;
        }
        return 4;
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

        // 排序：未完成在前，已完成沉底
        items.sort((a, b) => {
            // 已完成的沉底
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // 同状态按order排序
            const orderA = a.order ?? 999999;
            const orderB = b.order ?? 999999;
            return orderA - orderB;
        });

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
        card.className = `card ${item.type}-card${item.completed ? ' completed' : ''}`;
        card.dataset.id = item.id;
        card.draggable = true;

        let contentHtml = '';
        let detailHtml = '';

        switch (item.type) {
            case 'todo':
                const priorityClass = `priority-${item.priority || 'medium'}`;
                const priorityText = { high: '急', medium: '中', low: '低' }[item.priority] || '中';
                contentHtml = `
                    <div class="card-header-row">
                        <span class="priority-tag ${priorityClass}">${priorityText}</span>
                        <input type="checkbox" class="complete-checkbox" ${item.completed ? 'checked' : ''} title="${item.completed ? '已完成' : '标记完成'}">
                    </div>
                    <div class="card-title ${item.completed ? 'completed-text' : ''}">${this.escapeHtml(item.title)}</div>
                    ${item.deadline ? `<div class="card-time">${this.formatDeadline(item.deadline)}</div>` : ''}
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

                contentHtml = `
                    <div class="card-header-row">
                        <span class="doc-type-tag ${docTypeClass}">${docTypeIcon}</span>
                        <input type="checkbox" class="complete-checkbox" ${isCompleted ? 'checked' : ''} title="${isCompleted ? '已办结' : '标记办结'}">
                    </div>
                    <div class="card-title ${isCompleted ? 'completed-text' : ''}">${this.escapeHtml(item.title)}</div>
                    ${item.handler ? `<div class="card-handler">当前：${this.escapeHtml(item.handler)}</div>` : ''}
                `;
                detailHtml = `
                    ${item.docNumber ? `<div class="card-detail-section"><div class="detail-label">文号</div><div class="detail-content">${this.escapeHtml(item.docNumber)}</div></div>` : ''}
                    ${item.source ? `<div class="card-detail-section"><div class="detail-label">来文单位</div><div class="detail-content">${this.escapeHtml(item.source)}</div></div>` : ''}
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

        // 绑定完成复选框事件（待办和办文）
        const checkbox = card.querySelector('.complete-checkbox');
        checkbox?.addEventListener('change', () => {
            this.toggleItemComplete(item.id, item.type, checkbox.checked);
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
                break;
        }

        this.showModal('itemModal');
    }

    /**
     * 格式化截止时间显示
     */
    formatDeadline(deadline) {
        if (!deadline) return '';
        const date = new Date(deadline);
        const now = new Date();
        const isOverdue = date < now;
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        return isOverdue ? `⚠️ 已逾期 ${dateStr}` : `${dateStr}截止`;
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
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drag-above', 'drag-below');
        });
        this.draggedItem = null;
        this.draggedElement = null;
    }

    /**
     * 拖拽悬停
     */
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');

        // 高亮显示插入位置
        const afterElement = this.getDragAfterElement(e.currentTarget, e.clientY);
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drag-above', 'drag-below');
        });
        if (afterElement) {
            afterElement.classList.add('drag-above');
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
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * 放置
     */
    async handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedItem) return;

        const newType = e.currentTarget.id.replace('List', '');
        const isSameColumn = newType === this.draggedItem.type;

        // 获取插入位置
        const afterElement = this.getDragAfterElement(e.currentTarget, e.clientY);

        try {
            if (!isSameColumn) {
                // 跨列移动：更新类型
                await db.updateItem(this.draggedItem.id, { type: newType });
            }

            // 更新排序
            await this.updateItemOrder(newType, this.draggedItem.id, afterElement?.dataset.id);

            // 重新加载
            await this.loadItems();

            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }

        } catch (error) {
            console.error('移动失败:', error);
            this.showError('移动失败，请重试');
        }

        this.draggedItem = null;
    }

    /**
     * 更新事项排序
     */
    async updateItemOrder(type, draggedId, afterId) {
        const items = await db.getItemsByType(type);
        
        // 找到拖拽项和目标位置
        const draggedIndex = items.findIndex(i => i.id == draggedId);
        if (draggedIndex === -1) return;

        const draggedItem = items.splice(draggedIndex, 1)[0];
        
        // 插入到新位置
        let insertIndex = items.length;
        if (afterId) {
            insertIndex = items.findIndex(i => i.id == afterId);
            if (insertIndex === -1) insertIndex = items.length;
        }

        items.splice(insertIndex, 0, draggedItem);

        // 更新所有项的order
        for (let i = 0; i < items.length; i++) {
            if (items[i].order !== i) {
                await db.updateItem(items[i].id, { order: i });
            }
        }
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

        // 设置标题
        const typeLabels = { todo: '待办事项', meeting: '会议活动', document: '办文情况' };
        titleEl.textContent = '添加' + typeLabels[type];

        // 显示对应字段
        document.querySelectorAll('.type-fields').forEach(el => el.classList.remove('active'));
        document.getElementById(type + 'Fields')?.classList.add('active');

        // 设置默认日期
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        if (type === 'todo') {
            const deadlineEl = document.getElementById('todoDeadline');
            if (deadlineEl) deadlineEl.value = `${dateStr}T${timeStr}`;

            // 重置周期性选项
            const recurringFields = document.getElementById('recurringFields');
            const isRecurring = document.getElementById('isRecurring');
            if (recurringFields) recurringFields.style.display = 'none';
            if (isRecurring) isRecurring.checked = false;
        } else if (type === 'meeting') {
            const dateEl = document.getElementById('meetingDate');
            const timeEl = document.getElementById('meetingTime');
            if (dateEl) dateEl.value = dateStr;
            if (timeEl) timeEl.value = timeStr;
        }

        this.showModal('itemModal');
        this.initRecurringEvents();
    }

    /**
     * 初始化周期性任务相关事件
     */
    initRecurringEvents() {
        // 周期性选项切换
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

                if (monthlyDateGroup) monthlyDateGroup.style.display = type === 'monthly_date' ? 'block' : 'none';
                if (nthWorkDayGroup) nthWorkDayGroup.style.display = type === 'monthly_workday' ? 'block' : 'none';
                if (weekDayGroup) weekDayGroup.style.display = type === 'weekly_day' ? 'block' : 'none';
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
                    const recurringCount = parseInt(document.getElementById('recurringCount').value) || 6;
                    const skipWeekends = document.getElementById('skipWeekends')?.checked || false;

                    const rule = {
                        type: recurringType,
                        skipWeekends: skipWeekends
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
                    }

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
                // 流转历史
                const existingItem = document.getElementById('itemId').value ? await db.getItem(parseInt(document.getElementById('itemId').value)) : null;
                item.transferHistory = existingItem?.transferHistory || [];
                break;
        }

        try {
            if (id) {
                await db.updateItem(parseInt(id), item);
            } else {
                // 检查是否是周期性任务
                console.log('检查周期性任务:', { isRecurring: item.isRecurring, recurringRule: item.recurringRule });

                if (item.isRecurring && item.recurringRule) {
                    console.log('开始生成周期性任务...');
                    const recurringItems = this.generateRecurringItems(item, item.recurringRule, item.recurringCount || 6);

                    console.log('生成的任务列表:', recurringItems);

                    if (recurringItems.length > 0) {
                        for (const recurringItem of recurringItems) {
                            console.log('保存任务:', recurringItem);
                            await db.addItem(recurringItem);
                        }
                        this.showSuccess(`已生成 ${recurringItems.length} 个周期性任务`);
                    } else {
                        console.error('未生成任何周期性任务');
                        this.showError('周期性任务生成失败，请检查参数');
                        return;
                    }
                } else {
                    await db.addItem(item);
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
        try {
            await db.updateItem(id, {
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                // 办文类型额外更新progress字段
                ...(type === 'document' && { progress: completed ? 'completed' : 'pending' })
            });
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
    generateRecurringItems(baseItem, rule, count) {
        const items = [];
        const groupId = 'recurring_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const today = new Date();

        console.log('生成周期性任务:', { baseItem, rule, count });

        // 复制基础数据，移除周期相关字段和需要重新计算的字段
        const cleanItem = { ...baseItem };
        delete cleanItem.isRecurring;
        delete cleanItem.recurringRule;
        delete cleanItem.recurringCount;
        delete cleanItem.displayTitle;  // 删除显示标题，让显示时根据新日期重新生成
        delete cleanItem.deadline;      // 删除旧截止时间，使用新生成的

        for (let i = 0; i < count; i++) {
            let targetDate;

            switch (rule.type) {
                case 'monthly_date':
                    targetDate = this.getMonthlyDate(today, i + 1, rule.day, rule.skipWeekends);
                    break;
                case 'monthly_workday':
                    targetDate = this.getNthWorkDayOfMonth(today, i + 1, rule.nthWorkDay);
                    break;
                case 'weekly_day':
                    targetDate = this.getWeeklyDay(today, i + 1, rule.weekDay);
                    break;
            }

            console.log(`第${i + 1}个任务日期:`, targetDate);

            if (targetDate) {
                items.push({
                    ...cleanItem,
                    deadline: this.formatDateForInput(targetDate),
                    isRecurring: true,
                    recurringRule: rule,
                    recurringGroupId: groupId,
                    occurrenceIndex: i + 1
                });
            }
        }

        console.log('生成的周期性任务:', items);
        return items;
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
     */
    getWeeklyDay(baseDate, weeksAhead, weekDay) {
        const date = new Date(baseDate);
        // 先调整到本周的周一
        const currentDay = date.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        date.setDate(date.getDate() + diffToMonday);

        // 然后加上周数偏移和星期几偏移
        date.setDate(date.getDate() + weeksAhead * 7 + (weekDay - 1));
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
    showDeleteConfirm(id) {
        this.deleteItemId = id;
        this.showModal('confirmModal');
    }

    /**
     * 确认删除
     */
    async confirmDelete() {
        if (!this.deleteItemId) return;

        try {
            await db.deleteItem(this.deleteItemId);
            this.hideModal('confirmModal');
            await this.loadItems();
            // 立即同步到云端
            if (syncManager.isLoggedIn()) {
                await syncManager.immediateSyncToCloud();
            }
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
        const exportFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'word';

        const { start, end } = reportGenerator.getDateRange(reportType);

        this.showLoading(true);

        try {
            if (exportFormat === 'word') {
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
