﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * 用户登录同步模块
 * 使用Supabase Auth实现账号密码登录和数据同步
 * 
 * 同步策略（最新数据优先）：
 * 1. 打开页面时：比较云端和本地时间戳，新的覆盖旧的
 * 2. 本地修改后：立即上传到云端
 * 3. 定时同步：上传本地数据
 * 4. 数据合并：智能合并去重
 */



class SyncManager {
    constructor() {
        // Supabase配置（anon key 为公开密钥，安全性依赖 RLS 行级安全策略，非 service_role key）
        this.supabaseUrl = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';
        this.supabase = null;
        this.currentUser = null;
        this.initError = null;
        this.realtimeChannel = null;
        this.syncTimeout = null;
        this.initPromise = null;
        this.periodicSyncTimer = null;

        // 同步状态追踪
        this.lastLocalModifyTime = SafeStorage.get('lastLocalModifyTime') || null;  // 本地最后修改时间
        this.lastCloudSyncTime = SafeStorage.get('lastCloudSyncTime') || null;  // 最后成功同步到云端的时间
        this.isSyncing = false;  // 是否正在同步中
        this._offlineNotified = false;

        // 初始化Supabase
        this.initPromise = this.initSupabase();
    }

    isOnline() {
        return navigator.onLine !== false;
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
     * 记录本地修改时间
     */
    recordLocalModify() {
        this.lastLocalModifyTime = new Date().toISOString();
        SafeStorage.set('lastLocalModifyTime', this.lastLocalModifyTime);

    }

    /**
     * 初始化Supabase客户端
     */
    async initSupabase() {

        // 等待Supabase库加载（最多等待20秒）
        let waitTime = 0;
        const maxWait = 20000;
        while (typeof window.supabase === 'undefined' && waitTime < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 200));
            waitTime += 200;
            if (waitTime % 2000 === 0) {

            }
        }



        if (typeof window.supabase === 'undefined') {
            this.initError = '网络服务未加载，请检查网络连接后刷新页面重试。';
            console.error(this.initError);
            return;
        }



        try {
            // ES模块导出的是{ createClient }，需要检查
            const createClient = window.supabase.createClient || window.supabase.default?.createClient;
            if (!createClient) {
                console.error('Supabase模块结构:', Object.keys(window.supabase));
                throw new Error('createClient函数未找到');
            }

            this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });


            // 尝试获取会话
            try {
                const { data, error } = await this.supabase.auth.getSession();
                if (error) {
                    console.warn('获取会话失败:', error.message);
                } else if (data.session) {
                    this.currentUser = data.session.user;

                    this.updateLoginUI();

                    // 执行智能同步
                    await this.smartSync();

                    // 启动定时同步
                    this.startPeriodicSync();
                }
            } catch (sessionError) {
                console.warn('会话检查失败:', sessionError);
            }
        } catch (error) {
            this.initError = error.message;
            console.error('Supabase初始化异常:', error);
        }
    }

    /**
     * 智能同步（核心方法）
     * 比较云端和本地时间戳，决定同步方向
     */
    async smartSync() {
        if (!this.supabase || !this.currentUser) {
            return;
        }

        if (!this.isOnline()) {
            console.warn('离线状态，跳过同步');
            return;
        }

        if (this.isSyncing) {
            return;
        }

        this.isSyncing = true;


        try {
            // 1. 获取本地数据
            const localItems = await db.getAllItems();



            // 2. 获取云端数据和时间戳
            const { data: cloudData, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (error) {
                console.error('获取云端数据失败:', error);
                // 云端获取失败，但本地有数据，尝试上传
                if (localItems.length > 0) {
                    await this.uploadToCloud();
                }
                this.isSyncing = false;
                return;
            }

            // 3. 分析同步策略
            const cloudUpdateTime = cloudData?.updated_at ? new Date(cloudData.updated_at) : null;
            const localModifyTime = this.lastLocalModifyTime ? new Date(this.lastLocalModifyTime) : null;
            const lastSyncTime = this.lastCloudSyncTime ? new Date(this.lastCloudSyncTime) : null;


            // 情况1: 云端无数据
            if (!cloudData || !cloudData.data) {

                if (localItems.length > 0) {
                    await this.uploadToCloud(cloudData);
                }
                this.isSyncing = false;
                return;
            }

            // 情况2: 本地无数据
            if (localItems.length === 0) {

                await this.downloadFromCloud(cloudData);
                this.isSyncing = false;
                return;
            }

            // 情况3: 两边都有数据，需要比较时间
            const cloudItems = cloudData.data.items || [];

            const isFirstSync = !lastSyncTime;

            if (isFirstSync) {
                // 首次同步（新设备/清除过缓存）：走合并逻辑，避免任何一端数据丢失
                await this.mergeData(localItems, cloudData);
            } else {
                // 判断云端是否有更新（云端更新时间 > 上次同步时间）
                const cloudHasUpdate = cloudUpdateTime && cloudUpdateTime > lastSyncTime;

                // 判断本地是否有修改（本地修改时间 > 上次同步时间）
                const localHasModify = localModifyTime && localModifyTime > lastSyncTime;

                if (cloudHasUpdate && localHasModify) {
                    await this.mergeData(localItems, cloudData);
                } else if (cloudHasUpdate) {
                    await this.downloadFromCloud(cloudData);
                } else if (localHasModify) {
                    await this.uploadToCloud(cloudData);
                } else {
                    // 两边都没变化 - 但仍需同步备忘录
                    if (cloudData?.data?.memo !== undefined) {
                        const localMemo = SafeStorage.get('office_memo_content') || '';
                        const cloudMemo = cloudData.data.memo;
                        if (cloudMemo !== localMemo) {
                            SafeStorage.set('office_memo_content', cloudMemo);
                            document.dispatchEvent(new CustomEvent('memoSynced', { 
                                detail: { content: cloudMemo } 
                            }));
                        }
                    }
                    // 同步网站
                    if (cloudData?.data?.links !== undefined) {
                        const localLinks = SafeStorage.get('office_links') || '';
                        const cloudLinks = cloudData.data.links;
                        if (cloudLinks !== localLinks) {
                            SafeStorage.set('office_links', cloudLinks);
                            document.dispatchEvent(new CustomEvent('linksSynced', { 
                                detail: { links: safeJsonParse(cloudLinks, []) } 
                            }));
                        }
                    }
                    // 同步日程
                    if (cloudData?.data?.schedule !== undefined) {
                        const localSchedule = SafeStorage.get('office_schedule_content') || '';
                        const cloudSchedule = cloudData.data.schedule;
                        if (cloudSchedule !== localSchedule) {
                            SafeStorage.set('office_schedule_content', cloudSchedule);
                            document.dispatchEvent(new CustomEvent('scheduleSynced', { 
                                detail: { content: cloudSchedule } 
                            }));
                        }
                    }
                }
            }

        } catch (error) {
            console.error('智能同步失败:', error);
            document.dispatchEvent(new CustomEvent('syncError', {
                detail: { source: 'smartSync', message: '同步失败，请检查网络连接' }
            }));
        }

        this.isSyncing = false;
    }

    /**
     * 上传本地数据到云端
     */
    async uploadToCloud(existingCloudData = null) {


        try {
            const allItems = await db.getAllItems();
            
            // 空数据保护：如果本地事项为空但云端可能有数据，先检查云端
            if (allItems.length === 0) {
                let cloudRow = existingCloudData;
                if (!cloudRow) {
                    const { data } = await this.supabase
                        .from('user_data')
                        .select('data')
                        .eq('user_id', this.currentUser.id)
                        .maybeSingle();
                    cloudRow = data;
                }
                const cloudItemCount = cloudRow?.data?.items?.length || 0;
                if (cloudItemCount > 0) {
                    console.warn('本地数据为空但云端有 ' + cloudItemCount + ' 条事项，跳过上传防止覆盖');
                    await this.downloadFromCloud(cloudRow);
                    return { success: true, itemCount: cloudItemCount, recovered: true };
                }
            }
            
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
                memo: SafeStorage.get('office_memo_content') || '',
                schedule: SafeStorage.get('office_schedule_content') || '',
                links: SafeStorage.get('office_links') || '',
                contacts: SafeStorage.get('office_contacts') || '',
                countdownEvents: SafeStorage.get('office_countdown_events') || '[]',
                countdownTypeColors: SafeStorage.get('office_countdown_type_colors') || '{}',
                countdownSortOrder: SafeStorage.get('office_countdown_sort_order') || '[]',
                device_info: navigator.userAgent
            };

            const { data: upsertResult, error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.currentUser.id,
                    data: syncData,
                    updated_at: syncTime
                }, { onConflict: 'user_id' })
                .select('updated_at')
                .maybeSingle();

            if (error) {
                console.error('上传失败:', error);
                return { success: false, error: error.message };
            }

            // 使用云端实际返回的 updated_at（触发器会用 NOW() 覆盖）
            const actualSyncTime = upsertResult?.updated_at || syncTime;
            this.lastCloudSyncTime = actualSyncTime;
            SafeStorage.set('lastCloudSyncTime', actualSyncTime);
            

            return { success: true, itemCount: allItems.length };

        } catch (error) {
            console.error('上传异常:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 从云端下载数据
     */
    async downloadFromCloud(cloudData) {


        try {
            // 同步设置
            if (cloudData.data.settings) {
                const settings = cloudData.data.settings;
                if (settings.kimi_api_key) {
                    await db.setSetting('kimi_api_key', settings.kimi_api_key);
                    SafeStorage.set('kimiApiKey', settings.kimi_api_key);
                }
                if (settings.kimi_api_key_set) {
                    await db.setSetting('kimi_api_key_set', settings.kimi_api_key_set);
                }
                if (settings.deepseek_api_key) {
                    await db.setSetting('deepseek_api_key', settings.deepseek_api_key);
                    SafeStorage.set('deepseekApiKey', settings.deepseek_api_key);
                }
                if (settings.deepseek_api_key_set) {
                    await db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set);
                }
            }

            // 同步备忘录
            if (cloudData.data.memo !== undefined) {
                SafeStorage.set('office_memo_content', cloudData.data.memo);
                document.dispatchEvent(new CustomEvent('memoSynced', { 
                    detail: { content: cloudData.data.memo } 
                }));
            }

            // 同步日程
            if (cloudData.data.schedule !== undefined) {
                SafeStorage.set('office_schedule_content', cloudData.data.schedule);
                document.dispatchEvent(new CustomEvent('scheduleSynced', { 
                    detail: { content: cloudData.data.schedule } 
                }));
            }

            // 同步网站
            if (cloudData.data.links !== undefined) {
                SafeStorage.set('office_links', cloudData.data.links);
                document.dispatchEvent(new CustomEvent('linksSynced', {
                    detail: { links: safeJsonParse(cloudData.data.links, []) }
                }));
            }

            // 同步通讯录
            if (cloudData.data.contacts !== undefined) {
                SafeStorage.set('office_contacts', cloudData.data.contacts);
                document.dispatchEvent(new CustomEvent('contactsSynced', {
                    detail: { contacts: safeJsonParse(cloudData.data.contacts, []) }
                }));
            }

            if (cloudData.data.countdownEvents !== undefined) {
                SafeStorage.set('office_countdown_events', cloudData.data.countdownEvents || '[]');
            }

            if (cloudData.data.countdownTypeColors !== undefined) {
                SafeStorage.set('office_countdown_type_colors', cloudData.data.countdownTypeColors || '{}');
            }

            if (cloudData.data.countdownSortOrder !== undefined) {
                SafeStorage.set('office_countdown_sort_order', cloudData.data.countdownSortOrder || '[]');
            }

            document.dispatchEvent(new CustomEvent('countdownSynced', {
                detail: {
                    events: safeJsonParse(cloudData.data.countdownEvents || '[]', []),
                    colors: safeJsonParse(cloudData.data.countdownTypeColors || '{}', {}),
                    sortOrder: safeJsonParse(cloudData.data.countdownSortOrder || '[]', [])
                }
            }));

            // 同步事项（带去重）
            const cloudItems = cloudData.data.items || [];
            // 调试：打印下载的数据的order值

            const deduplicatedItems = this.deduplicateItems(cloudItems);
            
            // 安全替换：先备份，再清空+导入，失败则回滚
            const backupItems = await db.getAllItems();
            try {
                await db.clearAllItems();
            } catch (clearErr) {
                console.error('清空本地数据失败，中止下载:', clearErr);
                return { success: false, error: '清空失败' };
            }
            
            let importedCount = 0;
            const importErrors = [];
            for (const item of deduplicatedItems) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入失败:', e);
                    importErrors.push(e);
                }
            }
            
            // 如果全部导入失败且本地有备份数据，回滚
            if (importedCount === 0 && backupItems.length > 0 && importErrors.length > 0) {
                console.warn('全部导入失败，回滚到本地备份数据');
                for (const item of backupItems) {
                    try {
                        const { id, ...itemData } = item;
                        await db.addItem(itemData);
                    } catch (rollbackErr) {
                        console.error('回滚失败:', rollbackErr);
                    }
                }
                return { success: false, error: '导入失败，已回滚' };
            }

            // 更新同步时间
            if (cloudData.updated_at) {
                this.lastCloudSyncTime = cloudData.updated_at;
                SafeStorage.set('lastCloudSyncTime', cloudData.updated_at);
            }



            // 通知应用刷新
            const event = new CustomEvent('syncDataLoaded', {
                detail: { itemCount: importedCount }
            });
            document.dispatchEvent(event);

            return { success: true, itemCount: importedCount };

        } catch (error) {
            console.error('下载异常:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 智能合并本地和云端数据
     */
    async mergeData(localItems, cloudData) {

        const cloudItems = cloudData.data.items || [];


        try {
            // 创建合并后的数据
            const mergedMap = new Map();
            
            // 先添加云端数据
            for (const item of cloudItems) {
                const key = this.getItemKey(item);
                mergedMap.set(key, { ...item, source: 'cloud' });
            }
            
            // 再合并本地数据
            for (const item of localItems) {
                const key = this.getItemKey(item);
                if (mergedMap.has(key)) {
                    const existing = mergedMap.get(key);
                    // 合并参会人员（如果是会议）
                    if (item.type === 'meeting' && existing.type === 'meeting') {
                        const mergedAttendees = [...new Set([
                            ...(existing.attendees || []),
                            ...(item.attendees || [])
                        ])];
                        existing.attendees = mergedAttendees;
                    }
                    // 保留本地的新修改
                    if (item.updatedAt && (!existing.updatedAt || item.updatedAt > existing.updatedAt)) {
                        mergedMap.set(key, { ...item, source: 'local' });
                    }
                } else {
                    mergedMap.set(key, { ...item, source: 'local' });
                }
            }

            const mergedItems = Array.from(mergedMap.values());


            // 保存合并后的数据（安全替换：失败回滚）
            const backupItems = localItems.slice();
            try {
                await db.clearAllItems();
            } catch (clearErr) {
                console.error('清空本地数据失败，中止合并:', clearErr);
                return { success: false, error: '清空失败' };
            }
            let savedCount = 0;
            const saveErrors = [];
            for (const item of mergedItems) {
                try {
                    const { id, source, ...itemData } = item;
                    await db.addItem(itemData);
                    savedCount++;
                } catch (e) {
                    console.warn('保存失败:', e);
                    saveErrors.push(e);
                }
            }
            if (savedCount === 0 && backupItems.length > 0 && saveErrors.length > 0) {
                console.warn('合并后全部保存失败，回滚到本地数据');
                for (const item of backupItems) {
                    try {
                        const { id, ...itemData } = item;
                        await db.addItem(itemData);
                    } catch (rollbackErr) {
                        console.error('回滚失败:', rollbackErr);
                    }
                }
                return { success: false, error: '合并保存失败，已回滚' };
            }

            // 同步备忘录（云端优先）
            if (cloudData.data.memo !== undefined) {
                const cloudMemo = cloudData.data.memo;
                const localMemo = SafeStorage.get('office_memo_content') || '';
                if (cloudMemo !== localMemo) {

                    SafeStorage.set('office_memo_content', cloudMemo);
                    document.dispatchEvent(new CustomEvent('memoSynced', { 
                        detail: { content: cloudMemo } 
                    }));
                }
            }

            // 同步日程（云端优先）
            if (cloudData.data.schedule !== undefined) {
                const cloudSchedule = cloudData.data.schedule;
                const localSchedule = SafeStorage.get('office_schedule_content') || '';
                if (cloudSchedule !== localSchedule) {
                    SafeStorage.set('office_schedule_content', cloudSchedule);
                    document.dispatchEvent(new CustomEvent('scheduleSynced', { 
                        detail: { content: cloudSchedule } 
                    }));
                }
            }

            // 同步网站（云端优先）
            if (cloudData.data.links !== undefined) {
                const cloudLinks = cloudData.data.links;
                const localLinks = SafeStorage.get('office_links') || '';
                if (cloudLinks !== localLinks) {

                    SafeStorage.set('office_links', cloudLinks);
                    document.dispatchEvent(new CustomEvent('linksSynced', {
                        detail: { links: safeJsonParse(cloudLinks, []) }
                    }));
                }
            }

            // 同步通讯录（云端优先）
            if (cloudData.data.contacts !== undefined) {
                const cloudContacts = cloudData.data.contacts;
                const localContacts = SafeStorage.get('office_contacts') || '';
                if (cloudContacts !== localContacts) {

                    SafeStorage.set('office_contacts', cloudContacts);
                    document.dispatchEvent(new CustomEvent('contactsSynced', {
                        detail: { contacts: safeJsonParse(cloudContacts, []) }
                    }));
                }
            }

            if (cloudData.data.countdownEvents !== undefined) {
                const cloudCountdownEvents = cloudData.data.countdownEvents || '[]';
                const localCountdownEvents = SafeStorage.get('office_countdown_events') || '[]';
                if (cloudCountdownEvents !== localCountdownEvents) {
                    SafeStorage.set('office_countdown_events', cloudCountdownEvents);
                }
            }

            if (cloudData.data.countdownTypeColors !== undefined) {
                const cloudCountdownTypeColors = cloudData.data.countdownTypeColors || '{}';
                const localCountdownTypeColors = SafeStorage.get('office_countdown_type_colors') || '{}';
                if (cloudCountdownTypeColors !== localCountdownTypeColors) {
                    SafeStorage.set('office_countdown_type_colors', cloudCountdownTypeColors);
                }
            }

            if (cloudData.data.countdownSortOrder !== undefined) {
                const cloudCountdownSortOrder = cloudData.data.countdownSortOrder || '[]';
                const localCountdownSortOrder = SafeStorage.get('office_countdown_sort_order') || '[]';
                if (cloudCountdownSortOrder !== localCountdownSortOrder) {
                    SafeStorage.set('office_countdown_sort_order', cloudCountdownSortOrder);
                }
            }

            document.dispatchEvent(new CustomEvent('countdownSynced', {
                detail: {
                    events: safeJsonParse(cloudData.data.countdownEvents || '[]', []),
                    colors: safeJsonParse(cloudData.data.countdownTypeColors || '{}', {}),
                    sortOrder: safeJsonParse(cloudData.data.countdownSortOrder || '[]', [])
                }
            }));

            // 上传合并后的数据到云端
            await this.uploadToCloud(cloudData);

            // 通知应用刷新
            const event = new CustomEvent('syncDataLoaded', {
                detail: { itemCount: mergedItems.length }
            });
            document.dispatchEvent(event);

            return { success: true, itemCount: mergedItems.length };

        } catch (error) {
            console.error('合并失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取事项的唯一标识键
     */
    getItemKey(item) {
        const title = (item.title || '').trim().toLowerCase();
        const extractKeywords = (t) => {
            return t.replace(/会议|研究|工作|座谈|讨论|调研|培训|学习|协调|推进|落实/g, '').trim();
        };

        if (item.type === 'meeting') {
            const keywords = extractKeywords(title);
            return `meeting:${keywords}:${item.date || ''}`;
        } else if (item.type === 'todo') {
            return `todo:${title}:${item.deadline || ''}`;
        } else if (item.type === 'document') {
            return `doc:${item.docNumber || title}`;
        }
        return `${item.type}:${title}`;
    }

    /**
     * 对事项列表去重
     */
    deduplicateItems(items) {
        const result = [];
        const seen = new Map();

        for (const item of items) {
            const key = this.getItemKey(item);
            
            if (seen.has(key)) {
                const existing = seen.get(key);
                if (item.type === 'meeting' && item.attendees && existing.attendees) {
                    existing.attendees = [...new Set([...existing.attendees, ...item.attendees])];
                }
                continue;
            }
            
            seen.set(key, item);
            result.push(item);
        }

        return result;
    }

    /**
     * 立即同步到云端（本地修改后调用）
     */
    async immediateSyncToCloud() {
        if (!this.supabase || !this.currentUser) {
            console.warn('未登录，跳过同步');
            return { success: false };
        }

        if (!this.isOnline()) {
            console.warn('离线状态，跳过同步');
            return { success: false, offline: true };
        }

        // 记录本地修改时间
        this.recordLocalModify();

        // 清除防抖定时器
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }

        return await this.uploadToCloud();
    }

    /**
     * 启动定时同步
     */
    startPeriodicSync() {
        if (this.periodicSyncTimer) {
            clearInterval(this.periodicSyncTimer);
        }

        // 每10分钟检查一次
        this.periodicSyncTimer = setInterval(async () => {
            if (this.isLoggedIn() && !this.isSyncing) {

                await this.smartSync();
            }
        }, 600000);


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
                async (payload) => {

                    // 收到其他设备的更新通知，执行智能同步
                    if (payload.eventType === 'UPDATE' && !this.isSyncing) {
                        await this.smartSync();
                    }
                }
            )
            .subscribe((status) => {

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
     * 静默从云端同步（无进度提示，用于实时更新）
     */
    async silentSyncFromCloud() {
        if (!this.supabase || !this.currentUser) {
            return { success: false };
        }

        if (!this.isOnline()) {
            return { success: false, offline: true };
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
                    SafeStorage.set('kimiApiKey', settings.kimi_api_key);
                }
                if (settings.kimi_api_key_set) {
                    await db.setSetting('kimi_api_key_set', settings.kimi_api_key_set);
                }
                if (settings.deepseek_api_key) {
                    await db.setSetting('deepseek_api_key', settings.deepseek_api_key);
                    SafeStorage.set('deepseekApiKey', settings.deepseek_api_key);
                }
                if (settings.deepseek_api_key_set) {
                    await db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set);
                }
            }

            // 同步备忘录
            if (data.data.memo !== undefined) {
                SafeStorage.set('office_memo_content', data.data.memo);
                document.dispatchEvent(new CustomEvent('memoSynced', { 
                    detail: { content: data.data.memo } 
                }));
            }

            // 同步日程
            if (data.data.schedule !== undefined) {
                SafeStorage.set('office_schedule_content', data.data.schedule);
                document.dispatchEvent(new CustomEvent('scheduleSynced', { 
                    detail: { content: data.data.schedule } 
                }));
            }

            // 同步网站
            if (data.data.links !== undefined) {
                SafeStorage.set('office_links', data.data.links);
                document.dispatchEvent(new CustomEvent('linksSynced', {
                    detail: { links: safeJsonParse(data.data.links, []) }
                }));
            }

            // 同步通讯录
            if (data.data.contacts !== undefined) {
                SafeStorage.set('office_contacts', data.data.contacts);
                document.dispatchEvent(new CustomEvent('contactsSynced', {
                    detail: { contacts: safeJsonParse(data.data.contacts, []) }
                }));
            }

            if (data.data.countdownEvents !== undefined) {
                SafeStorage.set('office_countdown_events', data.data.countdownEvents || '[]');
            }

            if (data.data.countdownTypeColors !== undefined) {
                SafeStorage.set('office_countdown_type_colors', data.data.countdownTypeColors || '{}');
            }

            document.dispatchEvent(new CustomEvent('countdownSynced', {
                detail: {
                    events: safeJsonParse(data.data.countdownEvents || '[]', []),
                    colors: safeJsonParse(data.data.countdownTypeColors || '{}', {})
                }
            }));

            // 同步事项 - 带去重逻辑（安全替换：失败回滚）
            const cloudItems = data.data.items || [];
            
            const deduplicatedCloudItems = this.deduplicateItems(cloudItems);

            const backupItems = await db.getAllItems();
            try {
                await db.clearAllItems();
            } catch (clearErr) {
                console.error('静默同步清空失败:', clearErr);
                return { success: false };
            }

            let importedCount = 0;
            const importErrors = [];
            for (const item of deduplicatedCloudItems) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入项目失败:', e);
                    importErrors.push(e);
                }
            }

            if (importedCount === 0 && backupItems.length > 0 && importErrors.length > 0) {
                console.warn('静默同步全部导入失败，回滚到本地数据');
                for (const item of backupItems) {
                    try {
                        const { id, ...itemData } = item;
                        await db.addItem(itemData);
                    } catch (rollbackErr) {
                        console.error('回滚失败:', rollbackErr);
                    }
                }
                return { success: false };
            }

            // 更新云端同步时间
            if (data.updated_at) {
                this.lastCloudSyncTime = data.updated_at;
            }


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
        await this.waitForInit();
        if (!username || username.length < 2) {
            throw new Error('用户名至少需要2个字符');
        }
        if (!password || password.length < 6) {
            throw new Error('密码至少需要6个字符');
        }

        if (!this.isOnline()) {
            throw new Error('网络不可用，请检查网络连接后重试');
        }

        if (!this.isSupabaseReady()) {
            throw new Error('网络服务不可用，请检查网络连接后刷新页面重试');
        }

        const email = `${username}@office.local`;


        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });



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
        if (!username || !password) {
            throw new Error('请输入用户名和密码');
        }

        if (!this.isOnline()) {
            throw new Error('网络不可用，请检查网络连接后重试');
        }

        // 检查Supabase库是否加载
        if (typeof window.supabase === 'undefined') {
            throw new Error('网络服务未加载，请刷新页面重试。');
        }

        // 等待初始化完成
        await this.waitForInit();

        if (!this.isSupabaseReady()) {
            const errorMsg = this.initError || '网络服务初始化失败，请刷新页面重试。';
            throw new Error(errorMsg);
        }

        const email = `${username}@office.local`;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });


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
            this.updateLoginUI();

            // 执行智能同步
            await this.smartSync();

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
        await this.waitForInit();

        if (!username || !oldPassword || !newPassword) {
            throw new Error('请填写完整信息');
        }

        if (newPassword.length < 6) {
            throw new Error('新密码至少需要6位');
        }

        if (!this.isOnline()) {
            throw new Error('网络不可用，请检查网络连接后重试');
        }

        if (!this.isSupabaseReady()) {
            throw new Error('网络服务不可用，请检查网络连接后刷新页面重试');
        }

        const email = `${username}@office.local`;

        try {
            // 1. 先验证原密码（尝试登录）
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

        if (!this.isOnline()) {
            return { success: false, message: '网络不可用，请检查网络连接', offline: true };
        }

        try {
            if (progressCallback) progressCallback('正在准备数据...');
            const allItems = await db.getAllItems();

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
                memo: SafeStorage.get('office_memo_content') || '',
                schedule: SafeStorage.get('office_schedule_content') || '',
                links: SafeStorage.get('office_links') || '',
                contacts: SafeStorage.get('office_contacts') || '',
                countdownEvents: SafeStorage.get('office_countdown_events') || '[]',
                countdownTypeColors: SafeStorage.get('office_countdown_type_colors') || '{}',
                countdownSortOrder: SafeStorage.get('office_countdown_sort_order') || '[]',
                device_info: navigator.userAgent
            };
            if (progressCallback) progressCallback('正在上传到云端...');

            const upsertData = {
                user_id: this.currentUser.id,
                data: syncData,
                updated_at: new Date().toISOString()
            };
            const { data, error } = await this.supabase
                .from('user_data')
                .upsert(upsertData, { onConflict: 'user_id' })
                .select();

            if (error) {
                console.error('上传失败:', error);
                throw error;
            }

            this.lastSyncTime = new Date().toISOString();
            SafeStorage.set('lastSyncTime', this.lastSyncTime);
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

        if (!this.isOnline()) {
            return { success: false, message: '网络不可用，请检查网络连接', offline: true };
        }

        try {
            if (progressCallback) progressCallback('正在从云端获取数据...');

            // 查询当前用户数据
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (error) {
                console.error('查询失败:', error);
                throw error;
            }

            if (!data) {

                return { success: true, message: '云端暂无数据', itemCount: 0 };
            }

            if (!data.data) {

                return { success: true, message: '云端数据为空', itemCount: 0 };
            }

            if (progressCallback) progressCallback('正在合并数据...');

            // 同步设置数据（API Key等）
            if (data.data.settings) {
                const settings = data.data.settings;
                if (settings.kimi_api_key) {
                    await db.setSetting('kimi_api_key', settings.kimi_api_key);
                    SafeStorage.set('kimiApiKey', settings.kimi_api_key);
                }
                if (settings.kimi_api_key_set) {
                    await db.setSetting('kimi_api_key_set', settings.kimi_api_key_set);
                }
                if (settings.deepseek_api_key) {
                    await db.setSetting('deepseek_api_key', settings.deepseek_api_key);
                    SafeStorage.set('deepseekApiKey', settings.deepseek_api_key);
                }
                if (settings.deepseek_api_key_set) {
                    await db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set);
                }

            }

            // 同步备忘录
            if (data.data.memo !== undefined) {
                SafeStorage.set('office_memo_content', data.data.memo);
                document.dispatchEvent(new CustomEvent('memoSynced', { 
                    detail: { content: data.data.memo } 
                }));

            }

            // 同步日程
            if (data.data.schedule !== undefined) {
                SafeStorage.set('office_schedule_content', data.data.schedule);
                document.dispatchEvent(new CustomEvent('scheduleSynced', { 
                    detail: { content: data.data.schedule } 
                }));
            }

            // 同步网站
            if (data.data.links !== undefined) {
                SafeStorage.set('office_links', data.data.links);
                document.dispatchEvent(new CustomEvent('linksSynced', {
                    detail: { links: safeJsonParse(data.data.links, []) }
                }));

            }

            // 同步通讯录
            if (data.data.contacts !== undefined) {
                SafeStorage.set('office_contacts', data.data.contacts);
                document.dispatchEvent(new CustomEvent('contactsSynced', {
                    detail: { contacts: safeJsonParse(data.data.contacts, []) }
                }));

            }

            // 同步倒数日
            if (data.data.countdownEvents !== undefined) {
                SafeStorage.set('office_countdown_events', data.data.countdownEvents || '[]');
            }

            if (data.data.countdownTypeColors !== undefined) {
                SafeStorage.set('office_countdown_type_colors', data.data.countdownTypeColors || '{}');
            }

            if (data.data.countdownSortOrder !== undefined) {
                SafeStorage.set('office_countdown_sort_order', data.data.countdownSortOrder || '[]');
            }

            document.dispatchEvent(new CustomEvent('countdownSynced', {
                detail: {
                    events: safeJsonParse(data.data.countdownEvents || '[]', []),
                    colors: safeJsonParse(data.data.countdownTypeColors || '{}', {}),
                    sortOrder: safeJsonParse(data.data.countdownSortOrder || '[]', [])
                }
            }));

            // 同步事项数据
            const cloudItems = data.data.items || [];


            // 先对云端数据本身去重
            const deduplicatedCloudItems = this.deduplicateItems(cloudItems);

            let replaceBackup = [];
            if (mergeStrategy === 'replace') {
                replaceBackup = await db.getAllItems();
                try {
                    await db.clearAllItems();
                } catch (clearErr) {
                    console.error('清空本地数据失败:', clearErr);
                    return { success: false, message: '清空本地数据失败' };
                }
            }

            // 获取本地已有数据（用于与云端数据去重）
            const localItems = mergeStrategy !== 'replace' ? await db.getAllItems() : [];
            
            let importedCount = 0;
            let mergedCount = 0;
            let skippedCount = 0;
            const importErrors = [];
            
            for (const item of deduplicatedCloudItems) {
                try {
                    const { id, ...itemData } = item;
                    
                    if (mergeStrategy !== 'replace' && localItems.length > 0) {
                        const duplicateInfo = this.checkDuplicateWithLocal(item, localItems);
                        
                        if (duplicateInfo.isDuplicate) {
                            if (item.type === 'meeting' && duplicateInfo.existingItem) {
                                const existing = duplicateInfo.existingItem;
                                const cloudAttendees = item.attendees || [];
                                const localAttendees = existing.attendees || [];
                                const mergedAttendees = [...new Set([...localAttendees, ...cloudAttendees])];
                                
                                if (mergedAttendees.length > localAttendees.length) {
                                    await db.updateItem(existing.id, { attendees: mergedAttendees });
                                    mergedCount++;

                                }
                            } else {
                                skippedCount++;

                            }
                            continue;
                        }
                    }
                    
                    await db.addItem(itemData);
                    importedCount++;
                } catch (e) {
                    console.warn('导入项目失败:', e);
                    importErrors.push(e);
                }
            }

            if (mergeStrategy === 'replace' && importedCount === 0 && replaceBackup.length > 0 && importErrors.length > 0) {
                console.warn('replace模式全部导入失败，回滚到本地数据');
                for (const item of replaceBackup) {
                    try {
                        const { id, ...itemData } = item;
                        await db.addItem(itemData);
                    } catch (rollbackErr) {
                        console.error('回滚失败:', rollbackErr);
                    }
                }
                return { success: false, message: '导入失败，已回滚到本地数据' };
            }

            this.lastSyncTime = new Date().toISOString();
            SafeStorage.set('lastSyncTime', this.lastSyncTime);
            if (progressCallback) progressCallback('同步完成');
            
            let message = `从云端同步了 ${importedCount} 个事项`;
            if (mergedCount > 0) message += `，合并了 ${mergedCount} 个会议的参会人员`;
            if (skippedCount > 0) message += `，跳过了 ${skippedCount} 个重复事项`;
            
            return { success: true, message, itemCount: importedCount, mergedCount, skippedCount };
        } catch (error) {
            console.error('从云端同步失败:', error);
            return { success: false, message: '同步失败: ' + error.message };
        }
    }

    /**
     * 检查云端事项是否与本地数据重复
     */
    checkDuplicateWithLocal(cloudItem, localItems) {
        const cloudTitle = (cloudItem.title || '').trim().toLowerCase();
        const result = { isDuplicate: false, existingItem: null };

        // 提取关键词
        const extractKeywords = (t) => {
            return t.replace(/会议|研究|工作|座谈|讨论|调研|培训|学习/g, '').trim();
        };

        for (const local of localItems) {
            if (local.type !== cloudItem.type) continue;

            const localTitle = (local.title || '').trim().toLowerCase();

            if (cloudItem.type === 'meeting') {
                const cloudKeywords = extractKeywords(cloudTitle);
                const localKeywords = extractKeywords(localTitle);
                
                // 关键词匹配 + 同一天 = 重复
                const keywordMatch = cloudKeywords === localKeywords ||
                                     cloudKeywords.includes(localKeywords) ||
                                     localKeywords.includes(cloudKeywords) ||
                                     (cloudTitle.length > 2 && localTitle.length > 2 &&
                                      (cloudTitle.includes(localTitle) || localTitle.includes(cloudTitle)));

                if (keywordMatch && local.date === cloudItem.date) {
                    return { isDuplicate: true, existingItem: local };
                }
            } else if (cloudItem.type === 'todo') {
                const titleMatch = cloudTitle === localTitle ||
                                   cloudTitle.includes(localTitle) ||
                                   localTitle.includes(cloudTitle);
                if (titleMatch && local.deadline === cloudItem.deadline) {
                    return { isDuplicate: true, existingItem: local };
                }
            } else if (cloudItem.type === 'document') {
                if (cloudItem.docNumber && local.docNumber === cloudItem.docNumber) {
                    return { isDuplicate: true, existingItem: local };
                }
                if (cloudTitle === localTitle && cloudTitle.length > 3) {
                    return { isDuplicate: true, existingItem: local };
                }
            }
        }

        return result;
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
