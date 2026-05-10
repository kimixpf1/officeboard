/**
 * 侧边面板模块（mixin 模式）
 * 含日程便签、备忘录两个面板
 * 通过 Object.assign(OfficeDashboard.prototype, SidePanels) 混入
 */
const SidePanels = {

    /**
     * 初始化便签备忘录
     */
    initSchedulePanel() {
        const schedulePanel = document.getElementById('schedulePanel');
        const scheduleToggle = document.getElementById('scheduleToggle');
        const scheduleClose = document.getElementById('scheduleClose');
        const scheduleText = document.getElementById('scheduleText');
        const scheduleStatus = document.getElementById('scheduleStatus');

        if (!schedulePanel || !scheduleToggle || !scheduleText) return;

        const savedSchedule = SecurityUtils.safeGetStorage('office_schedule_content');
        if (savedSchedule) {
            scheduleText.value = savedSchedule;
        }

        scheduleToggle.addEventListener('click', () => {
            if (schedulePanel.classList.contains('expanded')) {
                schedulePanel.classList.remove('expanded');
            } else {
                schedulePanel.classList.add('expanded');
                scheduleText.focus();
            }
        });

        scheduleClose.addEventListener('click', () => {
            schedulePanel.classList.remove('expanded');
        });

        let saveTimeout = null;

        scheduleText.addEventListener('input', () => {
            if (scheduleStatus) {
                scheduleStatus.textContent = '保存中...';
                scheduleStatus.classList.add('saving');
            }

            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }

            saveTimeout = setTimeout(async () => {
                SecurityUtils.safeSetStorage('office_schedule_content', scheduleText.value);

                if (syncManager.isLoggedIn()) {
                    if (scheduleStatus) {
                        scheduleStatus.textContent = '同步中...';
                    }

                    try {
                        const result = await syncManager.immediateSyncToCloud();
                        if (result && result.success) {
                            if (scheduleStatus) {
                                scheduleStatus.textContent = '已同步到云端';
                                scheduleStatus.classList.remove('saving');
                            }
                        } else {
                            if (scheduleStatus) {
                                scheduleStatus.textContent = '同步失败';
                            }
                        }
                    } catch (e) {
                        console.error('日程同步异常:', e);
                        if (scheduleStatus) {
                            scheduleStatus.textContent = '同步失败';
                        }
                    }

                    setTimeout(() => {
                        if (scheduleStatus) {
                            scheduleStatus.textContent = '自动保存';
                        }
                    }, 3000);
                } else {
                    if (scheduleStatus) {
                        scheduleStatus.textContent = '已保存到本地';
                        scheduleStatus.classList.remove('saving');
                    }
                    setTimeout(() => {
                        if (scheduleStatus) {
                            scheduleStatus.textContent = '登录后可同步云端';
                        }
                    }, 2000);
                }
            }, 500);
        });

        document.addEventListener('scheduleSynced', (e) => {
            const newContent = e.detail.content;
            if (newContent !== scheduleText.value) {
                scheduleText.value = newContent;
                SecurityUtils.safeSetStorage('office_schedule_content', newContent);
                if (scheduleStatus) {
                    scheduleStatus.textContent = '已从云端同步';
                    setTimeout(() => {
                        scheduleStatus.textContent = '自动保存';
                    }, 3000);
                }
            }
        });
    },

    initMemoPanel() {
        const memoPanel = document.getElementById('memoPanel');
        const memoToggle = document.getElementById('memoToggle');
        const memoClose = document.getElementById('memoClose');
        const memoText = document.getElementById('memoText');
        const memoStatus = document.getElementById('memoStatus');

        if (!memoPanel || !memoToggle || !memoText) return;

        // 加载保存的内容
        const savedMemo = SecurityUtils.safeGetStorage('office_memo_content');
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
                SecurityUtils.safeSetStorage('office_memo_content', memoText.value);

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
                SecurityUtils.safeSetStorage('office_memo_content', newContent);
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

};
