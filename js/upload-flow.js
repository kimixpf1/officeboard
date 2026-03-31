(function () {
    function buildDetailedSummaryHtml(fileName, result, isPreview) {
        const sectionPrefix = isPreview ? '待' : '';
        let html = `<div style="text-align:left; max-height:500px; overflow-y:auto;color:inherit;">`;
        html += `<h4 style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color,#eee);">📄 文件：${fileName}</h4>`;

        const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
        html += `<div style="margin-bottom:16px;padding:10px;background:var(--card-bg,#f8fafc);border-radius:6px;">`;
        html += `<b>${isPreview ? '识别预览' : '识别汇总'}：</b>共识别 ${totalCount} 条记录`;
        html += ` → <span style="color:#10b981;">${sectionPrefix}新增 ${result.items?.length || 0}</span>`;
        html += ` | <span style="color:#f59e0b;">${sectionPrefix}合并 ${result.mergedItems?.length || 0}</span>`;
        html += ` | <span style="color:#6b7280;">${sectionPrefix}跳过 ${result.skippedItems?.length || 0}</span>`;
        html += `</div>`;

        if (result.items?.length > 0) {
            html += `<div style="margin-bottom:16px;">`;
            html += `<h5 style="color:#10b981;margin-bottom:10px;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:4px;">✅ ${sectionPrefix}新增事项 (${result.items.length}个)</h5>`;
            html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
            html += `<tr style="background:var(--header-bg,#f1f5f9);"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">类型</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">日期时间</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">事项名称</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">参会人员</th></tr>`;
            result.items.forEach((item, idx) => {
                if (!item) return;
                const typeIcon = { meeting: '📅 会议', todo: '☑️ 待办', document: '📄 办文' }[item.type] || '📌';
                const title = item.title || item.displayTitle || '未知事项';
                let dateStr = item.date || '';
                if (item.endDate && item.endDate !== item.date) {
                    dateStr = `${item.date} 至 ${item.endDate}`;
                }
                let timeStr = item.time || '';
                if (item.endTime) {
                    timeStr = `${item.time}-${item.endTime}`;
                }
                const dateTime = dateStr + (timeStr ? ` ${timeStr}` : '');
                const attendees = Array.isArray(item.attendees) ? item.attendees : [];
                const attendeesStr = attendees.length > 0 ? attendees.join('、') : '-';
                const bgColor = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                html += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${typeIcon}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);white-space:nowrap;color:inherit;">${dateTime || '-'}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${title}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${attendeesStr}</td></tr>`;
            });
            html += `</table></div>`;
        }

        if (result.mergedItems?.length > 0) {
            html += `<div style="margin-bottom:16px;">`;
            html += `<h5 style="color:#f59e0b;margin-bottom:10px;padding:6px 10px;background:rgba(245,158,11,0.1);border-radius:4px;">🔄 ${sectionPrefix}合并参会人员 (${result.mergedItems.length}个)</h5>`;
            html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
            html += `<tr style="background:var(--header-bg,#f1f5f9);"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">识别事项</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">归并到</th><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;">新增参会人员</th></tr>`;
            result.mergedItems.forEach((item, idx) => {
                const title = item.title || '未知事项';
                const targetTitle = item.targetTitle || title;
                const addedStr = item.addedAttendees?.length ? item.addedAttendees.join('、') : '-';
                const bgColor = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                html += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">📅 ${title}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${targetTitle}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:#f59e0b;font-weight:500;">+${addedStr}</td></tr>`;
            });
            html += `</table></div>`;
        }

        if (result.skippedItems?.length > 0) {
            html += `<div style="margin-bottom:16px;">`;
            html += `<h5 style="color:#6b7280;margin-bottom:10px;padding:6px 10px;background:rgba(107,114,128,0.1);border-radius:4px;">⏭️ ${sectionPrefix}跳过重复 (${result.skippedItems.length}个)</h5>`;
            html += `<ul style="margin:0;padding-left:20px;font-size:12px;opacity:0.7;">`;
            result.skippedItems.forEach(title => {
                html += `<li style="margin:4px 0;">${title}</li>`;
            });
            html += `</ul></div>`;
        }

        if (isPreview) {
            html += `<div style="padding:10px 12px;border-radius:6px;background:rgba(37,99,235,0.08);color:var(--text-color,#334155);font-size:13px;">确认后才会写入面板；取消则不会新增或合并任何事项。</div>`;
        }

        html += `</div>`;
        return html;
    }

    function buildCompactSummaryHtml(fileName, result, isPreview) {
        const sectionPrefix = isPreview ? '待' : '';
        let html = `<div style="text-align:left;color:inherit;">`;
        html += `<h4 style="margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">📄 文件：${fileName}</h4>`;
        const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
        html += `<div style="margin-bottom:16px;padding:10px;background:#f8fafc;border-radius:6px;">`;
        html += `<b>${isPreview ? '识别预览' : '识别汇总'}：</b>共识别 ${totalCount} 条记录`;
        html += ` → <span style="color:#10b981;">${sectionPrefix}新增 ${result.items?.length || 0}</span>`;
        html += ` | <span style="color:#f59e0b;">${sectionPrefix}合并 ${result.mergedItems?.length || 0}</span>`;
        html += ` | <span style="color:#6b7280;">${sectionPrefix}跳过 ${result.skippedItems?.length || 0}</span>`;
        html += `</div>`;

        if (result.items?.length) {
            html += `<div style="margin-bottom:16px;"><h5 style="color:#10b981;margin:0 0 10px;">✅ ${sectionPrefix}新增事项 (${result.items.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.items.forEach(item => {
                const title = item.title || item.displayTitle || '未知事项';
                const dateTime = [item.date, item.time].filter(Boolean).join(' ');
                html += `<li style="margin:6px 0;">${title}${dateTime ? `（${dateTime}）` : ''}</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.mergedItems?.length) {
            html += `<div style="margin-bottom:16px;"><h5 style="color:#f59e0b;margin:0 0 10px;">🔄 ${sectionPrefix}合并参会人员 (${result.mergedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.mergedItems.forEach(item => {
                const title = item.title || '未知事项';
                const targetTitle = item.targetTitle || title;
                const added = item.addedAttendees?.join('、') || '-';
                html += `<li style="margin:6px 0;">${title} → ${targetTitle}（新增：${added}）</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.skippedItems?.length) {
            html += `<div><h5 style="color:#6b7280;margin:0 0 10px;">⏭️ ${sectionPrefix}跳过重复 (${result.skippedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.skippedItems.forEach(title => {
                html += `<li style="margin:6px 0;">${title}</li>`;
            });
            html += `</ul></div>`;
        }

        if (isPreview) {
            html += `<div style="margin-top:12px;padding:10px;background:#eff6ff;border-radius:8px;color:#1e40af;">确认后才会写入主面板；取消则不保存。</div>`;
        }

        html += `</div>`;
        return html;
    }

    function buildRecognitionSummaryHtml(fileName, result, isPreview, layout = 'detailed') {
        if (layout === 'compact') {
            return buildCompactSummaryHtml(fileName, result, isPreview);
        }
        return buildDetailedSummaryHtml(fileName, result, isPreview);
    }

    function showRecognitionPreviewModal(fileName, result, options = {}) {
        const hasActions = (result.items?.length || 0) > 0 || (result.mergedItems?.length || 0) > 0;
        const layout = options.layout || 'detailed';
        const content = buildRecognitionSummaryHtml(fileName, result, true, layout);

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = options.overlayClassName || 'modal active';
            if (options.overlayId) {
                overlay.id = options.overlayId;
            }

            const closeButtonHtml = options.showCloseButton === false
                ? ''
                : `<button type="button" class="${options.closeButtonClass || 'btn-close'}">${options.closeButtonText || '×'}</button>`;

            overlay.innerHTML = `
                <div class="${options.dialogClassName || 'modal-content'}" style="${options.dialogStyle || 'max-width: 680px;'}">
                    <div class="${options.headerClassName || 'modal-header'}">
                        ${options.headerHtml || '<h3>识别前预览确认</h3>'}
                        ${closeButtonHtml}
                    </div>
                    <div class="${options.bodyClassName || 'modal-body'}" style="${options.bodyStyle || 'padding: 16px;'}">
                        ${content}
                    </div>
                    <div class="${options.footerClassName || 'modal-actions'}">
                        <button type="button" class="${options.cancelButtonClass || 'btn-secondary'} preview-cancel">${hasActions ? (options.cancelText || '取消保存') : (options.emptyText || '关闭')}</button>
                        ${hasActions ? `<button type="button" class="${options.confirmButtonClass || 'btn-primary'} preview-confirm">${options.confirmText || '确认保存'}</button>` : ''}
                    </div>
                </div>
            `;

            let settled = false;
            const finish = (confirmed) => {
                if (settled) {
                    return;
                }
                settled = true;
                overlay.remove();
                resolve(confirmed);
            };

            overlay.querySelector(`.${options.closeButtonClass || 'btn-close'}`)?.addEventListener('click', () => finish(false));
            overlay.querySelector('.preview-cancel')?.addEventListener('click', () => finish(false));
            overlay.querySelector('.preview-confirm')?.addEventListener('click', () => finish(true));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    finish(false);
                }
            });

            document.body.appendChild(overlay);
        });
    }

    window.UploadFlowUtils = {
        buildRecognitionSummaryHtml,
        showRecognitionPreviewModal
    };
})();
