/**
 * IndexedDB 数据库操作模块
 * 本地优先存储，数据不上传服务器
 */

const DB_NAME = 'OfficeDashboardDB';
const DB_VERSION = 1;

// 数据表名
const STORES = {
    ITEMS: 'items',
    SETTINGS: 'settings',
    DOCUMENT_HASHES: 'documentHashes'
};

class Database {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = () => {
                    console.error('数据库打开失败:', request.error);
                    reject(new Error('无法打开本地数据库，请检查浏览器设置'));
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('数据库连接成功');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    console.log('数据库升级中...');
                    const db = event.target.result;

                    // 创建事项表
                    if (!db.objectStoreNames.contains(STORES.ITEMS)) {
                        const itemsStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'id', autoIncrement: true });
                        itemsStore.createIndex('type', 'type', { unique: false });
                        itemsStore.createIndex('date', 'date', { unique: false });
                        itemsStore.createIndex('hash', 'hash', { unique: false });
                        itemsStore.createIndex('createdAt', 'createdAt', { unique: false });
                        console.log('事项表创建成功');
                    }

                    // 创建设置表
                    if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                        console.log('设置表创建成功');
                    }

                    // 创建文档哈希表（用于去重）
                    if (!db.objectStoreNames.contains(STORES.DOCUMENT_HASHES)) {
                        const hashStore = db.createObjectStore(STORES.DOCUMENT_HASHES, { keyPath: 'hash' });
                        hashStore.createIndex('createdAt', 'createdAt', { unique: false });
                        console.log('文档哈希表创建成功');
                    }
                };
            } catch (error) {
                console.error('数据库初始化异常:', error);
                reject(error);
            }
        });

        return this.initPromise;
    }

    /**
     * 获取数据存储对象
     */
    async getStore(storeName, mode = 'readonly') {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    /**
     * 获取数据存储对象（返回事务和store）
     */
    async getStoreWithTransaction(storeName, mode = 'readonly') {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        return { transaction, store };
    }

    /**
     * 添加事项
     */
    async addItem(item) {
        const db = await this.init();

        // 生成唯一标识（用于去重）
        item.hash = this.generateHash(item);
        item.createdAt = new Date().toISOString();
        item.updatedAt = item.createdAt;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const index = store.index('hash');

            // 先检查是否存在
            const checkRequest = index.get(item.hash);

            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    // 已存在相同的hash，但可能是不同的周期性任务
                    // 检查是否是同一周期的任务
                    const existing = checkRequest.result;
                    if (item.recurringGroupId && existing.recurringGroupId === item.recurringGroupId) {
                        console.log('同一周期任务已存在，跳过:', item.title, 'occurrenceIndex:', item.occurrenceIndex);
                        resolve(existing.id);
                        return;
                    }
                    // 不同周期的任务，修改hash后重新添加
                    item.hash = item.hash + '_' + Date.now();
                    console.log('hash冲突，重新生成hash:', item.title, 'new hash:', item.hash);
                }

                // 不存在则添加
                const addRequest = store.add(item);
                addRequest.onsuccess = () => {
                    console.log('添加事项成功:', item.title, 'id:', addRequest.result, 'recurringGroupId:', item.recurringGroupId);
                    resolve(addRequest.result);
                };
                addRequest.onerror = () => reject(addRequest.error);
            };

            checkRequest.onerror = () => reject(checkRequest.error);

            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 更新事项
     */
    async updateItem(id, updates) {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (!item) {
                    reject(new Error('事项不存在'));
                    return;
                }

                const updatedItem = { ...item, ...updates, updatedAt: new Date().toISOString() };
                updatedItem.hash = this.generateHash(updatedItem);

                const putRequest = store.put(updatedItem);
                putRequest.onsuccess = () => resolve(updatedItem);
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 删除事项
     */
    async deleteItem(id) {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 获取单个事项
     */
    async getItem(id) {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readonly');
            const store = transaction.objectStore(STORES.ITEMS);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 根据哈希获取事项
     */
    async getItemByHash(hash) {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readonly');
            const store = transaction.objectStore(STORES.ITEMS);
            const index = store.index('hash');
            const request = index.get(hash);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取所有事项
     */
    async getAllItems() {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readonly');
            const store = transaction.objectStore(STORES.ITEMS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 按类型获取事项
     */
    async getItemsByType(type) {
        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readonly');
            const store = transaction.objectStore(STORES.ITEMS);
            const index = store.index('type');
            const request = index.getAll(type);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取日期范围内的事项
     * 支持 date 字段（会议）、deadline 字段（待办）、docStartDate/docEndDate 字段（办文）
     */
    async getItemsByDateRange(startDate, endDate) {
        const allItems = await this.getAllItems();

        return allItems.filter(item => {
            // 会议：使用 date 字段（支持跨天会议）
            if (item.type === 'meeting' && item.date) {
                const meetingStart = item.date;
                const meetingEnd = item.endDate || item.date;
                // 检查会议日期范围是否与查询范围有交集
                return meetingStart <= endDate && meetingEnd >= startDate;
            }
            // 待办：使用 deadline 字段
            if (item.type === 'todo' && item.deadline) {
                const deadlineDate = item.deadline.split('T')[0];
                return deadlineDate >= startDate && deadlineDate <= endDate;
            }
            // 办文：使用 docStartDate/docEndDate 字段
            if (item.type === 'document') {
                const docStart = item.docStartDate || item.docDate;
                const docEnd = item.docEndDate || docStart;
                if (docStart) {
                    // 检查办文日期范围是否与查询范围有交集
                    return docStart <= endDate && docEnd >= startDate;
                }
                // 兼容旧数据：使用 createdAt
                if (item.createdAt) {
                    const createdDate = item.createdAt.split('T')[0];
                    return createdDate >= startDate && createdDate <= endDate;
                }
            }
            return false;
        });
    }

    /**
     * 更新事项排序（单事务，oncomplete后才resolve确保数据已提交）
     */
    async updateItemOrder(type, itemIds) {
        if (!itemIds || itemIds.length === 0) return;

        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            let updatedCount = 0;

            // 先读取所有需要更新的项目
            const items = [];
            let pendingGets = itemIds.length;

            itemIds.forEach((id, index) => {
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const item = getRequest.result;
                    if (item) {
                        // 更新 order 值（不检查 type，因为 DOM 中的卡片一定属于该容器）
                        item.order = index;
                        item.updatedAt = new Date().toISOString();
                        items.push(item);
                    }
                    pendingGets--;
                    // 所有 get 完成后，批量 put
                    if (pendingGets === 0) {
                        items.forEach(item => {
                            store.put(item);
                            updatedCount++;
                        });
                    }
                };
                getRequest.onerror = () => {
                    console.error('获取项目失败:', id, getRequest.error);
                    pendingGets--;
                };
            });

            transaction.oncomplete = () => {
                console.log(`排序保存成功: ${updatedCount} 个项目, 类型: ${type}, 顺序:`, itemIds);
                resolve();
            };
            transaction.onerror = () => {
                console.error('排序事务失败:', transaction.error);
                reject(transaction.error);
            };
            transaction.onabort = () => reject(new Error('排序事务被中止'));
        });
    }

    /**
     * 保存设置
     */
    async setSetting(key, value) {
        const store = await this.getStore(STORES.SETTINGS, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.put({ key, value, updatedAt: new Date().toISOString() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取设置
     */
    async getSetting(key) {
        const store = await this.getStore(STORES.SETTINGS);

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 添加文档哈希（用于去重）
     */
    async addDocumentHash(hash, metadata = {}) {
        const store = await this.getStore(STORES.DOCUMENT_HASHES, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.put({
                hash,
                ...metadata,
                createdAt: new Date().toISOString()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 检查文档哈希是否存在
     */
    async hasDocumentHash(hash) {
        if (!hash) return false;  // 安全检查

        const store = await this.getStore(STORES.DOCUMENT_HASHES);

        return new Promise((resolve, reject) => {
            try {
                const request = store.get(hash);
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error('hasDocumentHash错误:', error);
                resolve(false);
            }
        });
    }

    /**
     * 生成事项哈希（用于去重）
     */
    generateHash(item) {
        // 根据事项类型选择日期字段
        let dateField = '';
        if (item.type === 'document') {
            // 办文类型使用 docStartDate 或 docDate
            dateField = item.docStartDate || item.docDate || '';
        } else {
            // 待办和会议类型使用 date 或 deadline
            dateField = item.date || item.deadline || '';
        }
        
        // 周期性任务需要包含周期序号以区分不同周期
        const recurringKey = item.recurringGroupId ? 
            `_${item.recurringGroupId}_${item.occurrenceIndex || 0}` : '';
        
        const data = JSON.stringify({
            title: item.title,
            type: item.type,
            date: dateField,
            time: item.time || '',
            recurring: recurringKey
        });

        // 简单的哈希算法
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    /**
     * 导出所有数据
     */
    async exportData() {
        const items = await this.getAllItems();
        const settings = await new Promise(async (resolve, reject) => {
            const store = await this.getStore(STORES.SETTINGS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return {
            items,
            settings,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * 导入数据
     */
    async importData(data) {
        const { items, settings } = data;

        // 清空现有数据
        await this.clearAllData();

        // 导入事项
        if (items && items.length > 0) {
            const store = await this.getStore(STORES.ITEMS, 'readwrite');
            for (const item of items) {
                // 移除自动生成的id，让数据库重新分配
                delete item.id;
                await new Promise((resolve, reject) => {
                    const request = store.add(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        }

        // 导入设置
        if (settings && settings.length > 0) {
            const store = await this.getStore(STORES.SETTINGS, 'readwrite');
            for (const setting of settings) {
                await new Promise((resolve, reject) => {
                    const request = store.put(setting);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        }
    }

    /**
     * 清空所有数据
     */
    async clearAllData() {
        const stores = [STORES.ITEMS, STORES.SETTINGS, STORES.DOCUMENT_HASHES];

        for (const storeName of stores) {
            const store = await this.getStore(storeName, 'readwrite');
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * 清空所有事项（保留设置和文档哈希）
     */
    async clearAllItems() {
        const store = await this.getStore(STORES.ITEMS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取所有文档哈希记录
     */
    async getAllDocumentHashes() {
        const store = await this.getStore(STORES.DOCUMENT_HASHES, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
}

// 创建全局数据库实例
const db = new Database();
