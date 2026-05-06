/**
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
        this.realtimeReconnectTimer = null;
        this.realtimeReconnectAttempts = 0;
        this.lifecycleHandlersBound = false;

        // 同步状态追踪
        this.lastLocalModifyTime = SafeStorage.get('lastLocalModifyTime') || null;  // 本地最后修改时间
        this.lastCloudSyncTime = SafeStorage.get('lastCloudSyncTime') || null;  // 最后成功同步到云端的时间
        this.isSyncing = false;  // 是否正在同步中
        this._offlineNotified = false;
        this.deletedItemsKey = 'office_deleted_items_map';
        this.deletedItemsMap = safeJsonParse(SafeStorage.get(this.deletedItemsKey), {});
        this._deletedItemsMaxAge = 30 * 24 * 60 * 60 * 1000;
        this._deletedItemsMaxCount = 500;
        this._cleanupDeletedItemsMap();

        // 初始化Supabase（事件驱动，不再轮询等待）
        this.initPromise = this._waitForSupabaseLib().then(() => this._doInitSupabase());
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

    persistDeletedItemsMap() {
        SafeStorage.set(this.deletedItemsKey, JSON.stringify(this.deletedItemsMap || {}));
    }

    async _restoreSettingsFromCloud(settings) {
        if (!settings) return;
        const settingWrites = [];
        if (settings.kimi_api_key_encrypted) { settingWrites.push(db.setSetting('kimi_api_key_encrypted', settings.kimi_api_key_encrypted)); }
        if (settings.kimi_api_key_set) { settingWrites.push(db.setSetting('kimi_api_key_set', settings.kimi_api_key_set)); }
        if (settings.kimi_api_key) { settingWrites.push(db.setSetting('kimi_api_key', null)); }
        if (settings.deepseek_api_key_encrypted) { settingWrites.push(db.setSetting('deepseek_api_key_encrypted', settings.deepseek_api_key_encrypted)); }
        if (settings.deepseek_api_key_set) { settingWrites.push(db.setSetting('deepseek_api_key_set', settings.deepseek_api_key_set)); }
        if (settings.deepseek_api_key) { settingWrites.push(db.setSetting('deepseek_api_key', null)); }
        if (settings.qweather_api_key_encrypted) {
            settingWrites.push(db.setSetting('qweather_api_key_encrypted', settings.qweather_api_key_encrypted));
            SafeStorage.set('qweatherApiKeyEncrypted', settings.qweather_api_key_encrypted);
        }
        if (typeof settings.qweather_api_key_set !== 'undefined') {
            settingWrites.push(db.setSetting('qweather_api_key_set', settings.qweather_api_key_set));
            SafeStorage.set('qweatherApiKeySet', settings.qweather_api_key_set);
        }
        if (settings.crypto_master_key) {
            SafeStorage.set('crypto_master_key', settings.crypto_master_key);
            settingWrites.push(db.setSetting('crypto_master_key', settings.crypto_master_key));
        }
        if (settingWrites.length > 0) await Promise.all(settingWrites);
        if (typeof ocrManager !== 'undefined' && typeof ocrManager.loadApiKeysFromDB === 'function') {
            await ocrManager.loadApiKeysFromDB();
            if (typeof app !== 'undefined' && typeof app.updateApiKeyStatus === 'function') { app.updateApiKeyStatus(); }
        }
    }

    _cleanupDeletedItemsMap() {
        if (!this.deletedItemsMap || typeof this.deletedItemsMap !== 'object') return;
        const now = Date.now();
        let changed = false;
        const entries = Object.entries(this.deletedItemsMap);
        for (const [key, ts] of entries) {
            const ms = new Date(ts).getTime();
            if (!Number.isFinite(ms) || (now - ms) > this._deletedItemsMaxAge) {
                delete this.deletedItemsMap[key];
                changed = true;
            }
        }
        if (entries.length > this._deletedItemsMaxCount) {
            const sorted = Object.entries(this.deletedItemsMap).sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime());
            const excess = sorted.length - this._deletedItemsMaxCount;
            for (let i = 0; i < excess; i++) {
                delete this.deletedItemsMap[sorted[i][0]];
            }
            changed = true;
        }
        if (changed) this.persistDeletedItemsMap();
    }

    getItemDeletionKey(item) {
        if (!item) return '';
        return `key:${this.getItemKey(item)}`;
    }

    markItemDeleted(item, deletedAt = new Date().toISOString()) {
        const deletionKey = this.getItemDeletionKey(item);
        if (!deletionKey) return;
        this.deletedItemsMap[deletionKey] = deletedAt;
        this.persistDeletedItemsMap();
    }

    getDeletedAt(item) {
        const deletionKey = this.getItemDeletionKey(item);
        if (!deletionKey) return '';
        return this.deletedItemsMap[deletionKey] || '';
    }

    clearDeletedMarker(item) {
        const deletionKey = this.getItemDeletionKey(item);
        if (!deletionKey || !this.deletedItemsMap[deletionKey]) return;
        delete this.deletedItemsMap[deletionKey];
        this.persistDeletedItemsMap();
    }

    shouldKeepDeleted(item, deletedAt = '') {
        const deletionTime = this.getTimeMs(deletedAt || this.getDeletedAt(item));
        if (!deletionTime) return false;
        const itemTime = this.getItemUpdatedTime(item);
        return deletionTime >= itemTime;
    }

    getTimeMs(value) {
        if (!value) return 0;
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? ms : 0;
    }

    getItemUpdatedTime(item) {
        if (!item) return 0;
        return this.getTimeMs(item.updatedAt || item.createdAt);
    }

    findMatchingItem(items, targetItem) {
        if (!Array.isArray(items) || !targetItem) {
            return null;
        }

        const targetKey = this.getItemKey(targetItem);

        return items.find(item => {
            if (!item) return false;
            return this.getItemKey(item) === targetKey;
        }) || null;
    }

    buildReconciledItems(localItems, cloudItems, baselineTime = 0) {
        const normalizedLocalItems = Array.isArray(localItems) ? localItems : [];
        const normalizedCloudItems = Array.isArray(cloudItems) ? cloudItems : [];
        const reconciledItems = [];
        const matchedLocalKeys = new Set();

        const localKeyMap = new Map();
        for (const li of normalizedLocalItems) {
            const k = this.getItemKey(li);
            if (!localKeyMap.has(k)) localKeyMap.set(k, li);
        }

        for (const cloudItem of normalizedCloudItems) {
            const cloudKey = this.getItemKey(cloudItem);
            if (this.shouldKeepDeleted(cloudItem)) {
                continue;
            }

            const localMatch = localKeyMap.get(cloudKey) || null;
            if (!localMatch) {
                reconciledItems.push({ ...cloudItem });
                matchedLocalKeys.add(cloudKey);
                continue;
            }

            matchedLocalKeys.add(cloudKey);
            const localTime = this.getItemUpdatedTime(localMatch);
            const cloudTime = this.getItemUpdatedTime(cloudItem);
            const winner = localTime > cloudTime ? { ...localMatch } : { ...cloudItem };

            if (this.shouldKeepDeleted(winner)) {
                continue;
            }

            reconciledItems.push(winner);
        }

        for (const localItem of normalizedLocalItems) {
            const localKey = this.getItemKey(localItem);
            if (matchedLocalKeys.has(localKey)) {
                continue;
            }

            if (this.shouldKeepDeleted(localItem)) {
                continue;
            }

            const localTime = this.getItemUpdatedTime(localItem);
            if (!baselineTime || localTime > baselineTime) {
                reconciledItems.push({ ...localItem });
            }
        }

        return this.deduplicateItems(reconciledItems);
    }

    async syncLocalItemsToState(targetItems, currentLocalItems = null) {
        const existingLocalItems = Array.isArray(currentLocalItems) ? currentLocalItems : await db.getAllItems();
        const targetList = Array.isArray(targetItems) ? targetItems.filter(item => !this.shouldKeepDeleted(item)) : [];

        const localKeyMap = new Map();
        for (const li of existingLocalItems) {
            const k = this.getItemKey(li);
            if (!localKeyMap.has(k)) localKeyMap.set(k, li);
        }

        const keptLocalIds = new Set();
        const itemsToPut = [];
        const itemsToAdd = [];

        for (const targetItem of targetList) {
            const localMatch = localKeyMap.get(this.getItemKey(targetItem));
            if (localMatch) {
                itemsToPut.push({ ...targetItem, id: localMatch.id });
                this.clearDeletedMarker(localMatch);
                this.clearDeletedMarker(targetItem);
                keptLocalIds.add(String(localMatch.id));
            } else {
                const { id, ...itemData } = targetItem;
                itemsToAdd.push(itemData);
                this.clearDeletedMarker(targetItem);
            }
        }

        if (itemsToPut.length > 0) {
            await db.batchPutItems(itemsToPut);
            for (const item of itemsToPut) keptLocalIds.add(String(item.id));
        }

        if (itemsToAdd.length > 0) {
            const addedIds = await db.batchAddItems(itemsToAdd);
            for (const aid of addedIds) keptLocalIds.add(String(aid));
        }

        const toDelete = [];
        for (const localItem of existingLocalItems) {
            if (!keptLocalIds.has(String(localItem.id))) {
                this.markItemDeleted(localItem);
                toDelete.push(localItem.id);
            }
        }
        if (toDelete.length > 0) {
            await db.batchDeleteItems(toDelete);
        }
    }

    hasLocalNonItemData() {
        const hasNonEmptyString = (key) => {
            const value = SafeStorage.get(key);
            return typeof value === 'string' && value.trim() !== '';
        };

        const hasNonEmptyJson = (key, fallback) => {
            const raw = SafeStorage.get(key);
            if (!raw) {
                return false;
            }
            const parsed = safeJsonParse(raw, fallback);
            if (Array.isArray(parsed)) {
                return parsed.length > 0;
            }
            if (parsed && typeof parsed === 'object') {
                return Object.keys(parsed).length > 0;
            }
            return false;
        };

        return hasNonEmptyString('office_memo_content')
            || hasNonEmptyString('office_schedule_content')
            || hasNonEmptyString('office_links')
            || hasNonEmptyString('office_contacts')
            || hasNonEmptyJson('office_countdown_events', [])
            || hasNonEmptyJson('office_countdown_type_colors', {})
            || hasNonEmptyJson('office_countdown_sort_order', []);
    }

    async buildSyncData(items) {
        const settingKeys = [
            ['kimi_api_key_encrypted', 'kimi_api_key_encrypted'],
            ['kimi_api_key_set', 'kimi_api_key_set'],
            ['deepseek_api_key_encrypted', 'deepseek_api_key_encrypted'],
            ['deepseek_api_key_set', 'deepseek_api_key_set'],
            ['qweather_api_key_encrypted', 'qweather_api_key_encrypted'],
            ['qweather_api_key_set', 'qweather_api_key_set']
        ];

        const settingValues = await Promise.all(
            settingKeys.map(([dbKey]) => db.getSetting(dbKey))
        );

        const settings = {};
        for (let i = 0; i < settingKeys.length; i++) {
            if (settingValues[i]) settings[settingKeys[i][1]] = settingValues[i];
        }

        const cryptoMasterKey = SafeStorage.get('crypto_master_key');
        if (cryptoMasterKey) settings.crypto_master_key = cryptoMasterKey;

        return {
            sync_time: new Date().toISOString(),
            items: Array.isArray(items) ? items : [],
            deletedItems: this.deletedItemsMap || {},
            settings,
            memo: SafeStorage.get('office_memo_content') || '',
            schedule: SafeStorage.get('office_schedule_content') || '',
            links: SafeStorage.get('office_links') || '',
            contacts: SafeStorage.get('office_contacts') || '',
            countdownEvents: SafeStorage.get('office_countdown_events') || '[]',
            countdownTypeColors: SafeStorage.get('office_countdown_type_colors') || '{}',
            countdownSortOrder: SafeStorage.get('office_countdown_sort_order') || '[]',
            device_info: navigator.userAgent
        };
    }

    /**
     * 事件驱动等待 Supabase 库加载，替代轮询
     */
    _waitForSupabaseLib() {
        if (typeof window.supabase !== 'undefined') {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                window.removeEventListener('supabase-loaded', onLoaded);
                clearTimeout(timer);
                resolve();
            };
            const onLoaded = () => done();
            const timer = setTimeout(() => {
                if (!settled && typeof window.supabase === 'undefined') {
                    this.initError = '网络服务未加载，请检查网络连接后刷新页面重试。';
                    console.error(this.initError);
                }
                done();
            }, 20000);
            window.addEventListener('supabase-loaded', onLoaded, { once: true });
        });
    }

    /**
     * 初始化Supabase客户端
     */
    async _doInitSupabase() {
        if (typeof window.supabase === 'undefined') {
            // _waitForSupabaseLib 超时已设置 initError
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
                },
                realtime: {
                    params: {
                        eventsPerSecond: 2
                    },
                    heartbeatIntervalMs: 15000,
                    reconnectAfterMs: (tries) => Math.min(1000 * Math.max(1, tries), 10000)
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
                    this.bindLifecycleSyncHandlers();

                    this.smartSync().catch(e => console.warn('会话同步失败:', e));

                    // 启动定时同步
                    this.startPeriodicSync();

                    // 初始化实时订阅
                    this.initRealtimeSubscription();
                }
            } catch (sessionError) {
                console.warn('会话检查失败:', sessionError);
            }

            this.supabase.auth.onAuthStateChange(async (event, session) => {
                const wasLoggedIn = !!this.currentUser;
                this.currentUser = session?.user || null;
                this.updateLoginUI();

                if (this.currentUser) {
                    this.bindLifecycleSyncHandlers();
                    this.startPeriodicSync();
                    this.initRealtimeSubscription();

                    if (event === 'SIGNED_IN') {
                        this.smartSync().catch(e => console.warn('SIGNED_IN同步失败:', e));
                    } else if (event === 'INITIAL_SESSION') {
                        this.smartSync().catch(e => console.warn('INITIAL_SESSION同步失败:', e));
                    }
                } else if (wasLoggedIn) {
                    this.stopPeriodicSync();
                    this.unsubscribeRealtime();
                    this.clearRealtimeReconnectTimer();
                    this.showSessionExpiredNotice();
                }
            });
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
                if (localItems.length > 0 || this.hasLocalNonItemData()) {
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
                const localSyncData = await this.buildSyncData(localItems);
                const hasLocalSideData = this.hasLocalNonItemData();

                if (localItems.length > 0 || hasLocalSideData) {
                    await this.uploadToCloud(cloudData, localSyncData);
                }
                this.isSyncing = false;
                return;
            }

            // 情况2: 本地无事项数据
            if (localItems.length === 0) {
                const hasLocalSideData = this.hasLocalNonItemData();
                const cloudItems = cloudData.data.items || [];

                // 数据丢失保护：如果本地空且云端也几乎没数据，但历史有过同步，说明数据已丢失
                // 此时不应下载空数据，而应保留云端仅存的数据并警告
                if (cloudItems.length === 0) {
                    console.warn('本地和云端均无事项数据，跳过同步');
                    this.isSyncing = false;
                    return;
                }

                if (hasLocalSideData) {
                    await this.mergeData(localItems, cloudData);
                } else {
                    await this.downloadFromCloud(cloudData);
                }
                this.isSyncing = false;
                return;
            }

            // 情况3: 两边都有数据，需要比较时间
            const cloudItems = cloudData.data.items || [];

            if (cloudData.data.deletedItems && typeof cloudData.data.deletedItems === 'object') {
                this.deletedItemsMap = { ...this.deletedItemsMap, ...cloudData.data.deletedItems };
                this.persistDeletedItemsMap();
            }

            const isFirstSync = !lastSyncTime;

            if (isFirstSync) {
                await this.mergeData(localItems, cloudData);
            } else {
                const cloudHasUpdate = cloudUpdateTime && cloudUpdateTime > lastSyncTime;
                const localHasModify = localModifyTime && localModifyTime > lastSyncTime;
                let needsUIRefresh = false;
                let reconciledItems = null;

                if (cloudHasUpdate || localHasModify) {
                    reconciledItems = this.buildReconciledItems(
                        localItems,
                        cloudItems,
                        this.getTimeMs(this.lastCloudSyncTime)
                    );
                    const localTimeMap = new Map();
                    for (const li of localItems) localTimeMap.set(this.getItemKey(li), this.getItemUpdatedTime(li));
                    const localChanged = reconciledItems.length !== localItems.length
                        || reconciledItems.some(r => {
                            const localTime = localTimeMap.get(this.getItemKey(r));
                            return localTime === undefined || this.getItemUpdatedTime(r) !== localTime;
                        });

                    if (localChanged) {
                        await this.syncLocalItemsToState(reconciledItems, localItems);
                        needsUIRefresh = true;
                    }

                    if (localHasModify) {
                        const reconciledSyncData = await this.buildSyncData(reconciledItems);
                        await this.uploadToCloud(cloudData, reconciledSyncData);
                    } else if (cloudHasUpdate && cloudData.updated_at) {
                        this.lastCloudSyncTime = cloudData.updated_at;
                        SafeStorage.set('lastCloudSyncTime', cloudData.updated_at);
                    }
                }

                if (needsUIRefresh) {
                    document.dispatchEvent(new CustomEvent('syncDataLoaded', {
                        detail: { itemCount: reconciledItems?.length || cloudItems.length }
                    }));
                }

                if (!localHasModify && !needsUIRefresh) {
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

        if (this._pendingRealtimeSync) {
            this._pendingRealtimeSync = false;
            this.silentSyncFromCloud().catch(e => console.warn('补执行静默同步失败:', e?.message));
        }
    }

    /**
     * 上传本地数据到云端
     */
    async uploadToCloud(existingCloudData = null, preparedSyncData = null, skipCloudMerge = false) {


        try {
            this.autoBackupBeforeSync();

            const allItems = await db.getAllItems();
            const syncData = preparedSyncData || await this.buildSyncData(allItems);
            const normalizedLocalItems = Array.isArray(syncData.items) ? this.deduplicateItems(syncData.items) : [];
            syncData.items = normalizedLocalItems;
            const hasLocalSideData = this.hasLocalNonItemData();
            
            if (normalizedLocalItems.length === 0 && !hasLocalSideData) {
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

            const { data: existingRow } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (existingRow?.data?.deletedItems && typeof existingRow.data.deletedItems === 'object') {
                this.deletedItemsMap = { ...this.deletedItemsMap, ...existingRow.data.deletedItems };
                this.persistDeletedItemsMap();
                syncData.deletedItems = this.deletedItemsMap;
            }

            if (existingRow?.data?.dailyBackups) {
                syncData.dailyBackups = existingRow.data.dailyBackups;
            }

            const cloudItems = Array.isArray(existingRow?.data?.items) ? existingRow.data.items : [];

            const cloudOnlyItems = [];
            if (!skipCloudMerge) {
                const localKeys = new Set(normalizedLocalItems.map(item => this.getItemKey(item)));
                for (const ci of cloudItems) {
                    if (this.shouldKeepDeleted(ci)) continue;
                    if (localKeys.has(this.getItemKey(ci))) continue;
                    cloudOnlyItems.push(ci);
                }
            }

            syncData.items = [...normalizedLocalItems.filter(item => !this.shouldKeepDeleted(item)), ...cloudOnlyItems];
            
            const syncTime = new Date().toISOString();
            syncData.sync_time = syncTime;

            const { data: upsertResult, error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.currentUser.id,
                    data: syncData,
                    updated_at: syncTime
                }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) {
                console.error('上传失败:', error);
                return { success: false, error: error.message };
            }

            const actualSyncTime = upsertResult?.updated_at || syncTime;
            this.lastCloudSyncTime = actualSyncTime;
            SafeStorage.set('lastCloudSyncTime', actualSyncTime);
            

            return { success: true, itemCount: syncData.items.length };

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
            this.autoBackupBeforeSync();

            // 同步设置
            await this._restoreSettingsFromCloud(cloudData.data.settings);

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
                const nextValue = cloudData.data.countdownEvents || '[]';
                const currentValue = SafeStorage.get('office_countdown_events') || '[]';
                if (nextValue !== currentValue) {
                    SafeStorage.set('office_countdown_events', nextValue);
                }
            }

            if (cloudData.data.countdownTypeColors !== undefined) {
                const nextValue = cloudData.data.countdownTypeColors || '{}';
                const currentValue = SafeStorage.get('office_countdown_type_colors') || '{}';
                if (nextValue !== currentValue) {
                    SafeStorage.set('office_countdown_type_colors', nextValue);
                }
            }

            if (cloudData.data.countdownSortOrder !== undefined) {
                const nextValue = cloudData.data.countdownSortOrder || '[]';
                const currentValue = SafeStorage.get('office_countdown_sort_order') || '[]';
                if (nextValue !== currentValue) {
                    SafeStorage.set('office_countdown_sort_order', nextValue);
                }
            }

            document.dispatchEvent(new CustomEvent('countdownSynced', {
                detail: {
                    events: safeJsonParse(cloudData.data.countdownEvents || '[]', []),
                    colors: safeJsonParse(cloudData.data.countdownTypeColors || '{}', {}),
                    sortOrder: safeJsonParse(cloudData.data.countdownSortOrder || '[]', [])
                }
            }));

            if (cloudData.data.deletedItems && typeof cloudData.data.deletedItems === 'object') {
                this.deletedItemsMap = { ...this.deletedItemsMap, ...cloudData.data.deletedItems };
                this.persistDeletedItemsMap();
            }

            // 同步事项（带去重）
            const cloudItems = cloudData.data.items || [];

            const deduplicatedCloudItems = this.deduplicateItems(cloudItems);
            
            // 数据丢失保护：如果云端事项数远少于本地，阻止覆盖
            const backupItems = await db.getAllItems();
            if (backupItems.length > 0 && deduplicatedCloudItems.length < backupItems.length && backupItems.length >= 5) {
                const lossRatio = deduplicatedCloudItems.length / backupItems.length;
                if (lossRatio < 0.3) {
                    console.error(`数据丢失保护触发：本地 ${backupItems.length} 条，云端仅 ${deduplicatedCloudItems.length} 条，跳过下载防止覆盖`);
                    return { success: false, error: '数据丢失保护：云端数据量异常偏少，已阻止覆盖' };
                }
            }

            let importedCount = 0;
            const importErrors = [];

            try {
                await this.syncLocalItemsToState(deduplicatedCloudItems, backupItems);
                importedCount = deduplicatedCloudItems.length;
            } catch (e) {
                console.warn('导入失败:', e);
                importErrors.push(e);
            }

            if (importedCount === 0 && backupItems.length > 0 && importErrors.length > 0) {
                return { success: false, error: '导入失败' };
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
                if (this.shouldKeepDeleted(item)) continue;
                const key = this.getItemKey(item);
                mergedMap.set(key, { ...item, source: 'cloud' });
            }
            
            // 再合并本地数据
            for (const item of localItems) {
                if (this.shouldKeepDeleted(item)) continue;
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


            // 保存合并后的数据（使用批量写入）
            const backupItems = localItems.slice();
            let savedCount = 0;
            const saveErrors = [];
            const processedHashes = new Set();

            const backupHashMap = new Map();
            for (const b of backupItems) {
                if (b.hash) backupHashMap.set(b.hash, b);
            }

            const itemsToPut = [];
            const itemsToAdd = [];

            for (const item of mergedItems) {
                try {
                    const { id, source, ...itemData } = item;
                    const existing = backupHashMap.get(itemData.hash);
                    if (existing) {
                        itemsToPut.push({ ...existing, ...itemData, id: existing.id });
                        processedHashes.add(existing.hash);
                    } else {
                        itemsToAdd.push(itemData);
                    }
                    savedCount++;
                } catch (e) {
                    console.warn('保存失败:', e);
                    saveErrors.push(e);
                }
            }

            if (itemsToPut.length > 0) await db.batchPutItems(itemsToPut);
            if (itemsToAdd.length > 0) await db.batchAddItems(itemsToAdd);

            if (savedCount === 0 && backupItems.length > 0 && saveErrors.length > 0) {
                return { success: false, error: '合并保存失败' };
            }

            if (backupItems.length > 0 && savedCount > 0) {
                try {
                    await db.deleteItemsByHashes(processedHashes);
                } catch (cleanupErr) {
                    console.warn('合并后清理多余项失败:', cleanupErr);
                }
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
    isSameItem(a, b) {
        if (a.id && b.id && String(a.id) === String(b.id)) return true;
        return this.getItemKey(a) === this.getItemKey(b);
    }

    getItemKey(item) {
        const title = (item.title || '').trim().toLowerCase();
        const extractKeywords = (t) => {
            return t.replace(/会议|研究|工作|座谈|讨论|调研|培训|学习|协调|推进|落实/g, '').trim();
        };

        if (item.type === 'meeting') {
            const keywords = extractKeywords(title);
            return `meeting:${keywords}:${item.date || ''}`;
        } else if (item.type === 'todo') {
            if (item.recurringGroupId && item.occurrenceIndex !== undefined) {
                return `todo:recurring:${item.recurringGroupId}:${item.occurrenceIndex}`;
            }
            return `todo:${title}:${item.deadline || ''}`;
        } else if (item.type === 'document') {
            if (item.recurringGroupId && item.occurrenceIndex !== undefined) {
                return `doc:recurring:${item.recurringGroupId}:${item.occurrenceIndex}`;
            }
            const docStart = item.docStartDate || item.docDate || '';
            const docEnd = item.docEndDate || docStart;
            if (item.docNumber) {
                return `doc:${item.docNumber}`;
            }
            return `doc:${title}:${docStart}:${docEnd}`;
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
                } else if (item.updatedAt && (!existing.updatedAt || item.updatedAt > existing.updatedAt)) {
                    const idx = result.indexOf(existing);
                    if (idx !== -1) result[idx] = item;
                    seen.set(key, item);
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
            return { success: false };
        }

        if (!this.isOnline()) {
            return { success: false, offline: true };
        }

        this.recordLocalModify();

        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }

        this._pendingUpload = (async () => {
            let lastError = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await this.uploadToCloud();
                    if (result?.success) {
                        return result;
                    }
                    lastError = result?.error || '同步失败';
                    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                } catch (e) {
                    lastError = e.message;
                    if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
            console.error('上传重试3次仍失败:', lastError);
            document.dispatchEvent(new CustomEvent('syncError', { detail: { source: 'upload', message: '数据同步失败，请检查网络连接' } }));
            return { success: false, error: lastError };
        })();

        return this._pendingUpload;
    }

    /**
     * 启动定时同步
     */
    startPeriodicSync() {
        if (this.periodicSyncTimer) {
            clearInterval(this.periodicSyncTimer);
        }

        // 每20秒检查一次，缩短跨设备同步延迟，并兼容移动端实时通道失活场景
        this.periodicSyncTimer = setInterval(async () => {
            if (this.isLoggedIn() && !this.isSyncing) {
                await this.smartSync();
            }
        }, 30000);
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

        this.clearRealtimeReconnectTimer();

        if (this.realtimeChannel) {
            this.unsubscribeRealtime();
        }

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
                    this.realtimeReconnectAttempts = 0;
                    if (this.isSyncing) {
                        this._pendingRealtimeSync = true;
                        return;
                    }
                    try {
                        const result = await this.silentSyncFromCloud();
                        if (result?.success) {
                            document.dispatchEvent(new CustomEvent('syncDataLoaded', {
                                detail: { itemCount: result.itemCount, source: 'realtime' }
                            }));
                        }
                    } catch (e) {
                        console.warn('实时同步处理失败:', e);
                    }
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    this.realtimeReconnectAttempts = 0;
                    return;
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.warn('实时同步通道异常:', status);
                    this.scheduleRealtimeReconnect();
                }
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

    clearRealtimeReconnectTimer() {
        if (this.realtimeReconnectTimer) {
            clearTimeout(this.realtimeReconnectTimer);
            this.realtimeReconnectTimer = null;
        }
    }

    scheduleRealtimeReconnect() {
        if (!this.currentUser || !this.isOnline()) {
            return;
        }

        if (this.realtimeReconnectTimer) {
            return;
        }

        const delay = Math.min(3000 * Math.max(1, this.realtimeReconnectAttempts + 1), 15000);
        this.realtimeReconnectAttempts += 1;
        this.realtimeReconnectTimer = setTimeout(async () => {
            this.realtimeReconnectTimer = null;
            if (!this.currentUser || !this.isOnline()) {
                return;
            }
            try {
                this.initRealtimeSubscription();
                await this.silentSyncFromCloud();
                document.dispatchEvent(new CustomEvent('syncRemoteDataChanged', {
                    detail: { reason: 'realtime-reconnect' }
                }));
            } catch (error) {
                console.warn('实时同步重连失败:', error);
                this.scheduleRealtimeReconnect();
            }
        }, delay);
    }

    bindLifecycleSyncHandlers() {
        if (this.lifecycleHandlersBound) {
            return;
        }

        this.lifecycleHandlersBound = true;

        const resumeSync = async () => {
            if (!this.isLoggedIn() || this.isSyncing) {
                return;
            }
            try {
                this.initRealtimeSubscription();
                await this.smartSync();
            } catch (error) {
                console.warn('恢复前台同步失败:', error);
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                resumeSync();
            }
        });

        window.addEventListener('online', () => {
            this._offlineNotified = false;
            resumeSync();
        });

        window.addEventListener('focus', () => {
            resumeSync();
        });

        window.addEventListener('pageshow', () => {
            resumeSync();
        });
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

        if (this._pendingUpload) {
            try { await this._pendingUpload; } catch(e) {}
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
            await this._restoreSettingsFromCloud(data.data.settings);

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

            if (data.data.deletedItems && typeof data.data.deletedItems === 'object') {
                this.deletedItemsMap = { ...this.deletedItemsMap, ...data.data.deletedItems };
                this.persistDeletedItemsMap();
            }

            // 同步事项 - 使用对账合并，保留本设备未上传的新增
            const cloudItems = data.data.items || [];
            
            const deduplicatedCloudItems = this.deduplicateItems(cloudItems);

            const localItems = await db.getAllItems();

            // 导入保护窗口：导入后30秒内拒绝静默同步覆盖
            if (this._importProtectUntil && Date.now() < this._importProtectUntil) {
                console.log(`导入保护窗口中，跳过静默同步（剩余 ${Math.round((this._importProtectUntil - Date.now()) / 1000)}s）`);
                return { success: false, protected: true };
            }

            // 数据丢失保护：如果本地数据量显著大于云端，阻止静默覆盖
            if (localItems.length > 0 && deduplicatedCloudItems.length < localItems.length && localItems.length >= 5) {
                const lossRatio = deduplicatedCloudItems.length / localItems.length;
                if (lossRatio < 0.3) {
                    console.error(`静默同步数据丢失保护触发：本地 ${localItems.length} 条，云端仅 ${deduplicatedCloudItems.length} 条，跳过`);
                    return { success: false, protected: true };
                }
            }

            const reconciledItems = this.buildReconciledItems(
                localItems,
                deduplicatedCloudItems,
                this.getTimeMs(this.lastCloudSyncTime)
            );

            let importedCount = 0;

            try {
                await this.syncLocalItemsToState(reconciledItems, localItems);
                importedCount = reconciledItems.length;
            } catch (e) {
                console.warn('静默同步导入失败:', e);
            }

            if (importedCount === 0 && localItems.length > 0) {
                return { success: false };
            }

            // 更新云端同步时间
            if (data.updated_at) {
                this.lastCloudSyncTime = data.updated_at;
                SafeStorage.set('lastCloudSyncTime', data.updated_at);
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
            this.bindLifecycleSyncHandlers();

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
                this.clearRealtimeReconnectTimer();
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

        if (this.isSyncing) {
            return { success: false, message: '正在同步中，请稍后再试' };
        }
        this.isSyncing = true;

        try {
            if (progressCallback) progressCallback('正在准备数据...');
            const allItems = await db.getAllItems();

            // 获取设置数据（包括API Key）
            const settings = {};
        const [kimiKeyEnc, kimiKeySet, deepseekKeyEnc, deepseekKeySet, qweatherKeyEncrypted, qweatherKeySet] = await Promise.all([
            db.getSetting('kimi_api_key_encrypted'),
            db.getSetting('kimi_api_key_set'),
            db.getSetting('deepseek_api_key_encrypted'),
            db.getSetting('deepseek_api_key_set'),
            db.getSetting('qweather_api_key_encrypted'),
            db.getSetting('qweather_api_key_set')
        ]);
        const cryptoMasterKey = SafeStorage.get('crypto_master_key');

        if (kimiKeyEnc) settings.kimi_api_key_encrypted = kimiKeyEnc;
        if (kimiKeySet) settings.kimi_api_key_set = kimiKeySet;
        if (deepseekKeyEnc) settings.deepseek_api_key_encrypted = deepseekKeyEnc;
        if (deepseekKeySet) settings.deepseek_api_key_set = deepseekKeySet;
        if (qweatherKeyEncrypted) settings.qweather_api_key_encrypted = qweatherKeyEncrypted;
        if (qweatherKeySet) settings.qweather_api_key_set = qweatherKeySet;
        if (cryptoMasterKey) settings.crypto_master_key = cryptoMasterKey;

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
        } finally {
            this.isSyncing = false;
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

        if (this.isSyncing) {
            return { success: false, message: '正在同步中，请稍后再试' };
        }
        this.isSyncing = true;

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
            await this._restoreSettingsFromCloud(data.data.settings);

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

            if (data.data.deletedItems && typeof data.data.deletedItems === 'object') {
                this.deletedItemsMap = { ...this.deletedItemsMap, ...data.data.deletedItems };
                this.persistDeletedItemsMap();
            }

            // 先对云端数据本身去重
            const deduplicatedCloudItems = this.deduplicateItems(cloudItems);

            const localItems = await db.getAllItems();

            if (localItems.length > 0 && deduplicatedCloudItems.length < localItems.length && localItems.length >= 5) {
                const lossRatio = deduplicatedCloudItems.length / localItems.length;
                if (lossRatio < 0.3) {
                    console.error(`手动同步数据丢失保护触发：本地 ${localItems.length} 条，云端仅 ${deduplicatedCloudItems.length} 条，跳过`);
                    return { success: false, message: '数据丢失保护：云端数据量异常偏少（' + deduplicatedCloudItems.length + '/' + localItems.length + '），已阻止覆盖' };
                }
            }

            let importedCount = 0;
            let mergedCount = 0;
            let skippedCount = 0;

            if (mergeStrategy === 'replace') {
                try {
                    await this.syncLocalItemsToState(deduplicatedCloudItems, localItems);
                    importedCount = deduplicatedCloudItems.length;
                } catch (e) {
                    console.error('replace模式同步失败:', e);
                    return { success: false, message: '同步失败: ' + e.message };
                }
            } else {
                const importErrors = [];
                for (const item of deduplicatedCloudItems) {
                    try {
                        const { id, ...itemData } = item;

                        if (localItems.length > 0) {
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

                if (importedCount === 0 && localItems.length === 0 && importErrors.length > 0) {
                    return { success: false, message: '导入失败' };
                }
            }

            this.lastSyncTime = new Date().toISOString();
            SafeStorage.set('lastSyncTime', this.lastSyncTime);
            this.lastCloudSyncTime = this.lastSyncTime;
            SafeStorage.set('lastCloudSyncTime', this.lastSyncTime);
            if (progressCallback) progressCallback('同步完成');
            
            let message = `从云端同步了 ${importedCount} 个事项`;
            if (mergedCount > 0) message += `，合并了 ${mergedCount} 个会议的参会人员`;
            if (skippedCount > 0) message += `，跳过了 ${skippedCount} 个重复事项`;
            
            return { success: true, message, itemCount: importedCount, mergedCount, skippedCount };
        } catch (error) {
            console.error('从云端同步失败:', error);
            return { success: false, message: '同步失败: ' + error.message };
        } finally {
            this.isSyncing = false;
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
                    const cloudStart = cloudItem.docStartDate || cloudItem.docDate || '';
                    const localStart = local.docStartDate || local.docDate || '';
                    const cloudEnd = cloudItem.docEndDate || cloudStart;
                    const localEnd = local.docEndDate || localStart;
                    if (cloudStart === localStart && cloudEnd === localEnd) {
                        return { isDuplicate: true, existingItem: local };
                    }
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
        const wasSyncing = this.isSyncing;
        this.isSyncing = true;

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

            await db.clearAllItems();

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

            this.recordLocalModify();

            if (this.currentUser && importedCount > 0) {
                try {
                    await this.uploadToCloud(null, null, true);
                } catch (uploadErr) {
                    console.warn('导入后上传云端失败:', uploadErr);
                }
            }

            return { success: true, message: `成功导入 ${importedCount} 个事项`, itemCount: importedCount };
        } catch (error) {
            throw new Error('导入失败: ' + error.message);
        } finally {
            this.isSyncing = wasSyncing || false;
            this._pendingRealtimeSync = false;
            this._importProtectUntil = Date.now() + 30000;
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

    showSessionExpiredNotice() {
        const existing = document.getElementById('sessionExpiredNotice');
        if (existing) return;
        const notice = document.createElement('div');
        notice.id = 'sessionExpiredNotice';
        notice.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#ef4444;color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(239,68,68,0.3);cursor:pointer;max-width:90vw;text-align:center;';
        notice.textContent = '⚠️ 登录已过期，请点击重新登录';
        notice.onclick = () => {
            notice.remove();
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.click();
        };
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 30000);
    }

    /**
     * 获取登录状态
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    async getCloudBackupList() {
        if (!this.isLoggedIn()) return [];
        try {
            const { data, error } = await this.supabase
                .from('user_data')
                .select('data')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();
            if (error || !data?.data) return [];
            return data.data.dailyBackups || [];
        } catch (e) {
            console.warn('获取云端备份列表失败:', e);
            return [];
        }
    }

    async saveCloudBackupList(backups) {
        if (!this.isLoggedIn()) return;
        try {
            const { data: existing, error: fetchErr } = await this.supabase
                .from('user_data')
                .select('data')
                .eq('user_id', this.currentUser.id)
                .maybeSingle();
            const cloudData = (existing?.data) || {};
            cloudData.dailyBackups = backups;
            const { error } = await this.supabase
                .from('user_data')
                .update({ data: cloudData })
                .eq('user_id', this.currentUser.id);
            if (error) throw error;
        } catch (e) {
            console.warn('保存云端备份列表失败:', e);
            throw e;
        }
    }

    /**
     * 获取当前用户名
     */
    getUsername() {
        return this.currentUser?.user_metadata?.username || '';
    }

    autoBackupBeforeSync() {
        Promise.resolve().then(async () => {
            try {
                const allItems = await db.getAllItems();
                if (allItems.length === 0) return;
                const backup = {
                    timestamp: new Date().toISOString(),
                    items: allItems,
                    sideData: this._collectSideDataForBackup()
                };
                const backupJson = JSON.stringify(backup);
                const MAX_BACKUPS = 20;
                let backupList = [];
                try {
                    backupList = JSON.parse(localStorage.getItem('dataBackups') || '[]');
                } catch (e) { backupList = []; }
                backupList.push({ ts: backup.timestamp, size: backupJson.length, data: backupJson });
                if (backupList.length > MAX_BACKUPS) {
                    backupList = backupList.slice(backupList.length - MAX_BACKUPS);
                }
                localStorage.setItem('dataBackups', JSON.stringify(backupList.map(b => ({ ts: b.ts, size: b.size, data: b.data }))));
            } catch (e) {
                console.warn('自动备份失败:', e.message);
            }
        });
    }

    _collectSideDataForBackup() {
        const keys = ['office_tools', 'office_links', 'office_contacts', 'office_memo_content',
            'office_countdown_events', 'office_countdown_type_colors', 'office_countdown_sort_order',
            'office_weather_city', 'theme'];
        const result = {};
        for (const k of keys) {
            const v = localStorage.getItem(k);
            if (v !== null) result[k] = v;
        }
        return result;
    }

    getBackupList() {
        try {
            const list = JSON.parse(localStorage.getItem('dataBackups') || '[]');
            return list.map(b => ({ ts: b.ts, size: b.size, itemCount: 0 })).map((b, i) => {
                try {
                    const parsed = JSON.parse(list[i].data);
                    b.itemCount = parsed.items?.length || 0;
                } catch (e) { console.warn('备份数据解析失败:', e?.message); }
                return b;
            });
        } catch (e) { return []; }
    }

    async restoreFromBackup(index) {
        try {
            const list = JSON.parse(localStorage.getItem('dataBackups') || '[]');
            if (index < 0 || index >= list.length) throw new Error('备份索引无效');
            const backup = JSON.parse(list[index].data);
            if (!backup.items || backup.items.length === 0) throw new Error('备份数据为空');
            const database = await db.init();
            await new Promise((resolve, reject) => {
                const tx = database.transaction(db.STORES.ITEMS, 'readwrite');
                const store = tx.objectStore(db.STORES.ITEMS);
                const clearReq = store.clear();
                clearReq.onsuccess = () => {
                    for (const item of backup.items) {
                        const normalized = db.normalizeItemForStorage ? db.normalizeItemForStorage(item) : item;
                        if (!normalized.hash) normalized.hash = db.generateHash ? db.generateHash(normalized) : '';
                        if (!normalized.createdAt) normalized.createdAt = new Date().toISOString();
                        if (!normalized.updatedAt) normalized.updatedAt = normalized.createdAt;
                        delete normalized.id;
                        store.add(normalized);
                    }
                };
                clearReq.onerror = () => reject(clearReq.error);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(new Error('恢复备份事务中止'));
            });
            if (backup.sideData) {
                for (const [k, v] of Object.entries(backup.sideData)) {
                    localStorage.setItem(k, v);
                }
            }
            db.resetItemsCache();
            return { success: true, itemCount: backup.items.length };
        } catch (e) {
            console.error('恢复备份失败:', e);
            return { success: false, error: e.message };
        }
    }

    exportBackupAsFile() {
        try {
            const list = JSON.parse(localStorage.getItem('dataBackups') || '[]');
            if (list.length === 0) return null;
            const latest = JSON.parse(list[list.length - 1].data);
            const blob = new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `office-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        } catch (e) {
            console.error('导出备份失败:', e);
            return null;
        }
    }
}

// 创建全局同步管理器实例
const syncManager = new SyncManager();
window.syncManager = syncManager;
