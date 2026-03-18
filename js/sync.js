/**
 * 用户登录同步模块
 * 使用Supabase Auth实现账号密码登录和数据同步
 */

class SyncManager {
    constructor() {
        // Supabase配置
        this.supabaseUrl = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';
        this.supabase = null;
        this.currentUser = null;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;
        this.localMode = false;
        this.initError = null;
        this.realtimeChannel = null;
        this.syncTimeout = null;
        this.initPromise = null;

        // 智能同步标记
        this.hasLocalChanges = false;  // 本地是否有未同步的改动
        this.lastLocalChangeTime = null;  // 本地最后改动时间
        this.lastCloudSyncTime = null;  // 云端最后同步时间

        // 初始化Supabase
        this.initPromise = this.initSupabase();
    }

    /**
     * 等待初始化完成
     */
    async waitForInit() {
        if (this.initPromise) {
            await this.initPromise;
        }
    }

    /**
     * 初始化Supabase客户端
     */
    async initSupabase() {
        console.log('=== Supabase 初始化开始 ===');
        console.log('URL:', this.supabaseUrl);

        if (typeof window.supabase === 'undefined') {
            this.initError = 'Supabase库未加载';
            console.error(this.initError);
            return;
        }

        try {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });
            console.log('Supabase客户端创建成功');

            // 尝试获取会话（不阻塞初始化）
            try {
                const { data, error } = await this.supabase.auth.getSession();
                if (error) {
                    console.warn('获取会话失败:', error.message);
                } else {
                    console.log('Supabase连接正常');
                    if (data.session) {
                        this.currentUser = data.session.user;
                        console.log('已恢复登录状态:', this.currentUser.email);
                        this.updateLoginUI();

                        // 关键修复：恢复会话时的智能同步策略
                        const localItems = await db.getAllItems();
                        
                        if (localItems.length > 0) {
                            // 本地有数据：只上传，不从云端下载！
                            // 这样可以保护本地新数据不被云端老数据覆盖
                            console.log('本地有', localItems.length, '个事项，立即上传到云端...');
                            await this.immediateSyncToCloud();
                            console.log('本地数据已上传到云端');
                        } else {
                            // 本地无数据：从云端下载（新设备/清空后登录）
                            console.log('本地无数据，从云端下载...');
                            const syncResult = await this.syncFromCloud();
                            console.log('云端同步结果:', syncResult);
                            
                            // 通知应用刷新数据
                            const event = new CustomEvent('syncDataLoaded', {
                                detail: { syncResult }
                            });
                            document.dispatchEvent(event);
                        }

                        // 启动定时同步
                        this.startPeriodicSync();

                        // 初始化实时订阅
                        this.initRealtimeSubscription();
                    }
                }
            } catch (sessionError) {
                console.warn('会话检查失败，但Supabase客户端可用:', sessionError);
            }
        } catch (error) {
            this.initError = error.message;
            console.error('Supabase初始化异常:', error);
        }
    }

    /**
     * 启动定时同步（只上传策略）
     * 关键修复：定时同步只上传本地数据，不从云端下载
     * 这样可以确保本地数据永远不会被云端老数据覆盖
     */
    startPeriodicSync() {
        // 清除已有的定时器
        if (this.periodicSyncTimer) {
            clearInterval(this.periodicSyncTimer);
        }

        // 每10分钟上传一次本地数据到云端
        this.periodicSyncTimer = setInterval(async () => {
            if (this.isLoggedIn()) {
                console.log('定时同步：上传本地数据到云端...');
                
                // 只上传，不下载！
                const result = await this.immediateSyncToCloud();
                if (result.success) {
                    console.log('定时同步完成，已上传', result.itemCount, '个事项');
                } else {
                    console.warn('定时同步失败:', result.error);
                }
            }
        }, 600000); // 10分钟（600000ms）

        console.log('定时同步已启动（每10分钟，只上传模式）');
    }

    /**
     * 标记本地有改动
     */
    markLocalChange() {
        this.hasLocalChanges = true;
        this.lastLocalChangeTime = new Date().toISOString();
        console.log('标记本地改动:', this.lastLocalChangeTime);
    }

    /**
     * 检查云端是否有更新
     */
    async checkCloudUpdate() {
        if (!this.supabase || !this.currentUser) {
            return { hasUpdate: false };
        }

        try {
            const { data, error } = await this.supabase
                .from('user_data')
                .select('updated_at')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (error || !data) {
                return { hasUpdate: false };
            }

            const cloudTime = new Date(data.updated_at);
            const lastSyncTime = this.lastCloudSyncTime ? new Date(this.lastCloudSyncTime) : new Date(0);

            // 如果云端更新时间比上次同步时间新，说明有更新
            const hasUpdate = cloudTime > lastSyncTime;
            console.log('云端更新检查:', {
                cloudTime: data.updated_at,
                lastSyncTime: this.lastCloudSyncTime,
                hasUpdate
            });

            return { hasUpdate, cloudTime: data.updated_at };
        } catch (error) {
            console.error('检查云端更新失败:', error);
            return { hasUpdate: false };
        }
    }

    /**
     * 停止定时同步
     */
    stopPeriodicSync() {
        if (this.periodicSyncTimer) {
            clearInterval(this.periodicSyncTimer);
            this.periodicSyncTimer = null;
        }
    }

    /**
     * 初始化实时订阅
     */
    initRealtimeSubscription() {
        if (!this.supabase || !this.currentUser) return;

        console.log('初始化实时订阅...');

        // 订阅 user_data 表的变化
        this.realtimeChannel = this.supabase
            .channel(`user_data_changes_${this.currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_data',
                    filter: `user_id=eq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('收到数据变更通知:', payload);
                    if (payload.eventType === 'UPDATE') {
                        // 触发数据更新事件
                        const event = new CustomEvent('syncRemoteDataChanged', {
                            detail: { data: payload.new }
                        });
                        document.dispatchEvent(event);
                    }
                }
            )
            .subscribe((status) => {
                console.log('实时订阅状态:', status);
            });
    }

    /**
     * 取消实时订阅
     */
    unsubscribeRealtime() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
            this.realtimeChannel = null;
        }
    }

    /**
     * 立即同步到云端（无防抖延迟，用于新增事项后立即同步）
     * 这是关键方法：确保本地新数据立即上传到云端
     */
    async immediateSyncToCloud() {
        console.log('=== immediateSyncToCloud 立即同步 ===');
        console.log('Supabase:', !!this.supabase, 'currentUser:', !!this.currentUser);

        if (!this.supabase || !this.currentUser) {
            console.warn('未登录或Supabase不可用，跳过同步');
            return { success: false };
        }

        // 清除之前的防抖定时器
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }

        try {
            const allItems = await db.getAllItems();
            console.log('本地事项数量:', allItems.length);

            const settings = {};
            const kimiKey = await db.getSetting('kimi_api_key');
            const kimiKeySet = await db.getSetting('kimi_api_key_set');
            const deepseekKey = await db.getSetting('deepseek_api_key');
            const deepseekKeySet = await db.getSetting('deepseek_api_key_set');

            if (kimiKey) settings.kimi_api_key = kimiKey;
            if (kimiKeySet) settings.kimi_api_key_set = kimiKeySet;
            if (deepseekKey) settings.deepseek_api_key = deepseekKey;
            if (deepseekKeySet) settings.deepseek_api_key_set = deepseekKeySet;

            const syncTime = new Date().toISOString();
            const syncData = {
                sync_time: syncTime,
                items: allItems,
                settings: settings,
                device_info: navigator.userAgent
            };

            console.log('立即上传数据到云端...');
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.currentUser.id,
                    data: syncData,
                    updated_at: syncTime
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('立即同步失败:', error);
                return { success: false, error: error.message };
            } else {
                console.log('立即同步成功！共', allItems.length, '个事项已上传');
                this.lastSyncTime = syncTime;
                this.lastCloudSyncTime = syncTime;
                this.hasLocalChanges = false;
                localStorage.setItem('lastSyncTime', this.lastSyncTime);
                return { success: true, itemCount: allItems.length };
            }
        } catch (error) {
            console.error('立即同步异常:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 静默同步到云端（无进度提示，带防抖）
     * 用于频繁操作时的延迟同步
     */
    async silentSyncToCloud() {
        console.log('=== silentSyncToCloud 被调用 ===');
        console.log('Supabase:', !!this.supabase, 'currentUser:', !!this.currentUser);

        if (!this.supabase || !this.currentUser) {
            console.warn('未登录或Supabase不可用，跳过同步');
            return { success: false };
        }

        // 防抖：延迟500ms执行，避免频繁同步（从300ms增加到500ms）
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            console.log('清除之前的同步定时器');
        }

        return new Promise((resolve) => {
            this.syncTimeout = setTimeout(async () => {
                console.log('开始执行同步...');
                try {
                    const allItems = await db.getAllItems();
                    console.log('本地事项数量:', allItems.length);

                    const settings = {};
                    const kimiKey = await db.getSetting('kimi_api_key');
                    const kimiKeySet = await db.getSetting('kimi_api_key_set');
                    const deepseekKey = await db.getSetting('deepseek_api_key');
                    const deepseekKeySet = await db.getSetting('deepseek_api_key_set');

                    if (kimiKey) settings.kimi_api_key = kimiKey;
                    if (kimiKeySet) settings.kimi_api_key_set = kimiKeySet;
                    if (deepseekKey) settings.deepseek_api_key = deepseekKey;
                    if (deepseekKeySet) settings.deepseek_api_key_set = deepseekKeySet;

                    const syncTime = new Date().toISOString();
                    const syncData = {
                        sync_time: syncTime,
                        items: allItems,
                        settings: settings,
                        device_info: navigator.userAgent
                    };

                    const { error } = await this.supabase
                        .from('user_data')
                        .upsert({
                            user_id: this.currentUser.id,
                            data: syncData,
                            updated_at: syncTime
                        }, { onConflict: 'user_id' });

                    if (error) {
                        console.error('静默同步失败:', error);
                        resolve({ success: false });
                    } else {
                        console.log('静默同步成功，共', allItems.length, '个事项');
                        this.lastSyncTime = syncTime;
                        this.lastCloudSyncTime = syncTime;  // 记录云端同步时间
                        this.hasLocalChanges = false;  // 清除本地修改标记
                        localStorage.setItem('lastSyncTime', this.lastSyncTime);
                        resolve({ success: true, itemCount: allItems.length });
                    }
                } catch (error) {
                    console.error('静默同步异常:', error);
                    resolve({ success: false });
                }
            }, 500);  // 从300ms增加到500ms
        });
    }

    /**
     * 静默从云端同步（无进度提示，用于实时更新）
     */
    async silentSyncFromCloud() {
        if (!this.supabase || !this.currentUser) {
            return { success: false };
        }

        try {
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (error || !data || !data.data) {
                return { success: false };
            }

            // 同步设置
            if (data.data.settings) {
                const settings = data.data.settings;
                if (settings.kimi_api_key) {
                    await db.setSetting('kimi_api_key', settings.kimi_api_key);
                    localStorage.setItem('kimiApiKey', settings.kimi_api_key);
                }
                if (settings.kimi_api_key_set) {
                    await db.setSetting('kimi_api_key_set', settings.kimi_api_key_set);
                }
                if (settings.deepseek_api_key) {
                    await db.setSetting('deepseek_api_key', settings.deepseek_api_key);
                    localStorage.setItem('deepseekApiKey', settings.deepseek_api_key);
                }
                if (settings.deepseek_api_key_set) {
                    await db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set);
                }
            }

            // 同步事项
            const cloudItems = data.data.items || [];
            await db.clearAllItems();

            let importedCount = 0;
            for (const item of cloudItems) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入项目失败:', e);
                }
            }

            // 更新云端同步时间
            if (data.updated_at) {
                this.lastCloudSyncTime = data.updated_at;
            }

            console.log('静默下载成功，共', importedCount, '个事项');
            return { success: true, itemCount: importedCount };
        } catch (error) {
            console.error('静默下载异常:', error);
            return { success: false };
        }
    }

    /**
     * 检查Supabase是否可用
     */
    isSupabaseReady() {
        return !!this.supabase;
    }

    /**
     * 注册用户
     */
    async register(username, password) {
        console.log('=== 注册请求 ===');
        console.log('用户名:', username);

        // 等待初始化完成
        await this.waitForInit();
        console.log('Supabase状态:', this.isSupabaseReady() ? '可用' : '不可用');

        if (!username || username.length < 2) {
            throw new Error('用户名至少需要2个字符');
        }
        if (!password || password.length < 6) {
            throw new Error('密码至少需要6个字符');
        }

        if (!this.isSupabaseReady()) {
            throw new Error('网络服务不可用，请检查网络连接后刷新页面重试');
        }

        const email = `${username}@office.local`;
        console.log('注册邮箱:', email);

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });

            console.log('注册结果:', { user: data.user?.id, session: !!data.session, error: error?.message });

            if (error) {
                if (error.message.includes('already registered') || error.message.includes('already been registered')) {
                    throw new Error('用户名已存在');
                }
                if (error.message.includes('password')) {
                    throw new Error('密码强度不足，请使用更复杂的密码（至少6位，包含字母和数字）');
                }
                throw new Error('注册失败: ' + error.message);
            }

            // 注册成功但需要邮箱验证
            if (data.user && !data.session) {
                throw new Error('注册成功，但需要邮箱验证。请在Supabase后台关闭邮箱验证功能，或手动确认用户。');
            }

            // 注册成功并自动登录
            if (data.session) {
                this.currentUser = data.user;
                this.updateLoginUI();
                return { success: true, message: '注册成功！', user: this.currentUser };
            }

            return { success: true, message: '注册成功，请登录' };
        } catch (error) {
            console.error('注册失败:', error);
            throw error;
        }
    }

    /**
     * 用户登录
     */
    async login(username, password) {
        console.log('=== 登录请求 ===');
        console.log('用户名:', username);

        // 等待初始化完成
        await this.waitForInit();
        console.log('Supabase状态:', this.isSupabaseReady() ? '可用' : '不可用');

        if (!username || !password) {
            throw new Error('请输入用户名和密码');
        }

        if (!this.isSupabaseReady()) {
            throw new Error('网络服务不可用，请检查网络连接后刷新页面重试');
        }

        const email = `${username}@office.local`;
        console.log('登录邮箱:', email);

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            console.log('登录结果:', { user: data.user?.id, session: !!data.session, error: error?.message });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('用户名或密码错误');
                }
                if (error.message.includes('Email not confirmed')) {
                    throw new Error('账号未激活。请在Supabase后台手动确认用户，或关闭邮箱验证功能。');
                }
                throw new Error('登录失败: ' + error.message);
            }

            this.currentUser = data.user;
            console.log('登录成功:', this.currentUser.email);
            this.updateLoginUI();

            // 智能同步策略：登录时根据本地数据情况决定同步方向
            const localItems = await db.getAllItems();
            
            if (localItems.length > 0) {
                // 本地有数据：只上传，不从云端下载！
                console.log('本地有', localItems.length, '个事项，立即上传到云端...');
                await this.immediateSyncToCloud();
                console.log('本地数据已上传到云端');
            } else {
                // 本地无数据：从云端下载
                console.log('本地无数据，从云端下载...');
                const syncResult = await this.syncFromCloud();
                console.log('云端同步结果:', syncResult);
                
                // 通知应用刷新数据
                const event = new CustomEvent('syncDataLoaded', {
                    detail: { syncResult }
                });
                document.dispatchEvent(event);
            }

            // 启动定时同步
            this.startPeriodicSync();

            // 初始化实时订阅
            this.initRealtimeSubscription();

            return { success: true, message: '登录成功', user: this.currentUser };
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    }

    /**
     * 修改密码
     */
    async changePassword(username, oldPassword, newPassword) {
        console.log('=== 修改密码请求 ===');
        console.log('用户名:', username);

        // 等待初始化完成
        await this.waitForInit();

        if (!username || !oldPassword || !newPassword) {
            throw new Error('请填写完整信息');
        }

        if (newPassword.length < 6) {
            throw new Error('新密码至少需要6位');
        }

        if (!this.isSupabaseReady()) {
            throw new Error('网络服务不可用，请检查网络连接后刷新页面重试');
        }

        const email = `${username}@office.local`;

        try {
            // 1. 先验证原密码（尝试登录）
            console.log('验证原密码...');
            const { data: loginData, error: loginError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: oldPassword
            });

            if (loginError) {
                if (loginError.message.includes('Invalid login credentials')) {
                    throw new Error('用户名或原密码错误');
                }
                throw new Error('验证失败: ' + loginError.message);
            }

            console.log('原密码验证成功，开始修改密码...');

            // 2. 修改密码
            const { error: updateError } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                throw new Error('修改密码失败: ' + updateError.message);
            }

            // 3. 登出（让用户用新密码重新登录）
            await this.supabase.auth.signOut();
            this.currentUser = null;
            this.updateLoginUI();

            console.log('密码修改成功');
            return { success: true, message: '密码修改成功，请使用新密码登录' };
        } catch (error) {
            console.error('修改密码失败:', error);
            throw error;
        }
    }

    /**
     * 退出登录
     */
    async logout() {
        try {
            if (this.supabase && this.currentUser) {
                await this.syncToCloud().catch(e => console.warn('同步失败:', e));
                this.stopPeriodicSync();
                this.unsubscribeRealtime();
                await this.supabase.auth.signOut().catch(e => console.warn('登出失败:', e));
            }
            this.currentUser = null;
            this.updateLoginUI();
            console.log('已退出登录');
        } catch (error) {
            console.error('退出登录失败:', error);
        }
    }

    /**
     * 同步数据到云端
     */
    async syncToCloud(progressCallback = null) {
        if (!this.supabase || !this.currentUser) {
            console.warn('未登录，跳过同步');
            return { success: false, message: '请先登录' };
        }
        try {
            if (progressCallback) progressCallback('正在准备数据...');
            const allItems = await db.getAllItems();
            console.log('=== 上传数据 ===');
            console.log('用户ID:', this.currentUser.id);
            console.log('事项数量:', allItems.length);

            // 获取设置数据（包括API Key）
            const settings = {};
            const kimiKey = await db.getSetting('kimi_api_key');
            const kimiKeySet = await db.getSetting('kimi_api_key_set');
            const deepseekKey = await db.getSetting('deepseek_api_key');
            const deepseekKeySet = await db.getSetting('deepseek_api_key_set');

            if (kimiKey) settings.kimi_api_key = kimiKey;
            if (kimiKeySet) settings.kimi_api_key_set = kimiKeySet;
            if (deepseekKey) settings.deepseek_api_key = deepseekKey;
            if (deepseekKeySet) settings.deepseek_api_key_set = deepseekKeySet;

            const syncData = {
                sync_time: new Date().toISOString(),
                items: allItems,
                settings: settings,
                device_info: navigator.userAgent
            };
            if (progressCallback) progressCallback('正在上传到云端...');

            const upsertData = {
                user_id: this.currentUser.id,
                data: syncData,
                updated_at: new Date().toISOString()
            };
            console.log('上传数据:', JSON.stringify(upsertData, null, 2));

            const { data, error } = await this.supabase
                .from('user_data')
                .upsert(upsertData, { onConflict: 'user_id' })
                .select();

            console.log('上传响应:', { data, error });

            if (error) {
                console.error('上传失败:', error);
                throw error;
            }

            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            if (progressCallback) progressCallback('上传完成');
            return { success: true, message: `已同步 ${allItems.length} 个事项到云端`, itemCount: allItems.length };
        } catch (error) {
            console.error('同步到云端失败:', error);
            return { success: false, message: '同步失败: ' + error.message };
        }
    }

    /**
     * 从云端同步数据
     */
    async syncFromCloud(progressCallback = null, mergeStrategy = 'merge') {
        if (!this.supabase || !this.currentUser) {
            console.warn('未登录，跳过同步');
            return { success: false, message: '请先登录' };
        }
        try {
            console.log('=== 下载数据 ===');
            console.log('用户ID:', this.currentUser.id);
            console.log('用户邮箱:', this.currentUser.email);

            if (progressCallback) progressCallback('正在从云端获取数据...');

            // 先查询所有数据（调试用）
            const { data: allData, error: allError } = await this.supabase
                .from('user_data')
                .select('*');
            console.log('表中所有数据:', allData, '错误:', allError);

            // 查询当前用户数据
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            console.log('查询结果:', { data, error });

            if (error) {
                console.error('查询失败:', error);
                throw error;
            }

            if (!data) {
                console.log('云端暂无此用户数据');
                return { success: true, message: '云端暂无数据', itemCount: 0 };
            }

            if (!data.data) {
                console.log('数据字段为空');
                return { success: true, message: '云端数据为空', itemCount: 0 };
            }

            if (progressCallback) progressCallback('正在合并数据...');

            // 同步设置数据（API Key等）
            if (data.data.settings) {
                const settings = data.data.settings;
                if (settings.kimi_api_key) {
                    await db.setSetting('kimi_api_key', settings.kimi_api_key);
                    localStorage.setItem('kimiApiKey', settings.kimi_api_key);
                }
                if (settings.kimi_api_key_set) {
                    await db.setSetting('kimi_api_key_set', settings.kimi_api_key_set);
                }
                if (settings.deepseek_api_key) {
                    await db.setSetting('deepseek_api_key', settings.deepseek_api_key);
                    localStorage.setItem('deepseekApiKey', settings.deepseek_api_key);
                }
                if (settings.deepseek_api_key_set) {
                    await db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set);
                }
                console.log('已同步API Key设置');
            }

            // 同步事项数据
            const cloudItems = data.data.items || [];
            console.log('云端事项数量:', cloudItems.length);

            if (mergeStrategy === 'replace') {
                await db.clearAllItems();
            }

            let importedCount = 0;
            for (const item of cloudItems) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入项目失败:', e);
                }
            }

            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            if (progressCallback) progressCallback('同步完成');
            return { success: true, message: `从云端同步了 ${importedCount} 个事项`, itemCount: importedCount };
        } catch (error) {
            console.error('从云端同步失败:', error);
            return { success: false, message: '同步失败: ' + error.message };
        }
    }

    /**
     * 导出数据为文件
     */
    async exportToFile(password = null) {
        try {
            const allItems = await db.getAllItems();
            const exportData = {
                version: '2.0',
                export_time: new Date().toISOString(),
                items: allItems
            };
            let dataStr = JSON.stringify(exportData, null, 2);
            if (password) {
                const encrypted = await this.simpleEncrypt(dataStr, password);
                dataStr = JSON.stringify({ encrypted: true, data: encrypted });
            }
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `办公面板备份_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true, message: `已导出 ${allItems.length} 个事项`, itemCount: allItems.length };
        } catch (error) {
            throw new Error('导出失败: ' + error.message);
        }
    }

    /**
     * 从文件导入数据
     */
    async importFromFile(file, password = null) {
        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('文件格式不正确');
            }
            if (data.encrypted && data.data) {
                if (!password) {
                    throw new Error('此文件需要密码才能导入');
                }
                const decrypted = await this.simpleDecrypt(data.data, password);
                data = JSON.parse(decrypted);
            }
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('文件格式不正确');
            }
            let importedCount = 0;
            for (const item of data.items) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入项目失败:', e);
                }
            }
            return { success: true, message: `成功导入 ${importedCount} 个事项`, itemCount: importedCount };
        } catch (error) {
            throw new Error('导入失败: ' + error.message);
        }
    }

    /**
     * 简单加密
     */
    async simpleEncrypt(text, password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const passwordData = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
        const key = await crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encrypted), iv.length);
        return btoa(String.fromCharCode(...result));
    }

    /**
     * 简单解密
     */
    async simpleDecrypt(encryptedBase64, password) {
        const encoder = new TextEncoder();
        const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const iv = encryptedData.slice(0, 12);
        const data = encryptedData.slice(12);
        const passwordData = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
        const key = await crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * 更新登录UI
     */
    updateLoginUI() {
        const event = new CustomEvent('syncLoginStatusChanged', {
            detail: {
                isLoggedIn: !!this.currentUser,
                username: this.currentUser?.user_metadata?.username || ''
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 获取登录状态
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * 获取当前用户名
     */
    getUsername() {
        return this.currentUser?.user_metadata?.username || '';
    }
}

// 创建全局同步管理器实例
const syncManager = new SyncManager();
