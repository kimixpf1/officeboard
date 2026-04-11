/**
 * 全局共享工具函数
 * 消除跨模块重复代码
 */

const SafeStorage = {
    get(key) {
        try { return localStorage.getItem(key); } catch (e) { console.warn('localStorage读取失败:', key, e.message); return null; }
    },
    set(key, val) {
        try { localStorage.setItem(key, val); return true; } catch (e) { console.warn('localStorage写入失败:', key, e.message); return false; }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) { console.warn('localStorage删除失败:', key, e.message); }
    }
};

async function fetchWithRetry(url, options, maxRetries = 3, logPrefix = 'API') {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok && (response.status === 429 || response.status >= 500)) {
                if (i === maxRetries - 1) return response;
                const delay = 1000 * Math.pow(2, i);
                console.warn(`[${logPrefix}] 请求失败 (状态码: ${response.status}), ${delay}ms 后进行第 ${i + 1} 次重试...`);
                await new Promise(res => setTimeout(res, delay));
                continue;
            }
            return response;
        } catch (e) {
            if (i === maxRetries - 1) throw e;
            const delay = 1000 * Math.pow(2, i);
            console.warn(`[${logPrefix}] 网络请求异常: ${e.message}, ${delay}ms 后进行第 ${i + 1} 次重试...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

const HolidayData = {
    holidays: {
        2024: [
            '2024-01-01',
            '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17',
            '2024-04-04', '2024-04-05', '2024-04-06',
            '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05',
            '2024-06-08', '2024-06-09', '2024-06-10',
            '2024-09-15', '2024-09-16', '2024-09-17',
            '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07',
        ],
        2025: [
            '2025-01-01',
            '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
            '2025-04-04', '2025-04-05', '2025-04-06',
            '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
            '2025-05-31', '2025-06-01', '2025-06-02',
            '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
        ],
        2026: [
            '2026-01-01', '2026-01-02', '2026-01-03',
            '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
            '2026-04-05', '2026-04-06', '2026-04-07',
            '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
            '2026-05-31', '2026-06-01', '2026-06-02',
            '2026-09-25', '2026-09-26', '2026-09-27',
            '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
        ]
    },
    makeupDays: {
        2024: [
            '2024-02-04', '2024-02-18', '2024-04-07', '2024-04-28', '2024-05-11', '2024-09-14', '2024-09-29', '2024-10-12',
        ],
        2025: [
            '2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11',
        ],
        2026: [
            '2026-02-14', '2026-02-15', '2026-04-26', '2026-09-27', '2026-10-10',
        ]
    },
    isHoliday(dateStr) {
        const year = parseInt(dateStr.substring(0, 4));
        return (this.holidays[year] || []).includes(dateStr);
    },
    isMakeupDay(dateStr) {
        const year = parseInt(dateStr.substring(0, 4));
        return (this.makeupDays[year] || []).includes(dateStr);
    }
};
