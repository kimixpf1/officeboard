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

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value || null));
    }

    function ensurePreviewIds(result) {
        const cloned = cloneJson(result) || {};
        cloned.actionPlan = cloned.actionPlan || {};

        cloned.items = (cloned.items || []).map((item, index) => ({
            ...item,
            __previewId: item.__previewId || `create-${index}`
        }));
        cloned.actionPlan.createItems = cloned.items.map(item => ({ ...item }));

        cloned.mergedItems = (cloned.mergedItems || []).map((item, index) => ({
            ...item,
            __previewId: item.__previewId || `merge-${index}`
        }));
        const mergeUpdateMap = new Map(
            (cloned.actionPlan.mergeUpdates || []).map((item, index) => [item.__previewId || `merge-${index}`, { ...item, __previewId: item.__previewId || `merge-${index}` }])
        );
        cloned.actionPlan.mergeUpdates = cloned.mergedItems.map((item, index) => {
            const previewId = item.__previewId || `merge-${index}`;
            return mergeUpdateMap.get(previewId) || { ...item, __previewId: previewId };
        });
        cloned.actionPlan.mergeSummaries = cloned.mergedItems.map(item => ({ ...item }));

        cloned.skippedItems = (cloned.skippedItems || []).map((item, index) => ({
            ...(typeof item === 'string' ? { title: item } : item),
            __previewId: item?.__previewId || `skip-${index}`
        }));
        cloned.actionPlan.skippedItems = cloned.skippedItems.map(item => ({ ...item }));

        return cloned;
    }

    function cleanPreviewMeta(item) {
        if (!item || typeof item !== 'object') return item;
        const cleaned = { ...item };
        delete cleaned.__previewId;
        return cleaned;
    }

    function buildRecognitionSummaryHtml(fileName, result, isPreview, layout = 'detailed') {
        if (layout === 'compact') {
            return buildCompactSummaryHtml(fileName, result, isPreview);
        }
        return buildDetailedSummaryHtml(fileName, result, isPreview);
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

    function renderEditablePreview(body, fileName, workingResult) {
        body.innerHTML = '';

        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;gap:12px;color:var(--gray-800);';

        const title = document.createElement('h4');
        title.style.cssText = 'margin:0;padding-bottom:8px;border-bottom:1px solid var(--border-color,#eee);color:var(--gray-800);';
        title.textContent = '📄 文件：' + fileName;
        container.appendChild(title);

        const summary = document.createElement('div');
        summary.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--bg-tertiary,#f8fafc);color:var(--gray-700);font-size:13px;border:1px solid var(--border-color,#e5e7eb);';
        summary.textContent = `可逐条修改新增项，也可删除不需要的新增/合并/跳过记录。当前：新增 ${workingResult.items.length}｜合并 ${workingResult.mergedItems.length}｜跳过 ${workingResult.skippedItems.length}`;
        container.appendChild(summary);

        const createInput = (labelText, value, onChange, placeholder = '') => {
            const wrap = document.createElement('label');
            wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;min-width:0;color:var(--gray-700);';
            const label = document.createElement('span');
            label.style.cssText = 'font-size:12px;color:var(--gray-600);';
            label.textContent = labelText;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            input.placeholder = placeholder;
            input.style.cssText = 'padding:8px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;background:var(--bg-primary,#fff);color:var(--gray-800);caret-color:var(--gray-800);';
            input.addEventListener('input', () => onChange(input.value));
            wrap.append(label, input);
            return wrap;
        };

        const createSectionTitle = (text, color, bg) => {
            const sectionTitle = document.createElement('h5');
            sectionTitle.style.cssText = `margin:0;padding:8px 10px;border-radius:6px;color:${color};background:${bg};border:1px solid var(--border-color,#e5e7eb);`;
            sectionTitle.textContent = text;
            return sectionTitle;
        };

        if (workingResult.items.length) {
            const section = document.createElement('div');
            section.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
            section.appendChild(createSectionTitle('✅ 待新增事项（可编辑）', '#10b981', 'rgba(16,185,129,0.1)'));
            workingResult.items.forEach((item, index) => {
                const card = document.createElement('div');
                card.style.cssText = 'border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--bg-primary,#fff);color:var(--gray-800);';

                const top = document.createElement('div');
                top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;';
                const head = document.createElement('div');
                head.style.cssText = 'font-weight:600;color:var(--gray-800);';
                head.textContent = `${index + 1}. ${item.type === 'meeting' ? '会议' : item.type === 'document' ? '办文' : '待办'}`;
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'btn-secondary';
                del.textContent = '删除此条';
                del.addEventListener('click', () => {
                    workingResult.items = workingResult.items.filter(current => current.__previewId !== item.__previewId);
                    renderEditablePreview(body, fileName, workingResult);
                });
                top.append(head, del);
                card.appendChild(top);

                card.appendChild(createInput('标题', item.title || '', value => {
                    item.title = value.trim();
                    item.displayTitle = value.trim();
                }, '请输入事项标题'));

                const row1 = document.createElement('div');
                row1.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;';
                row1.appendChild(createInput('开始日期', item.date || item.deadline?.slice?.(0, 10) || item.docDate || item.docStartDate || '', value => {
                    const trimmed = value.trim();
                    if (item.type === 'meeting') item.date = trimmed;
                    if (item.type === 'todo') item.deadline = trimmed ? `${trimmed}${item.time ? 'T' + item.time : ''}` : '';
                    if (item.type === 'document') {
                        item.docDate = trimmed;
                        item.docStartDate = trimmed;
                    }
                }, 'YYYY-MM-DD'));
                row1.appendChild(createInput('结束日期', item.endDate || item.docEndDate || '', value => {
                    const trimmed = value.trim();
                    if (item.type === 'meeting') item.endDate = trimmed;
                    if (item.type === 'document') item.docEndDate = trimmed;
                }, '跨日期时填写'));
                row1.appendChild(createInput('时间', item.time || '', value => {
                    const trimmed = value.trim();
                    item.time = trimmed;
                    if (item.type === 'todo') {
                        const datePart = item.deadline?.slice?.(0, 10) || '';
                        item.deadline = datePart ? `${datePart}${trimmed ? 'T' + trimmed : ''}` : item.deadline;
                    }
                }, 'HH:MM'));
                card.appendChild(row1);

                const row2 = document.createElement('div');
                row2.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;';
                row2.appendChild(createInput('地点', item.location || '', value => {
                    item.location = value.trim();
                }, '会议地点/备注地点'));
                row2.appendChild(createInput('参会人员', Array.isArray(item.attendees) ? item.attendees.join('、') : '', value => {
                    item.attendees = value.split(/[、，,\s]+/).map(part => part.trim()).filter(Boolean);
                }, '多个用顿号或逗号分隔'));
                card.appendChild(row2);

                if (item.previewReason || item.matchedExistingSummary) {
                    const note = document.createElement('div');
                    note.style.cssText = 'font-size:12px;color:var(--gray-600);';
                    if (item.previewReason) note.textContent = '依据：' + item.previewReason;
                    if (item.matchedExistingSummary?.title) {
                        const match = document.createElement('div');
                        match.style.marginTop = '4px';
                        match.textContent = '匹配到：' + item.matchedExistingSummary.title + (item.matchedExistingSummary.summaryText ? '｜' + item.matchedExistingSummary.summaryText : '');
                        note.appendChild(match);
                    }
                    card.appendChild(note);
                }

                section.appendChild(card);
            });
            container.appendChild(section);
        }

        if (workingResult.mergedItems.length) {
            const section = document.createElement('div');
            section.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
            section.appendChild(createSectionTitle('🔄 待合并事项（可删除）', '#f59e0b', 'rgba(245,158,11,0.1)'));
            workingResult.mergedItems.forEach((item, index) => {
                const card = document.createElement('div');
                card.style.cssText = 'border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;background:var(--bg-primary,#fff);color:var(--gray-800);';
                const text = document.createElement('div');
                text.style.cssText = 'font-size:13px;line-height:1.6;color:var(--gray-800);';
                text.innerHTML = `<div><b>${index + 1}. ${item.title || '未知事项'}</b></div><div>归并到：${item.targetTitle || item.title || '未知事项'}</div><div>新增参会：${item.addedAttendees?.length ? item.addedAttendees.join('、') : '-'}</div>`;
                appendReason(text, item.reason, '#b45309');
                appendMatchedExisting(text, item, '#92400e');
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'btn-secondary';
                del.textContent = '删除此条';
                del.addEventListener('click', () => {
                    workingResult.mergedItems = workingResult.mergedItems.filter(current => current.__previewId !== item.__previewId);
                    renderEditablePreview(body, fileName, workingResult);
                });
                card.append(text, del);
                section.appendChild(card);
            });
            container.appendChild(section);
        }

        if (workingResult.skippedItems.length) {
            const section = document.createElement('div');
            section.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
            section.appendChild(createSectionTitle('⏭️ 待跳过事项（可移除）', '#6b7280', 'rgba(107,114,128,0.1)'));
            workingResult.skippedItems.forEach((item, index) => {
                const card = document.createElement('div');
                card.style.cssText = 'border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;background:var(--bg-primary,#fff);color:var(--gray-800);';
                const text = document.createElement('div');
                text.style.cssText = 'font-size:13px;line-height:1.6;color:var(--gray-800);';
                const titleText = getSkippedTitle(item);
                text.innerHTML = `<div><b>${index + 1}. ${titleText}</b></div>`;
                appendReason(text, getSkippedReason(item), '#6b7280');
                appendMatchedExisting(text, item, '#6b7280');
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'btn-secondary';
                del.textContent = '移除此条';
                del.addEventListener('click', () => {
                    workingResult.skippedItems = workingResult.skippedItems.filter(current => current.__previewId !== item.__previewId);
                    renderEditablePreview(body, fileName, workingResult);
                });
                card.append(text, del);
                section.appendChild(card);
            });
            container.appendChild(section);
        }

        if (!workingResult.items.length && !workingResult.mergedItems.length && !workingResult.skippedItems.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:16px;border:1px dashed var(--border-color,#d1d5db);border-radius:8px;text-align:center;color:var(--gray-600);background:var(--bg-tertiary,#f8fafc);';
            empty.textContent = '当前预览结果已清空。';
            container.appendChild(empty);
        }

        const tip = document.createElement('div');
        tip.style.cssText = 'padding:10px 12px;border-radius:6px;background:rgba(37,99,235,0.08);color:var(--gray-700);font-size:13px;border:1px solid var(--border-color,#e5e7eb);';
        tip.textContent = '确认后按当前预览结果写入面板；删除的条目不会保存。';
        container.appendChild(tip);

        body.appendChild(container);
    }

    function buildFinalPreviewResult(workingResult) {
        const keptCreates = (workingResult.items || []).map(item => cleanPreviewMeta(item));
        const keptMergeIds = new Set((workingResult.mergedItems || []).map(item => item.__previewId));
        const keptSkipIds = new Set((workingResult.skippedItems || []).map(item => item.__previewId));
        const finalMergeSummaries = (workingResult.mergedItems || []).map(item => cleanPreviewMeta(item));
        const finalSkippedItems = (workingResult.skippedItems || []).map(item => cleanPreviewMeta(item));
        const finalMergeUpdates = (workingResult.actionPlan?.mergeUpdates || [])
            .filter(item => keptMergeIds.has(item.__previewId))
            .map(item => cleanPreviewMeta(item));

        return {
            ...workingResult,
            items: keptCreates,
            mergedItems: finalMergeSummaries,
            skippedItems: finalSkippedItems,
            actionPlan: {
                ...(workingResult.actionPlan || {}),
                createItems: keptCreates,
                mergeUpdates: finalMergeUpdates,
                mergeSummaries: finalMergeSummaries,
                skippedItems: finalSkippedItems
            }
        };
    }

    function showRecognitionPreviewModal(fileName, result, options = {}) {
        const preparedResult = ensurePreviewIds(result);
        const hasActions = (preparedResult.items?.length || 0) > 0 || (preparedResult.mergedItems?.length || 0) > 0 || (preparedResult.skippedItems?.length || 0) > 0;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = options.overlayClassName || 'modal active';
            if (options.overlayId) {
                overlay.id = options.overlayId;
            }

            const dialog = document.createElement('div');
            dialog.className = options.dialogClassName || 'modal-content';
            dialog.style.cssText = options.dialogStyle || 'max-width: 880px;';

            const header = document.createElement('div');
            header.className = options.headerClassName || 'modal-header';
            const h3 = document.createElement('h3');
            h3.textContent = '识别前预览确认';
            header.appendChild(h3);
            if (options.showCloseButton !== false) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = options.closeButtonClass || 'btn-close';
                closeBtn.textContent = options.closeButtonText || '×';
                closeBtn.addEventListener('click', () => finish(false, null));
                header.appendChild(closeBtn);
            }
            dialog.appendChild(header);

            const body = document.createElement('div');
            body.className = options.bodyClassName || 'modal-body';
            body.style.cssText = options.bodyStyle || 'padding: 16px; max-height: 70vh; overflow-y: auto;';
            renderEditablePreview(body, fileName, preparedResult);
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
            const finish = (confirmed, payload) => {
                if (settled) {
                    return;
                }
                settled = true;
                overlay.remove();
                resolve({ confirmed, result: payload });
            };

            cancelBtn.addEventListener('click', () => finish(false, null));
            overlay.querySelector('.preview-confirm')?.addEventListener('click', () => finish(true, buildFinalPreviewResult(preparedResult)));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    finish(false, null);
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
