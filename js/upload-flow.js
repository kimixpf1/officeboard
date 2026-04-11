(function () {
    function appendReason(parent, reason, color = '#64748b') {
        if (!reason) return;
        const div = document.createElement('div');
        div.style.cssText = `margin-top:4px;font-size:12px;color:${color};`;
        div.textContent = '依据：' + reason;
        parent.appendChild(div);
    }

    function getSkippedTitle(item) {
        return typeof item === 'string' ? item : (item?.title || '未知事项');
    }

    function getSkippedReason(item) {
        return typeof item === 'string' ? '' : (item?.reason || '');
    }

    function appendMatchedExisting(parent, item, color = '#475569') {
        const matched = item?.matchedExistingSummary;
        if (!matched?.title && !matched?.summaryText) return;
        const div = document.createElement('div');
        div.style.cssText = `margin-top:4px;font-size:12px;color:${color};`;
        const title = matched.title || '已有事项';
        const summaryText = matched.summaryText || '';
        div.textContent = '匹配到：' + title + (summaryText ? '｜' + summaryText : '');
        parent.appendChild(div);
    }

    function buildDetailedSummaryHtml(fileName, result, isPreview) {
        const sectionPrefix = isPreview ? '待' : '';
        const container = document.createElement('div');
        container.style.cssText = 'text-align:left; max-height:500px; overflow-y:auto;color:inherit;';

        const h4 = document.createElement('h4');
        h4.style.cssText = 'margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color,#eee);';
        h4.textContent = '📄 文件：' + fileName;
        container.appendChild(h4);

        const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
        const summaryBox = document.createElement('div');
        summaryBox.style.cssText = 'margin-bottom:16px;padding:10px;background:var(--card-bg,#f8fafc);border-radius:6px;';
        const summaryB = document.createElement('b');
        summaryB.textContent = (isPreview ? '识别预览' : '识别汇总') + '：共识别 ' + totalCount + ' 条记录';
        summaryBox.appendChild(summaryB);
        summaryBox.appendChild(document.createTextNode(' → '));
        const spanNew = document.createElement('span');
        spanNew.style.color = '#10b981';
        spanNew.textContent = sectionPrefix + '新增 ' + (result.items?.length || 0);
        summaryBox.appendChild(spanNew);
        summaryBox.appendChild(document.createTextNode(' | '));
        const spanMerge = document.createElement('span');
        spanMerge.style.color = '#f59e0b';
        spanMerge.textContent = sectionPrefix + '合并 ' + (result.mergedItems?.length || 0);
        summaryBox.appendChild(spanMerge);
        summaryBox.appendChild(document.createTextNode(' | '));
        const spanSkip = document.createElement('span');
        spanSkip.style.color = '#6b7280';
        spanSkip.textContent = sectionPrefix + '跳过 ' + (result.skippedItems?.length || 0);
        summaryBox.appendChild(spanSkip);
        container.appendChild(summaryBox);

        if (result.items?.length > 0) {
            const section = document.createElement('div');
            section.style.marginBottom = '16px';
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#10b981;margin-bottom:10px;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:4px;';
            h5.textContent = '✅ ' + sectionPrefix + '新增事项 (' + result.items.length + '个)';
            section.appendChild(h5);
            const table = document.createElement('table');
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
            const thead = document.createElement('tr');
            thead.style.background = 'var(--header-bg,#f1f5f9)';
            const typeIconMap = { meeting: '📅 会议', todo: '☑️ 待办', document: '📄 办文' };
            ['类型', '日期时间', '事项名称', '参会人员'].forEach(label => {
                const th = document.createElement('th');
                th.style.cssText = 'padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;';
                th.textContent = label;
                thead.appendChild(th);
            });
            table.appendChild(thead);
            result.items.forEach((item, idx) => {
                if (!item) return;
                const tr = document.createElement('tr');
                tr.style.background = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                const td1 = document.createElement('td');
                td1.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;';
                td1.textContent = typeIconMap[item.type] || '📌';
                tr.appendChild(td1);
                const td2 = document.createElement('td');
                td2.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);white-space:nowrap;color:inherit;';
                let dateStr = item.date || '';
                if (item.endDate && item.endDate !== item.date) dateStr = item.date + ' 至 ' + item.endDate;
                let timeStr = item.time || '';
                if (item.endTime) timeStr = item.time + '-' + item.endTime;
                td2.textContent = (dateStr + (timeStr ? ' ' + timeStr : '')) || '-';
                tr.appendChild(td2);
                const td3 = document.createElement('td');
                td3.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;';
                td3.textContent = item.title || item.displayTitle || '未知事项';
                appendReason(td3, item.previewReason);
                appendMatchedExisting(td3, item);
                tr.appendChild(td3);
                const td4 = document.createElement('td');
                td4.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;';
                const attendees = Array.isArray(item.attendees) ? item.attendees : [];
                td4.textContent = attendees.length > 0 ? attendees.join('、') : '-';
                tr.appendChild(td4);
                table.appendChild(tr);
            });
            section.appendChild(table);
            container.appendChild(section);
        }

        if (result.mergedItems?.length > 0) {
            const section = document.createElement('div');
            section.style.marginBottom = '16px';
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#f59e0b;margin-bottom:10px;padding:6px 10px;background:rgba(245,158,11,0.1);border-radius:4px;';
            h5.textContent = '🔄 ' + sectionPrefix + '合并参会人员 (' + result.mergedItems.length + '个)';
            section.appendChild(h5);
            const table = document.createElement('table');
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
            const thead = document.createElement('tr');
            thead.style.background = 'var(--header-bg,#f1f5f9)';
            ['识别事项', '归并到', '新增参会人员'].forEach(label => {
                const th = document.createElement('th');
                th.style.cssText = 'padding:8px;text-align:left;border-bottom:1px solid var(--border-color,#ddd);color:inherit;';
                th.textContent = label;
                thead.appendChild(th);
            });
            table.appendChild(thead);
            result.mergedItems.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.style.background = idx % 2 === 0 ? 'var(--row-bg-1,transparent)' : 'var(--row-bg-2,rgba(0,0,0,0.02))';
                const td1 = document.createElement('td');
                td1.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;';
                td1.textContent = '📅 ' + (item.title || '未知事项');
                appendReason(td1, item.reason);
                appendMatchedExisting(td1, item);
                tr.appendChild(td1);
                const td2 = document.createElement('td');
                td2.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:inherit;';
                td2.textContent = item.targetTitle || item.title || '未知事项';
                tr.appendChild(td2);
                const td3 = document.createElement('td');
                td3.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color,#eee);color:#f59e0b;font-weight:500;';
                td3.textContent = '+' + (item.addedAttendees?.length ? item.addedAttendees.join('、') : '-');
                tr.appendChild(td3);
                table.appendChild(tr);
            });
            section.appendChild(table);
            container.appendChild(section);
        }

        if (result.skippedItems?.length > 0) {
            const section = document.createElement('div');
            section.style.marginBottom = '16px';
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#6b7280;margin-bottom:10px;padding:6px 10px;background:rgba(107,114,128,0.1);border-radius:4px;';
            h5.textContent = '⏭️ ' + sectionPrefix + '跳过重复 (' + result.skippedItems.length + '个)';
            section.appendChild(h5);
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0;padding-left:20px;font-size:12px;opacity:0.7;';
            result.skippedItems.forEach(item => {
                const li = document.createElement('li');
                li.style.margin = '4px 0';
                li.textContent = getSkippedTitle(item);
                appendReason(li, getSkippedReason(item), '#6b7280');
                appendMatchedExisting(li, item, '#6b7280');
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }

        if (isPreview) {
            const tip = document.createElement('div');
            tip.style.cssText = 'padding:10px 12px;border-radius:6px;background:rgba(37,99,235,0.08);color:var(--text-color,#334155);font-size:13px;';
            tip.textContent = '确认后才会写入面板；取消则不会新增或合并任何事项。';
            container.appendChild(tip);
        }

        return container;
    }

    function buildCompactSummaryHtml(fileName, result, isPreview) {
        const sectionPrefix = isPreview ? '待' : '';
        const container = document.createElement('div');
        container.style.cssText = 'text-align:left;color:inherit;';

        const h4 = document.createElement('h4');
        h4.style.cssText = 'margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;';
        h4.textContent = '📄 文件：' + fileName;
        container.appendChild(h4);

        const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
        const summaryBox = document.createElement('div');
        summaryBox.style.cssText = 'margin-bottom:16px;padding:10px;background:#f8fafc;border-radius:6px;';
        const summaryB = document.createElement('b');
        summaryB.textContent = (isPreview ? '识别预览' : '识别汇总') + '：共识别 ' + totalCount + ' 条记录';
        summaryBox.appendChild(summaryB);
        summaryBox.appendChild(document.createTextNode(' → '));
        const spanNew = document.createElement('span');
        spanNew.style.color = '#10b981';
        spanNew.textContent = sectionPrefix + '新增 ' + (result.items?.length || 0);
        summaryBox.appendChild(spanNew);
        summaryBox.appendChild(document.createTextNode(' | '));
        const spanMerge = document.createElement('span');
        spanMerge.style.color = '#f59e0b';
        spanMerge.textContent = sectionPrefix + '合并 ' + (result.mergedItems?.length || 0);
        summaryBox.appendChild(spanMerge);
        summaryBox.appendChild(document.createTextNode(' | '));
        const spanSkip = document.createElement('span');
        spanSkip.style.color = '#6b7280';
        spanSkip.textContent = sectionPrefix + '跳过 ' + (result.skippedItems?.length || 0);
        summaryBox.appendChild(spanSkip);
        container.appendChild(summaryBox);

        if (result.items?.length) {
            const section = document.createElement('div');
            section.style.marginBottom = '16px';
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#10b981;margin:0 0 10px;';
            h5.textContent = '✅ ' + sectionPrefix + '新增事项 (' + result.items.length + '个)';
            section.appendChild(h5);
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0;padding-left:18px;';
            result.items.forEach(item => {
                const li = document.createElement('li');
                li.style.margin = '6px 0';
                const title = item.title || item.displayTitle || '未知事项';
                const dateTime = [item.date, item.time].filter(Boolean).join(' ');
                li.textContent = title + (dateTime ? '（' + dateTime + '）' : '');
                appendReason(li, item.previewReason);
                appendMatchedExisting(li, item);
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }

        if (result.mergedItems?.length) {
            const section = document.createElement('div');
            section.style.marginBottom = '16px';
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#f59e0b;margin:0 0 10px;';
            h5.textContent = '🔄 ' + sectionPrefix + '合并参会人员 (' + result.mergedItems.length + '个)';
            section.appendChild(h5);
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0;padding-left:18px;';
            result.mergedItems.forEach(item => {
                const li = document.createElement('li');
                li.style.margin = '6px 0';
                const title = item.title || '未知事项';
                const targetTitle = item.targetTitle || title;
                const added = item.addedAttendees?.join('、') || '-';
                li.textContent = title + ' → ' + targetTitle + '（新增：' + added + '）';
                appendReason(li, item.reason, '#b45309');
                appendMatchedExisting(li, item, '#92400e');
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }

        if (result.skippedItems?.length) {
            const section = document.createElement('div');
            const h5 = document.createElement('h5');
            h5.style.cssText = 'color:#6b7280;margin:0 0 10px;';
            h5.textContent = '⏭️ ' + sectionPrefix + '跳过重复 (' + result.skippedItems.length + '个)';
            section.appendChild(h5);
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0;padding-left:18px;';
            result.skippedItems.forEach(item => {
                const li = document.createElement('li');
                li.style.margin = '6px 0';
                li.textContent = getSkippedTitle(item);
                appendReason(li, getSkippedReason(item), '#6b7280');
                appendMatchedExisting(li, item, '#6b7280');
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }

        if (isPreview) {
            const tip = document.createElement('div');
            tip.style.cssText = 'margin-top:12px;padding:10px;background:#eff6ff;border-radius:8px;color:#1e40af;';
            tip.textContent = '确认后才会写入主面板；取消则不保存。';
            container.appendChild(tip);
        }

        return container;
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
        const contentEl = buildRecognitionSummaryHtml(fileName, result, true, layout);

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = options.overlayClassName || 'modal active';
            if (options.overlayId) {
                overlay.id = options.overlayId;
            }

            const dialog = document.createElement('div');
            dialog.className = options.dialogClassName || 'modal-content';
            dialog.style.cssText = options.dialogStyle || 'max-width: 680px;';

            const header = document.createElement('div');
            header.className = options.headerClassName || 'modal-header';
            if (options.headerContent) {
                header.appendChild(options.headerContent);
            } else {
                const h3 = document.createElement('h3');
                h3.textContent = '识别前预览确认';
                header.appendChild(h3);
            }
            if (options.showCloseButton !== false) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = options.closeButtonClass || 'btn-close';
                closeBtn.textContent = options.closeButtonText || '×';
                closeBtn.addEventListener('click', () => finish(false));
                header.appendChild(closeBtn);
            }
            dialog.appendChild(header);

            const body = document.createElement('div');
            body.className = options.bodyClassName || 'modal-body';
            body.style.cssText = options.bodyStyle || 'padding: 16px;';
            body.appendChild(contentEl);
            dialog.appendChild(body);

            const footer = document.createElement('div');
            footer.className = options.footerClassName || 'modal-actions';
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = options.cancelButtonClass || 'btn-secondary';
            cancelBtn.className += ' preview-cancel';
            cancelBtn.textContent = hasActions ? (options.cancelText || '取消保存') : (options.emptyText || '关闭');
            footer.appendChild(cancelBtn);
            if (hasActions) {
                const confirmBtn = document.createElement('button');
                confirmBtn.type = 'button';
                confirmBtn.className = options.confirmButtonClass || 'btn-primary';
                confirmBtn.className += ' preview-confirm';
                confirmBtn.textContent = options.confirmText || '确认保存';
                footer.appendChild(confirmBtn);
            }
            dialog.appendChild(footer);
            overlay.appendChild(dialog);

            let settled = false;
            const finish = (confirmed) => {
                if (settled) {
                    return;
                }
                settled = true;
                overlay.remove();
                resolve(confirmed);
            };

            cancelBtn.addEventListener('click', () => finish(false));
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
