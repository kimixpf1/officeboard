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
        this.itemsCache = null;
        this.itemsCacheUpdatedAt = null;
    }

    _rejectWithLog(reject, error, context) {
        console.error(`[DB] ${context}:`, error);
        reject(error);
    }

    normalizeItemForStorage(item) {
        const normalizedItem = { ...item };

        if (normalizedItem.type === 'meeting') {
            if (normalizedItem.manualOrder !== true) {
                delete normalizedItem.order;
                delete normalizedItem.manualOrderUpdatedAt;
                normalizedItem.manualOrder = false;
            }
        }

        return normalizedItem;
    }

    resetItemsCache() {
        this.itemsCache = null;
        this.itemsCacheUpdatedAt = null;
    }

    shouldReuseItemsCache() {
        if (!this.itemsCache || !this.itemsCacheUpdatedAt) {
            return false;
        }

        const cacheAge = Date.now() - this.itemsCacheUpdatedAt;
        return cacheAge < 5000;
    }

    matchItemDateRange(item, startDate, endDate) {
        if (item.type === 'meeting' && item.date) {
            const meetingStart = item.date;
            const meetingEnd = item.endDate || item.date;
            return meetingStart <= endDate && meetingEnd >= startDate;
        }

        if (item.type === 'todo' && item.deadline) {
            const deadlineDate = item.deadline.split('T')[0];
            return deadlineDate >= startDate && deadlineDate <= endDate;
        }

        if (item.type === 'document') {
            const docStart = item.docStartDate || item.docDate;
            const docEnd = item.docEndDate || docStart;
            if (docStart) {
                return docStart <= endDate && docEnd >= startDate;
            }
            if (item.createdAt) {
                const createdDate = item.createdAt.split('T')[0];
                return createdDate >= startDate && createdDate <= endDate;
            }
        }

        return false;
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
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    if (!db.objectStoreNames.contains(STORES.ITEMS)) {
                        const itemsStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'id', autoIncrement: true });
                        itemsStore.createIndex('type', 'type', { unique: false });
                        itemsStore.createIndex('date', 'date', { unique: false });
                        itemsStore.createIndex('hash', 'hash', { unique: false });
                        itemsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    }

                    if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                    }

                    if (!db.objectStoreNames.contains(STORES.DOCUMENT_HASHES)) {
                        const hashStore = db.createObjectStore(STORES.DOCUMENT_HASHES, { keyPath: 'hash' });
                        hashStore.createIndex('createdAt', 'createdAt', { unique: false });
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
        const normalizedItem = this.normalizeItemForStorage(item);

        normalizedItem.hash = this.generateHash(normalizedItem);
        if (!normalizedItem.createdAt) {
            normalizedItem.createdAt = new Date().toISOString();
        }
        if (!normalizedItem.updatedAt) {
            normalizedItem.updatedAt = normalizedItem.createdAt;
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const index = store.index('hash');

            const checkRequest = index.get(normalizedItem.hash);

            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    const existing = checkRequest.result;
                    if (normalizedItem.recurringGroupId && existing.recurringGroupId === normalizedItem.recurringGroupId) {
                        resolve(existing.id);
                        return;
                    }
                    normalizedItem.hash = normalizedItem.hash + '_' + Date.now();
                }

                const addRequest = store.add(normalizedItem);
                addRequest.onsuccess = () => {
                    this.resetItemsCache();
                    resolve(addRequest.result);
                };
                addRequest.onerror = () => this._rejectWithLog(reject, addRequest.error, 'addItem写入失败');
            };

            checkRequest.onerror = () => this._rejectWithLog(reject, checkRequest.error, 'addItem重复检查失败');
            transaction.onerror = () => this._rejectWithLog(reject, transaction.error, 'addItem事务失败');
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

                const updatedItem = this.normalizeItemForStorage({
                    ...item,
                    ...updates,
                    updatedAt: new Date().toISOString()
                });
                updatedItem.hash = this.generateHash(updatedItem);

                const putRequest = store.put(updatedItem);
                putRequest.onsuccess = () => {
                    this.resetItemsCache();
                    resolve(updatedItem);
                };
                putRequest.onerror = () => this._rejectWithLog(reject, putRequest.error, 'updateItem写入失败');
            };

            getRequest.onerror = () => this._rejectWithLog(reject, getRequest.error, 'updateItem读取失败');
            transaction.onerror = () => this._rejectWithLog(reject, transaction.error, 'updateItem事务失败');
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
            request.onsuccess = () => {
                this.resetItemsCache();
                resolve();
            };
            request.onerror = () => this._rejectWithLog(reject, request.error, 'deleteItem删除失败');
            transaction.onerror = () => this._rejectWithLog(reject, transaction.error, 'deleteItem事务失败');
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'getItem读取失败');
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'getItemByHash读取失败');
        });
    }

    /**
     * 获取所有事项
     */
    async getAllItems() {
        if (this.shouldReuseItemsCache()) {
            return [...this.itemsCache];
        }

        const db = await this.init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readonly');
            const store = transaction.objectStore(STORES.ITEMS);
            const request = store.getAll();
            request.onsuccess = () => {
                this.itemsCache = request.result || [];
                this.itemsCacheUpdatedAt = Date.now();
                resolve([...(this.itemsCache || [])]);
            };
            request.onerror = () => this._rejectWithLog(reject, request.error, 'getAllItems读取失败');
        });
    }

    /**
     * 按类型获取事项
     */
    async getItemsByType(type) {
        const allItems = await this.getAllItems();
        return allItems.filter(item => item?.type === type);
    }

    /**
     * 获取日期范围内的事项
     * 支持 date 字段（会议）、deadline 字段（待办）、docStartDate/docEndDate 字段（办文）
     */
    async getItemsByDateRange(startDate, endDate) {
        const allItems = await this.getAllItems();
        return allItems.filter(item => this.matchItemDateRange(item, startDate, endDate));
    }

    /**
     * 更新事项排序（单事务，oncomplete后才resolve确保数据已提交）
     */
    async updateItemOrder(type, itemIds) {
        if (!itemIds || itemIds.length === 0) return;

        const db = await this.init();
        const manualOrderUpdatedAt = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const items = [];
            let pendingGets = itemIds.length;

            itemIds.forEach((id, index) => {
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const item = getRequest.result;
                    if (item) {
                        item.order = index;
                        item.manualOrder = true;
                        item.manualOrderUpdatedAt = manualOrderUpdatedAt;
                        item.updatedAt = manualOrderUpdatedAt;
                        items.push(item);
                    }
                    pendingGets--;
                    if (pendingGets === 0) {
                        items.forEach(currentItem => {
                            store.put(currentItem);
                        });
                    }
                };
                getRequest.onerror = () => {
                    console.error('获取项目失败:', id, getRequest.error);
                    pendingGets--;
                };
            });

            transaction.oncomplete = () => {
                this.resetItemsCache();
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'setSetting写入失败');
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'getSetting读取失败');
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'addDocumentHash写入失败');
        });
    }

    /**
     * 检查文档哈希是否存在
     */
    async hasDocumentHash(hash) {
        if (!hash) return false;

        const store = await this.getStore(STORES.DOCUMENT_HASHES);

        return new Promise((resolve, reject) => {
            try {
                const request = store.get(hash);
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => this._rejectWithLog(reject, request.error, 'hasDocumentHash读取失败');
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
        let dateField = '';
        if (item.type === 'document') {
            dateField = item.docStartDate || item.docDate || '';
        } else {
            dateField = item.date || item.deadline || '';
        }

        const recurringKey = item.recurringGroupId ?
            `_${item.recurringGroupId}_${item.occurrenceIndex || 0}` : '';

        const data = JSON.stringify({
            title: item.title,
            type: item.type,
            date: dateField,
            time: item.time || '',
            recurring: recurringKey
        });

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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'exportData设置读取失败');
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

        await this.clearAllData();

        if (items && items.length > 0) {
            const store = await this.getStore(STORES.ITEMS, 'readwrite');
            for (const item of items) {
                delete item.id;
                await new Promise((resolve, reject) => {
                    const request = store.add(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => this._rejectWithLog(reject, request.error, 'importData事项导入失败');
                });
            }
        }

        if (settings && settings.length > 0) {
            const store = await this.getStore(STORES.SETTINGS, 'readwrite');
            for (const setting of settings) {
                await new Promise((resolve, reject) => {
                    const request = store.put(setting);
                    request.onsuccess = () => resolve();
                    request.onerror = () => this._rejectWithLog(reject, request.error, 'importData设置导入失败');
                });
            }
        }

        this.resetItemsCache();
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
                request.onerror = () => this._rejectWithLog(reject, request.error, 'clearAllData清空失败');
            });
        }

        this.resetItemsCache();
    }

    /**
     * 清空所有事项（保留设置和文档哈希）
     */
    async clearAllItems() {
        const store = await this.getStore(STORES.ITEMS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                this.resetItemsCache();
                resolve();
            };
            request.onerror = () => this._rejectWithLog(reject, request.error, 'clearAllItems清空失败');
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
            request.onerror = () => this._rejectWithLog(reject, request.error, 'getAllDocumentHashes读取失败');
        });
    }

    async putItem(item) {
        const db = await this.init();
        const normalizedItem = this.normalizeItemForStorage(item);
        normalizedItem.hash = this.generateHash(normalizedItem);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            const putRequest = store.put(normalizedItem);
            putRequest.onsuccess = () => {
                this.resetItemsCache();
                resolve(putRequest.result);
            };
            putRequest.onerror = () => this._rejectWithLog(reject, putRequest.error, 'putItem写入失败');
            transaction.onerror = () => this._rejectWithLog(reject, transaction.error, 'putItem事务失败');
        });
    }

    async deleteItemsByHashes(keepHashes) {
        const db = await this.init();
        const allItems = await this.getAllItems();
        const toDelete = allItems.filter(item => !keepHashes.has(item.hash));
        if (toDelete.length === 0) return;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ITEMS, 'readwrite');
            const store = transaction.objectStore(STORES.ITEMS);
            let deleted = 0;
            for (const item of toDelete) {
                const req = store.delete(item.id);
                req.onsuccess = () => { deleted++; };
                req.onerror = () => console.warn('删除多余项失败:', item.id);
            }
            transaction.oncomplete = () => {
                this.resetItemsCache();
                resolve(deleted);
            };
            transaction.onerror = () => this._rejectWithLog(reject, transaction.error, 'deleteItemsByHashes失败');
        });
    }
}

const db = new Database();
window.db = db;
