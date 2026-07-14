/**
 * 撤回操作描述生成器（纯函数）
 * 把 undoHistory 里的一条记录翻译成人类可读的摘要，供撤回前确认弹窗显示。
 * 优先使用 saveUndoHistory 时传入的 label（精准），否则按 action+data 通用推导。
 */
(function () {
    'use strict';

    // 取事项的可读标题，容错多种字段名
    function titleOf(it) {
        if (!it) return '事项';
        return it.title || it.text || it.name || it.content || '事项';
    }

    function describeUndoAction(act) {
        if (!act) return '上一步操作';
        if (act.label) return act.label;

        const d = act.data || {};
        switch (act.action) {
            case 'delete': {
                const items = Array.isArray(d.items) ? d.items : (d.item ? [d.item] : []);
                if (items.length === 1) return '删除「' + titleOf(items[0]) + '」';
                if (items.length > 1) return '删除 ' + items.length + ' 个事项';
                return '删除事项';
            }
            case 'add': {
                const n = Array.isArray(d.ids) ? d.ids.length : 1;
                return n === 1 ? '新增事项' : '新增 ' + n + ' 个事项';
            }
            case 'update': {
                const items = Array.isArray(d.items) ? d.items : (d.item ? [d.item] : []);
                if (items.length === 1) return '修改「' + titleOf(items[0]) + '」';
                if (items.length > 1) return '修改 ' + items.length + ' 个事项';
                return '修改事项';
            }
            case 'reorder': {
                return '调整' + (d.typeLabel || '列表') + '顺序';
            }
            default:
                return '上一步操作';
        }
    }

    window.describeUndoAction = describeUndoAction;
})();
