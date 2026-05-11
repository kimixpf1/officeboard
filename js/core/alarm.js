/**
 * 闹钟提醒模块
 * 支持每天/工作日/每周几 + 时间设置，提前3分钟闪烁提醒
 * 数据存储在 localStorage（SafeStorage 封装），纳入云端同步
 * 通过 Object.assign(OfficeDashboard.prototype, AlarmManager) 混入
 */
const AlarmManager = {

    ALARMS_KEY: 'office_alarms',

    initAlarmSystem() {
        this._activeAlarm = null;
        this._alarmDismissedAt = null;
        this.loadAlarms();

        document.addEventListener('alarmsSynced', (e) => {
            this.loadAlarms();
        });
        document.addEventListener('syncDataLoaded', () => {
            this.loadAlarms();
        });
    },

    loadAlarms() {
        try {
            const raw = SafeStorage.get(this.ALARMS_KEY);
            this._alarms = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this._alarms = [];
        }
    },

    saveAlarms() {
        SafeStorage.set(this.ALARMS_KEY, JSON.stringify(this._alarms));
    },

    getAlarms() {
        return this._alarms || [];
    },

    addAlarm(alarm) {
        const a = {
            id: 'alarm_' + Date.now(),
            label: alarm.label || '',
            time: alarm.time || '09:00',
            repeatMode: alarm.repeatMode || 'daily',
            weekDays: alarm.weekDays || [],
            enabled: true,
            createdAt: new Date().toISOString()
        };
        this._alarms.push(a);
        this.saveAlarms();
        return a;
    },

    removeAlarm(id) {
        this._alarms = this._alarms.filter(a => a.id !== id);
        this.saveAlarms();
    },

    toggleAlarm(id) {
        const alarm = this._alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            this.saveAlarms();
        }
        return alarm;
    },

    isWeekday() {
        const d = new Date().getDay();
        return d >= 1 && d <= 5;
    },

    shouldAlarmTrigger(alarm) {
        if (!alarm.enabled) return false;
        const now = new Date();
        const today = now.getDay();
        switch (alarm.repeatMode) {
            case 'daily': return true;
            case 'weekday': return this.isWeekday();
            case 'weekly': return alarm.weekDays && alarm.weekDays.includes(today);
            default: return false;
        }
    },

    checkAlarms() {
        if (this._alarmDismissedAt) {
            const elapsed = Date.now() - this._alarmDismissedAt;
            if (elapsed < 120000) return false;
            this._alarmDismissedAt = null;
        }

        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const nowSeconds = now.getSeconds();

        for (const alarm of this._alarms) {
            if (!this.shouldAlarmTrigger(alarm)) continue;
            const [h, m] = alarm.time.split(':').map(Number);
            const alarmMinutes = h * 60 + m;
            const diff = alarmMinutes - nowMinutes;

            if (diff === 3 && nowSeconds < 2) {
                this._activeAlarm = alarm;
                this.showAlarmNotice(alarm, true);
                return true;
            }
            if (diff >= 0 && diff <= 3) {
                if (!this._activeAlarm || this._activeAlarm.id !== alarm.id) {
                    this._activeAlarm = alarm;
                }
                this.showAlarmNotice(alarm, false);
                return true;
            }
        }
        if (this._activeAlarm) {
            this._activeAlarm = null;
            this.hideAlarmNotice();
        }
        return false;
    },

    showAlarmNotice(alarm, justStarted) {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;

        this.hideIdleNotice();
        noticeEl.hidden = false;
        noticeEl.classList.remove('todo-reminder-active', 'idle-mode');
        noticeEl.classList.add('alarm-active', 'todo-reminder-flashing');

        const titleEl = noticeEl.querySelector('.countdown-notice-title');
        const descEl = noticeEl.querySelector('.countdown-notice-desc');
        const badgeEl = noticeEl.querySelector('.countdown-notice-badge');
        const completeBtn = document.getElementById('todoReminderCompleteBtn');

        const now = new Date();
        const [h, m] = alarm.time.split(':').map(Number);
        const alarmMinutes = h * 60 + m;
        const nowTotal = now.getHours() * 60 + now.getMinutes();
        const remaining = alarmMinutes - nowTotal;

        if (titleEl) titleEl.textContent = `⏰ ${alarm.label || '闹钟提醒'}`;
        if (descEl) descEl.textContent = remaining > 0 ? `还有 ${remaining} 分钟 (${alarm.time})` : `时间到！(${alarm.time})`;
        if (badgeEl) badgeEl.textContent = '闹钟';

        if (completeBtn) {
            completeBtn.style.display = '';
            completeBtn.textContent = '✓';
            completeBtn.title = '关闭闹钟';
            completeBtn.onclick = () => this.dismissAlarm(alarm.id);
        }
    },

    hideAlarmNotice() {
        const noticeEl = document.getElementById('countdownNotice');
        if (!noticeEl) return;
        noticeEl.classList.remove('alarm-active', 'todo-reminder-flashing');
        const completeBtn = document.getElementById('todoReminderCompleteBtn');
        if (completeBtn && !noticeEl.classList.contains('todo-reminder-active')) {
            completeBtn.style.display = 'none';
            completeBtn.onclick = null;
        }
    },

    dismissAlarm(id) {
        this._activeAlarm = null;
        this._alarmDismissedAt = Date.now();
        this.hideAlarmNotice();
        this.updateCountdownNotice();
    },

    showAlarmSettings() {
        let overlay = document.getElementById('alarmSettingsOverlay');
        if (overlay) { overlay.remove(); return; }

        overlay = document.createElement('div');
        overlay.id = 'alarmSettingsOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:var(--bg-primary);border-radius:12px;padding:20px;width:340px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div style="font-size:16px;font-weight:600;color:var(--text-primary);">⏰ 闹钟设置</div>
                    <button id="alarmSettingsClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);">×</button>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">提醒内容</label>
                    <input type="text" id="alarmLabelInput" placeholder="如：吃饭、开会" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">时间</label>
                    <input type="time" id="alarmTimeInput" value="09:00" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">重复</label>
                    <select id="alarmRepeatSelect" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">
                        <option value="daily">每天</option>
                        <option value="weekday">工作日（周一到周五）</option>
                        <option value="weekly">每周几</option>
                    </select>
                </div>
                <div id="alarmWeekDaysRow" style="display:none;margin-bottom:16px;">
                    <div style="display:flex;gap:4px;justify-content:space-between;">
                        ${['日','一','二','三','四','五','六'].map((d,i) => `<label style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;font-size:13px;"><input type="checkbox" value="${i}" style="display:none;" class="alarm-weekday-check">${d}</label>`).join('')}
                    </div>
                </div>
                <button id="alarmAddBtn" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--primary-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:16px;">添加闹钟</button>
                <button id="alarmCancelEditBtn" style="display:none;width:100%;padding:6px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);font-size:13px;cursor:pointer;margin-bottom:16px;">取消编辑</button>
                <div id="alarmListContainer" style="border-top:1px solid var(--border-color);padding-top:12px;">
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">已有闹钟</div>
                    <div id="alarmList"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const repeatSelect = overlay.querySelector('#alarmRepeatSelect');
        const weekDaysRow = overlay.querySelector('#alarmWeekDaysRow');
        repeatSelect.addEventListener('change', () => {
            weekDaysRow.style.display = repeatSelect.value === 'weekly' ? '' : 'none';
        });

        const weekdayLabels = overlay.querySelectorAll('.alarm-weekday-check');
        weekdayLabels.forEach(cb => {
            cb.parentElement.addEventListener('click', (e) => {
                e.preventDefault();
                cb.checked = !cb.checked;
                cb.parentElement.style.background = cb.checked ? 'var(--primary-color)' : '';
                cb.parentElement.style.color = cb.checked ? '#fff' : '';
            });
        });

        const renderList = () => {
            const listEl = overlay.querySelector('#alarmList');
            const addBtn = overlay.querySelector('#alarmAddBtn');
            const cancelBtn = overlay.querySelector('#alarmCancelEditBtn');
            const weekDaysRow = overlay.querySelector('#alarmWeekDaysRow');
            const alarms = this.getAlarms();
            if (!alarms.length) {
                listEl.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:8px;">暂无闹钟</div>';
                return;
            }
            listEl.innerHTML = alarms.map(a => {
                const safeLabel = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(a.label || '') : (a.label || '');
                const safeTime = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(a.time) : a.time;
                const repeatText = a.repeatMode === 'daily' ? '每天' : a.repeatMode === 'weekday' ? '工作日' : `每周${(a.weekDays||[]).map(d => ['日','一','二','三','四','五','六'][d]).join('、')}`;
                return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                    <label style="cursor:pointer;flex-shrink:0;"><input type="checkbox" ${a.enabled ? 'checked' : ''} data-alarm-toggle="${a.id}" style="display:none;"><span style="display:inline-block;width:36px;height:20px;border-radius:10px;background:${a.enabled ? 'var(--primary-color)' : 'var(--gray-300)'};position:relative;transition:background 0.2s;"><span style="position:absolute;top:2px;left:${a.enabled ? '18px' : '2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;"></span></span></label>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:600;color:var(--text-primary);${a.enabled ? '' : 'opacity:0.5;'}">${safeTime} ${safeLabel}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${repeatText}</div>
                    </div>
                    <button data-alarm-edit="${a.id}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;" title="编辑">✎</button>
                    <button data-alarm-delete="${a.id}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:4px;">×</button>
                </div>`;
            }).join('');

            listEl.querySelectorAll('[data-alarm-toggle]').forEach(cb => {
                cb.parentElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = cb.dataset.alarmToggle;
                    this.toggleAlarm(id);
                    renderList();
                });
            });
            listEl.querySelectorAll('[data-alarm-delete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.removeAlarm(btn.dataset.alarmDelete);
                    renderList();
                });
            });
            listEl.querySelectorAll('[data-alarm-edit]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const alarm = this._alarms.find(a => a.id === btn.dataset.alarmEdit);
                    if (!alarm) return;
                    this._editingAlarmId = alarm.id;
                    overlay.querySelector('#alarmLabelInput').value = alarm.label || '';
                    overlay.querySelector('#alarmTimeInput').value = alarm.time;
                    overlay.querySelector('#alarmRepeatSelect').value = alarm.repeatMode;
                    weekDaysRow.style.display = alarm.repeatMode === 'weekly' ? '' : 'none';
                    overlay.querySelectorAll('.alarm-weekday-check').forEach(cb => {
                        cb.checked = (alarm.weekDays || []).includes(parseInt(cb.value));
                        cb.parentElement.style.background = cb.checked ? 'var(--primary-color)' : '';
                        cb.parentElement.style.color = cb.checked ? '#fff' : '';
                    });
                    addBtn.textContent = '更新闹钟';
                    cancelBtn.style.display = '';
                });
            });
        };
        renderList();

        overlay.querySelector('#alarmAddBtn').addEventListener('click', () => {
            const label = overlay.querySelector('#alarmLabelInput').value.trim();
            const time = overlay.querySelector('#alarmTimeInput').value;
            const repeat = overlay.querySelector('#alarmRepeatSelect').value;
            const weekDays = [...overlay.querySelectorAll('.alarm-weekday-check:checked')].map(cb => parseInt(cb.value));

            if (!time) { this.showError('请选择时间'); return; }
            if (this._editingAlarmId) {
                const alarm = this._alarms.find(a => a.id === this._editingAlarmId);
                if (alarm) {
                    alarm.label = label;
                    alarm.time = time;
                    alarm.repeatMode = repeat;
                    alarm.weekDays = weekDays;
                    this.saveAlarms();
                    this.showSuccess(`闹钟已更新：${time} ${label}`);
                }
                this._editingAlarmId = null;
                overlay.querySelector('#alarmAddBtn').textContent = '添加闹钟';
                overlay.querySelector('#alarmCancelEditBtn').style.display = 'none';
            } else {
                this.addAlarm({ label, time, repeatMode: repeat, weekDays });
                this.showSuccess(`闹钟已添加：${time} ${label}`);
            }
            overlay.querySelector('#alarmLabelInput').value = '';
            renderList();
        });

        overlay.querySelector('#alarmCancelEditBtn').addEventListener('click', () => {
            this._editingAlarmId = null;
            overlay.querySelector('#alarmLabelInput').value = '';
            overlay.querySelector('#alarmAddBtn').textContent = '添加闹钟';
            overlay.querySelector('#alarmCancelEditBtn').style.display = 'none';
            const weekDaysRow = overlay.querySelector('#alarmWeekDaysRow');
            weekDaysRow.style.display = 'none';
            overlay.querySelectorAll('.alarm-weekday-check').forEach(cb => {
                cb.checked = false;
                cb.parentElement.style.background = '';
                cb.parentElement.style.color = '';
            });
        });

        const close = () => { this._editingAlarmId = null; overlay.remove(); this.hideContextMenu?.(); };
        overlay.querySelector('#alarmSettingsClose').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }
};
