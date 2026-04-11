(function () {
    function getReasonHtml(reason, color = '#64748b') {
        if (!reason) {
            return '';
        }

        return `<div style="margin-top:4px;font-size:12px;color:${color};">依据：${reason}</div>`;
    }

    function getSkippedTitle(item) {
        return typeof item === 'string' ? item : (item?.title || '未知事项');
    }

    function getSkippedReason(item) {
        return typeof item === 'string' ? '' : (item?.reason || '');
    }

    function getMatchedExistingHtml(item, color = '#475569') {
        const matched = item?.matchedExistingSummary;
        if (!matched?.title && !matched?.summaryText) {
            return '';
        }

        const title = matched.title || '已有事项';
        const summaryText = matched.summaryText || '';
        return `<div style="margin-top:4px;font-size:12px;color:${color};">匹配到：${title}${summaryText ? `｜${summaryText}` : ''}</div>`;
    }

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
                html += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${typeIcon}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);white-space:nowrap;color:inherit;">${dateTime || '-'}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${title}${getReasonHtml(item.previewReason)}${getMatchedExistingHtml(item)}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${attendeesStr}</td></tr>`;
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
                html += `<tr style="background:${bgColor};"><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">📅 ${title}${getReasonHtml(item.reason)}${getMatchedExistingHtml(item)}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;">${targetTitle}</td><td style="padding:8px;border-bottom:1px solid var(--border-color,#eee);color:#f59e0b;font-weight:500;">+${addedStr}</td></tr>`;
            });
            html += `</table></div>`;
        }

        if (result.skippedItems?.length > 0) {
            html += `<div style="margin-bottom:16px;">`;
            html += `<h5 style="color:#6b7280;margin-bottom:10px;padding:6px 10px;background:rgba(107,114,128,0.1);border-radius:4px;">⏭️ ${sectionPrefix}跳过重复 (${result.skippedItems.length}个)</h5>`;
            html += `<ul style="margin:0;padding-left:20px;font-size:12px;opacity:0.7;">`;
            result.skippedItems.forEach(item => {
                html += `<li style="margin:4px 0;">${getSkippedTitle(item)}${getReasonHtml(getSkippedReason(item), '#6b7280')}${getMatchedExistingHtml(item, '#6b7280')}</li>`;
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
                html += `<li style="margin:6px 0;">${title}${dateTime ? `（${dateTime}）` : ''}${getReasonHtml(item.previewReason)}${getMatchedExistingHtml(item)}</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.mergedItems?.length) {
            html += `<div style="margin-bottom:16px;"><h5 style="color:#f59e0b;margin:0 0 10px;">🔄 ${sectionPrefix}合并参会人员 (${result.mergedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.mergedItems.forEach(item => {
                const title = item.title || '未知事项';
                const targetTitle = item.targetTitle || title;
                const added = item.addedAttendees?.join('、') || '-';
                html += `<li style="margin:6px 0;">${title} → ${targetTitle}（新增：${added}）${getReasonHtml(item.reason, '#b45309')}${getMatchedExistingHtml(item, '#92400e')}</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.skippedItems?.length) {
            html += `<div><h5 style="color:#6b7280;margin:0 0 10px;">⏭️ ${sectionPrefix}跳过重复 (${result.skippedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.skippedItems.forEach(item => {
                html += `<li style="margin:6px 0;">${getSkippedTitle(item)}${getReasonHtml(getSkippedReason(item), '#6b7280')}${getMatchedExistingHtml(item, '#6b7280')}</li>`;
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

    async function compressImageIfNeeded(file, maxSizeMB = 2) {
        if (!file.type.startsWith('image/')) return file;
        if (file.size <= maxSizeMB * 1024 * 1024) return file;

        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                const maxDim = 2048;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size < file.size) {
                            const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                            console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB`);
                            resolve(compressed);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            img.src = url;
        });
    }

    window.UploadFlowUtils = {
        buildRecognitionSummaryHtml,
        showRecognitionPreviewModal,
        compressImageIfNeeded
    };
})();
