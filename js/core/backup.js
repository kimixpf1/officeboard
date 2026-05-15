/**
 * 备份恢复模块（v5.66 拆分）
 * 导出/导入 + 每日双轨备份（云端+本地）
 */
const BackupCore = {

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
    },

    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const password = await this.showPasswordPrompt('导入密码', '如果文件有密码保护，请输入密码（无密码请留空）');
        if (password === null) { e.target.value = ''; return; }

        this.showLoading(true, '正在导入...');

        try {
            const result = await syncManager.importFromFile(file, password || null);
            this.showSuccess(result.message);
            await this.loadItems();
        } catch (error) {
            this.showError('导入失败: ' + error.message);
        } finally {
            this.showLoading(false);
            e.target.value = '';
        }
    },

    async handleExportBackupFile() {
        const result = syncManager.exportBackupAsFile();
        if (result) {
            this.showSuccess('备份文件已导出');
        } else {
            this.showError('暂无备份数据可导出');
        }
    },

    async handleRestoreBackup() {
        const list = syncManager.getBackupList();
        if (list.length === 0) {
            this.showError('暂无备份数据可恢复');
            return;
        }
        const latest = list[list.length - 1];
        const confirmed = confirm(`确认恢复到 ${latest.ts} 的备份？\n该备份包含 ${latest.itemCount} 条事项。\n当前数据将被替换。`);
        if (!confirmed) return;
        this.showLoading(true, '正在恢复备份...');
        try {
            const result = await syncManager.restoreFromBackup(list.length - 1);
            if (result.success) {
                this.showSuccess(`已恢复 ${result.itemCount} 条事项`);
                await this.loadItems();
            } else {
                this.showError('恢复失败: ' + result.error);
            }
        } catch (e) {
            this.showError('恢复失败: ' + e.message);
        } finally {
            this.showLoading(false);
        }
    },

    startDailyBackupSchedule() {
        const BACKUP_HOUR = 20;
        const CHECK_KEY = 'dailyBackupLastDate';
        const TOGGLE_KEY = 'autoBackupEnabled';

        const toggle = document.getElementById('autoBackupToggle');
        if (toggle) {
            const saved = localStorage.getItem(TOGGLE_KEY);
            toggle.checked = saved === null ? true : saved === 'true';
            toggle.addEventListener('change', () => {
                localStorage.setItem(TOGGLE_KEY, toggle.checked);
            });
        }

        const tryBackup = async () => {
            if (localStorage.getItem(TOGGLE_KEY) === 'false') return;
            const now = new Date();
            const todayStr = this.formatDateLocal(now);
            const lastBackupDate = SafeStorage.get(CHECK_KEY);

            if (lastBackupDate === todayStr) return;
            if (now.getHours() < BACKUP_HOUR) return;

            try {
                const allItems = await db.getAllItems();
                if (allItems.length === 0) return;

                SafeStorage.set(CHECK_KEY, todayStr);

                const exportData = {
                    version: '2.0',
                    export_time: new Date().toISOString(),
                    type: 'daily-auto-backup',
                    items: allItems,
                    sideData: syncManager._collectSideDataForBackup()
                };

                await this.saveDailyBackupToCloud(exportData);

                const dataStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const dateStr = todayStr.replace(/-/g, '');
                a.download = `办公面板每日备份_${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

            } catch (e) {
                console.warn('每日备份失败:', e);
            }
        };

        if (this._dailyBackupTimer) {
            clearInterval(this._dailyBackupTimer);
        }
        this._dailyBackupTimer = setInterval(tryBackup, 60000);
        tryBackup();
    },

    async saveDailyBackupToCloud(exportData) {
        if (!syncManager.isLoggedIn()) return;

        try {
            const todayStr = this.formatDateLocal(new Date());
            const { items, sideData = {}, ...meta } = exportData;
            const compressedItems = items.map(i => {
                const { hash, ...rest } = i;
                return rest;
            });
            const backupEntry = {
                date: todayStr,
                time: new Date().toISOString(),
                count: items.length,
                items: compressedItems,
                sideData,
                meta
            };

            const MAX_CLOUD_BACKUPS = 30;

            const result = await syncManager.getCloudBackupList();
            let backups = result || [];

            backups.push(backupEntry);

            backups.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            if (backups.length > MAX_CLOUD_BACKUPS) {
                backups = backups.slice(0, MAX_CLOUD_BACKUPS);
            }

            await syncManager.saveCloudBackupList(backups);
        } catch (e) {
            console.warn('云端备份失败:', e);
        }
    },

    async restoreCloudBackup(backupDate) {
        try {
            const backups = await syncManager.getCloudBackupList() || [];
            const backup = backups.find(b => b.date === backupDate);
            if (!backup || !backup.items) {
                throw new Error('未找到该日期的备份');
            }

            await db.clearAllItems();
            let imported = 0;
            for (const item of backup.items) {
                try {
                    const { id, ...itemData } = item;
                    await db.addItem(itemData);
                    imported++;
                } catch (e) {
                    console.warn('恢复项目失败:', e);
                }
            }

            if (backup.sideData && typeof backup.sideData === 'object') {
                syncManager._applySideData(backup.sideData, {
                    dispatchMemo: true,
                    dispatchSchedule: true,
                    dispatchLinks: true,
                    dispatchContacts: true,
                    dispatchCountdown: true,
                    dispatchTools: true
                });
            }

            await this.loadItems();
            return { success: true, message: `已恢复 ${backupDate} 的备份，共 ${imported} 条事项` };
        } catch (e) {
            throw new Error('恢复失败: ' + e.message);
        }
    }
};
