/**
 * 用户登录同步模块
 * 使用Supabase Auth实现账号密码登录和数据同步
 * 支持本地模式（无需登录即可使用）
 */

class SyncManager {
    constructor() {
        // Supabase配置（用户配置）
        this.supabaseUrl = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';
        this.supabase = null;
        this.currentUser = null;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;

        // 默认测试账号（本地模式）
        this.defaultUsername = 'admin';
        this.defaultPassword = '123456';
        this.localMode = false; // 是否使用本地模式

        // 初始化Supabase
        this.initSupabase();
    }

    /**
     * 初始化Supabase客户端
     */
    initSupabase() {
        if (typeof window.supabase !== 'undefined') {
            try {
                this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                console.log('Supabase客户端已初始化');
                this.localMode = false;
                this.checkSession();
            } catch (error) {
                console.error('Supabase初始化失败:', error);
                this.enableLocalMode();
            }
        } else {
            console.warn('Supabase库未加载，启用本地模式');
            this.enableLocalMode();
        }
    }

    /**
     * 启用本地模式
     */
    enableLocalMode() {
        this.localMode = true;
        this.supabase = null;
        console.log('已启用本地模式，可使用默认账号登录');
    }

    /**
     * 检查当前会话
     */
    async checkSession() {
        if (!this.supabase) return;
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;
            if (session) {
                this.currentUser = session.user;
                console.log('已登录用户:', this.currentUser.email);
                this.updateLoginUI();
            }
        } catch (error) {
            console.error('检查会话失败:', error);
        }
    }

    /**
     * 注册用户
     */
    async register(username, password) {
        console.log('注册请求:', { username, hasSupabase: !!this.supabase, localMode: this.localMode });

        // 检查用户名格式
        if (!username || username.length < 2) {
            throw new Error('用户名至少需要2个字符');
        }
        if (!password || password.length < 6) {
            throw new Error('密码至少需要6个字符');
        }

        // 本地模式：保存到localStorage
        if (this.localMode || !this.supabase) {
            const localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');
            if (localUsers[username]) {
                throw new Error('用户名已存在');
            }
            localUsers[username] = {
                username,
                password,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('localUsers', JSON.stringify(localUsers));
            return { success: true, message: '注册成功（本地模式），请登录' };
        }

        // Supabase 注册
        try {
            const email = `${username}@office.local`;
            console.log('尝试注册:', email);

            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username },
                    emailRedirectTo: window.location.origin
                }
            });

            console.log('注册响应:', { data, error });

            if (error) {
                // 处理常见错误
                if (error.message.includes('already registered')) {
                    throw new Error('用户名已存在');
                }
                if (error.message.includes('password')) {
                    throw new Error('密码强度不足，请使用更复杂的密码');
                }
                throw error;
            }

            // 检查是否需要邮箱验证
            if (data.user && !data.session) {
                return {
                    success: true,
                    message: '注册成功！由于安全设置，请联系管理员激活账号，或稍后尝试登录',
                    needsConfirmation: true
                };
            }

            if (data.session) {
                this.currentUser = data.user;
                this.updateLoginUI();
                return { success: true, message: '注册成功！', user: this.currentUser };
            }

            return { success: true, message: '注册成功，请登录' };
        } catch (error) {
            console.error('注册失败:', error);
            throw new Error('注册失败: ' + (error.message || '请稍后重试'));
        }
    }

    /**
     * 用户登录
     */
    async login(username, password) {
        console.log('登录请求:', { username, hasSupabase: !!this.supabase, localMode: this.localMode });

        // 本地模式或Supabase不可用时
        if (this.localMode || !this.supabase) {
            // 检查默认账号
            if (username === this.defaultUsername && password === this.defaultPassword) {
                this.currentUser = {
                    id: 'local-admin',
                    email: 'admin@local',
                    user_metadata: { username: 'admin' }
                };
                this.updateLoginUI();
                return { success: true, message: '登录成功（本地模式）', user: this.currentUser };
            }

            // 检查本地注册用户
            const localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');
            if (localUsers[username] && localUsers[username].password === password) {
                this.currentUser = {
                    id: 'local-' + username,
                    email: `${username}@local`,
                    user_metadata: { username: username }
                };
                this.updateLoginUI();
                return { success: true, message: '登录成功（本地模式）', user: this.currentUser };
            }

            throw new Error('用户名或密码错误（提示：默认账号 admin/123456）');
        }

        // Supabase 登录
        try {
            const email = `${username}@office.local`;
            console.log('尝试登录:', email);

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            console.log('登录响应:', { data, error });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('用户名或密码错误');
                }
                if (error.message.includes('Email not confirmed')) {
                    throw new Error('账号未激活，请联系管理员或重新注册');
                }
                throw error;
            }

            this.currentUser = data.user;
            console.log('登录成功:', this.currentUser.email);
            this.updateLoginUI();

            // 自动同步云端数据
            try {
                await this.syncFromCloud();
            } catch (syncError) {
                console.warn('同步数据失败:', syncError);
            }

            return { success: true, message: '登录成功', user: this.currentUser };
        } catch (error) {
            console.error('登录失败:', error);
            throw new Error(error.message || '登录失败，请检查用户名和密码');
        }
    }

    /**
     * 退出登录
     */
    async logout() {
        try {
            if (this.supabase && this.currentUser) {
                await this.syncToCloud();
                await this.supabase.auth.signOut();
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
            throw new Error('请先登录');
        }
        try {
            if (progressCallback) progressCallback('正在准备数据...');
            const allItems = await db.getAllItems();
            const syncData = {
                user_id: this.currentUser.id,
                sync_time: new Date().toISOString(),
                items: allItems,
                device_info: navigator.userAgent
            };
            if (progressCallback) progressCallback('正在上传到云端...');
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.currentUser.id,
                    data: syncData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            if (error) throw error;
            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            if (progressCallback) progressCallback('上传完成');
            return { success: true, message: `已同步 ${allItems.length} 个事项到云端`, itemCount: allItems.length };
        } catch (error) {
            console.error('同步到云端失败:', error);
            throw new Error('同步失败: ' + error.message);
        }
    }

    /**
     * 从云端同步数据
     */
    async syncFromCloud(progressCallback = null, mergeStrategy = 'merge') {
        if (!this.supabase || !this.currentUser) {
            throw new Error('请先登录');
        }
        try {
            if (progressCallback) progressCallback('正在从云端获取数据...');
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return { success: true, message: '云端暂无数据', itemCount: 0 };
                }
                throw error;
            }
            if (!data || !data.data || !data.data.items) {
                return { success: true, message: '云端暂无数据', itemCount: 0 };
            }
            if (progressCallback) progressCallback('正在合并数据...');
            const cloudItems = data.data.items;
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
            throw new Error('同步失败: ' + error.message);
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
